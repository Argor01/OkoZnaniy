from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.catalog.models import DiscountRule, Subject, WorkType
from apps.orders.models import Order

User = get_user_model()


class OrderModelBehaviorTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_user = User.objects.create_user(
            username='order_client_model',
            email='order_client_model@example.com',
            password='testpass123',
            role='client',
        )
        cls.subject = Subject.objects.create(name='Order model subject')
        cls.work_type = WorkType.objects.create(name='Order model work type')

    def setUp(self):
        self.order = Order.objects.create(
            client=self.client_user,
            subject=self.subject,
            work_type=self.work_type,
            title='Model order',
            description='Order model tests',
            budget=Decimal('5000.00'),
            deadline=timezone.now() + timedelta(days=3),
            status='new',
        )

    def test_freeze_sets_flags_and_reason(self):
        self.order.freeze('Need investigation')
        self.order.refresh_from_db()

        self.assertTrue(self.order.is_frozen)
        self.assertEqual(self.order.frozen_reason, 'Need investigation')
        self.assertIsNotNone(self.order.frozen_at)

    def test_freeze_is_idempotent_when_order_already_frozen(self):
        self.order.freeze('First reason')
        first_frozen_at = self.order.frozen_at

        self.order.freeze('Second reason')
        self.order.refresh_from_db()

        self.assertEqual(self.order.frozen_reason, 'First reason')
        self.assertEqual(self.order.frozen_at, first_frozen_at)

    def test_unfreeze_clears_flags_and_extends_deadline(self):
        original_deadline = self.order.deadline
        self.order.is_frozen = True
        self.order.frozen_reason = 'Paused'
        self.order.frozen_at = timezone.now() - timedelta(hours=6)
        self.order.save(update_fields=['is_frozen', 'frozen_reason', 'frozen_at'])

        self.order.unfreeze()
        self.order.refresh_from_db()

        self.assertFalse(self.order.is_frozen)
        self.assertEqual(self.order.frozen_reason, '')
        self.assertIsNone(self.order.frozen_at)
        self.assertGreater(self.order.deadline, original_deadline)

    def test_unfreeze_is_noop_for_unfrozen_order(self):
        original_deadline = self.order.deadline
        self.order.unfreeze()
        self.order.refresh_from_db()

        self.assertFalse(self.order.is_frozen)
        self.assertEqual(self.order.deadline, original_deadline)

    def test_apply_percentage_discount_updates_prices(self):
        discount = DiscountRule.objects.create(
            name='Percent order discount',
            discount_type='percentage',
            value=Decimal('10.00'),
            valid_from=timezone.now() - timedelta(days=1),
            is_active=True,
        )
        discount.work_types.add(self.work_type)

        applied = self.order.apply_discount(discount)
        self.order.refresh_from_db()

        self.assertTrue(applied)
        self.assertEqual(self.order.original_price, Decimal('5000.00'))
        self.assertEqual(self.order.discount_amount, Decimal('500.00'))
        self.assertEqual(self.order.final_price, Decimal('4500.00'))
        self.assertEqual(self.order.budget, Decimal('4500.00'))

    def test_apply_fixed_discount_is_capped_by_order_budget(self):
        discount = DiscountRule.objects.create(
            name='Fixed order discount',
            discount_type='fixed',
            value=Decimal('9999.00'),
            valid_from=timezone.now() - timedelta(days=1),
            is_active=True,
        )
        discount.work_types.add(self.work_type)

        applied = self.order.apply_discount(discount)
        self.order.refresh_from_db()

        self.assertTrue(applied)
        self.assertEqual(self.order.discount_amount, Decimal('5000.00'))
        self.assertEqual(self.order.final_price, Decimal('0.00'))
        self.assertEqual(self.order.budget, Decimal('0.00'))

    def test_apply_discount_rejects_inactive_rule(self):
        discount = DiscountRule.objects.create(
            name='Inactive discount',
            discount_type='percentage',
            value=Decimal('10.00'),
            valid_from=timezone.now() - timedelta(days=1),
            is_active=False,
        )

        applied = self.order.apply_discount(discount)
        self.order.refresh_from_db()

        self.assertFalse(applied)
        self.assertIsNone(self.order.discount)
        self.assertEqual(self.order.budget, Decimal('5000.00'))

    def test_remove_discount_restores_original_price(self):
        discount = DiscountRule.objects.create(
            name='Temporary discount',
            discount_type='percentage',
            value=Decimal('20.00'),
            valid_from=timezone.now() - timedelta(days=1),
            is_active=True,
        )
        discount.work_types.add(self.work_type)
        self.order.apply_discount(discount)

        self.order.remove_discount()
        self.order.refresh_from_db()

        self.assertIsNone(self.order.discount)
        self.assertIsNone(self.order.original_price)
        self.assertEqual(self.order.discount_amount, Decimal('0.00'))
        self.assertIsNone(self.order.final_price)
        self.assertEqual(self.order.budget, Decimal('5000.00'))

    def test_clean_rejects_past_deadline(self):
        self.order.deadline = timezone.now() - timedelta(minutes=1)

        with self.assertRaises(ValidationError):
            self.order.clean()
