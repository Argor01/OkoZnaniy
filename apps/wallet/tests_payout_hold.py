"""Выдержка выплаты автору после приёмки.

Заказчик принял работу — деньги автора остаются замороженными ещё
несколько дней. Это запас на претензии, которые подают уже после
приёмки: пока деньги не выведены, вернуть их несравнимо проще.

Мелкие заказы выдаются сразу: держать десять дней сотню рублей значит
раздражать автора ради риска, которого нет.
"""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone

from apps.orders.views import _payout_hold_until
from apps.wallet.tasks import release_due_payouts


@override_settings(EXPERT_PAYOUT_HOLD_DAYS=10, EXPERT_PAYOUT_HOLD_MIN_AMOUNT=Decimal('1000'))
class PayoutHoldRuleTests(TestCase):
    """Кому выдержка, а кому сразу."""

    def test_small_order_is_paid_out_at_once(self):
        self.assertIsNone(_payout_hold_until(Decimal('100.00')))

    def test_amount_just_below_threshold_is_paid_out_at_once(self):
        self.assertIsNone(_payout_hold_until(Decimal('999.99')))

    def test_amount_at_threshold_is_held(self):
        """Порог включительно: ровно пороговая сумма уже крупная."""
        self.assertIsNotNone(_payout_hold_until(Decimal('1000.00')))

    def test_large_order_is_held_for_configured_days(self):
        until = _payout_hold_until(Decimal('15000.00'))
        self.assertIsNotNone(until)
        expected = timezone.now() + timedelta(days=10)
        # Сравниваем по дате: секунды между вызовами роли не играют.
        self.assertEqual(until.date(), expected.date())

    @override_settings(EXPERT_PAYOUT_HOLD_DAYS=0)
    def test_zero_days_disables_hold_entirely(self):
        """Срок 0 — выдержки нет вовсе, даже для крупных заказов."""
        self.assertIsNone(_payout_hold_until(Decimal('15000.00')))


class ReleaseDuePayoutsTests(TestCase):
    """Разморозка по расписанию."""

    def _settlement(self, release_after, frozen_order=False):
        from django.contrib.auth import get_user_model

        from apps.catalog.models import Subject, WorkType
        from apps.orders.models import Order
        from apps.wallet.models import Settlement
        from apps.wallet.services import WalletService

        User = get_user_model()
        tag = f'{release_after.timestamp():.6f}'.replace('.', '')[-9:]
        client = User.objects.create(username=f'hold_c{tag}', role='client')
        expert = User.objects.create(username=f'hold_e{tag}', role='expert')
        subject = Subject.objects.create(name=f'Предмет {tag}')
        work_type = WorkType.objects.create(name=f'Тип {tag}')
        order = Order.objects.create(
            client=client, expert=expert, subject=subject, work_type=work_type,
            title='Заказ', description='...', budget=Decimal('1000.00'),
            deadline=timezone.now() + timedelta(days=5), status='completed',
        )
        if frozen_order:
            order.freeze('Открыта претензия')

        WalletService.topup(client, Decimal('1250.00'))
        WalletService.fund_distributed_escrow(
            client=client, expert=expert,
            base_amount=Decimal('1000.00'), service_fee=Decimal('250.00'),
            fund_amount=Decimal('1250.00'), order=order,
        )
        settlement = Settlement.objects.get(order=order)
        settlement.release_after = release_after
        settlement.save(update_fields=['release_after'])
        return settlement, expert

    def test_due_payout_is_released(self):
        settlement, expert = self._settlement(timezone.now() - timedelta(minutes=1))
        # Резерв заводился через сервис — в памяти объект об этом не знает.
        expert.refresh_from_db()
        frozen_before = expert.frozen_balance
        self.assertEqual(frozen_before, Decimal('1000.00'))

        result = release_due_payouts()

        settlement.refresh_from_db()
        expert.refresh_from_db()
        self.assertEqual(result['released'], 1)
        self.assertTrue(settlement.is_released)
        self.assertLess(expert.frozen_balance, frozen_before)

    def test_payout_before_its_time_is_left_alone(self):
        settlement, _ = self._settlement(timezone.now() + timedelta(days=5))

        result = release_due_payouts()

        settlement.refresh_from_db()
        self.assertEqual(result['released'], 0)
        self.assertFalse(settlement.is_released)

    def test_disputed_order_is_not_released(self):
        """Спор ещё идёт — выпускать деньги рано."""
        settlement, _ = self._settlement(
            timezone.now() - timedelta(minutes=1), frozen_order=True,
        )

        result = release_due_payouts()

        settlement.refresh_from_db()
        self.assertEqual(result['released'], 0)
        self.assertEqual(result['skipped'], 1)
        self.assertFalse(settlement.is_released)

    def test_second_run_does_not_pay_twice(self):
        settlement, expert = self._settlement(timezone.now() - timedelta(minutes=1))

        release_due_payouts()
        expert.refresh_from_db()
        after_first = expert.balance
        release_due_payouts()

        expert.refresh_from_db()
        self.assertEqual(expert.balance, after_first)
