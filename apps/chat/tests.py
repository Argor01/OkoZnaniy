"""Regression tests for chat offer-acceptance flow.

Bug: ``POST /api/chat/chats/<id>/accept_offer/`` returned 400 (Bad Request)
because the view wraps order creation in a broad ``try / except`` block and the
``IntegrityError`` raised by the NOT-NULL ``paid_amount`` column was surfaced as
a 400. After fixing the column default, accepting an individual offer must
create the order and return 200.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.chat.models import Chat, Message
from apps.chat.services import ContactDetectionService
from apps.orders.models import Order, Transaction, TransactionType
from apps.wallet.services import WalletService
from apps.wallet.policy import order_quote

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
        WalletService.topup(self.client_user, 1875)
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
        self.client_user.refresh_from_db()
        self.assertEqual(order.client_id, self.client_user.id)
        self.assertEqual(order.expert_id, self.expert_user.id)
        self.assertEqual(order.subject_id, self.subject.id)
        self.assertEqual(order.status, "in_progress")
        self.assertEqual(self.client_user.balance, Decimal("937.50"))
        self.assertEqual(self.client_user.frozen_balance, Decimal("0"))
        self.expert_user.refresh_from_db()
        self.assertEqual(self.expert_user.frozen_balance, Decimal("750.00"))
        self.assertTrue(
            Transaction.objects.filter(
                order=order,
                user=self.client_user,
                type=TransactionType.HOLD,
                amount=Decimal("937.50"),
            ).exists()
        )
        self.assertIn("chat_id", payload)
        order_chat = Chat.objects.get(pk=payload["chat_id"])
        self.assertEqual(order_chat.order_id, order.id)
        self.chat.refresh_from_db()
        self.assertIsNone(self.chat.order_id)
        # Offer message must be marked accepted
        self.offer_message.refresh_from_db()
        self.assertEqual(self.offer_message.offer_data.get("status"), "accepted")

    def test_client_cannot_accept_same_offer_twice(self):
        WalletService.topup(self.client_user, 3000)
        self.api_client.force_authenticate(user=self.client_user)

        first_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": self.offer_message.id},
            format="json",
        )
        second_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": self.offer_message.id},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(description="Test offer for regression").count(), 1)

    def test_accepted_offer_cannot_be_rejected_afterwards(self):
        WalletService.topup(self.client_user, 1875)
        self.api_client.force_authenticate(user=self.client_user)

        accept_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": self.offer_message.id},
            format="json",
        )
        reject_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/reject_offer/",
            {"message_id": self.offer_message.id},
            format="json",
        )

        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.offer_message.refresh_from_db()
        self.assertEqual(self.offer_message.offer_data.get("status"), "accepted")

    def test_client_cannot_accept_individual_offer_without_wallet_funds(self):
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": self.offer_message.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.client_user.refresh_from_db()
        self.offer_message.refresh_from_db()
        self.assertEqual(self.client_user.frozen_balance, 0)
        self.assertEqual(self.offer_message.offer_data.get("status"), "new")
        self.assertFalse(Order.objects.filter(description="Test offer for regression").exists())
        self.assertIn("Недостаточно средств", response.json()["detail"])


@override_settings(SECURE_SSL_REDIRECT=False)
class LinkedIndividualOfferTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_user = User.objects.create_user(
            username="linked_offer_client", password="pwd", role="client"
        )
        cls.expert_user = User.objects.create_user(
            username="linked_offer_expert", password="pwd", role="expert"
        )
        cls.other_expert = User.objects.create_user(
            username="linked_offer_other_expert", password="pwd", role="expert"
        )
        cls.chat = Chat.objects.create(client=cls.client_user, expert=cls.expert_user)
        cls.chat.participants.set([cls.client_user, cls.expert_user])

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.expert_user)

    def _order(self, **overrides):
        values = {
            "client": self.client_user,
            "title": "Fixed-price order",
            "description": "Order available for an individual offer",
            "budget": 1200,
            "price_type": "fixed",
            "deadline": timezone.now() + timedelta(days=5),
            "status": "new",
        }
        values.update(overrides)
        return Order.objects.create(**values)

    def test_fixed_price_unassigned_order_can_be_linked(self):
        order = self._order()
        response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/send_message/",
            {
                "message_type": "offer",
                "offer_data": {
                    "description": "Offer for fixed-price order",
                    "cost": 1400,
                    "deadline": (timezone.now() + timedelta(days=4)).isoformat(),
                    "linked_order_id": order.id,
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["offer_data"]["linked_order_id"], order.id)

    def test_accepting_linked_offer_reserves_service_fee_and_can_complete(self):
        order = self._order(budget=1200)
        WalletService.topup(self.client_user, 1750)
        create_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/send_message/",
            {
                "message_type": "offer",
                "offer_data": {
                    "description": "Linked offer with service fee",
                    "cost": 1400,
                    "deadline": (timezone.now() + timedelta(days=4)).isoformat(),
                    "linked_order_id": order.id,
                    "prepayment_percent": 50,
                },
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_200_OK, create_response.content)

        self.api_client.force_authenticate(user=self.client_user)
        accept_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": create_response.json()["id"]},
            format="json",
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK, accept_response.content)
        order.refresh_from_db()
        self.client_user.refresh_from_db()
        self.assertEqual(order.budget, Decimal("1400"))
        self.assertEqual(self.client_user.balance, Decimal("875"))
        self.assertEqual(self.client_user.frozen_balance, Decimal("0"))
        self.expert_user.refresh_from_db()
        self.assertEqual(self.expert_user.frozen_balance, Decimal("700"))

        pay_response = self.api_client.post(
            f"/api/orders/orders/{order.id}/pay-remaining/", {}, format="json"
        )
        self.assertEqual(pay_response.status_code, status.HTTP_200_OK, pay_response.content)
        self.expert_user.refresh_from_db()
        self.assertEqual(self.expert_user.frozen_balance, Decimal("1400"))

        order.status = "review"
        order.save(update_fields=["status", "updated_at"])
        approve_response = self.api_client.post(
            f"/api/orders/orders/{order.id}/approve/", {}, format="json"
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK, approve_response.content)
        order.refresh_from_db()
        self.assertEqual(order.status, "completed")

    def test_active_order_assigned_to_current_expert_is_available_for_linking(self):
        order = self._order(expert=self.expert_user, status="in_progress")

        response = self.api_client.get(
            "/api/orders/orders/client_available_orders/",
            {"client_id": self.client_user.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertIn(order.id, [item["id"] for item in response.json()])

    def test_active_order_can_receive_additional_linked_offer(self):
        order = self._order(expert=self.expert_user, status="in_progress", budget=1200)
        create_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/send_message/",
            {
                "message_type": "offer",
                "offer_data": {
                    "description": "Additional work",
                    "cost": 400,
                    "prepayment_percent": 0,
                    "deadline": (timezone.now() + timedelta(days=6)).isoformat(),
                    "linked_order_id": order.id,
                },
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_200_OK, create_response.content)

        self.api_client.force_authenticate(user=self.client_user)
        accept_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": create_response.json()["id"]},
            format="json",
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK, accept_response.content)
        order.refresh_from_db()
        self.assertEqual(order.status, "in_progress")
        self.assertEqual(order.budget, Decimal("400"))

    def test_active_linked_offer_reconciles_existing_hold_instead_of_freezing_twice(self):
        from apps.wallet.models import Settlement

        order = self._order(expert=self.expert_user, status="in_progress", budget=1200)
        WalletService.topup(self.client_user, 2000)
        quote = order_quote(1200)
        WalletService.fund_distributed_escrow(
            client=self.client_user,
            expert=self.expert_user,
            base_amount=quote["base_amount"],
            service_fee=quote["service_fee"],
            fund_amount=750,
            order=order,
            description="Initial reserve",
        )
        create_response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/send_message/",
            {
                "message_type": "offer",
                "offer_data": {
                    "description": "Replacement offer",
                    "cost": 1000,
                    "prepayment_percent": 50,
                    "linked_order_id": order.id,
                },
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_200_OK, create_response.content)
        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/accept_offer/",
            {"message_id": create_response.json()["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        order.refresh_from_db()
        settlement = Settlement.objects.get(order=order)
        self.client_user.refresh_from_db()
        self.assertEqual(order.budget, Decimal("1000"))
        self.assertEqual(settlement.funded_base + settlement.funded_service_fee, Decimal("625"))
        self.assertEqual(self.client_user.balance, Decimal("1375"))

    def test_order_with_expert_cannot_be_linked(self):
        order = self._order(expert=self.other_expert)
        response = self.api_client.post(
            f"/api/chat/chats/{self.chat.id}/send_message/",
            {
                "message_type": "offer",
                "offer_data": {
                    "description": "Invalid linked offer",
                    "cost": 1400,
                    "linked_order_id": order.id,
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("заказ", response.json()["detail"].lower())


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

    def test_expert_can_open_assigned_order_subdialog(self):
        self.api_client.force_authenticate(user=self.expert_user)

        response = self.api_client.post(
            "/api/chat/chats/get_or_create_by_order_and_user/",
            {"order_id": self.order.id, "user_id": self.client_user.id},
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

        Message.objects.filter(chat=self.direct_chat, message_type="system").update(is_read=True)
        mark_response = self.api_client.post(f"/api/chat/chats/{self.direct_chat.id}/mark_as_unread/")
        self.assertEqual(mark_response.status_code, status.HTTP_200_OK)
        self.assertFalse(Message.objects.filter(chat=self.direct_chat, message_type="system", is_read=False).exists())

        Message.objects.filter(pk=hidden_message.pk).update(is_read=True)
        mark_response = self.api_client.post(f"/api/chat/chats/{self.direct_chat.id}/mark_as_unread/")
        self.assertEqual(mark_response.status_code, status.HTTP_200_OK)
        hidden_message.refresh_from_db()
        self.assertTrue(hidden_message.is_read)

    def test_contact_unban_is_silent_and_keeps_pair_chats_visible(self):
        self.direct_chat.freeze("Contact ban")
        self.order_chat.freeze("Contact ban")
        self.expert_user.is_banned_for_contacts = True
        self.expert_user.contact_ban_reason = "Contact ban"
        self.expert_user.contact_ban_date = timezone.now()
        self.expert_user.save(update_fields=[
            "is_banned_for_contacts",
            "contact_ban_reason",
            "contact_ban_date",
        ])

        stats = self.expert_user.clear_contact_ban(unfreeze_related=True)

        self.assertGreaterEqual(stats["chats"], 2)
        self.direct_chat.refresh_from_db()
        self.order_chat.refresh_from_db()
        self.assertFalse(self.direct_chat.is_frozen)
        self.assertFalse(self.order_chat.is_frozen)
        self.assertFalse(Message.objects.filter(
            chat__in=[self.direct_chat, self.order_chat],
            message_type="system",
        ).exists())

        self.order.status = "completed"
        self.order.save(update_fields=["status", "updated_at"])
        response = self.api_client.get("/api/chat/chats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        items = payload.get("results", payload) if isinstance(payload, dict) else payload
        chat_ids = {item["id"] for item in items}
        self.assertIn(self.direct_chat.id, chat_ids)
        self.assertIn(self.order_chat.id, chat_ids)

    def test_system_message_in_regular_frozen_chat_does_not_count_as_unread(self):
        client = User.objects.create_user(
            username="chat_unread_client",
            email="chat_unread_client@example.com",
            password="pwd",
            role="client",
        )
        expert = User.objects.create_user(
            username="chat_unread_expert",
            email="chat_unread_expert@example.com",
            password="pwd",
            role="expert",
        )
        system_user = User.objects.create_user(
            username="chat_unread_system",
            email="chat_unread_system@example.com",
            password="pwd",
            role="admin",
        )
        chat = Chat.objects.create(client=client, expert=expert, is_frozen=True, frozen_reason="Frozen")
        chat.participants.set([client, expert])
        Message.objects.create(
            chat=chat,
            sender=system_user,
            text="ЧАТ ЗАМОРОЖЕН",
            message_type="system",
            is_read=False,
        )

        self.api_client.force_authenticate(user=client)
        detail_response = self.api_client.get(f"/api/chat/chats/{chat.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.json()["unread_count"], 0)

        count_response = self.api_client.get("/api/chat/chats/unread_count/")
        self.assertEqual(count_response.status_code, status.HTTP_200_OK)
        self.assertEqual(count_response.json()["unread_count"], 0)

    def test_other_contact_banned_user_gets_clear_frozen_reason(self):
        client = User.objects.create_user(
            username="chat_other_ban_client",
            email="chat_other_ban_client@example.com",
            password="pwd",
            role="client",
        )
        expert = User.objects.create_user(
            username="chat_other_ban_expert",
            email="chat_other_ban_expert@example.com",
            password="pwd",
            role="expert",
            is_banned_for_contacts=True,
            contact_ban_reason="Обнаружен обмен контактами: номер телефона",
        )
        chat = Chat.objects.create(client=client, expert=expert)
        chat.participants.set([client, expert])

        self.api_client.force_authenticate(user=client)
        detail_response = self.api_client.get(f"/api/chat/chats/{chat.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        detail = detail_response.json()
        self.assertTrue(detail["is_frozen"])
        self.assertIn("Собеседник нарушил правила платформы", detail["frozen_reason"])

        send_response = self.api_client.post(
            f"/api/chat/chats/{chat.id}/send_message/",
            {"text": "Здравствуйте"},
            format="json",
        )
        self.assertEqual(send_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Собеседник нарушил правила платформы", send_response.json()["detail"])

    def test_contact_detector_recognizes_russian_keywords(self):
        result = ContactDetectionService.detect_contacts("напиши мне в личку, мой телефон позже")

        self.assertTrue(result["has_contacts"])
        self.assertIn("keywords", result["contact_types"])
