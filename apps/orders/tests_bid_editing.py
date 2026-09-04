"""Регрессия: комиссия внутри ставки и редактирование собственной ставки.

Две проблемы, которые фиксируют тесты:

1. Клиент видел «чистую» ставку эксперта (1000 ₽), а списывалось 1250 ₽ —
   сервисный сбор всплывал только при оплате. Теперь API отдаёт
   ``client_amount`` с уже включённым сбором, и показывать клиенту нужно его.
2. Эксперт не мог исправить свою ставку: повторный отклик запрещён, а
   редактирования не существовало. Теперь ставку можно менять, пока заказ
   свободен, и только автору самой ставки.
"""

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
class BidCommissionAndEditingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Ставки — предмет")
        cls.work_type = WorkType.objects.create(name="Ставки — тип работы")
        cls.client_user = User.objects.create_user(
            username="bid_client", email="bid_client@example.com",
            password="pwd", role="client",
        )
        cls.expert = User.objects.create_user(
            username="bid_expert", email="bid_expert@example.com",
            password="pwd", role="expert",
        )
        cls.other_expert = User.objects.create_user(
            username="bid_other_expert", email="bid_other@example.com",
            password="pwd", role="expert",
        )

    def setUp(self):
        self.order = Order.objects.create(
            client=self.client_user,
            subject=self.subject,
            work_type=self.work_type,
            title="Заказ для ставок",
            description="Описание заказа",
            deadline=timezone.now() + timedelta(days=5),
            budget=Decimal("1000.00"),
            status="new",
        )
        self.bid = Bid.objects.create(
            order=self.order,
            expert=self.expert,
            amount=Decimal("1000.00"),
            prepayment_percent=50,
            status=BidStatus.ACTIVE,
        )

    def _url(self):
        return f"/api/orders/orders/{self.order.id}/bids/{self.bid.id}/"

    def _api(self, user):
        api = APIClient()
        api.force_authenticate(user=user)
        return api

    # --- комиссия ---

    def test_client_amount_includes_service_fee(self):
        """Ставка 1000 ₽ должна показываться клиенту как 1250 ₽."""
        response = self._api(self.client_user).get(
            f"/api/orders/orders/{self.order.id}/bids/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        payload = response.json()
        rows = payload["results"] if isinstance(payload, dict) else payload
        row = next(r for r in rows if r["id"] == self.bid.id)
        self.assertEqual(Decimal(row["amount"]), Decimal("1000.00"))
        self.assertEqual(Decimal(row["client_amount"]), Decimal("1250.00"))

    def test_client_amount_recalculated_after_edit(self):
        self._api(self.expert).patch(self._url(), {"amount": "2000"}, format="json")
        response = self._api(self.client_user).get(self._url())
        self.assertEqual(Decimal(response.json()["client_amount"]), Decimal("2500.00"))

    # --- редактирование ---

    def test_expert_can_edit_own_active_bid(self):
        response = self._api(self.expert).patch(
            self._url(), {"amount": "1500", "prepayment_percent": 25}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.bid.refresh_from_db()
        self.assertEqual(self.bid.amount, Decimal("1500.00"))
        self.assertEqual(self.bid.prepayment_percent, 25)

    def test_other_expert_cannot_touch_foreign_bid(self):
        response = self._api(self.other_expert).patch(
            self._url(), {"amount": "1"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.bid.refresh_from_db()
        self.assertEqual(self.bid.amount, Decimal("1000.00"))

    def test_client_cannot_edit_expert_bid(self):
        response = self._api(self.client_user).patch(
            self._url(), {"amount": "1"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.bid.refresh_from_db()
        self.assertEqual(self.bid.amount, Decimal("1000.00"))

    def test_cannot_edit_bid_once_order_is_in_progress(self):
        self.order.status = "in_progress"
        self.order.save(update_fields=["status"])
        response = self._api(self.expert).patch(
            self._url(), {"amount": "1"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_edit_bid_once_expert_assigned(self):
        self.order.expert = self.other_expert
        self.order.save(update_fields=["expert"])
        response = self._api(self.expert).patch(
            self._url(), {"amount": "1"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
