from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def expire_old_orders():
    """
    Помечает как истёкшие заказы, которые созданы более 14 дней назад,
    находятся в статусе 'new' и не имеют назначенного эксперта.
    """
    from apps.orders.models import Order
    from apps.notifications.services import NotificationService
    from apps.notifications.models import NotificationType

    threshold = timezone.now() - timedelta(days=14)

    expired_orders = Order.objects.filter(
        status='new',
        expert__isnull=True,
        created_at__lte=threshold,
    )

    count = 0
    for order in expired_orders:
        order.status = 'expired'
        order.save(update_fields=['status', 'updated_at'])
        count += 1

        try:
            NotificationService.create_notification(
                recipient=order.client,
                type=NotificationType.ORDER_EXPIRED,
                title='Срок размещения заказа истёк',
                message=(
                    f'Заказ "{order.title}" был размещён более 14 дней назад '
                    f'и не получил откликов от экспертов. '
                    f'Заказ перемещён в архив. Вы можете продлить его срок.'
                ),
                related_object_id=order.id,
                related_object_type='order',
                data={'order_id': order.id, 'order_title': order.title},
            )
        except Exception as e:
            logger.error(
                f"Ошибка отправки уведомления о истечении заказа {order.id}: {e}"
            )

    logger.info(f"Помечено как истёкшие: {count} заказов")
    return f"Истекло: {count} заказов"
