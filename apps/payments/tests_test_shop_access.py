"""Доступ к оплате через тестовый магазин ЮKassa.

Тестовый ключ создаёт платежи, которые ничего не списывают, но зачисляются на
кошелёк. Поэтому по умолчанию платить через него может только персонал, а
обычному аккаунту доступ выдаётся точечно — флагом.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.payments.models import Payment, PaymentStatus
from apps.payments.providers.yookassa import YooKassaClient
from apps.payments.services import PaymentService

User = get_user_model()


class _TestShopClient(YooKassaClient):
    """Клиент, который считает магазин тестовым, без обращения к настройкам."""

    @property
    def test_mode(self):  # type: ignore[override]
        return True


# Тесты проверяют саму защиту, поэтому режим «открыто всем» здесь всегда
# выключен — иначе они зависели бы от настройки конкретного стенда.
@override_settings(SECURE_SSL_REDIRECT=False, YOOKASSA_TEST_SHOP_OPEN_TO_ALL=False)
class TestShopAccessTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='shop_payer', email='shop_payer@example.com',
            password='pwd', role='client',
        )
        self.payment = Payment(
            user=self.client_user, amount=Decimal('100.00'),
            payment_method='yookassa', status=PaymentStatus.PENDING,
            payment_id='probe-test-shop',
        )

    def _check(self):
        PaymentService._ensure_test_shop_payer(self.payment, _TestShopClient())

    def test_regular_client_is_blocked_by_default(self):
        with self.assertRaises(ValueError):
            self._check()

    def test_flag_opens_payment_for_that_account(self):
        self.client_user.test_payments_allowed = True
        self.client_user.save(update_fields=['test_payments_allowed'])
        self._check()  # не должно бросить

    def test_flag_of_one_user_does_not_open_it_for_another(self):
        self.client_user.test_payments_allowed = True
        self.client_user.save(update_fields=['test_payments_allowed'])
        other = User.objects.create_user(
            username='shop_payer2', email='shop_payer2@example.com',
            password='pwd', role='client',
        )
        self.payment.user = other
        with self.assertRaises(ValueError):
            self._check()

    def test_staff_roles_still_pass(self):
        for role in ('director', 'admin'):
            with self.subTest(role=role):
                boss = User.objects.create_user(
                    username=f'shop_{role}', email=f'shop_{role}@example.com',
                    password='pwd', role=role,
                )
                self.payment.user = boss
                self._check()

    def test_live_shop_ignores_the_flag(self):
        """На боевом магазине проверка не вмешивается вообще."""
        with patch.object(YooKassaClient, 'test_mode', False):
            PaymentService._ensure_test_shop_payer(self.payment, YooKassaClient())

    def test_director_can_toggle_the_flag(self):
        director = User.objects.create_user(
            username='shop_director', email='shop_director@example.com',
            password='pwd', role='director',
        )
        api = APIClient()
        api.force_authenticate(director)
        response = api.patch(
            f'/api/users/{self.client_user.username}/admin_update_partner/',
            {'test_payments_allowed': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.client_user.refresh_from_db()
        self.assertTrue(self.client_user.test_payments_allowed)

    @override_settings(YOOKASSA_TEST_SHOP_OPEN_TO_ALL=True)
    def test_open_to_all_lets_any_account_pay(self):
        """Режим тестирования площадки: магазин открыт всем без флагов."""
        self.assertFalse(self.client_user.test_payments_allowed)
        self._check()  # не должно бросить

    @override_settings(YOOKASSA_TEST_SHOP_OPEN_TO_ALL=False)
    def test_switch_off_restores_protection(self):
        with self.assertRaises(ValueError):
            self._check()
