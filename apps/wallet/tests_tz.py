from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.users.models import User, PartnerEarning
from apps.wallet.policy import order_quote, withdrawal_quote
from apps.wallet.services import WalletService, get_system_account


class ApprovedFinanceSpecificationTests(TestCase):
    def setUp(self):
        self.partner = User.objects.create_user(username='partner-tz', role='partner', partner_commission_rate=25)
        self.client = User.objects.create_user(username='client-tz', role='client', partner=self.partner, partner_linked_at=timezone.now())
        self.expert = User.objects.create_user(username='expert-tz', role='expert')

    def test_order_quote_for_1000_matches_tz(self):
        """Сервисный сбор 25% и эквайринг 3.5% сверх суммы с сбором.

        Ставка приёма поднята с 1.5% до фактической: ЮKassa удерживает
        3.5%, и раньше разницу доплачивала площадка из своей доли.
        """
        quote = order_quote('1000')
        self.assertEqual(quote['base_amount'], Decimal('1000.00'))
        self.assertEqual(quote['service_fee'], Decimal('250.00'))
        self.assertEqual(quote['acquiring_fee'], Decimal('43.75'))
        self.assertEqual(quote['total'], Decimal('1293.75'))

    def test_withdrawal_keeps_its_own_acquiring_rate(self):
        """Вывод — перевод на карту, ставка приёма платежей его не касается."""
        from apps.wallet.policy import (
            ACQUIRING_FEE_PERCENT, PAYOUT_ACQUIRING_FEE_PERCENT,
        )

        self.assertNotEqual(ACQUIRING_FEE_PERCENT, PAYOUT_ACQUIRING_FEE_PERCENT)
        quote = withdrawal_quote('1000', 'expert')
        self.assertEqual(
            quote['acquiring_fee'],
            Decimal('1000') * PAYOUT_ACQUIRING_FEE_PERCENT / 100,
        )

    def test_acquiring_fee_is_paid_on_top_by_the_client(self):
        """Комиссия банка не съедает долю автора: она добавляется сверху."""
        quote = order_quote('1000')
        self.assertEqual(
            quote['total'],
            quote['base_amount'] + quote['service_fee'] + quote['acquiring_fee'],
        )

    def test_expert_withdrawal_is_15_plus_1_5_percent(self):
        quote = withdrawal_quote('1000', 'expert')
        self.assertEqual(quote['platform_fee'], Decimal('150.00'))
        self.assertEqual(quote['acquiring_fee'], Decimal('15.00'))
        self.assertEqual(quote['net'], Decimal('835.00'))

    def test_release_pays_author_1000_and_partner_250(self):
        WalletService.topup(self.client, Decimal('1250'))
        WalletService.hold(self.client, Decimal('1250'))
        result = WalletService.release_order_payment(
            client=self.client, expert=self.expert,
            base_amount=Decimal('1000'), service_fee=Decimal('250'),
            source_key='test:release',
        )
        self.client.refresh_from_db(); self.expert.refresh_from_db(); self.partner.refresh_from_db()
        self.assertEqual(self.client.balance, Decimal('0.00'))
        self.assertEqual(self.client.frozen_balance, Decimal('0.00'))
        self.assertEqual(self.expert.balance, Decimal('1000.00'))
        self.assertEqual(self.partner.balance, Decimal('250.00'))
        self.assertEqual(result['service_fee'], Decimal('250.00'))
        self.assertTrue(PartnerEarning.objects.get(source_key='test:release').is_paid)

    def test_expired_referral_fee_goes_to_directors(self):
        self.client.partner_linked_at = timezone.now() - timedelta(days=184)
        self.client.save(update_fields=['partner_linked_at'])
        WalletService.topup(self.client, Decimal('1250'))
        WalletService.hold(self.client, Decimal('1250'))
        WalletService.release_order_payment(
            client=self.client, expert=self.expert,
            base_amount=Decimal('1000'), service_fee=Decimal('250'),
            source_key='test:expired',
        )
        self.partner.refresh_from_db(); system = get_system_account(); system.refresh_from_db()
        self.assertEqual(self.partner.balance, Decimal('0.00'))
        self.assertEqual(system.balance, Decimal('250.00'))

    def test_release_is_atomic_when_hold_is_insufficient(self):
        WalletService.topup(self.client, Decimal('1000'))
        WalletService.hold(self.client, Decimal('1000'))
        with self.assertRaises(Exception):
            WalletService.release_order_payment(
                client=self.client, expert=self.expert,
                base_amount=Decimal('1000'), service_fee=Decimal('250'),
                source_key='test:insufficient',
            )
        self.expert.refresh_from_db(); self.partner.refresh_from_db()
        self.assertEqual(self.expert.balance, Decimal('0.00'))
        self.assertEqual(self.partner.balance, Decimal('0.00'))


class PaymentQuoteEndpointTests(TestCase):
    """Разбивку суммы считает сервер.

    Интерфейс раньше умножал на зашитые 25% и 1.5% и расходился с
    сервером у клиентов с индивидуальной ставкой сервисного сбора.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='quote-client', email='quote@example.com',
            password='pwd', role='client',
        )
        self.url = '/api/wallet/quote/'

    def test_topup_quote_adds_acquiring_on_top(self):
        self.client.force_login(self.user)
        body = self.client.get(self.url, {'amount': '1000', 'kind': 'topup'}).json()
        self.assertEqual(body['wallet_credit'], '1000.00')
        self.assertEqual(body['acquiring_fee'], '35.00')
        self.assertEqual(body['total'], '1035.00')
        self.assertEqual(body['acquiring_fee_percent'], '3.5')

    def test_order_quote_matches_the_policy(self):
        self.client.force_login(self.user)
        body = self.client.get(self.url, {'amount': '1000', 'kind': 'order'}).json()
        self.assertEqual(body['service_fee'], '250.00')
        self.assertEqual(body['service_fee_percent'], '25')
        self.assertEqual(body['acquiring_fee'], '43.75')
        self.assertEqual(body['total'], '1293.75')

    def test_individual_service_fee_is_respected(self):
        self.user.service_fee_percent = Decimal('10')
        self.user.save(update_fields=['service_fee_percent'])
        self.client.force_login(self.user)
        body = self.client.get(self.url, {'amount': '1000', 'kind': 'order'}).json()
        self.assertEqual(body['service_fee'], '100.00')
        self.assertEqual(body['service_fee_percent'], '10')  # не '10.00'
        self.assertEqual(body['total'], '1138.50')

    def test_bad_amount_is_rejected(self):
        self.client.force_login(self.user)
        for value in ('0', '-5', 'сто', ''):
            self.assertEqual(
                self.client.get(self.url, {'amount': value}).status_code, 400, value,
            )

    def test_anonymous_is_rejected(self):
        self.assertIn(self.client.get(self.url, {'amount': '100'}).status_code, (401, 403))
