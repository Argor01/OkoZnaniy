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
        self.assertIn("chat_id", payload)
        order_chat = Chat.objects.get(pk=payload["chat_id"])
        self.assertEqual(order_chat.order_id, order.id)
        self.chat.refresh_from_db()
        self.assertIsNone(self.chat.order_id)
        # Offer message must be marked accepted
        self.offer_message.refresh_from_db()
        self.assertEqual(self.offer_message.offer_data.get("status"), "accepted")


@override_settings(SECURE_SSL_REDIRECT=False)
class ChatConversationRoutingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Routing subject")
        cls.work_type = WorkType.objects.create(name="Routing work type")
        cls.client_user = User.objects.create_user(
            username="chat_routing_client",
            email="chat_routing_client@example.com",
            password="pwd",
            role="client",
        )
        cls.expert_user = User.objects.create_user(
            username="chat_routing_expert",
            email="chat_routing_expert@example.com",
            password="pwd",
            role="expert",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.client_user)
        self.direct_chat = Chat.objects.create(client=self.client_user, expert=self.expert_user)
        self.direct_chat.participants.set([self.client_user, self.expert_user])
        self.order = Order.objects.create(
            client=self.client_user,
            expert=self.expert_user,
            subject=self.subject,
            work_type=self.work_type,
            title="Routing order",
            description="Routing order body",
            budget=1500,
            deadline=timezone.now() + timedelta(days=4),
            status="in_progress",
        )
        self.order_chat = Chat.objects.create(order=self.order, client=self.client_user, expert=self.expert_user)
        self.order_chat.participants.set([self.client_user, self.expert_user])

    def test_get_or_create_by_user_prefers_main_direct_chat(self):
        response = self.api_client.post(
            "/api/chat/chats/get_or_create_by_user/",
            {"user_id": self.expert_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], self.direct_chat.id)

    def test_get_or_create_by_order_and_user_returns_order_subdialog(self):
        response = self.api_client.post(
            "/api/chat/chats/get_or_create_by_order_and_user/",
            {"order_id": self.order.id, "user_id": self.expert_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], self.order_chat.id)
        self.assertEqual(response.json()["order_id"], self.order.id)

    def test_locked_direct_chat_hides_system_messages_from_unread_and_detail(self):
        system_user = User.objects.create_user(
            username="chat_routing_system",
            email="chat_routing_system@example.com",
            password="pwd",
            role="admin",
        )
        hidden_message = Message.objects.create(
            chat=self.direct_chat,
            sender=system_user,
            text="Hidden system event",
            message_type="system",
            is_read=False,
        )

        detail_response = self.api_client.get(f"/api/chat/chats/{self.direct_chat.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        detail = detail_response.json()
        self.assertEqual(detail["unread_count"], 0)
        self.assertNotIn(hidden_message.id, [message["id"] for message in detail["messages"]])

        count_response = self.api_client.get("/api/chat/chats/unread_count/")
        self.assertEqual(count_response.status_code, status.HTTP_200_OK)
        self.assertEqual(count_response.json()["unread_count"], 0)

        Message.objects.filter(pk=hidden_message.pk).update(is_read=True)
        mark_response = self.api_client.post(f"/api/chat/chats/{self.direct_chat.id}/mark_as_unread/")
        self.assertEqual(mark_response.status_code, status.HTTP_200_OK)
        hidden_message.refresh_from_db()
        self.assertTrue(hidden_message.is_read)
