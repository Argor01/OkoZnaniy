import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def release_ready_work_holds():
    now = timezone.now()

    from apps.shop.models import Purchase
    from apps.wallet.services import WalletService

    expired = Purchase.objects.filter(
        status='paid',
        hold_until__lte=now,
    ).select_related('work', 'work__author', 'buyer')

    count = 0
    for purchase in expired:
        try:
            WalletService.release_to_expert(
                client=purchase.buyer,
                expert=purchase.work.author,
                amount=purchase.price_paid,
                description=f'Выплата по покупке готовой работы «{purchase.work.title}»',
            )
            purchase.status = Purchase.Status.COMPLETED
            purchase.save(update_fields=['status'])
            count += 1
        except Exception as e:
            logger.error(
                f"Ошибка автовыплаты по покупке #{purchase.id}: {e}"
            )

    if count:
        logger.info(f"Автовыплачено: {count} покупок готовых работ")
    return f"Автовыплачено: {count} покупок"
