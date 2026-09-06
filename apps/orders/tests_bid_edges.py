"""Пограничные случаи ставок: суммы, округление и запреты на редактирование."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.orders.models import Bid, BidStatus, Order

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class BidEdgeCaseTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name='Ставки-границы — предмет')
        cls.work_type = WorkType.objects.create(name='Ставки-границы — тип')

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='bidedge_client', email='bidedge_client@example.com',
            password='pwd', role='client',
        )
        self.expert = User.objects.create_user(
            username='bidedge_expert', email='bidedge_expert@example.com',
            password='pwd', role='expert',
        )
        self.order = Order.objects.create(
            client=self.client_user, subject=self.subject, work_type=self.work_type,
            title='Заказ для ставок', description='Описание',
            deadline=timezone.now() + timedelta(days=5),
            budget=Decimal('1000.00'), status='new',
        )
        self.api = APIClient()

    def _bid(self, amount='1000.00'):
        return Bid.objects.create(
            order=self.order, expert=self.expert, amount=Decimal(amount),
            prepayment_percent=50, status=BidStatus.ACTIVE,
        )

    def _url(self, bid):
        return f'/api/orders/orders/{self.order.id}/bids/{bid.id}/'

    # --- суммы и округление ---

    def test_negotiable_zero_bid_shows_zero_to_client(self):
        """Договорная ставка (0) не должна превращаться в мусорную сумму."""
        bid = self._bid('0.00')
        self.api.force_authenticate(self.client_user)
        response = self.api.get(self._url(bid))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(Decimal(response.json()['client_amount']), Decimal('0.00'))

    def test_client_amount_rounds_half_up(self):
        """999.99 + 25% = 1249.9875 — клиенту показываем 1249.99."""
        bid = self._bid('999.99')
        self.api.force_authenticate(self.client_user)
        response = self.api.get(self._url(bid))
        self.assertEqual(Decimal(response.json()['client_amount']), Decimal('1249.99'))

    def test_small_amount_keeps_commission_visible(self):
        bid = self._bid('1.00')
        self.api.force_authenticate(self.client_user)
        response = self.api.get(self._url(bid))
        self.assertEqual(Decimal(response.json()['client_amount']), Decimal('1.25'))

    def test_absurd_amount_is_rejected(self):
        bid = self._bid()
        self.api.force_authenticate(self.expert)
        response = self.api.patch(
            self._url(bid), {'amount': '99999999999'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        bid.refresh_from_db()
        self.assertEqual(bid.amount, Decimal('1000.00'))

    def test_negative_amount_is_rejected(self):
        bid = self._bid()
        self.api.force_authenticate(self.expert)
        response = self.api.patch(self._url(bid), {'amount': '-100'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        bid.refresh_from_db()
        self.assertEqual(bid.amount, Decimal('1000.00'))

    # --- запреты на редактирование ---

    def test_cannot_edit_cancelled_bid(self):
        bid = self._bid()
        bid.status = BidStatus.CANCELLED
        bid.save(update_fields=['status'])
        self.api.force_authenticate(self.expert)
        response = self.api.patch(self._url(bid), {'amount': '1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_edit_accepted_bid(self):
        bid = self._bid()
        bid.status = BidStatus.ACCEPTED
        bid.save(update_fields=['status'])
        self.api.force_authenticate(self.expert)
        response = self.api.patch(self._url(bid), {'amount': '1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editing_bid_keeps_owner_and_status(self):
        """Правка суммы не должна менять владельца ставки или её статус."""
        bid = self._bid()
        self.api.force_authenticate(self.expert)
        response = self.api.patch(self._url(bid), {'amount': '1500'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        bid.refresh_from_db()
        self.assertEqual(bid.expert_id, self.expert.id)
        self.assertEqual(bid.status, BidStatus.ACTIVE)
        self.assertEqual(bid.order_id, self.order.id)

    def test_anonymous_cannot_read_or_edit_bid(self):
        bid = self._bid()
        anon = APIClient()
        for response in (
            anon.get(self._url(bid)),
            anon.patch(self._url(bid), {'amount': '1'}, format='json'),
        ):
            self.assertIn(
                response.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
            )
