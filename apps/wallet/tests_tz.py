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
        quote = order_quote('1000')
        self.assertEqual(quote['base_amount'], Decimal('1000.00'))
        self.assertEqual(quote['service_fee'], Decimal('250.00'))
        self.assertEqual(quote['acquiring_fee'], Decimal('18.75'))
        self.assertEqual(quote['total'], Decimal('1268.75'))

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
