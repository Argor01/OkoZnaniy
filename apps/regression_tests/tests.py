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
