import os
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch, Mock
import requests
from django.test import TestCase, override_settings
from django.db import transaction
from django.core import mail
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from .models import Notification, ExternalDelivery
from .services import NotificationService
from .delivery import channel_for, enqueue, deliver, dispatch_pending, enqueue_chat_message
from .tasks import check_deadlines
from apps.orders.models import Order, Transaction, TransactionType
from apps.catalog.models import Subject, WorkType
from apps.wallet.policy import order_paid_amount
from apps.wallet.services import WalletService
User=get_user_model()

@override_settings(SECURE_SSL_REDIRECT=False,EXTERNAL_NOTIFICATION_CHANNELS=('email','max'),MAX_BOT_TOKEN='qa-fake-token',FRONTEND_URL='https://okoznaniy.ru',EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DeliveryTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_user(username='delivery-user',email='recipient@example.test',registration_source='email',email_verified=True)
        self.expert=User.objects.create_user(username='delivery-expert',role='expert')
    def row(self,key='test'):
        return enqueue(self.user,key,'Новый отклик','Автор откликнулся','/orders/12')
    def test_email_contents_recipient_and_link(self):
        row=self.row();self.assertEqual(deliver(row.pk),'sent')
        self.assertEqual(mail.outbox[-1].to,['recipient@example.test'])
        self.assertIn('https://okoznaniy.ru/orders/12',mail.outbox[-1].body)
        self.assertIn('\n\n',mail.outbox[-1].body)
    def test_sent_delivery_not_repeated(self):
        row=self.row();deliver(row.pk);count=len(mail.outbox);self.assertEqual(deliver(row.pk),'ignored');self.assertEqual(len(mail.outbox),count)
    def test_same_event_only_one_row(self):
        self.assertEqual(self.row().pk,self.row().pk);self.assertEqual(ExternalDelivery.objects.count(),1)
    def test_commit_boundary_and_broker_recovery(self):
        with patch('apps.notifications.tasks.deliver_external_notification.delay',side_effect=RuntimeError('broker')) as q:
            with self.captureOnCommitCallbacks(execute=True):
                row=self.row();q.assert_not_called()
            q.assert_called_once_with(row.pk)
        row.refresh_from_db();self.assertEqual(row.state,'pending')
        with patch('apps.notifications.delivery.publish') as q:
            self.assertEqual(dispatch_pending(),1);q.assert_called_once_with(row.pk)
    def test_rollback_drops_outbox(self):
        with self.assertRaises(ValueError):
            with transaction.atomic():
                self.row();raise ValueError('rollback')
        self.assertFalse(ExternalDelivery.objects.exists())
    def test_source_takes_priority_over_linked_accounts(self):
        self.user.max_id=999;self.user.vk_id=777
        self.assertEqual(channel_for(self.user),'email')
    def test_google_routes_to_email(self):
        self.user.registration_source='google';self.assertEqual(channel_for(self.user),'email')
    def test_legacy_unambiguous_channel(self):
        self.user.registration_source='unknown';self.user.max_id=9
        self.assertEqual(channel_for(self.user),'max');self.assertEqual(self.user.registration_source,'unknown')
    def test_legacy_ambiguous_is_not_guessed(self):
        self.user.registration_source='unknown';self.user.max_id=9;self.user.vk_id=8
        self.assertEqual(channel_for(self.user),'unknown')
    def test_legacy_verified_email(self):
        self.user.registration_source='unknown';self.assertEqual(channel_for(self.user),'email')
    def test_vk_telegram_deferred_without_email_fallback(self):
        for ch in ('vk','telegram'):
            self.user.registration_source=ch;setattr(self.user,ch+'_id',23)
            row=self.row(ch);self.assertEqual(row.state,'skipped');self.assertEqual(row.channel,ch)
    def test_synthetic_email_is_never_used(self):
        self.user.email='max123@okoznaniy.ru';row=self.row();self.assertEqual(row.state,'skipped')
    def test_inactive_account_not_sent(self):
        row=self.row();self.user.is_active=False;self.user.save(update_fields=['is_active'])
        with patch('apps.notifications.delivery.send_delivery') as send:
            self.assertEqual(deliver(row.pk),'skipped');send.assert_not_called()
    def test_max_uses_max_id_and_checks_response(self):
        self.user.registration_source='max';self.user.max_id=99;self.user.save()
        row=self.row();resp=Mock(status_code=200);resp.json.return_value={'message':{'body':{'mid':'qa'}}}
        with patch('apps.notifications.delivery.requests.post',return_value=resp) as send:
            self.assertEqual(deliver(row.pk),'sent');self.assertEqual(send.call_args.kwargs['params'],{'user_id':99})
            self.assertEqual(send.call_args.kwargs['headers'],{'Authorization':'qa-fake-token'})
    def test_max_api_rejection_not_marked_sent(self):
        self.user.registration_source='max';self.user.max_id=99;self.user.save();row=self.row()
        with patch('apps.notifications.delivery.requests.post',return_value=Mock(status_code=403)):
            self.assertEqual(deliver(row.pk),'failed')
        row.refresh_from_db();self.assertEqual(row.last_error,'max_rejected_403')
    def test_max_invalid_success_body_is_failure(self):
        self.user.registration_source='max';self.user.max_id=99;self.user.save();row=self.row()
        resp=Mock(status_code=200);resp.json.return_value={'code':'not.allowed'}
        with patch('apps.notifications.delivery.requests.post',return_value=resp):self.assertEqual(deliver(row.pk),'failed')
    def test_transient_error_is_retried_without_secret_in_log(self):
        row=self.row()
        with patch('apps.notifications.delivery.send_delivery',side_effect=requests.Timeout('secret-in-url')):
            self.assertEqual(deliver(row.pk),'pending')
        row.refresh_from_db();self.assertEqual(row.last_error,'Timeout');self.assertGreater(row.next_attempt,timezone.now())
        self.assertEqual(deliver(row.pk),'ignored')
        ExternalDelivery.objects.filter(pk=row.pk).update(next_attempt=timezone.now()-timedelta(seconds=1))
        self.assertEqual(deliver(row.pk),'sent')
    def test_processing_lease_prevents_concurrent_send(self):
        row=self.row();ExternalDelivery.objects.filter(pk=row.pk).update(state='processing',next_attempt=timezone.now()+timedelta(minutes=2))
        with patch('apps.notifications.delivery.send_delivery') as send:self.assertEqual(deliver(row.pk),'ignored');send.assert_not_called()
    def test_stale_processing_lease_recovers(self):
        row=self.row();ExternalDelivery.objects.filter(pk=row.pk).update(state='processing',next_attempt=timezone.now()-timedelta(seconds=1))
        self.assertEqual(deliver(row.pk),'sent')
    def test_retry_limit(self):
        row=self.row();ExternalDelivery.objects.filter(pk=row.pk).update(attempts=5)
        with patch('apps.notifications.delivery.send_delivery') as send:self.assertEqual(deliver(row.pk),'failed');send.assert_not_called()
    def test_notification_duplicate_not_mailed_twice(self):
        n=NotificationService.create_notification(self.user,'new_bid','Новый отклик','Автор откликнулся',12,'order')
        n2=NotificationService.create_notification(self.user,'new_bid','Новый отклик','Автор откликнулся',12,'order')
        self.assertEqual(n.pk,n2.pk);self.assertEqual(ExternalDelivery.objects.count(),1)
    def test_chat_routes_to_recipient_once_without_content_leak(self):
        from apps.chat.models import Chat,Message
        chat=Chat.objects.create(client=self.user,expert=self.expert);chat.participants.add(self.user,self.expert)
        msg=Message.objects.create(chat=chat,sender=self.expert,text='Работа готова')
        enqueue_chat_message(msg.pk)
        row=ExternalDelivery.objects.get();self.assertEqual(row.recipient_id,self.user.pk)
        self.assertEqual(row.path,f'/messages?chatId={chat.pk}');self.assertNotIn('Работа готова',row.body)
    def test_system_chat_message_not_notified(self):
        from apps.chat.models import Chat,Message
        chat=Chat.objects.create(client=self.user,expert=self.expert)
        Message.objects.create(chat=chat,sender=self.expert,text='system',message_type='system')
        self.assertFalse(ExternalDelivery.objects.exists())
    def test_missing_message_ignored(self):
        self.assertEqual(enqueue_chat_message(999999),0)

@override_settings(SECURE_SSL_REDIRECT=False)
class FollowupOrderTests(TestCase):
    def setUp(self):
        self.client_user=User.objects.create_user(username='followup-client',role='client',email='client@example.test',registration_source='email',service_fee_percent=0)
        self.expert=User.objects.create_user(username='followup-expert',role='expert')
        self.order=Order.objects.create(client=self.client_user,expert=self.expert,title='Followup',description='test',status='in_progress',budget=100,final_price=100,deadline=timezone.now()+timedelta(hours=1),subject=Subject.objects.create(name='Followup'),work_type=WorkType.objects.create(name='Followup'))
    def test_partial_full_and_refund_paid_amount(self):
        WalletService.topup(self.client_user,Decimal('100'))
        self.assertEqual(order_paid_amount(self.order),0)
        WalletService.hold(self.client_user,Decimal('50'),order=self.order);self.assertEqual(order_paid_amount(self.order),50)
        WalletService.hold(self.client_user,Decimal('50'),order=self.order);self.assertEqual(order_paid_amount(self.order),100)
        WalletService.refund_hold(self.client_user,Decimal('25'),order=self.order);self.assertEqual(order_paid_amount(self.order),75)
    def test_release_does_not_erase_paid_amount(self):
        Transaction.objects.create(user=self.client_user,order=self.order,type=TransactionType.HOLD,amount=100)
        Transaction.objects.create(user=self.client_user,order=self.order,type=TransactionType.RELEASE,amount=100)
        self.assertEqual(order_paid_amount(self.order),100)
    def test_other_user_money_does_not_count(self):
        Transaction.objects.create(user=self.expert,order=self.order,type=TransactionType.HOLD,amount=100)
        self.assertEqual(order_paid_amount(self.order),0)
    def test_paid_amount_exposed_to_admin(self):
        from apps.admin_panel.views import get_all_orders
        Transaction.objects.create(user=self.client_user,order=self.order,type='hold',amount=50)
        admin=User.objects.create_user(username='followup-admin',role='admin',is_staff=True)
        req=APIRequestFactory().get('/api/admin-panel/orders/');force_authenticate(req,admin)
        self.assertEqual(get_all_orders(req).data[0]['paid_amount'],'50.00')
    def test_deadline_task_no_field_error_no_duplicate(self):
        check_deadlines();count=Notification.objects.filter(type='deadline_soon').count();self.assertEqual(count,2)
        check_deadlines();self.assertEqual(Notification.objects.filter(type='deadline_soon').count(),count)
    def test_new_bid_generates_email_delivery(self):
        NotificationService.notify_new_bid(self.order,SimpleNamespace(amount=Decimal('100')),self.expert)
        row=ExternalDelivery.objects.get();self.assertEqual(row.channel,'email');self.assertIn('100',row.body)

@override_settings(SECURE_SSL_REDIRECT=False)
class MaxAuthTests(TestCase):
    def setUp(self):
        os.environ['MAX_BOT_TOKEN']='qa-fake-token'
        from max_bot import bot
        self.bot=bot;cache.clear()
        self.user=User.objects.create_user(username='max-qa',max_id=777,role='client')
        self.api=APIClient()
    def test_new_auth_id_produces_cookie_session(self):
        with patch.object(self.bot,'send_message'):
            self.bot.process_update({'update_type':'bot_started','user':{'user_id':777,'first_name':'QA'},'payload':'auth_qa-random-id'})
        r=self.api.get('/api/users/max_auth_status/qa-random-id/')
        self.assertEqual(r.status_code,200);self.assertTrue(r.data['authenticated']);self.assertIn('oko_access',r.cookies)
        self.assertTrue(r.cookies['oko_access']['httponly']);self.assertNotIn('access',r.data)
        self.assertEqual(self.api.get('/api/users/me/').status_code,200)
    def test_legacy_double_prefix_works(self):
        self.bot.save_auth_data('auth_legacy',self.user)
        r=self.api.get('/api/users/max_auth_status/auth_legacy/');self.assertTrue(r.data['authenticated'])
    def test_new_max_registration_sets_source(self):
        with patch.object(self.bot,'send_message'):
            self.bot.process_update({'update_type':'bot_started','user':{'user_id':778,'first_name':'New'},'payload':'auth_new-reg'})
        user=User.objects.get(max_id=778);self.assertEqual(user.registration_source,'max')
        self.assertTrue(self.api.get('/api/users/max_auth_status/new-reg/').data['authenticated'])
    def test_message_created_start_variant(self):
        with patch.object(self.bot,'send_message'):
            self.bot.process_update({'update_type':'message_created','message':{'sender':{'user_id':777},'body':{'text':'/start auth_message-id'}}})
        self.assertTrue(self.api.get('/api/users/max_auth_status/message-id/').data['authenticated'])
    def test_wrong_auth_id_cannot_sign_in(self):
        self.bot.save_auth_data('correct',self.user)
        r=self.api.get('/api/users/max_auth_status/wrong/');self.assertFalse(r.data['authenticated']);self.assertNotIn('oko_access',r.cookies)
    def test_blocked_user_cannot_sign_in(self):
        self.bot.save_auth_data('blocked',self.user);self.user.is_active=False;self.user.save(update_fields=['is_active'])
        r=self.api.get('/api/users/max_auth_status/blocked/');self.assertEqual(r.status_code,403);self.assertNotIn('oko_access',r.cookies)
    def test_inactive_user_not_issued_tokens(self):
        self.user.is_active=False
        with self.assertRaises(ValueError):self.bot.save_auth_data('no-token',self.user)
