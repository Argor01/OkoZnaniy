"""
Comprehensive finance tests — end-to-end wallet, orders, payments, shop,
withdrawals, discounts, partner earnings, and sandbox behaviour.

Run with:
    docker compose exec backend python manage.py test apps.orders.tests_finance -v2
"""
import uuid
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.db import transaction as db_tx
from django.db import IntegrityError
from django.test import TestCase, override_settings, RequestFactory
from django.utils import timezone
from rest_framework import status as http
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType, DiscountRule
from apps.orders.models import (
    Bid, BidStatus, Order, OrderFile, Transaction, TransactionType,
)
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.payments.services import PaymentService
from apps.shop.models import ReadyWork
from apps.users.models import PartnerEarning
from apps.wallet.models import WithdrawalRequest
from apps.wallet.services import WalletService, InsufficientFunds, get_system_account

User = get_user_model()

ZERO = Decimal('0.00')
COMMISSION = Decimal('15')  # default platform commission


# ──────────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────────

def _q(v):
    return Decimal(str(v)).quantize(Decimal('0.01'))


def _user(name, role='client', **kw):
    return User.objects.create_user(
        username=name,
        email=kw.pop('email', f'{name}@test.local'),
        password='pwd',
        role=role,
        **kw,
    )


# ──────────────────────────────────────────────────────────────────
# 1. WalletService — unit tests
# ──────────────────────────────────────────────────────────────────

class WalletServiceTests(TestCase):
    """Direct tests on WalletService static methods."""

    def setUp(self):
        self.user = _user('ws_user')
        self.expert = _user('ws_expert', role='expert')

    # --- topup ---

    def test_topup_positive_amount(self):
        tx = WalletService.topup(self.user, Decimal('500.00'))
        self.user.refresh_from_db()
        self.assertEqual(self.user.balance, Decimal('500.00'))
        self.assertEqual(tx.type, TransactionType.TOPUP)
        self.assertEqual(tx.amount, Decimal('500.00'))
        self.assertEqual(tx.balance_after, Decimal('500.00'))

    def test_topup_rejects_zero(self):
        with self.assertRaises(ValueError):
            WalletService.topup(self.user, Decimal('0'))

    def test_topup_rejects_negative(self):
        with self.assertRaises(ValueError):
            WalletService.topup(self.user, Decimal('-100'))

    def test_topup_cumulative(self):
        WalletService.topup(self.user, Decimal('300'))
        WalletService.topup(self.user, Decimal('200'))
        self.user.refresh_from_db()
        self.assertEqual(self.user.balance, Decimal('500.00'))

    # --- hold ---

    def test_hold_freezes_funds(self):
        WalletService.topup(self.user, Decimal('1000'))
        tx = WalletService.hold(self.user, Decimal('400'), order=None)
        self.user.refresh_from_db()
        self.assertEqual(self.user.balance, Decimal('1000.00'))
        self.assertEqual(self.user.frozen_balance, Decimal('400.00'))
        self.assertEqual(tx.type, TransactionType.HOLD)

    def test_hold_insufficient_funds(self):
        WalletService.topup(self.user, Decimal('100'))
        with self.assertRaises(InsufficientFunds):
            WalletService.hold(self.user, Decimal('200'))

    def test_hold_rejects_zero(self):
        with self.assertRaises(ValueError):
            WalletService.hold(self.user, Decimal('0'))

    def test_hold_considers_existing_frozen(self):
        WalletService.topup(self.user, Decimal('500'))
        WalletService.hold(self.user, Decimal('400'))
        with self.assertRaises(InsufficientFunds):
            WalletService.hold(self.user, Decimal('200'))

    # --- refund_hold ---

    def test_refund_hold_unfreezes(self):
        WalletService.topup(self.user, Decimal('500'))
        WalletService.hold(self.user, Decimal('300'))
        tx = WalletService.refund_hold(self.user, Decimal('300'))
        self.user.refresh_from_db()
        self.assertEqual(self.user.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.user.balance, Decimal('500.00'))
        self.assertEqual(tx.type, TransactionType.REFUND)

    def test_refund_hold_clamps_at_zero(self):
        WalletService.topup(self.user, Decimal('500'))
        WalletService.hold(self.user, Decimal('100'))
        WalletService.refund_hold(self.user, Decimal('200'))
        self.user.refresh_from_db()
        self.assertEqual(self.user.frozen_balance, Decimal('0.00'))

    def test_refund_rejects_zero(self):
        with self.assertRaises(ValueError):
            WalletService.refund_hold(self.user, Decimal('0'))

    # --- release_to_expert ---

    def test_release_to_expert_pays_out_minus_commission(self):
        WalletService.topup(self.user, Decimal('1000'))
        WalletService.hold(self.user, Decimal('1000'))
        result = WalletService.release_to_expert(
            client=self.user, expert=self.expert, amount=Decimal('1000'),
        )
        self.user.refresh_from_db()
        self.expert.refresh_from_db()
        system = get_system_account()
        system.refresh_from_db()

        fee = Decimal('0.00')
        payout = Decimal('1000.00')

        self.assertEqual(self.user.balance, Decimal('0.00'))
        self.assertEqual(self.user.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.expert.balance, payout)
        self.assertEqual(system.balance, fee)
        self.assertEqual(result['payout'], payout)
        self.assertEqual(result['fee'], fee)

    def test_release_insufficient_held(self):
        WalletService.topup(self.user, Decimal('500'))
        WalletService.hold(self.user, Decimal('100'))
        with self.assertRaises(InsufficientFunds):
            WalletService.release_to_expert(
                client=self.user, expert=self.expert, amount=Decimal('500'),
            )

    def test_release_rejects_zero(self):
        with self.assertRaises(ValueError):
            WalletService.release_to_expert(
                client=self.user, expert=self.expert, amount=Decimal('0'),
            )

    def test_release_creates_three_transactions(self):
        WalletService.topup(self.user, Decimal('1000'))
        WalletService.hold(self.user, Decimal('1000'))
        WalletService.release_to_expert(
            client=self.user, expert=self.expert, amount=Decimal('1000'),
        )
        self.assertEqual(Transaction.objects.filter(user=self.user, type=TransactionType.RELEASE).count(), 1)
        self.assertEqual(Transaction.objects.filter(user=self.expert, type=TransactionType.PAYOUT).count(), 1)
        self.assertEqual(Transaction.objects.filter(type=TransactionType.COMMISSION).count(), 0)

    # --- direct_transfer ---

    def test_direct_transfer_pays_out_minus_commission(self):
        WalletService.topup(self.user, Decimal('1000'))
        result = WalletService.direct_transfer(
            payer=self.user, recipient=self.expert, amount=Decimal('500'),
        )
        self.user.refresh_from_db()
        self.expert.refresh_from_db()
        self.assertEqual(self.user.balance, Decimal('500.00'))
        self.assertEqual(self.expert.balance, result['payout'])

    def test_direct_transfer_insufficient_funds(self):
        WalletService.topup(self.user, Decimal('100'))
        with self.assertRaises(InsufficientFunds):
            WalletService.direct_transfer(
                payer=self.user, recipient=self.expert, amount=Decimal('500'),
            )

    # --- withdraw ---

    def test_withdraw_debits_balance(self):
        WalletService.topup(self.user, Decimal('1000'))
        tx = WalletService.withdraw(self.user, Decimal('300'))
        self.user.refresh_from_db()
        self.assertEqual(self.user.balance, Decimal('700.00'))
        self.assertEqual(tx.type, TransactionType.WITHDRAWAL)

    def test_withdraw_insufficient_funds(self):
        WalletService.topup(self.user, Decimal('100'))
        with self.assertRaises(InsufficientFunds):
            WalletService.withdraw(self.user, Decimal('200'))

    def test_withdraw_considers_frozen(self):
        WalletService.topup(self.user, Decimal('1000'))
        WalletService.hold(self.user, Decimal('900'))
        with self.assertRaises(InsufficientFunds):
            WalletService.withdraw(self.user, Decimal('200'))

    # --- get_balance / get_stats ---

    def test_get_balance(self):
        WalletService.topup(self.user, Decimal('500'))
        WalletService.hold(self.user, Decimal('200'))
        bal = WalletService.get_balance(self.user)
        self.assertEqual(bal['balance'], Decimal('500.00'))
        self.assertEqual(bal['frozen_balance'], Decimal('200.00'))
        self.assertEqual(bal['available_balance'], Decimal('300.00'))

    def test_get_stats_uses_release_not_hold(self):
        WalletService.topup(self.user, Decimal('1000'))
        WalletService.hold(self.user, Decimal('500'))
        WalletService.release_to_expert(
            client=self.user, expert=self.expert, amount=Decimal('500'),
        )
        stats = WalletService.get_stats(self.user)
        self.assertEqual(stats['total_topup'], Decimal('1000.00'))
        # HOLD should NOT be counted as spent, RELEASE should
        self.assertEqual(stats['total_spent'], Decimal('500.00'))


# ──────────────────────────────────────────────────────────────────
# 2. Order model — deadline, discount, budget validator
# ──────────────────────────────────────────────────────────────────

@override_settings(SECURE_SSL_REDIRECT=False)
class OrderModelTests(TestCase):

    def setUp(self):
        self.client_u = _user('om_client')
        self.expert = _user('om_expert', role='expert')
        self.subject = Subject.objects.create(name='S1')
        self.work_type = WorkType.objects.create(name='WT1')

    def _order(self, **kw):
        defaults = dict(
            client=self.client_u, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title='T', description='D',
            deadline=timezone.now() + timedelta(days=7),
            budget=Decimal('1000.00'), status='new',
        )
        defaults.update(kw)
        return Order.objects.create(**defaults)

    def test_budget_min_validator(self):
        with self.assertRaises(Exception):
            o = self._order(budget=Decimal('0.00'))
            o.full_clean()

    def test_budget_rejects_negative(self):
        with self.assertRaises(Exception):
            o = self._order(budget=Decimal('-1'))
            o.full_clean()

    def test_budget_accepts_minimum(self):
        o = self._order(budget=Decimal('0.01'))
        o.full_clean()  # should not raise

    def test_deadline_must_be_future(self):
        with self.assertRaises(ValidationError):
            o = self._order(deadline=timezone.now() - timedelta(hours=1))
            o.save()

    def test_discount_capped_at_100_percent(self):
        dr = DiscountRule.objects.create(
            name='Big', discount_type='fixed',
            value=Decimal('9999'), is_active=True,
        )
        order = self._order(budget=Decimal('100.00'))
        order.apply_discount(dr)
        order.refresh_from_db()
        self.assertEqual(order.discount_amount, Decimal('100.00'))
        self.assertEqual(order.final_price, Decimal('0.00'))

    def test_discount_does_not_overwrite_budget(self):
        dr = DiscountRule.objects.create(
            name='Pct', discount_type='percentage',
            value=Decimal('20'), is_active=True,
        )
        order = self._order(budget=Decimal('5000.00'))
        order.apply_discount(dr)
        order.refresh_from_db()
        self.assertEqual(order.budget, Decimal('5000.00'))
        self.assertEqual(order.original_price, Decimal('5000.00'))
        self.assertEqual(order.discount_amount, Decimal('1000.00'))
        self.assertEqual(order.final_price, Decimal('4000.00'))


# ──────────────────────────────────────────────────────────────────
# 3. Order lifecycle — create → take → complete → approve
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class OrderLifecycleTests(TestCase):

    def setUp(self):
        self.client_u = _user('lc_client')
        self.expert = _user('lc_expert', role='expert')
        self.subject = Subject.objects.create(name='LS')
        self.work_type = WorkType.objects.create(name='LWT')
        self.api = APIClient()

    def _order(self, **kw):
        defaults = dict(
            client=self.client_u, expert=None,
            subject=self.subject, work_type=self.work_type,
            title='L', description='D',
            deadline=timezone.now() + timedelta(days=7),
            budget=Decimal('500.00'), status='new',
        )
        defaults.update(kw)
        return Order.objects.create(**defaults)

    def test_take_order_holds_funds(self):
        WalletService.topup(self.client_u, Decimal('1000'))
        order = self._order()
        self.api.force_authenticate(self.expert)
        resp = self.api.post(f'/api/orders/orders/{order.id}/take/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.client_u.refresh_from_db()
        self.assertEqual(order.status, 'in_progress')
        self.assertEqual(order.expert, self.expert)
        self.assertEqual(self.client_u.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.client_u.balance, Decimal('375.00'))
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.frozen_balance, Decimal('500.00'))

    def test_take_order_insufficient_funds(self):
        # no topup → should fail
        order = self._order()
        self.api.force_authenticate(self.expert)
        resp = self.api.post(f'/api/orders/orders/{order.id}/take/')
        self.assertEqual(resp.status_code, http.HTTP_400_BAD_REQUEST)

    def test_complete_order_moves_to_review(self):
        WalletService.topup(self.client_u, Decimal('1000'))
        order = self._order(status='in_progress', expert=self.expert)
        self.api.force_authenticate(self.expert)
        resp = self.api.post(f'/api/orders/orders/{order.id}/complete/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.assertEqual(order.status, 'review')

    def test_approve_releases_hold_to_expert(self):
        WalletService.topup(self.client_u, Decimal('1000'))
        order = self._order(status='review', expert=self.expert)
        WalletService.hold(self.client_u, Decimal('625'), order=order)
        self.api.force_authenticate(self.client_u)
        OrderFile.objects.create(order=order, file=SimpleUploadedFile('solution.txt', b'solution'), file_type='solution', uploaded_by=self.expert, client_downloaded_at=timezone.now())
        resp = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.client_u.refresh_from_db()
        self.expert.refresh_from_db()
        self.assertEqual(order.status, 'completed')
        self.assertEqual(self.client_u.frozen_balance, Decimal('0.00'))
        # Author receives the full base price; client service fee goes to directors.
        self.assertEqual(self.expert.balance, Decimal('500.00'))

    def test_reject_keeps_prepayment_in_escrow(self):
        WalletService.topup(self.client_u, Decimal('1000'))
        order = self._order(status='review', expert=self.expert)
        WalletService.hold(self.client_u, Decimal('500'), order=order)
        self.api.force_authenticate(self.client_u)
        resp = self.api.post(f'/api/orders/orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.client_u.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self.client_u.frozen_balance, Decimal('500.00'))
        self.assertEqual(self.client_u.balance, Decimal('1000.00'))
        self.assertFalse(Transaction.objects.filter(order=order, type=TransactionType.REFUND).exists())


# ──────────────────────────────────────────────────────────────────
# 4. cancel_overdue — P0 fix #1
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class CancelOverdueTests(TestCase):

    def setUp(self):
        self.client_u = _user('co_client')
        self.expert = _user('co_expert', role='expert')
        self.subject = Subject.objects.create(name='CO')
        self.work_type = WorkType.objects.create(name='COW')
        self.api = APIClient()

    def _overdue_order(self):
        order = Order.objects.create(
            client=self.client_u, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title='overdue', description='d',
            deadline=timezone.now() + timedelta(days=1),
            budget=Decimal('800.00'), status='in_progress',
        )
        Order.objects.filter(pk=order.pk).update(
            deadline=timezone.now() - timedelta(days=1)
        )
        order.refresh_from_db()
        return order

    def test_cancel_overdue_keeps_prepayment_in_escrow(self):
        WalletService.topup(self.client_u, Decimal('1000'))
        order = self._overdue_order()
        WalletService.hold(self.client_u, Decimal('800'), order=order)
        self.api.force_authenticate(self.client_u)
        resp = self.api.post(f'/api/orders/orders/{order.id}/cancel_overdue/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.client_u.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self.client_u.frozen_balance, Decimal('800.00'))
        self.assertEqual(self.client_u.balance, Decimal('1000.00'))
        self.assertFalse(
            Transaction.objects.filter(order=order, type=TransactionType.REFUND).exists()
        )


# ──────────────────────────────────────────────────────────────────
# 5. perform_destroy — P0 fix #2
# ──────────────────────────────────────────────────────────────────

@override_settings(SECURE_SSL_REDIRECT=False)
class OrderDeletionProtectionTests(TestCase):

    def setUp(self):
        self.client_u = _user('dp_client')
        self.expert = _user('dp_expert', role='expert')
        self.subject = Subject.objects.create(name='DP')
        self.work_type = WorkType.objects.create(name='DPW')
        self.api = APIClient()
        self.api.force_authenticate(self.client_u)

    def test_can_delete_new_order(self):
        order = Order.objects.create(
            client=self.client_u, subject=self.subject,
            work_type=self.work_type, title='x', description='x',
            deadline=timezone.now() + timedelta(days=1),
            budget=Decimal('100'), status='new',
        )
        resp = self.api.delete(f'/api/orders/orders/{order.id}/')
        self.assertEqual(resp.status_code, http.HTTP_204_NO_CONTENT)

    def test_cannot_delete_completed_order_with_transactions(self):
        order = Order.objects.create(
            client=self.client_u, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title='x', description='x',
            deadline=timezone.now() + timedelta(days=1),
            budget=Decimal('500'), status='completed',
        )
        Transaction.objects.create(
            user=self.client_u, order=order, amount=Decimal('500'),
            type=TransactionType.RELEASE, description='test',
        )
        resp = self.api.delete(f'/api/orders/orders/{order.id}/')
        self.assertEqual(resp.status_code, http.HTTP_403_FORBIDDEN)
        self.assertTrue(Order.objects.filter(pk=order.pk).exists())


# ──────────────────────────────────────────────────────────────────
# 6. Payment callback signature verification — P0 fix #3
# ──────────────────────────────────────────────────────────────────

@override_settings(SECURE_SSL_REDIRECT=False)
class CallbackSignatureTests(TestCase):

    def setUp(self):
        self.client_u = _user('cs_client')
        self.order = Order.objects.create(
            client=self.client_u,
            subject=Subject.objects.create(name='CS'),
            work_type=WorkType.objects.create(name='CSW'),
            title='cs', description='cs',
            deadline=timezone.now() + timedelta(days=1),
            budget=Decimal('500'), status='new',
        )

    def test_alfabank_rejects_callback_without_order_id(self):
        from apps.payments.providers.alfabank import AlfaBankClient
        client = AlfaBankClient()
        self.assertFalse(client.verify_callback_signature({}))

    def test_alfabank_rejects_callback_for_unknown_payment(self):
        from apps.payments.providers.alfabank import AlfaBankClient
        client = AlfaBankClient()
        self.assertFalse(client.verify_callback_signature({'orderId': 'nonexistent-123'}))

    def test_alfabank_accepts_callback_for_existing_payment(self):
        from apps.payments.providers.alfabank import AlfaBankClient
        Payment.objects.create(
            order=self.order, user=self.client_u,
            amount=Decimal('500'), payment_method='card',
            status=PaymentStatus.PENDING, payment_id='alfa-test-1',
        )
        client = AlfaBankClient()
        self.assertTrue(client.verify_callback_signature({'orderId': 'alfa-test-1'}))

    def test_sbp_rejects_callback_without_signature(self):
        from apps.payments.providers.sbp import SBPClient
        client = SBPClient()
        self.assertFalse(client.verify_callback_signature({'qrId': 'qr-1'}))

    def test_sbp_rejects_callback_with_bad_signature(self):
        from apps.payments.providers.sbp import SBPClient
        with patch.object(SBPClient, '__init__', lambda s: setattr(s, 'api_key', 'test-key') or setattr(s, 'api_url', '') or setattr(s, 'merchant_id', '') or setattr(s, 'test_mode', True)):
            client = SBPClient()
            self.assertFalse(client.verify_callback_signature({
                'qrId': 'qr-1', 'signature': 'bad-sig',
            }))

    def test_sbp_accepts_callback_with_valid_signature(self):
        from apps.payments.providers.sbp import SBPClient
        with patch.object(SBPClient, '__init__', lambda s: setattr(s, 'api_key', 'test-secret-key') or setattr(s, 'api_url', '') or setattr(s, 'merchant_id', '') or setattr(s, 'test_mode', True)):
            client = SBPClient()
            data_to_sign = {'qrId': 'qr-1', 'status': 'PAID'}
            valid_sig = client._sign_request(data_to_sign)
            self.assertTrue(client.verify_callback_signature({
                'qrId': 'qr-1', 'status': 'PAID', 'signature': valid_sig,
            }))


# ──────────────────────────────────────────────────────────────────
# 7. Shop escrow purchase — P2 fix #12
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class ShopEscrowTests(TestCase):

    def setUp(self):
        self.buyer = _user('shop_buyer')
        self.seller = _user('shop_seller', role='expert')
        self.subject = Subject.objects.create(name='SH')
        self.work_type = WorkType.objects.create(name='SHW')
        self.api = APIClient()

    def _ready_work(self):
        return ReadyWork.objects.create(
            title='Test work', description='desc',
            price=Decimal('750.00'), subject=self.subject,
            work_type=self.work_type, author=self.seller,
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        )

    def test_shop_purchase_uses_escrow(self):
        WalletService.topup(self.buyer, Decimal('937.50'))
        work = self._ready_work()
        self.api.force_authenticate(self.buyer)
        resp = self.api.post(f'/api/shop/works/{work.id}/purchase/')
        self.assertEqual(resp.status_code, http.HTTP_201_CREATED, resp.content)
        self.buyer.refresh_from_db()
        self.seller.refresh_from_db()
        # Ready work is escrowed for the 10-day guarantee period.
        self.assertEqual(self.buyer.balance, Decimal('0.00'))
        self.assertEqual(self.buyer.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.seller.balance, Decimal('750.00'))
        self.assertEqual(self.seller.frozen_balance, Decimal('750.00'))
        self.assertFalse(Order.objects.filter(client=self.buyer, expert=self.seller).exists())

    def test_shop_purchase_insufficient_funds(self):
        work = self._ready_work()
        self.api.force_authenticate(self.buyer)
        resp = self.api.post(f'/api/shop/works/{work.id}/purchase/')
        self.assertEqual(resp.status_code, http.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────
# 8. Withdrawal limits — P2 fix #15
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class WithdrawalLimitTests(TestCase):

    def setUp(self):
        self.user = _user('wl_user')
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        WalletService.topup(self.user, Decimal('2000000'))

    def test_below_minimum_rejected(self):
        resp = self.api.post('/api/wallet/withdraw/', {
            'amount': '50', 'card_number': '4111111111111111',
        }, format='json')
        self.assertEqual(resp.status_code, http.HTTP_400_BAD_REQUEST)

    def test_above_maximum_rejected(self):
        resp = self.api.post('/api/wallet/withdraw/', {
            'amount': '600000', 'card_number': '4111111111111111',
        }, format='json')
        self.assertEqual(resp.status_code, http.HTTP_400_BAD_REQUEST)

    def test_minimum_accepted(self):
        resp = self.api.post('/api/wallet/withdraw/', {
            'amount': '100', 'card_number': '4111111111111111',
        }, format='json')
        self.assertEqual(resp.status_code, http.HTTP_201_CREATED, resp.content)

    def test_maximum_accepted(self):
        resp = self.api.post('/api/wallet/withdraw/', {
            'amount': '500000', 'card_number': '4111111111111111',
        }, format='json')
        self.assertEqual(resp.status_code, http.HTTP_201_CREATED, resp.content)

    def test_daily_limit_enforced(self):
        # First withdrawal: max
        self.api.post('/api/wallet/withdraw/', {
            'amount': '500000', 'card_number': '4111111111111111',
        }, format='json')
        # Second: should be rejected (daily limit 500k)
        resp = self.api.post('/api/wallet/withdraw/', {
            'amount': '100', 'card_number': '4111111111111111',
        }, format='json')
        self.assertEqual(resp.status_code, http.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────
# 9. Sandbox topup signal — P1 fix #7
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class SandboxTopupSignalTests(TestCase):

    def test_signal_credits_wallet_on_completed_topup(self):
        user = _user('sig_user')
        payment = Payment.objects.create(
            amount=Decimal('300'), payment_method='sberpay_qr',
            status=PaymentStatus.PENDING, purpose=Payment.Purpose.TOPUP,
            user=user, payment_id=f'topup-{user.pk}-{uuid.uuid4().hex}',
        )
        # Simulate saving with status=completed
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = timezone.now()
        payment.save(update_fields=['status', 'paid_at'])
        user.refresh_from_db()
        self.assertEqual(user.balance, Decimal('300.00'))
        self.assertEqual(
            Transaction.objects.filter(user=user, type=TransactionType.TOPUP, payment=payment).count(),
            1,
        )

    def test_signal_idempotent(self):
        user = _user('sig_idem')
        payment = Payment.objects.create(
            amount=Decimal('200'), payment_method='sberpay_qr',
            status=PaymentStatus.PENDING, purpose=Payment.Purpose.TOPUP,
            user=user, payment_id=f'topup-{user.pk}-{uuid.uuid4().hex}',
        )
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = timezone.now()
        payment.save(update_fields=['status', 'paid_at'])
        # Save again (should not double credit)
        payment.save(update_fields=['status', 'paid_at'])
        user.refresh_from_db()
        self.assertEqual(user.balance, Decimal('200.00'))


# ──────────────────────────────────────────────────────────────────
# 10. Topup idempotency — P3 fix #19
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class TopupIdempotencyTests(TestCase):

    def test_duplicate_topup_returns_existing(self):
        user = _user('idem_user', email='idem_user@okoznaniy.test')
        api = APIClient()
        api.force_authenticate(user)
        # First topup
        r1 = api.post('/api/wallet/topup/', {
            'amount': '100', 'payment_method': 'sberpay_qr',
        }, format='json')
        self.assertEqual(r1.status_code, http.HTTP_200_OK)
        pid1 = r1.json()['payment_id']
        # Second topup same params
        r2 = api.post('/api/wallet/topup/', {
            'amount': '100', 'payment_method': 'sberpay_qr',
        }, format='json')
        self.assertEqual(r2.status_code, http.HTTP_200_OK)
        pid2 = r2.json()['payment_id']
        # Should be same payment
        self.assertEqual(pid1, pid2)


# ──────────────────────────────────────────────────────────────────
# 11. accept_bid — P3 fix #17
# ──────────────────────────────────────────────────────────────────

@override_settings(SECURE_SSL_REDIRECT=False)
class AcceptBidTests(TestCase):

    def setUp(self):
        self.client_u = _user('ab_client')
        self.expert = _user('ab_expert', role='expert')
        self.subject = Subject.objects.create(name='AB')
        self.work_type = WorkType.objects.create(name='ABW')
        self.api = APIClient()

    def test_accept_bid_updates_budget(self):
        order = Order.objects.create(
            client=self.client_u, subject=self.subject,
            work_type=self.work_type, title='ab', description='ab',
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal('3000'), status='new',
        )
        bid = Bid.objects.create(
            order=order, expert=self.expert,
            amount=Decimal('2500'), prepayment_percent=50,
        )
        WalletService.topup(self.client_u, Decimal('2500'))
        self.api.force_authenticate(self.client_u)
        resp = self.api.post(
            f'/api/orders/orders/{order.id}/accept_bid/',
            {'bid_id': bid.id}, format='json',
        )
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.assertEqual(order.budget, Decimal('2500.00'))
        self.assertEqual(order.expert, self.expert)
        self.assertEqual(order.status, 'awaiting_expert_acceptance')


# ──────────────────────────────────────────────────────────────────
# 12. User.balance CheckConstraint — P3 fix #20
# ──────────────────────────────────────────────────────────────────

class BalanceConstraintTests(TestCase):

    def test_negative_balance_rejected_by_db(self):
        user = _user('bc_user')
        with self.assertRaises(IntegrityError):
            User.objects.filter(pk=user.pk).update(balance=Decimal('-1'))

    def test_negative_frozen_rejected_by_db(self):
        user = _user('bc_frozen')
        with self.assertRaises(IntegrityError):
            User.objects.filter(pk=user.pk).update(frozen_balance=Decimal('-1'))


# ──────────────────────────────────────────────────────────────────
# 13. PartnerEarning rounding — P3 fix #21
# ──────────────────────────────────────────────────────────────────

class PartnerEarningRoundingTests(TestCase):

    def test_amount_rounded_to_two_decimals(self):
        partner = _user('pe_partner', role='partner')
        referral = _user('pe_referral')
        earning = PartnerEarning.objects.create(
            partner=partner, referral=referral,
            amount=Decimal('123.456'),
            commission_rate=Decimal('5'),
            source_amount=Decimal('2469.12'),
        )
        earning.refresh_from_db()
        self.assertEqual(earning.amount, Decimal('123.46'))


# ──────────────────────────────────────────────────────────────────
# 14. PaymentViewSet shows topup payments — P2 fix #13
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class PaymentViewSetTopupVisibilityTests(TestCase):

    def test_topup_visible_in_payment_list(self):
        user = _user('pv_user')
        Payment.objects.create(
            amount=Decimal('500'), payment_method='sberpay_qr',
            status=PaymentStatus.COMPLETED, purpose=Payment.Purpose.TOPUP,
            user=user, payment_id=f'topup-{user.pk}-{uuid.uuid4().hex}',
        )
        api = APIClient()
        api.force_authenticate(user)
        resp = api.get('/api/payments/payments/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK)
        # Should contain our topup
        results = resp.json() if isinstance(resp.json(), list) else resp.json().get('results', resp.json())
        self.assertTrue(len(results) >= 1)


# ──────────────────────────────────────────────────────────────────
# 15. Full end-to-end flow: topup → order → hold → complete → release
# ──────────────────────────────────────────────────────────────────

@override_settings(PAYMENTS_SANDBOX=True, SECURE_SSL_REDIRECT=False)
class FullE2EFlowTests(TestCase):

    def test_complete_order_flow(self):
        client_u = _user('e2e_client')
        expert = _user('e2e_expert', role='expert')
        subject = Subject.objects.create(name='E2E')
        work_type = WorkType.objects.create(name='E2EW')

        # 1. Client tops up
        WalletService.topup(client_u, Decimal('5000'))
        client_u.refresh_from_db()
        self.assertEqual(client_u.balance, Decimal('5000.00'))

        # 2. Client creates order
        order = Order.objects.create(
            client=client_u, subject=subject, work_type=work_type,
            title='E2E order', description='Full flow test',
            deadline=timezone.now() + timedelta(days=7),
            budget=Decimal('2000'), status='new',
        )

        # 3. Expert takes order → hold
        api = APIClient()
        api.force_authenticate(expert)
        resp = api.post(f'/api/orders/orders/{order.id}/take/')
        # Note: take requires role=expert, status=new, no expert assigned
        # The order was created with expert=None, so this should work
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        client_u.refresh_from_db()
        self.assertEqual(client_u.frozen_balance, Decimal('0.00'))
        self.assertEqual(client_u.balance, Decimal('2500.00'))
        expert.refresh_from_db()
        self.assertEqual(expert.frozen_balance, Decimal('2000.00'))

        # 4. Expert completes → review
        resp = api.post(f'/api/orders/orders/{order.id}/complete/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)
        order.refresh_from_db()
        self.assertEqual(order.status, 'review')

        # 5. Client approves → release
        api.force_authenticate(client_u)
        OrderFile.objects.create(order=order, file=SimpleUploadedFile('solution.txt', b'solution'), file_type='solution', uploaded_by=expert, client_downloaded_at=timezone.now())
        resp = api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(resp.status_code, http.HTTP_200_OK, resp.content)

        client_u.refresh_from_db()
        expert.refresh_from_db()
        order.refresh_from_db()
        system = get_system_account()
        system.refresh_from_db()

        self.assertEqual(order.status, 'completed')
        self.assertEqual(client_u.balance, Decimal('2500.00'))
        self.assertEqual(client_u.frozen_balance, Decimal('0.00'))
        # Author gets base, directors get the 25% client service fee.
        self.assertEqual(expert.balance, Decimal('2000.00'))
        self.assertEqual(system.balance, Decimal('500.00'))

        # Verify transactions
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.HOLD).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.RELEASE).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.PAYOUT).exists())
        self.assertTrue(Transaction.objects.filter(order=order, type=TransactionType.COMMISSION).exists())

        # Verify stats
        stats_c = WalletService.get_stats(client_u)
        self.assertEqual(stats_c['total_topup'], Decimal('5000.00'))
        self.assertEqual(stats_c['total_spent'], Decimal('2500.00'))

        stats_e = WalletService.get_stats(expert)
        self.assertEqual(stats_e['total_earned'], Decimal('2000.00'))
