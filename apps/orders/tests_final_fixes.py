from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import AccessToken
from apps.catalog.models import Subject, WorkType
from apps.orders.models import Order, OrderFile, Transaction, TransactionType
from apps.orders.serializers import OrderFileSerializer
from apps.wallet.services import WalletService
from apps.admin_panel.views import get_all_orders

User = get_user_model()

@override_settings(SECURE_SSL_REDIRECT=False)
class FinalFileAndOrderTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='final-owner', password='qa', role='client', service_fee_percent=0)
        self.expert = User.objects.create_user(username='final-expert', password='qa', role='expert')
        self.outsider = User.objects.create_user(username='final-outsider', password='qa', role='client')
        self.order = Order.objects.create(client=self.owner, expert=self.expert,
            subject=Subject.objects.create(name='Final subject'), work_type=WorkType.objects.create(name='Final work'),
            title='Final check', description='test', deadline=timezone.now()+timedelta(days=3),
            budget=Decimal('1000'), final_price=Decimal('1000'), status='review')
        self.file = OrderFile.objects.create(order=self.order, uploaded_by=self.expert,
            file_type='solution', file=SimpleUploadedFile('final.txt', b'final QA contents'))
        self.api = APIClient()

    def login(self, user=None):
        self.api.cookies['oko_access'] = str(AccessToken.for_user(user or self.owner))

    def fund(self):
        WalletService.topup(self.owner, Decimal('1000'))
        WalletService.hold(self.owner, Decimal('1000'), order=self.order)

    def fetch(self, path):
        r=self.api.get(path)
        if getattr(r,'streaming',False):
            data=b''.join(r.streaming_content)
            self.assertEqual(data,b'final QA contents')
        return r

    def approve(self):
        return self.api.post(f'/api/orders/orders/{self.order.pk}/approve/', {}, format='json')

    def test_cookie_direct_media_marks_received_and_approves_without_review(self):
        self.fund();self.login()
        self.assertEqual(self.fetch(self.file.file.url).status_code,200)
        self.file.refresh_from_db(); self.assertIsNotNone(self.file.client_downloaded_at)
        r=self.approve();self.assertEqual(r.status_code,200,r.content)
        self.order.refresh_from_db();self.assertEqual(self.order.status,'completed')
        from apps.experts.models import ExpertReview
        self.assertFalse(ExpertReview.objects.filter(order=self.order).exists())
        self.assertEqual(self.fetch(self.file.file.url).status_code,200)

    def test_inline_api_view_counts_as_receipt(self):
        self.fund();self.login()
        self.assertEqual(self.fetch(f'/api/orders/orders/{self.order.pk}/files/{self.file.pk}/view/').status_code,200)
        self.file.refresh_from_db();self.assertIsNotNone(self.file.client_downloaded_at)
        self.assertEqual(self.approve().status_code,200)

    def test_download_api_counts_as_receipt(self):
        self.fund();self.login()
        self.assertEqual(self.fetch(f'/api/orders/orders/{self.order.pk}/files/{self.file.pk}/download/').status_code,200)
        self.file.refresh_from_db();self.assertIsNotNone(self.file.client_downloaded_at)

    def test_unpaid_media_explains_payment_not_login(self):
        self.login();r=self.fetch(self.file.file.url)
        self.assertEqual(r.status_code,403)
        self.assertIn('оплаты',r.content.decode())
        self.assertNotIn('Требуется вход',r.content.decode())
        self.file.refresh_from_db();self.assertIsNone(self.file.client_downloaded_at)

    def test_unpaid_api_is_payment_required(self):
        self.login();r=self.fetch(f'/api/orders/orders/{self.order.pk}/files/{self.file.pk}/view/')
        self.assertEqual(r.status_code,402)

    def test_anonymous_cannot_read_paid_work(self):
        self.fund();self.assertEqual(self.fetch(self.file.file.url).status_code,403)

    def test_invalid_cookie_cannot_read(self):
        self.fund();self.api.cookies['oko_access']='invalid'
        self.assertEqual(self.fetch(self.file.file.url).status_code,403)

    def test_expired_cookie_cannot_read(self):
        self.fund();t=AccessToken.for_user(self.owner);t.set_exp(lifetime=timedelta(seconds=-10))
        self.api.cookies['oko_access']=str(t)
        self.assertEqual(self.fetch(self.file.file.url).status_code,403)

    def test_outsider_cannot_read_paid_work(self):
        self.fund();self.login(self.outsider)
        self.assertEqual(self.fetch(self.file.file.url).status_code,403)
        self.file.refresh_from_db();self.assertIsNone(self.file.client_downloaded_at)

    def test_expert_can_read_unpaid_own_work_without_marking_client(self):
        self.login(self.expert);self.assertEqual(self.fetch(self.file.file.url).status_code,200)
        self.file.refresh_from_db();self.assertIsNone(self.file.client_downloaded_at)

    def test_payment_check_failure_does_not_disclose_file(self):
        self.login()
        with patch('apps.wallet.policy.order_remaining_payment',side_effect=RuntimeError('QA failure')):
            self.assertEqual(self.fetch(self.file.file.url).status_code,403)
            self.assertEqual(self.fetch(f'/api/orders/orders/{self.order.pk}/files/{self.file.pk}/view/').status_code,503)

    def test_no_double_settlement_on_repeated_approval(self):
        self.fund();self.login();self.fetch(self.file.file.url)
        self.assertEqual(self.approve().status_code,200)
        before=list(Transaction.objects.filter(order=self.order).values_list('pk','amount','type'))
        self.assertEqual(self.approve().status_code,400)
        self.assertEqual(before,list(Transaction.objects.filter(order=self.order).values_list('pk','amount','type')))

    def test_download_flag_not_writable_by_client(self):
        serializer=OrderFileSerializer(self.file, data={'client_downloaded_at':timezone.now()},partial=True)
        self.assertTrue(serializer.is_valid(),serializer.errors)
        self.assertNotIn('client_downloaded_at',serializer.validated_data)

    def test_all_files_must_be_viewed_before_confirmation(self):
        self.fund();self.login()
        second=OrderFile.objects.create(order=self.order, uploaded_by=self.expert,
            file_type='revision',file=SimpleUploadedFile('second.txt',b'final QA contents'))
        self.fetch(self.file.file.url)
        self.assertEqual(self.approve().status_code,400)
        self.fetch(second.file.url)
        self.assertEqual(self.approve().status_code,200)

    def test_admin_partner_amount_and_exact_number_search(self):
        partner=User.objects.create_user(username='final-partner', role='partner')
        self.owner.partner=partner;self.owner.save(update_fields=['partner'])
        admin=User.objects.create_user(username='final-admin',role='admin',is_staff=True)
        request=APIRequestFactory().get('/api/admin-panel/orders/', {'search':f'#{self.order.pk}'})
        force_authenticate(request,user=admin);r=get_all_orders(request)
        self.assertEqual(r.status_code,200);self.assertEqual(len(r.data),1)
        self.assertEqual(r.data[0]['partner']['id'],partner.pk)
        self.assertEqual(Decimal(r.data[0]['order_amount']),Decimal('1000'))
        request=APIRequestFactory().get('/api/admin-panel/orders/', {'search':'99999999'})
        force_authenticate(request,user=admin);self.assertEqual(get_all_orders(request).data,[])

    def test_registration_source_is_not_changed_by_later_linking(self):
        u=User.objects.create_user(username='final-telegram',telegram_id=987654)
        self.assertEqual(u.registration_source,'telegram')
        u.vk_id=123456;u.save();u.refresh_from_db()
        self.assertEqual(u.registration_source,'telegram')
        self.assertEqual(self.owner.registration_source,'unknown')

    def test_old_unseen_revision_does_not_block_current_delivery(self):
        self.fund();self.login()
        OrderFile.objects.filter(pk=self.file.pk).update(created_at=timezone.now()-timedelta(days=1))
        latest=OrderFile.objects.create(order=self.order, uploaded_by=self.expert,
            file_type='revision',file=SimpleUploadedFile('latest.txt',b'final QA contents'))
        self.fetch(latest.file.url)
        r=self.approve();self.assertEqual(r.status_code,200,r.content)

    def test_completed_status_alone_cannot_unlock_unpaid_file(self):
        self.order.status='completed';self.order.save(update_fields=['status'])
        self.login();self.assertEqual(self.fetch(self.file.file.url).status_code,403)

    def test_refunded_payment_does_not_unlock_file(self):
        self.fund();WalletService.refund_hold(self.owner, Decimal('1000'), order=self.order)
        self.login();self.assertEqual(self.fetch(self.file.file.url).status_code,403)

    def test_message_broadcast_reaches_recipient_not_sender(self):
        from apps.chat.models import Chat
        from apps.chat.websocket_utils import notify_chat_message
        chat=Chat.objects.create(order=self.order,client=self.owner,expert=self.expert)
        chat.participants.add(self.owner,self.expert)
        with patch('apps.chat.websocket_utils.send_to_group') as send:
            notify_chat_message(chat.pk,{'id':99,'sender':{'id':self.expert.pk},'text':'QA'})
        groups=[c.args[0] for c in send.call_args_list]
        self.assertIn(f'user_{self.owner.pk}',groups)
        self.assertNotIn(f'user_{self.expert.pk}',groups)
