"""Индивидуальный сервисный сбор для отдельных аккаунтов.

Пусто — общий процент площадки, 0 — заказы без комиссии, любое число — своя
ставка. Главное, что здесь проверяется: резерв и списание считают процент
одинаково. Если бы они разошлись, деньги зависли бы в эскроу.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.orders.models import Bid, BidStatus, Order, OrderFile
from apps.wallet.policy import client_service_fee_percent, order_quote
from apps.wallet.services import WalletService

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class ServiceFeePercentResolutionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='fee_plain', email='fee_plain@example.com',
            password='pwd', role='client',
        )

    def test_no_client_falls_back_to_platform_rate(self):
        self.assertEqual(client_service_fee_percent(None), Decimal('25'))

    def test_empty_override_means_platform_rate(self):
        self.assertIsNone(self.user.service_fee_percent)
        self.assertEqual(client_service_fee_percent(self.user), Decimal('25'))

    def test_zero_override_disables_commission(self):
        self.user.service_fee_percent = Decimal('0')
        self.user.save(update_fields=['service_fee_percent'])
        self.assertEqual(client_service_fee_percent(self.user), Decimal('0'))
        quote = order_quote(Decimal('1000'), client=self.user)
        self.assertEqual(quote['service_fee'], Decimal('0.00'))
        self.assertEqual(quote['base_amount'], Decimal('1000.00'))

    def test_custom_override_is_applied(self):
        self.user.service_fee_percent = Decimal('10')
        self.user.save(update_fields=['service_fee_percent'])
        quote = order_quote(Decimal('1000'), client=self.user)
        self.assertEqual(quote['service_fee'], Decimal('100.00'))

    def test_default_quote_without_client_is_unchanged(self):
        """Старое поведение обязано сохраниться для вызовов без клиента."""
        quote = order_quote(Decimal('1000'))
        self.assertEqual(quote['service_fee'], Decimal('250.00'))


@override_settings(SECURE_SSL_REDIRECT=False)
class ServiceFeeOverrideMoneyFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name='Сбор — предмет')
        cls.work_type = WorkType.objects.create(name='Сбор — тип работы')

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='fee_client', email='fee_client@example.com',
            password='pwd', role='client',
        )
        self.expert = User.objects.create_user(
            username='fee_expert', email='fee_expert@example.com',
            password='pwd', role='expert',
        )
        self.api = APIClient()

    def _order(self, status_value='review'):
        return Order.objects.create(
            client=self.client_user, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title='Заказ без комиссии', description='Описание',
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal('1000.00'), final_price=Decimal('1000.00'),
            status=status_value,
        )

    def _exempt(self):
        self.client_user.service_fee_percent = Decimal('0')
        self.client_user.save(update_fields=['service_fee_percent'])

    def test_bid_shows_no_markup_for_exempt_client(self):
        self._exempt()
        order = self._order('new')
        bid = Bid.objects.create(
            order=order, expert=self.expert, amount=Decimal('1000.00'),
            prepayment_percent=50, status=BidStatus.ACTIVE,
        )
        self.api.force_authenticate(self.client_user)
        response = self.api.get(f'/api/orders/orders/{order.id}/bids/{bid.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(Decimal(response.json()['client_amount']), Decimal('1000.00'))

    def test_bid_keeps_markup_for_regular_client(self):
        order = self._order('new')
        bid = Bid.objects.create(
            order=order, expert=self.expert, amount=Decimal('1000.00'),
            prepayment_percent=50, status=BidStatus.ACTIVE,
        )
        self.api.force_authenticate(self.client_user)
        response = self.api.get(f'/api/orders/orders/{order.id}/bids/{bid.id}/')
        self.assertEqual(Decimal(response.json()['client_amount']), Decimal('1250.00'))

    def test_exempt_client_pays_only_base_and_expert_gets_all(self):
        """Резерв и списание должны сойтись без комиссии."""
        self._exempt()
        order = self._order('review')
        WalletService.topup(self.client_user, Decimal('1000.00'))
        WalletService.hold(self.client_user, Decimal('1000.00'), order=order)
        OrderFile.objects.create(
            order=order, file=SimpleUploadedFile('s.txt', b'solution'),
            file_type='solution', uploaded_by=self.expert,
            client_downloaded_at=timezone.now(),
        )

        self.api.force_authenticate(self.client_user)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

        self.client_user.refresh_from_db()
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.balance, Decimal('1000.00'), 'автор должен получить всю базу')
        self.assertEqual(self.client_user.balance, Decimal('0.00'), 'списали ровно ставку')
        self.assertEqual(self.client_user.frozen_balance, Decimal('0.00'))

    def test_regular_client_still_pays_the_fee(self):
        order = self._order('review')
        WalletService.topup(self.client_user, Decimal('1250.00'))
        WalletService.hold(self.client_user, Decimal('1250.00'), order=order)
        OrderFile.objects.create(
            order=order, file=SimpleUploadedFile('s.txt', b'solution'),
            file_type='solution', uploaded_by=self.expert,
            client_downloaded_at=timezone.now(),
        )

        self.api.force_authenticate(self.client_user)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

        self.expert.refresh_from_db()
        self.client_user.refresh_from_db()
        self.assertEqual(self.expert.balance, Decimal('1000.00'))
        self.assertEqual(self.client_user.balance, Decimal('0.00'))

    def test_override_is_editable_through_admin_api(self):
        admin = User.objects.create_user(
            username='fee_admin', email='fee_admin@example.com',
            password='pwd', role='admin',
        )
        api = APIClient()
        api.force_authenticate(admin)
        response = api.patch(
            f'/api/users/{self.client_user.username}/admin_update_partner/',
            {'service_fee_percent': '0'}, format='json',
        )
        if response.status_code == status.HTTP_404_NOT_FOUND:
            self.fail('маршрут админского редактирования не найден')
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_202_ACCEPTED))
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.service_fee_percent, Decimal('0.00'))
