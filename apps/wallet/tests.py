from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.orders.models import Bid, BidStatus, Order, Transaction, TransactionType
from apps.payments.models import Payment, PaymentStatus
from apps.payments.services import PaymentService
from apps.users.models import PartnerEarning
from apps.users.serializers import CustomRegisterSerializer
from apps.wallet.models import WithdrawalRequest
from apps.wallet.services import WalletService, get_system_account

User = get_user_model()


@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class WalletSandboxTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='wallet_client',
            email='wallet_client@okoznaniy.test',
            password='pwd',
            role='client',
        )
        self.api = APIClient()
        self.api.force_authenticate(self.client_user)

    def test_sandbox_topup_credits_test_wallet_once(self):
        response = self.api.post(
            '/api/wallet/topup/',
            {'amount': '500.00', 'payment_method': 'sberpay_qr'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertTrue(response.json()['sandbox'])
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.balance, Decimal('500.00'))

        payment = Payment.objects.get(payment_id=response.json()['payment_id'])
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertEqual(
            Transaction.objects.filter(
                user=self.client_user,
                payment=payment,
                type=TransactionType.TOPUP,
            ).count(),
            1,
        )

        payment.save()
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.balance, Decimal('500.00'))

    def test_withdraw_debits_wallet_and_creates_pending_request(self):
        WalletService.topup(self.client_user, Decimal('700.00'))

        response = self.api.post(
            '/api/wallet/withdraw/',
            {'amount': '300.00', 'card_number': '4111111111111111'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.balance, Decimal('400.00'))
        withdrawal = WithdrawalRequest.objects.get(pk=response.json()['withdrawal_id'])
        self.assertEqual(withdrawal.status, WithdrawalRequest.Status.PENDING)
        self.assertEqual(withdrawal.transaction.type, TransactionType.WITHDRAWAL)

    def test_partner_can_topup_and_withdraw_from_wallet(self):
        partner = User.objects.create_user(
            username='wallet_partner',
            email='wallet_partner@okoznaniy.test',
            password='pwd',
            role='partner',
        )
        self.api.force_authenticate(partner)

        topup = self.api.post(
            '/api/wallet/topup/',
            {'amount': '1200.00', 'payment_method': 'sberpay_qr'},
            format='json',
        )
        self.assertEqual(topup.status_code, status.HTTP_200_OK, topup.content)
        self.assertTrue(topup.json()['sandbox'])

        withdraw = self.api.post(
            '/api/wallet/withdraw/',
            {'amount': '500.00', 'card_number': '5555444433332222'},
            format='json',
        )
        self.assertEqual(withdraw.status_code, status.HTTP_201_CREATED, withdraw.content)

        partner.refresh_from_db()
        self.assertEqual(partner.balance, Decimal('700.00'))
        withdrawal = WithdrawalRequest.objects.get(pk=withdraw.json()['withdrawal_id'])
        self.assertEqual(withdrawal.user, partner)
        self.assertEqual(withdrawal.status, WithdrawalRequest.Status.PENDING)


@override_settings(SECURE_SSL_REDIRECT=False)
class PartnerReferralFinanceTests(TestCase):
    def test_registration_with_referral_code_creates_partner_bonus(self):
        partner = User.objects.create_user(
            username='ref_partner',
            email='ref_partner@example.com',
            password='pwd',
            role='partner',
        )

        serializer = CustomRegisterSerializer(data={
            'email': 'referred_client@example.com',
            'password': 'secret123',
            'password2': 'secret123',
            'role': 'client',
            'referral_code': partner.referral_code,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        referred_client = serializer.save()
        bonus = PartnerEarning.objects.get(
            partner=partner,
            referral=referred_client,
            earning_type='registration',
        )

        self.assertEqual(bonus.amount, Decimal('50.00'))
        self.assertEqual(bonus.source_amount, Decimal('50.00'))
        partner.refresh_from_db()
        self.assertEqual(partner.total_referrals, 1)
        self.assertEqual(partner.total_earnings, Decimal('50.00'))


@override_settings(SECURE_SSL_REDIRECT=False)
class WalletOrderLedgerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name='Wallet subject')
        cls.work_type = WorkType.objects.create(name='Wallet work type')

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='ledger_client',
            email='ledger_client@example.com',
            password='pwd',
            role='client',
        )
        self.expert = User.objects.create_user(
            username='ledger_expert',
            email='ledger_expert@example.com',
            password='pwd',
            role='expert',
        )
        self.api = APIClient()

    def _order(self, status_value='review'):
        return Order.objects.create(
            client=self.client_user,
            expert=self.expert,
            subject=self.subject,
            work_type=self.work_type,
            title='Ledger order',
            description='Ledger order description',
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal('1000.00'),
            final_price=Decimal('1000.00'),
            status=status_value,
        )

    def test_approve_releases_order_hold_to_expert_with_commission(self):
        order = self._order()
        WalletService.topup(self.client_user, Decimal('1000.00'))
        WalletService.hold(self.client_user, Decimal('1000.00'), order=order)

        self.api.force_authenticate(self.client_user)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        order.refresh_from_db()
        self.client_user.refresh_from_db()
        self.expert.refresh_from_db()
        system_user = get_system_account()
        system_user.refresh_from_db()

        self.assertEqual(order.status, 'completed')
        self.assertEqual(self.client_user.balance, Decimal('0.00'))
        self.assertEqual(self.client_user.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.expert.balance, Decimal('850.00'))
        self.assertEqual(system_user.balance, Decimal('150.00'))
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.RELEASE).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.PAYOUT).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.COMMISSION).exists())

    def test_reject_refunds_order_hold_to_available_balance(self):
        order = self._order()
        WalletService.topup(self.client_user, Decimal('1000.00'))
        WalletService.hold(self.client_user, Decimal('1000.00'), order=order)

        self.api.force_authenticate(self.client_user)
        response = self.api.post(f'/api/orders/orders/{order.id}/reject/')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        order.refresh_from_db()
        self.client_user.refresh_from_db()
        self.expert.refresh_from_db()

        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self.client_user.balance, Decimal('1000.00'))
        self.assertEqual(self.client_user.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.expert.balance, Decimal('0.00'))
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.REFUND).exists())

    def test_external_order_payment_callback_creates_idempotent_wallet_hold(self):
        order = self._order(status_value='waiting_payment')
        payment = Payment.objects.create(
            order=order,
            user=self.client_user,
            amount=Decimal('1000.00'),
            payment_method='card',
            status=PaymentStatus.PENDING,
            payment_id='callback-order-payment',
        )

        with patch('apps.payments.services.AlfaBankClient.process_callback', return_value=payment):
            self.assertTrue(PaymentService.process_payment_callback(payment.payment_id, {'orderId': payment.payment_id}))
            self.assertTrue(PaymentService.process_payment_callback(payment.payment_id, {'orderId': payment.payment_id}))

        order.refresh_from_db()
        self.client_user.refresh_from_db()
        payment.refresh_from_db()

        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertEqual(order.status, 'in_progress')
        self.assertEqual(self.client_user.balance, Decimal('1000.00'))
        self.assertEqual(self.client_user.frozen_balance, Decimal('1000.00'))
        self.assertEqual(
            Transaction.objects.filter(order=order, payment=payment, type=TransactionType.TOPUP).count(),
            1,
        )
        self.assertEqual(
            Transaction.objects.filter(order=order, type=TransactionType.HOLD).count(),
            1,
        )

    def test_completed_referred_order_is_visible_in_partner_and_director_finance(self):
        partner = User.objects.create_user(
            username='ledger_partner',
            email='ledger_partner@example.com',
            password='pwd',
            role='partner',
            partner_commission_rate=Decimal('7.50'),
        )
        director = User.objects.create_user(
            username='ledger_director',
            email='ledger_director@example.com',
            password='pwd',
            role='director',
        )
        admin_user = User.objects.create_user(
            username='ledger_admin',
            email='ledger_admin@example.com',
            password='pwd',
            role='admin',
        )
        self.client_user.partner = partner
        self.client_user.save(update_fields=['partner'])

        order = self._order()
        WalletService.topup(self.client_user, Decimal('1000.00'))
        WalletService.hold(self.client_user, Decimal('1000.00'), order=order)

        self.api.force_authenticate(self.client_user)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

        earning = PartnerEarning.objects.get(partner=partner, referral=self.client_user, order=order)
        self.assertEqual(earning.source_amount, Decimal('1000.00'))
        self.assertEqual(earning.commission_rate, Decimal('7.50'))
        self.assertEqual(earning.amount, Decimal('75.0000'))
        self.assertFalse(earning.is_paid)

        partner.refresh_from_db()
        self.assertEqual(partner.total_referrals, 1)
        self.assertEqual(partner.active_referrals, 1)
        self.assertEqual(partner.total_earnings, Decimal('75.0000'))
        self.assertEqual(partner.balance, Decimal('0.00'))
        self.assertEqual(partner.pending_balance, Decimal('75.00'))

        self.api.force_authenticate(partner)
        dashboard = self.api.get('/api/users/partner_dashboard/')
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK, dashboard.content)
        self.assertEqual(Decimal(str(dashboard.json()['partner_info']['total_earnings'])), Decimal('75.0000'))
        self.assertEqual(len(dashboard.json()['recent_earnings']), 1)

        start = (timezone.now() - timedelta(days=1)).date().isoformat()
        end = (timezone.now() + timedelta(days=1)).date().isoformat()
        self.api.force_authenticate(director)
        turnover = self.api.get(f'/api/director/partners/turnover/?start_date={start}&end_date={end}')
        self.assertEqual(turnover.status_code, status.HTTP_200_OK, turnover.content)
        partner_row = next(item for item in turnover.json()['partners'] if item['id'] == partner.id)
        self.assertEqual(Decimal(str(partner_row['turnover'])), Decimal('1000.0'))
        self.assertEqual(Decimal(str(partner_row['commission'])), Decimal('75.0'))

        self.api.force_authenticate(admin_user)
        admin_earnings = self.api.get('/api/users/admin_earnings/')
        self.assertEqual(admin_earnings.status_code, status.HTTP_200_OK, admin_earnings.content)
        earnings_data = admin_earnings.json()['earnings']
        admin_row = next(item for item in earnings_data if item['id'] == earning.id)
        self.assertEqual(Decimal(str(admin_row['amount'])), Decimal('75.00'))
        self.assertFalse(admin_row['is_paid'])

        mark_paid = self.api.post('/api/users/admin_mark_earning_paid/', {'earning_id': earning.id}, format='json')
        self.assertEqual(mark_paid.status_code, status.HTTP_200_OK, mark_paid.content)
        earning.refresh_from_db()
        self.assertTrue(earning.is_paid)

    def test_referred_order_full_wallet_flow_reserves_releases_and_accrues_partner_commission(self):
        partner = User.objects.create_user(
            username='ledger_partner_full_flow',
            email='ledger_partner_full_flow@example.com',
            password='pwd',
            role='partner',
            partner_commission_rate=Decimal('10.00'),
        )
        self.client_user.partner = partner
        self.client_user.save(update_fields=['partner'])
        WalletService.topup(self.client_user, Decimal('1200.00'))

        order = Order.objects.create(
            client=self.client_user,
            expert=self.expert,
            subject=self.subject,
            work_type=self.work_type,
            title='Referral full flow order',
            description='Referral full flow order description',
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal('1200.00'),
            status='awaiting_expert_acceptance',
        )
        Bid.objects.create(
            order=order,
            expert=self.expert,
            amount=Decimal('1200.00'),
            prepayment_percent=50,
            status=BidStatus.INVITED,
        )

        self.api.force_authenticate(self.expert)
        accepted = self.api.post(f'/api/orders/orders/{order.id}/accept_assignment/', {}, format='json')
        self.assertEqual(accepted.status_code, status.HTTP_200_OK, accepted.content)

        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.balance, Decimal('1200.00'))
        self.assertEqual(self.client_user.frozen_balance, Decimal('1200.00'))
        self.assertEqual(Transaction.objects.filter(order=order, type=TransactionType.HOLD).count(), 1)

        order.status = 'review'
        order.save(update_fields=['status', 'updated_at'])
        self.api.force_authenticate(self.client_user)
        approved = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(approved.status_code, status.HTTP_200_OK, approved.content)

        order.refresh_from_db()
        self.client_user.refresh_from_db()
        self.expert.refresh_from_db()
        system_user = get_system_account()
        system_user.refresh_from_db()
        partner.refresh_from_db()

        self.assertEqual(order.status, 'completed')
        self.assertEqual(self.client_user.balance, Decimal('0.00'))
        self.assertEqual(self.client_user.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.expert.balance, Decimal('1020.00'))
        self.assertEqual(system_user.balance, Decimal('180.00'))
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.RELEASE).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.PAYOUT).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.COMMISSION).exists())

        earning = PartnerEarning.objects.get(partner=partner, referral=self.client_user, order=order)
        self.assertEqual(earning.amount, Decimal('120.0000'))
        self.assertEqual(partner.total_earnings, Decimal('120.0000'))
        self.assertEqual(partner.balance, Decimal('0.00'))
        self.assertEqual(partner.pending_balance, Decimal('120.00'))


class PartnerPayoutTests(TestCase):
    """Tests for WalletService.payout_to_partner and admin_mark_earning_paid API."""

    def setUp(self):
        self.partner = User.objects.create_user(
            username='partner1', email='partner1@test.com', password='pwd',
            role='partner',
        )
        self.client_user = User.objects.create_user(
            username='client1', email='client1@test.com', password='pwd',
            role='client',
        )
        self.client_user.partner = self.partner
        self.client_user.save(update_fields=['partner'])
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@test.com', password='pwd',
            role='admin',
        )
        self.earning1 = PartnerEarning.objects.create(
            partner=self.partner, referral=self.client_user,
            amount=Decimal('50.00'),
            commission_rate=Decimal('5.00'), source_amount=Decimal('1000.00'),
            earning_type='order',
        )
        self.earning2 = PartnerEarning.objects.create(
            partner=self.partner, referral=self.client_user,
            amount=Decimal('100.00'),
            commission_rate=Decimal('5.00'), source_amount=Decimal('2000.00'),
            earning_type='order',
        )
        from apps.users.signals import _add_pending_balance
        _add_pending_balance(self.partner, self.earning1)
        _add_pending_balance(self.partner, self.earning2)
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.pending_balance, Decimal('150.00'))
        self.assertEqual(self.partner.balance, Decimal('0.00'))

    def test_payout_single_earning(self):
        result = WalletService.payout_to_partner(self.partner, [self.earning1.pk])
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.balance, Decimal('50.00'))
        self.assertEqual(self.partner.pending_balance, Decimal('100.00'))
        self.assertTrue(PartnerEarning.objects.get(pk=self.earning1.pk).is_paid)
        self.assertFalse(PartnerEarning.objects.get(pk=self.earning2.pk).is_paid)
        self.assertEqual(result['amount'], Decimal('50.00'))
        self.assertEqual(result['earnings_count'], 1)
        tx = Transaction.objects.get(pk=result['transaction'].pk)
        self.assertEqual(tx.type, TransactionType.PARTNER_PAYOUT)
        self.assertEqual(tx.user, self.partner)

    def test_payout_all_earnings(self):
        result = WalletService.payout_to_partner(
            self.partner, [self.earning1.pk, self.earning2.pk]
        )
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.balance, Decimal('150.00'))
        self.assertEqual(self.partner.pending_balance, Decimal('0.00'))
        self.assertTrue(PartnerEarning.objects.get(pk=self.earning1.pk).is_paid)
        self.assertTrue(PartnerEarning.objects.get(pk=self.earning2.pk).is_paid)
        self.assertEqual(result['amount'], Decimal('150.00'))
        self.assertEqual(result['earnings_count'], 2)

    def test_payout_already_paid_earning_fails(self):
        self.earning1.is_paid = True
        self.earning1.save(update_fields=['is_paid'])
        with self.assertRaises(ValueError):
            WalletService.payout_to_partner(self.partner, [self.earning1.pk])

    def test_payout_empty_list_fails(self):
        with self.assertRaises(ValueError):
            WalletService.payout_to_partner(self.partner, [])

    def test_payout_creates_transaction(self):
        WalletService.payout_to_partner(self.partner, [self.earning1.pk, self.earning2.pk])
        txs = Transaction.objects.filter(
            user=self.partner, type=TransactionType.PARTNER_PAYOUT
        )
        self.assertEqual(txs.count(), 1)
        self.assertEqual(txs.first().amount, Decimal('150.00'))

    def test_wallet_balance_includes_pending(self):
        bal = WalletService.get_balance(self.partner)
        self.assertEqual(bal['pending_balance'], Decimal('150.00'))
        self.assertEqual(bal['balance'], Decimal('0.00'))

    def test_admin_api_pay_earning(self):
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        resp = self.api.post(
            '/api/users/admin_mark_earning_paid/',
            {'earning_id': self.earning1.pk},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.balance, Decimal('50.00'))
        self.assertEqual(self.partner.pending_balance, Decimal('100.00'))

    def test_admin_api_pay_all_for_partner(self):
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        resp = self.api.post(
            '/api/users/admin_mark_earning_paid/',
            {'earning_ids': [self.earning1.pk, self.earning2.pk]},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.balance, Decimal('150.00'))
        self.assertEqual(self.partner.pending_balance, Decimal('0.00'))
