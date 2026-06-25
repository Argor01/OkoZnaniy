"""Regression tests for orders app.

Covers the production bugs where:
 * ``POST /api/orders/orders/`` returned 500 because the underlying
   ``paid_amount`` column in the database was NOT NULL but absent from the
   Django model (no default was provided), so every ORM-driven INSERT failed
   with ``IntegrityError``.
 * ``POST /api/chat/chats/<id>/accept_offer/`` returned 400 for the same
   reason — chat-side offer acceptance creates an Order via
   ``Order.objects.create`` and the IntegrityError is caught and re-raised as a
   400 Bad Request. The chat-level regression test lives in
   ``apps/chat/tests.py``; this module only verifies the order endpoint.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.chat.models import Chat, Message
from apps.orders.models import Order

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class OrderCreationRegressionTests(TestCase):
    """Make sure clients can create orders even though the ``paid_amount``
    column lives outside the Django model definition.
    """

    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Регрессия — Алгебра")
        cls.work_type = WorkType.objects.create(name="Регрессия — Контрольная")
        cls.client_user = User.objects.create_user(
            username="orders_regression_client",
            email="orders_regression_client@example.com",
            password="testpass123",
            role="client",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.client_user)

    def test_paid_amount_column_has_db_default(self):
        """``paid_amount`` may not exist on the model, but if the column is
        present in the database it must have a DEFAULT so ORM INSERTs that
        omit it still succeed.
        """
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT column_default, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'orders_order' AND column_name = 'paid_amount'
                """
            )
            row = cursor.fetchone()
        if row is None:
            # Column was dropped entirely — that's a valid fix too.
            return
        column_default, is_nullable = row
        # Either the column is nullable OR it has an explicit DB default.
        self.assertTrue(
            is_nullable == "YES" or column_default not in (None, ""),
            f"orders_order.paid_amount must be nullable or have a DEFAULT — "
            f"got default={column_default!r}, nullable={is_nullable!r}",
        )

    def test_create_order_via_api_returns_201(self):
        """``POST /api/orders/orders/`` must succeed for a logged-in client
        with the minimum required payload. Before the fix this returned
        500 due to ``paid_amount`` NOT NULL violation.
        """
        deadline = (timezone.now() + timedelta(days=7)).isoformat()
        payload = {
            "title": "Regression order",
            "description": "Order body for regression test",
            "subject_id": self.subject.id,
            "work_type_id": self.work_type.id,
            "deadline": deadline,
            "budget": "1000",
        }
        response = self.api_client.post("/api/orders/orders/", payload, format="json")
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            f"unexpected status={response.status_code}, body={response.content[:300]!r}",
        )
        # Order is persisted with the expected client
        order_id = response.json()["id"]
        order = Order.objects.get(pk=order_id)
        self.assertEqual(order.client_id, self.client_user.id)
        self.assertEqual(order.subject_id, self.subject.id)

    def test_create_order_via_orm_does_not_raise(self):
        """Lower-level guarantee: ``Order.objects.create`` succeeds with only
        the minimum kwargs the chat flow supplies.
        """
        order = Order.objects.create(
            client=self.client_user,
            subject=self.subject,
            work_type=self.work_type,
            title="ORM regression order",
            description="body",
            budget=Decimal("500"),
            deadline=timezone.now() + timedelta(days=3),
            status="new",
        )
        self.assertIsNotNone(order.pk)


@override_settings(SECURE_SSL_REDIRECT=False)
class OrderReviewLifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Order lifecycle subject")
        cls.work_type = WorkType.objects.create(name="Order lifecycle work type")
        cls.client_user = User.objects.create_user(
            username="orders_lifecycle_client",
            email="orders_lifecycle_client@example.com",
            password="testpass123",
            role="client",
        )
        cls.expert_user = User.objects.create_user(
            username="orders_lifecycle_expert",
            email="orders_lifecycle_expert@example.com",
            password="testpass123",
            role="expert",
        )
        cls.other_client = User.objects.create_user(
            username="orders_lifecycle_other",
            email="orders_lifecycle_other@example.com",
            password="testpass123",
            role="client",
        )

    def setUp(self):
        self.api_client = APIClient()

    def _create_order(self, **overrides):
        defaults = {
            "client": self.client_user,
            "expert": self.expert_user,
            "subject": self.subject,
            "work_type": self.work_type,
            "title": "Lifecycle order",
            "description": "Order for lifecycle tests",
            "budget": Decimal("5000"),
            "deadline": timezone.now() + timedelta(days=5),
            "status": "in_progress",
        }
        defaults.update(overrides)
        return Order.objects.create(**defaults)

    def test_expert_can_submit_work_for_review(self):
        order = self._create_order(status="in_progress")
        self.api_client.force_authenticate(user=self.expert_user)

        response = self.api_client.post(f"/api/orders/orders/{order.id}/submit/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "review")

    def test_non_executor_cannot_submit_work_for_review(self):
        order = self._create_order(status="in_progress")
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(f"/api/orders/orders/{order.id}/submit/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        order.refresh_from_db()
        self.assertEqual(order.status, "in_progress")

    def test_client_can_approve_review_order(self):
        order = self._create_order(status="review")
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(f"/api/orders/orders/{order.id}/approve/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "completed")

    def test_other_client_cannot_approve_review_order(self):
        order = self._create_order(status="review")
        self.api_client.force_authenticate(user=self.other_client)

        response = self.api_client.post(f"/api/orders/orders/{order.id}/approve/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        order.refresh_from_db()
        self.assertEqual(order.status, "review")

    def test_client_can_send_review_order_to_revision_and_chat_gets_message(self):
        order = self._create_order(status="review")
        chat = Chat.objects.create(order=order, client=self.client_user, expert=self.expert_user)
        chat.participants.add(self.client_user, self.expert_user)
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            f"/api/orders/orders/{order.id}/revision/",
            {"comment": "Please fix the calculations"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "revision")
        self.assertTrue(
            Message.objects.filter(
                chat=chat,
                sender=self.client_user,
                message_type="system",
                offer_data__revision_comment="Please fix the calculations",
            ).exists()
        )

    def test_revision_requires_comment(self):
        order = self._create_order(status="review")
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            f"/api/orders/orders/{order.id}/revision/",
            {"comment": "   "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, "review")
