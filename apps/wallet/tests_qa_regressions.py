
from decimal import Decimal as D
from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.catalog.models import Subject, WorkType
from apps.orders.models import Order, Transaction
from apps.wallet.models import Settlement
from apps.wallet.services import WalletService
from apps.wallet.serializers import WalletTransactionSerializer
from apps.arbitration.models import ArbitrationCase, ArbitrationMessage
from apps.arbitration.views import ArbitrationCaseViewSet, freeze_case_context
from apps.chat.models import Chat, Message
from apps.users.views import UserViewSet

U = get_user_model()
class FinanceAndAppealRegressionTests(TestCase):
    def setUp(self):
        self.p = U.objects.create_user(username='qa_partner', role='partner')
        self.c = U.objects.create_user(username='qa_client', role='client', partner=self.p, partner_linked_at=timezone.now())
        self.e = U.objects.create_user(username='qa_expert', role='expert')
        self.admin = U.objects.create_user(username='qa_admin', role='admin')
        self.other = U.objects.create_user(username='qa_other', role='client')
        self.order = Order.objects.create(client=self.c, expert=self.e,
            subject=Subject.objects.create(name='QA'), work_type=WorkType.objects.create(name='QA'),
            title='QA escrow', description='QA', budget=D('80'),
            deadline=timezone.now()+timedelta(days=4), status='in_progress')
        WalletService.topup(self.c,D('100'))
        self.st = WalletService.fund_distributed_escrow(client=self.c, expert=self.e,
            base_amount=D('80'),service_fee=D('20'),fund_amount=D('50'),order=self.order)['settlement']
        self.case = ArbitrationCase.objects.create(order=self.order,plaintiff=self.c,defendant=self.e,
            subject='QA dispute',description='QA',reason='poor_quality',status='in_arbitration',assigned_admin=self.admin)
        self.chat = Chat.objects.filter(order=self.order).first()
        if self.chat is None:
            self.chat=Chat.objects.create(order=self.order,client=self.c,expert=self.e)
        self.chat.participants.add(self.c,self.e)
        self.msg=Message.objects.create(chat=self.chat,sender=self.c,text='Keep this history')
        freeze_case_context(self.case)
    def action(self,name,user,data=None,method='post'):
        factory=APIRequestFactory()
        req=getattr(factory,method)('/qa/',data or {},format='json')
        force_authenticate(req,user=user)
        return ArbitrationCaseViewSet.as_view({method:name})(req,pk=self.case.pk)
    def values(self):
        return list(U.objects.filter(pk__in=[self.c.pk,self.e.pk,self.p.pk]).order_by('pk').values_list('balance','frozen_balance','pending_balance'))
    def test_escrow_credits_include_order_and_income_direction(self):
        for user,amount in [(self.e,D('40')),(self.p,D('10'))]:
            tx=Transaction.objects.get(user=user,order=self.order,type='escrow_credit')
            self.assertEqual(tx.amount,amount)
            self.assertEqual(WalletTransactionSerializer(tx).data['direction'],'in')
            self.assertEqual(tx.order_id,self.order.pk)
    def test_full_refund_reverses_actual_partial_funding(self):
        response=self.action('process_refund',self.admin,{'refund_percentage':100,'refund_amount':80})
        self.assertEqual(response.status_code,200,response.data)
        for u in [self.c,self.e,self.p]:u.refresh_from_db()
        self.assertEqual(self.c.balance,D('100'))
        self.assertEqual(self.e.balance,D('0'))
        self.assertEqual(self.p.balance,D('0'))
        self.assertEqual(self.e.frozen_balance,D('0'))
        self.assertEqual(self.p.frozen_balance,D('0'))
        self.case.refresh_from_db();self.st.refresh_from_db()
        self.assertEqual(self.case.approved_refund_amount,D('50'))
        self.assertTrue(self.st.is_released)
        self.assertEqual(self.st.refunded_base,D('40'))
        self.assertEqual(Transaction.objects.filter(order=self.order,type='clawback').count(),2)
        self.chat.refresh_from_db();self.assertFalse(self.chat.is_frozen)
    def test_partial_refund_returns_share_and_releases_only_remainder(self):
        response=self.action('process_refund',self.admin,{'refund_percentage':50})
        self.assertEqual(response.status_code,200,response.data)
        for u in [self.c,self.e,self.p]:u.refresh_from_db()
        self.assertEqual(self.c.balance,D('75'))
        self.assertEqual(self.e.balance,D('20'))
        self.assertEqual(self.p.balance,D('5'))
        self.assertEqual(self.e.frozen_balance,D('0'))
        self.assertEqual(self.p.frozen_balance,D('0'))
    def test_second_refund_is_rejected_without_balance_change(self):
        self.assertEqual(self.action('process_refund',self.admin,{'refund_percentage':100}).status_code,200)
        before=self.values();count=Transaction.objects.count()
        self.assertEqual(self.action('process_refund',self.admin,{'refund_percentage':100}).status_code,400)
        self.assertEqual(before,self.values());self.assertEqual(count,Transaction.objects.count())
    def test_refund_failure_rolls_back_all_recipients(self):
        U.objects.filter(pk=self.p.pk).update(frozen_balance=0)
        before=self.values();count=Transaction.objects.count()
        response=self.action('process_refund',self.admin,{'refund_percentage':100})
        self.assertEqual(response.status_code,400,response.data)
        self.assertEqual(before,self.values());self.assertEqual(count,Transaction.objects.count())
        self.case.refresh_from_db();self.assertIsNone(self.case.approved_refund_percentage)
    def test_release_then_refund_is_capped_at_paid_amount(self):
        WalletService.release_distributed_escrow(self.st)
        self.assertEqual(self.action('process_refund',self.admin,{'refund_percentage':100}).status_code,200)
        self.c.refresh_from_db();self.assertEqual(self.c.balance,D('100'))
    def test_both_parties_can_reopen_without_repaying(self):
        self.assertEqual(self.action('process_refund',self.admin,{'refund_percentage':100}).status_code,200)
        before=self.values();count=Transaction.objects.count()
        for user in [self.c,self.e]:
            self.case.refresh_from_db();self.case.status='closed';self.case.save(update_fields=['status'])
            response=self.action('reopen',user,{'reason':'Please review the evidence'})
            self.assertEqual(response.status_code,200,response.data)
            latest=ArbitrationMessage.objects.filter(case=self.case).latest('pk')
            self.assertEqual(latest.message_type,'plaintiff' if user.pk==self.c.pk else 'defendant')
            self.assertEqual(before,self.values());self.assertEqual(count,Transaction.objects.count())
            self.assertTrue(Message.objects.filter(pk=self.msg.pk).exists())
            self.assertEqual(self.action('process_refund',self.admin,{'refund_percentage':100}).status_code,400)
    def test_outsider_cannot_reopen(self):
        self.case.status='closed';self.case.save(update_fields=['status'])
        self.assertIn(self.action('reopen',self.other,{'reason':'No'}).status_code,[403,404])
    def test_empty_reason_and_open_case_are_rejected(self):
        self.assertEqual(self.action('reopen',self.c,{'reason':'reason'}).status_code,400)
        self.case.status='closed';self.case.save(update_fields=['status'])
        self.assertEqual(self.action('reopen',self.c,{'reason':' '}).status_code,400)
    def test_closed_case_retains_chat_for_both_parties(self):
        self.assertEqual(self.action('close_case',self.admin).status_code,200)
        for user in [self.c,self.e]:
            r=self.action('activity_feed',user,method='get')
            self.assertEqual(r.status_code,200,r.data)
            self.assertTrue(any(m['text']=='Keep this history' for m in r.data['feed']))
        self.assertTrue(Message.objects.filter(pk=self.msg.pk).exists())
    def test_partner_dashboard_shows_reserved_order_without_saving_user(self):
        req=APIRequestFactory().get('/qa/');force_authenticate(req,user=self.p)
        before=self.values()
        with patch.object(U,'save',side_effect=AssertionError('Dashboard attempted a write')):
            response=UserViewSet.as_view({'get':'partner_dashboard'})(req)
        self.assertEqual(response.status_code,200,response.data)
        rows=[r for r in response.data['recent_earnings'] if r.get('is_frozen')]
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]['amount'],D('10'))
        self.assertEqual(rows[0]['order_id'],self.order.pk);self.assertEqual(before,self.values())
    def test_approval_performs_actual_refund(self):
        response=self.action('process_refund',self.admin,{'refund_percentage':100,'require_approval':True})
        self.assertEqual(response.status_code,200,response.data)
        self.c.refresh_from_db();self.assertEqual(self.c.balance,D('50'))
        response=self.action('approve_refund',self.admin)
        self.assertEqual(response.status_code,200,response.data)
        self.c.refresh_from_db();self.assertEqual(self.c.balance,D('100'))

    def test_legacy_reserve_snapshot_is_read_only(self):
        Transaction.objects.filter(user=self.e,type='escrow_credit').delete()
        before=self.values();count=Transaction.objects.count()
        rows=WalletService.get_transactions(self.e)
        snapshots=[row for row in rows if row.pk<0]
        self.assertEqual(len(snapshots),1)
        self.assertEqual(snapshots[0].amount,D('40'))
        self.assertEqual(WalletTransactionSerializer(snapshots[0]).data['order_id'],self.order.pk)
        self.assertEqual(before,self.values());self.assertEqual(count,Transaction.objects.count())
    def test_new_credits_are_not_duplicated_by_snapshots(self):
        rows=WalletService.get_transactions(self.e)
        self.assertEqual(len([r for r in rows if r.type=='escrow_credit']),1)
        self.assertTrue(all(r.pk>0 for r in rows))

    def test_released_partial_refund_is_idempotent_and_cumulative(self):
        WalletService.release_distributed_escrow(self.st)
        first=WalletService.clawback_settlement(self.st,50)
        before=self.values()
        second=WalletService.clawback_settlement(self.st,50)
        self.assertEqual(first['refund'],D('25'))
        self.assertEqual(second['refund'],D('0'))
        self.assertEqual(before,self.values())
        final=WalletService.clawback_settlement(self.st,100)
        self.assertEqual(final['refund'],D('25'))
        self.c.refresh_from_db();self.assertEqual(self.c.balance,D('100'))
