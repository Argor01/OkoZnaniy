"""Regression tests for chat offer-acceptance flow.

Bug: ``POST /api/chat/chats/<id>/accept_offer/`` returned 400 (Bad Request)
because the view wraps order creation in a broad ``try / except`` block and the
``IntegrityError`` raised by the NOT-NULL ``paid_amount`` column was surfaced as
a 400. After fixing the column default, accepting an individual offer must
create the order and return 200.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.chat.models import Chat, Message
from apps.orders.models import Order

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class AcceptOfferRegressionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Регрессия — Чат")
        cls.work_type = WorkType.objects.create(name="Регрессия — Реферат")
        cls.client_user = User.objects.create_user(
            username="chat_regression_client",
            email="chat_regression_client@example.com",
            password="pwd",
            role="client",
        )
        cls.expert_user = User.objects.create_user(
            username="chat_regression_expert",
            email="chat_regression_expert@example.com",
            password="pwd",
            role="expert",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.chat = Chat.objects.create(client=self.client_user, expert=self.expert_user)
        self.chat.participants.set([self.client_user, self.expert_user])
        self.offer_message = Message.objects.create(
            chat=self.chat,
            sender=self.expert_user,
            text="Individual offer",
            message_type="offer",
            offer_data={
                "subject_id": self.subject.id,
                "work_type_id": self.work_type.id,
                "cost": 1500,
                "description": "Test offer for regression",
                "deadline": (timezone.now() + timedelta(days=5)).isoformat(),
                "status": "new",
                "prepayment_percent": 50,
            },
        )

    def test_client_can_accept_individual_offer(self):
        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": self.offer_message.id},
            format="json",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"unexpected status={response.status_code}, body={response.content[:400]!r}",
        )
        payload = response.json()
        self.assertEqual(payload.get("status"), "success")
        self.assertIn("order_id", payload)
        order = Order.objects.get(pk=payload["order_id"])
        self.assertEqual(order.client_id, self.client_user.id)
        self.assertEqual(order.expert_id, self.expert_user.id)
        self.assertEqual(order.subject_id, self.subject.id)
        self.assertEqual(order.status, "in_progress")
        # Offer message must be marked accepted
        self.offer_message.refresh_from_db()
        self.assertEqual(self.offer_message.offer_data.get("status"), "accepted")
