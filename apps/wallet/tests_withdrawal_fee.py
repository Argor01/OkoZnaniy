"""Индивидуальное удержание с эксперта при выводе средств.

Пусто — общий процент по роли, 0 — вывод без удержания, число — своя ставка.
Проверяется, что расчёт берёт персональное значение, а не глобальное.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.wallet.policy import withdrawal_fee_percent, withdrawal_quote

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class WithdrawalFeePercentTests(TestCase):
    def setUp(self):
        self.expert = User.objects.create_user(
            username='wf_expert', email='wf_expert@example.com',
            password='pwd', role='expert',
        )
        self.client_user = User.objects.create_user(
            username='wf_client', email='wf_client@example.com',
            password='pwd', role='client',
        )

    def test_without_override_platform_rate_is_used(self):
        self.assertIsNone(self.expert.withdrawal_fee_percent)
        self.assertEqual(withdrawal_fee_percent('expert', self.expert), Decimal('15'))
        self.assertEqual(withdrawal_fee_percent('client', self.client_user), Decimal('0'))

    def test_zero_override_means_no_retention(self):
        self.expert.withdrawal_fee_percent = Decimal('0')
        self.expert.save(update_fields=['withdrawal_fee_percent'])
        self.assertEqual(withdrawal_fee_percent('expert', self.expert), Decimal('0'))
        quote = withdrawal_quote(Decimal('1000'), 'expert', user=self.expert)
        self.assertEqual(quote['platform_fee'], Decimal('0.00'))

    def test_custom_override_is_applied(self):
        self.expert.withdrawal_fee_percent = Decimal('5')
        self.expert.save(update_fields=['withdrawal_fee_percent'])
        quote = withdrawal_quote(Decimal('1000'), 'expert', user=self.expert)
        self.assertEqual(quote['platform_fee'], Decimal('50.00'))

    def test_quote_without_user_keeps_old_behaviour(self):
        quote = withdrawal_quote(Decimal('1000'), 'expert')
        self.assertEqual(quote['platform_fee'], Decimal('150.00'))

    def test_lower_fee_increases_payout(self):
        base = withdrawal_quote(Decimal('1000'), 'expert', user=self.expert)
        self.expert.withdrawal_fee_percent = Decimal('0')
        self.expert.save(update_fields=['withdrawal_fee_percent'])
        discounted = withdrawal_quote(Decimal('1000'), 'expert', user=self.expert)
        self.assertGreater(discounted['net'], base['net'])

    def test_director_can_change_it_through_admin_api(self):
        director = User.objects.create_user(
            username='wf_director', email='wf_director@example.com',
            password='pwd', role='director',
        )
        api = APIClient()
        api.force_authenticate(director)
        response = api.patch(
            f'/api/users/{self.expert.username}/admin_update_partner/',
            {'withdrawal_fee_percent': '5'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.withdrawal_fee_percent, Decimal('5.00'))
