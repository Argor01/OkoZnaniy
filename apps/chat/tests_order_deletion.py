"""Регрессия: удаление заказа и комиссия в предложениях чата.

1. Удалить заказ было невозможно, если у клиента с экспертом уже существовал
   личный чат: ``Chat.order`` объявлен как SET_NULL, чат заказа превращался во
   второй «личный» чат той же пары и упирался в ограничение
   ``unique_direct_chat_pair`` — весь DELETE падал с IntegrityError.
   Теперь сообщения переезжают в существующий личный чат, а чат заказа
   удаляется: заказ удаляется штатно и переписка не теряется.

2. Предложение в чате показывало клиенту «чистую» цену эксперта, хотя
   списывалось на 25% больше. Сериализатор обязан отдавать ``client_cost``.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.catalog.models import Subject, WorkType
from apps.chat.models import Chat, Message
from apps.chat.serializers import MessageSerializer
from apps.orders.models import Order

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class OrderDeletionWithExistingDirectChatTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Удаление — предмет")
        cls.work_type = WorkType.objects.create(name="Удаление — тип работы")
        cls.client_user = User.objects.create_user(
            username="del_client", email="del_client@example.com",
            password="pwd", role="client",
        )
        cls.expert = User.objects.create_user(
            username="del_expert", email="del_expert@example.com",
            password="pwd", role="expert",
        )
        cls.lonely_client = User.objects.create_user(
            username="del_client2", email="del_client2@example.com",
            password="pwd", role="client",
        )
        cls.lonely_expert = User.objects.create_user(
            username="del_expert2", email="del_expert2@example.com",
            password="pwd", role="expert",
        )

    def _order(self, client, expert):
        return Order.objects.create(
            client=client,
            expert=expert,
            subject=self.subject,
            work_type=self.work_type,
            title="Заказ на удаление",
            description="Описание",
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal("1000.00"),
            status="new",
        )

    def test_order_with_chat_deletes_when_direct_chat_exists(self):
        direct_chat = Chat.objects.create(
            client=self.client_user, expert=self.expert
        )
        direct_chat.participants.set([self.client_user, self.expert])

        order = self._order(self.client_user, self.expert)
        order_chat = Chat.objects.create(
            order=order, client=self.client_user, expert=self.expert
        )
        order_chat.participants.set([self.client_user, self.expert])
        Message.objects.create(
            chat=order_chat, sender=self.client_user, text="сообщение по заказу"
        )

        order_id, order_chat_id = order.id, order_chat.id
        order.delete()  # раньше здесь падал IntegrityError

        self.assertFalse(Order.objects.filter(id=order_id).exists())
        self.assertFalse(Chat.objects.filter(id=order_chat_id).exists())
        # переписка сохранена — переехала в личный чат
        direct_chat.refresh_from_db()
        self.assertEqual(direct_chat.messages.count(), 1)
        self.assertEqual(direct_chat.messages.first().text, "сообщение по заказу")

    def test_order_chat_becomes_direct_when_pair_has_no_direct_chat(self):
        """Если личного чата ещё нет — чат заказа штатно становится личным."""
        order = self._order(self.lonely_client, self.lonely_expert)
        order_chat = Chat.objects.create(
            order=order, client=self.lonely_client, expert=self.lonely_expert
        )
        order_chat.participants.set([self.lonely_client, self.lonely_expert])
        Message.objects.create(
            chat=order_chat, sender=self.lonely_client, text="привет"
        )

        order.delete()

        order_chat.refresh_from_db()
        self.assertIsNone(order_chat.order_id)
        self.assertEqual(order_chat.messages.count(), 1)

    def test_order_without_chat_deletes_cleanly(self):
        order = self._order(self.client_user, self.expert)
        order_id = order.id
        order.delete()
        self.assertFalse(Order.objects.filter(id=order_id).exists())


@override_settings(SECURE_SSL_REDIRECT=False)
class ChatOfferCommissionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_user = User.objects.create_user(
            username="offer_client", email="offer_client@example.com",
            password="pwd", role="client",
        )
        cls.expert = User.objects.create_user(
            username="offer_expert", email="offer_expert@example.com",
            password="pwd", role="expert",
        )
        cls.chat = Chat.objects.create(client=cls.client_user, expert=cls.expert)
        cls.chat.participants.set([cls.client_user, cls.expert])

    def _offer(self, cost):
        return Message.objects.create(
            chat=self.chat,
            sender=self.expert,
            text="Предложение",
            message_type="offer",
            offer_data={"status": "new", "cost": cost},
        )

    def test_offer_exposes_client_cost_with_service_fee(self):
        message = self._offer("1000.00")
        data = MessageSerializer(message).data
        self.assertEqual(Decimal(data["offer_data"]["cost"]), Decimal("1000.00"))
        self.assertEqual(Decimal(data["offer_data"]["client_cost"]), Decimal("1250.00"))

    def test_numeric_cost_is_supported(self):
        message = self._offer(1500)
        data = MessageSerializer(message).data
        self.assertEqual(Decimal(data["offer_data"]["client_cost"]), Decimal("1875.00"))

    def test_offer_without_cost_is_left_untouched(self):
        message = Message.objects.create(
            chat=self.chat, sender=self.expert, text="Без цены",
            message_type="offer", offer_data={"status": "new"},
        )
        data = MessageSerializer(message).data
        self.assertNotIn("client_cost", data["offer_data"])

    def test_plain_message_has_no_offer_data(self):
        message = Message.objects.create(
            chat=self.chat, sender=self.expert, text="Просто сообщение"
        )
        data = MessageSerializer(message).data
        self.assertIsNone(data["offer_data"])
