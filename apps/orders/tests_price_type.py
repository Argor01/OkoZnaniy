"""Price-type feature tests.

Coverage:
 * fixed-price orders require the client to have enough balance at creation;
 * negotiable orders can be published regardless of balance;
 * fixed-price orders require a non-empty budget;
 * accept_bid (assigning an expert) checks the client balance when the bid
   has a concrete price, and refuses negotiable bids (chat-only).
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.orders.models import Bid, Order
from apps.wallet.services import WalletService

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class OrderPriceTypeTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Цены — Алгебра")
        cls.work_type = WorkType.objects.create(name="Цены — Контрольная")
        cls.client_user = User.objects.create_user(
            username="price_client",
            email="price_client@example.com",
            password="testpass123",
            role="client",
        )
        cls.expert_user = User.objects.create_user(
            username="price_expert",
            email="price_expert@example.com",
            password="testpass123",
            role="expert",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.client_user)

    def _deadline(self):
        return (timezone.now() + timedelta(days=7)).isoformat()

    def _payload(self, **overrides):
        payload = {
            "title": "Заказ с ценой",
            "description": "Описание",
            "subject_id": self.subject.id,
            "work_type_id": self.work_type.id,
            "deadline": self._deadline(),
            "budget": "5000",
            "price_type": "fixed",
        }
        payload.update(overrides)
        return payload

    def _create_order(self, **overrides):
        defaults = {
            "client": self.client_user,
            "subject": self.subject,
            "work_type": self.work_type,
            "title": "Заказ с ценой",
            "description": "Описание",
            "budget": Decimal("5000"),
            "deadline": timezone.now() + timedelta(days=5),
            "status": "new",
        }
        defaults.update(overrides)
        return Order.objects.create(**defaults)

    # ── creation ──────────────────────────────────────────────────

    def test_fixed_price_order_blocked_without_funds(self):
        response = self.api_client.post(
            "/api/orders/orders/", self._payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Недостаточно средств", response.json()["detail"])
        self.assertFalse(Order.objects.filter(title="Заказ с ценой").exists())

    def test_fixed_price_order_created_with_enough_funds(self):
        WalletService.topup(self.client_user, Decimal("5000"))
        response = self.api_client.post(
            "/api/orders/orders/", self._payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order = Order.objects.get(pk=response.json()["id"])
        self.assertEqual(order.price_type, "fixed")

    def test_fixed_price_order_requires_budget(self):
        WalletService.topup(self.client_user, Decimal("5000"))
        payload = self._payload(budget=None)
        response = self.api_client.post("/api/orders/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("budget", response.json())

    def test_negotiable_order_created_without_funds(self):
        payload = self._payload(price_type="negotiable", budget=None)
        response = self.api_client.post("/api/orders/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order = Order.objects.get(pk=response.json()["id"])
        self.assertEqual(order.price_type, "negotiable")
        self.assertIsNone(order.budget)

    # ── accept_bid ────────────────────────────────────────────────

    def test_accept_bid_blocked_when_client_has_no_funds(self):
        order = self._create_order()
        bid = Bid.objects.create(order=order, expert=self.expert_user, amount=Decimal("3000"))
        response = self.api_client.post(
            f"/api/orders/orders/{order.id}/accept_bid/",
            {"bid_id": bid.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Недостаточно средств", response.json()["detail"])
        order.refresh_from_db()
        self.assertIsNone(order.expert)
        self.assertEqual(order.status, "new")

    def test_accept_bid_blocked_when_balance_below_bid_amount(self):
        WalletService.topup(self.client_user, Decimal("2000"))
        order = self._create_order()
        bid = Bid.objects.create(order=order, expert=self.expert_user, amount=Decimal("3000"))
        response = self.api_client.post(
            f"/api/orders/orders/{order.id}/accept_bid/",
            {"bid_id": bid.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Недостаточно средств", response.json()["detail"])

    def test_accept_bid_allowed_with_enough_funds(self):
        WalletService.topup(self.client_user, Decimal("3000"))
        order = self._create_order()
        bid = Bid.objects.create(order=order, expert=self.expert_user, amount=Decimal("3000"))
        response = self.api_client.post(
            f"/api/orders/orders/{order.id}/accept_bid/",
            {"bid_id": bid.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        order.refresh_from_db()
        self.assertEqual(order.expert_id, self.expert_user.id)
        self.assertEqual(order.status, "awaiting_expert_acceptance")

    def test_accept_bid_refuses_negotiable_bid(self):
        WalletService.topup(self.client_user, Decimal("3000"))
        order = self._create_order()
        bid = Bid.objects.create(order=order, expert=self.expert_user, amount=Decimal("0"))
        response = self.api_client.post(
            f"/api/orders/orders/{order.id}/accept_bid/",
            {"bid_id": bid.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("договорная", response.json()["detail"])
        order.refresh_from_db()
        self.assertIsNone(order.expert)
