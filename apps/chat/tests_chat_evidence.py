"""Переписка по спорному заказу переживает удаление из списков.

Чат стирается насовсем, когда его скрыли все участники. Удалять
разрешено, едва заказ закрыт, — а после арбитража с возвратом заказ как
раз становится отменённым. Достаточно обеим сторонам убрать чат, и
доказательства по спору исчезают. Обращение при этом можно возобновить,
но разбирать будет уже нечего.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.arbitration.models import ArbitrationCase
from apps.catalog.models import Subject, WorkType
from apps.chat.models import Chat, Message
from apps.orders.models import Order

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class ChatDeletionTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(username='chat_client', role='client')
        self.expert = User.objects.create_user(username='chat_expert', role='expert')
        self.subject = Subject.objects.create(name='Предмет чата')
        self.work_type = WorkType.objects.create(name='Тип чата')
        self.api = APIClient()

    def _order(self, status='cancelled'):
        return Order.objects.create(
            client=self.client_user, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title='Спорный заказ', description='...', budget=Decimal('1000.00'),
            deadline=timezone.now() + timedelta(days=3), status=status,
        )

    def _chat_with_history(self, order):
        chat = Chat.objects.create(
            order=order, client=self.client_user, expert=self.expert,
        )
        chat.participants.add(self.client_user, self.expert)
        Message.objects.create(chat=chat, sender=self.client_user, text='Вопрос по работе')
        Message.objects.create(chat=chat, sender=self.expert, text='Ответ автора')
        return chat

    def _both_delete(self, chat):
        for user in (self.client_user, self.expert):
            self.api.force_authenticate(user=user)
            response = self.api.delete(f'/api/chat/chats/{chat.id}/')
            self.assertEqual(response.status_code, 204, response.content)

    def test_disputed_chat_survives_deletion_by_both_sides(self):
        """По заказу был арбитраж — переписка остаётся на месте."""
        order = self._order()
        chat = self._chat_with_history(order)
        ArbitrationCase.objects.create(
            plaintiff=self.client_user, defendant=self.expert, order=order,
            reason='poor_quality', subject='Спор', description='...',
            status='closed',
        )

        self._both_delete(chat)

        self.assertTrue(Chat.objects.filter(pk=chat.pk).exists())
        self.assertEqual(Message.objects.filter(chat=chat).count(), 2)

    def test_disputed_chat_is_hidden_from_both_lists(self):
        """Из списков он при этом уходит: скрыть чат по-прежнему можно."""
        order = self._order()
        chat = self._chat_with_history(order)
        ArbitrationCase.objects.create(
            plaintiff=self.client_user, defendant=self.expert, order=order,
            reason='poor_quality', subject='Спор', description='...',
            status='closed',
        )

        self._both_delete(chat)

        for user in (self.client_user, self.expert):
            self.api.force_authenticate(user=user)
            listing = self.api.get('/api/chat/chats/')
            items = listing.data if isinstance(listing.data, list) else listing.data.get('results', [])
            self.assertNotIn(chat.id, [item['id'] for item in items])

    def test_ordinary_chat_is_still_removed(self):
        """Без спора поведение прежнее: чат удаляется, как и раньше."""
        order = self._order()
        chat = self._chat_with_history(order)

        self._both_delete(chat)

        self.assertFalse(Chat.objects.filter(pk=chat.pk).exists())

    def test_chat_of_active_order_cannot_be_deleted(self):
        """Заказ в работе — чат трогать нельзя вовсе."""
        order = self._order(status='in_progress')
        chat = self._chat_with_history(order)

        self.api.force_authenticate(user=self.client_user)
        response = self.api.delete(f'/api/chat/chats/{chat.id}/')

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Chat.objects.filter(pk=chat.pk).exists())

    def test_one_sided_deletion_keeps_chat_for_the_other(self):
        order = self._order()
        chat = self._chat_with_history(order)

        self.api.force_authenticate(user=self.client_user)
        self.api.delete(f'/api/chat/chats/{chat.id}/')

        self.assertTrue(Chat.objects.filter(pk=chat.pk).exists())
        self.api.force_authenticate(user=self.expert)
        listing = self.api.get('/api/chat/chats/')
        items = listing.data if isinstance(listing.data, list) else listing.data.get('results', [])
        self.assertIn(chat.id, [item['id'] for item in items])
