from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from apps.catalog.models import Complexity, DiscountRule, Subject, WorkType
from apps.catalog.services import PricingService
from apps.orders.models import Order

User = get_user_model()


class PricingServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='pricing_client',
            email='pricing_client@example.com',
            password='testpass123',
            role='client',
        )
        cls.subject = Subject.objects.create(name='Pricing subject')
        cls.work_type = WorkType.objects.create(
            name='Pricing work type',
            base_price=Decimal('1200.00'),
            estimated_time=24,
        )
        cls.complexity = Complexity.objects.create(
            name='Pricing complexity',
            multiplier=Decimal('1.50'),
        )

    def setUp(self):
        cache.clear()

    def test_hash_requirements_returns_none_for_empty_input(self):
        self.assertIsNone(PricingService._hash_requirements(None))
        self.assertIsNone(PricingService._hash_requirements({}))

    def test_hash_requirements_is_order_independent(self):
        left = PricingService._hash_requirements({'b': 2, 'a': 1})
        right = PricingService._hash_requirements({'a': 1, 'b': 2})
        self.assertEqual(left, right)

    def test_urgency_multiplier_raises_for_past_deadline(self):
        with self.assertRaises(ValueError):
            PricingService._calculate_urgency_multiplier(24, timezone.now() - timedelta(hours=1))

    def test_urgency_multiplier_returns_one_for_non_positive_estimated_time(self):
        multiplier = PricingService._calculate_urgency_multiplier(0, timezone.now() + timedelta(hours=2))
        self.assertEqual(multiplier, Decimal('1.0'))

    def test_urgency_multiplier_increases_for_short_deadline(self):
        multiplier = PricingService._calculate_urgency_multiplier(24, timezone.now() + timedelta(hours=6))
        self.assertGreater(multiplier, Decimal('1.0'))

    def test_urgency_multiplier_decreases_for_long_deadline(self):
        multiplier = PricingService._calculate_urgency_multiplier(24, timezone.now() + timedelta(hours=80))
        self.assertEqual(multiplier, Decimal('0.9'))

    def test_requirements_multiplier_combines_enabled_flags(self):
        multiplier = PricingService._calculate_requirements_multiplier(
            {
                'uniqueness': 95,
                'formatting': True,
                'additional_materials': True,
                'presentation': True,
            }
        )
        self.assertEqual(multiplier, Decimal('1.8975'))

    def test_discount_rule_invalid_when_user_has_not_enough_orders(self):
        discount = DiscountRule.objects.create(
            name='Loyalty',
            discount_type='percentage',
            value=Decimal('10.00'),
            min_orders=1,
            min_total_spent=Decimal('1000.00'),
            valid_from=timezone.now() - timedelta(days=1),
        )
        self.assertFalse(discount.is_valid_for_user(self.user))

    def test_discount_rule_calculates_percentage_discount(self):
        discount = DiscountRule.objects.create(
            name='Percent',
            discount_type='percentage',
            value=Decimal('15.00'),
            valid_from=timezone.now() - timedelta(days=1),
        )
        self.assertEqual(discount.calculate_discount(Decimal('2000.00')), Decimal('300.00'))

    def test_discount_rule_calculates_fixed_discount_capped_by_price(self):
        discount = DiscountRule.objects.create(
            name='Fixed',
            discount_type='fixed',
            value=Decimal('5000.00'),
            valid_from=timezone.now() - timedelta(days=1),
        )
        self.assertEqual(discount.calculate_discount(Decimal('1200.00')), Decimal('1200.00'))

    def test_apply_discounts_chooses_best_valid_discount(self):
        Order.objects.create(
            client=self.user,
            subject=self.subject,
            work_type=self.work_type,
            title='Completed order',
            budget=Decimal('3000.00'),
            final_price=Decimal('3000.00'),
            status='completed',
            deadline=timezone.now() + timedelta(days=2),
        )
        lower = DiscountRule.objects.create(
            name='Lower',
            discount_type='percentage',
            value=Decimal('10.00'),
            min_orders=1,
            valid_from=timezone.now() - timedelta(days=1),
        )
        higher = DiscountRule.objects.create(
            name='Higher',
            discount_type='fixed',
            value=Decimal('500.00'),
            min_orders=1,
            valid_from=timezone.now() - timedelta(days=1),
        )
        lower.work_types.add(self.work_type)
        higher.work_types.add(self.work_type)

        discounted_price, info = PricingService._apply_discounts(Decimal('3000.00'), self.work_type, self.user)

        self.assertEqual(discounted_price, Decimal('2500.00'))
        self.assertEqual(info['name'], 'Higher')
        self.assertEqual(info['amount'], Decimal('500.00'))

    def test_calculate_order_price_rounds_to_hundreds(self):
        deadline = timezone.now() + timedelta(hours=20)
        price = PricingService.calculate_order_price(
            self.work_type,
            self.complexity,
            deadline,
            additional_requirements={'uniqueness': 95},
        )
        self.assertEqual(price % 100, 0)

    def test_get_price_breakdown_contains_discount_details(self):
        Order.objects.create(
            client=self.user,
            subject=self.subject,
            work_type=self.work_type,
            title='Completed order for breakdown',
            budget=Decimal('4000.00'),
            final_price=Decimal('4000.00'),
            status='completed',
            deadline=timezone.now() + timedelta(days=3),
        )
        discount = DiscountRule.objects.create(
            name='Breakdown discount',
            discount_type='fixed',
            value=Decimal('300.00'),
            min_orders=1,
            valid_from=timezone.now() - timedelta(days=1),
        )
        discount.work_types.add(self.work_type)

        breakdown = PricingService.get_price_breakdown(
            self.work_type,
            self.complexity,
            timezone.now() + timedelta(hours=30),
            user=self.user,
            additional_requirements={'formatting': True},
        )

        self.assertIn('discount_details', breakdown)
        self.assertEqual(breakdown['discount_details']['name'], 'Breakdown discount')
        self.assertGreaterEqual(breakdown['discount_amount'], Decimal('300.00'))
        self.assertEqual(breakdown['final_price'] % 100, 0)
