"""Пограничные случаи предложений в чате и удаления заказов.

Расчёт клиентской суммы не должен падать на кривых данных: в offer_data лежит
свободный JSON, туда могло попасть что угодно.
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
class OfferCostEdgeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_user = User.objects.create_user(
            username='offeredge_client', email='offeredge_client@example.com',
            password='pwd', role='client',
        )
        cls.expert = User.objects.create_user(
            username='offeredge_expert', email='offeredge_expert@example.com',
            password='pwd', role='expert',
        )
        cls.chat = Chat.objects.create(client=cls.client_user, expert=cls.expert)
        cls.chat.participants.set([cls.client_user, cls.expert])

    def _offer_data(self, offer_data):
        message = Message.objects.create(
            chat=self.chat, sender=self.expert, text='Предложение',
            message_type='offer', offer_data=offer_data,
        )
        return MessageSerializer(message).data['offer_data']

    def test_broken_cost_does_not_break_serialization(self):
        """Мусор в cost не должен ронять выдачу сообщений чата."""
        for broken in ('abc', 'не число', [], {}, True):
            with self.subTest(cost=broken):
                data = self._offer_data({'status': 'new', 'cost': broken})
                self.assertNotIn('client_cost', data)

    def test_empty_and_missing_cost_are_ignored(self):
        for value in ('', None):
            with self.subTest(cost=value):
                data = self._offer_data({'status': 'new', 'cost': value})
                self.assertNotIn('client_cost', data)
        self.assertNotIn('client_cost', self._offer_data({'status': 'new'}))

    def test_zero_cost_is_reported_as_zero(self):
        data = self._offer_data({'status': 'new', 'cost': '0'})
        self.assertEqual(Decimal(data['client_cost']), Decimal('0.00'))

    def test_cost_rounding_matches_bids(self):
        data = self._offer_data({'status': 'new', 'cost': '999.99'})
        self.assertEqual(Decimal(data['client_cost']), Decimal('1249.99'))

    def test_original_cost_is_preserved(self):
        """Эксперт должен видеть свою сумму — исходное поле не перезаписываем."""
        data = self._offer_data({'status': 'new', 'cost': '2000.00'})
        self.assertEqual(Decimal(data['cost']), Decimal('2000.00'))
        self.assertEqual(Decimal(data['client_cost']), Decimal('2500.00'))

    def test_non_dict_offer_data_is_left_alone(self):
        message = Message.objects.create(
            chat=self.chat, sender=self.expert, text='Странное',
            message_type='offer', offer_data=['не словарь'],
        )
        self.assertEqual(MessageSerializer(message).data['offer_data'], ['не словарь'])


@override_settings(SECURE_SSL_REDIRECT=False)
class OrderDeletionEdgeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name='Удаление-границы — предмет')
        cls.work_type = WorkType.objects.create(name='Удаление-границы — тип')

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='deledge_client', email='deledge_client@example.com',
            password='pwd', role='client',
        )
        self.expert = User.objects.create_user(
            username='deledge_expert', email='deledge_expert@example.com',
            password='pwd', role='expert',
        )

    def _order(self, title='Заказ'):
        return Order.objects.create(
            client=self.client_user, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title=title, description='Описание',
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal('1000.00'), status='new',
        )

    def test_two_orders_of_same_pair_delete_one_after_another(self):
        """Второе удаление тоже не должно упираться в дубль личного чата."""
        direct = Chat.objects.create(client=self.client_user, expert=self.expert)
        direct.participants.set([self.client_user, self.expert])

        for index in range(2):
            order = self._order(title=f'Заказ {index}')
            chat = Chat.objects.create(
                order=order, client=self.client_user, expert=self.expert
            )
            chat.participants.set([self.client_user, self.expert])
            Message.objects.create(chat=chat, sender=self.client_user, text=f'msg {index}')
            order.delete()
            self.assertFalse(Chat.objects.filter(pk=chat.pk).exists())

        direct.refresh_from_db()
        self.assertEqual(direct.messages.count(), 2, 'сообщения обоих заказов сохранены')

    def test_order_chat_without_messages_is_removed_cleanly(self):
        direct = Chat.objects.create(client=self.client_user, expert=self.expert)
        direct.participants.set([self.client_user, self.expert])

        order = self._order(title='Пустой чат')
        chat = Chat.objects.create(order=order, client=self.client_user, expert=self.expert)
        order.delete()

        self.assertFalse(Chat.objects.filter(pk=chat.pk).exists())
        direct.refresh_from_db()
        self.assertEqual(direct.messages.count(), 0)
