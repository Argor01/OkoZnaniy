"""Задачи кошелька."""
import logging

from celery import shared_task

logger = logging.getLogger("oko.wallet")


@shared_task(name="apps.wallet.tasks.release_due_payouts")
def release_due_payouts() -> dict:
    """Размораживает выплаты авторам, у которых вышел срок выдержки.

    После приёмки деньги автора остаются замороженными: это запас на
    претензии, которые подают уже после приёмки. Когда срок вышел, деньги
    становятся доступны к выводу.

    Заказ с открытой претензией не размораживаем: спор ещё идёт, и
    выпускать деньги рано.
    """
    from django.utils import timezone

    from apps.wallet.models import Settlement
    from apps.wallet.services import WalletService

    due = Settlement.objects.filter(
        is_released=False,
        release_after__isnull=False,
        release_after__lte=timezone.now(),
    ).select_related('order')

    released = skipped = errors = 0
    for settlement in due:
        order = settlement.order
        if order is not None and getattr(order, 'is_frozen', False):
            # Идёт спор — деньги пока не трогаем.
            skipped += 1
            continue
        try:
            WalletService.release_distributed_escrow(
                settlement,
                description=(
                    f'Выплата по заказу #{order.id} после выдержки'
                    if order else 'Выплата после выдержки'
                ),
            )
            released += 1
        except Exception:  # noqa: BLE001
            errors += 1
            logger.exception(
                'Выдержка: не удалось выплатить по расчёту #%s', settlement.id,
            )

    if released or errors:
        logger.warning(
            'Выдержка выплат: выплачено %s, отложено из-за спора %s, ошибок %s',
            released, skipped, errors,
        )
    return {'released': released, 'skipped': skipped, 'errors': errors}
