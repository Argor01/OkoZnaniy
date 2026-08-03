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


@shared_task
def expire_ready_work_transfers():
    """
    Для заказов в статусе «Передача готовой работы» с истёкшим таймером
    отправляет эксперту ОДНОКРАТНОЕ уведомление, что клиент может в любой
    момент отменить заказ (деньги вернутся, эксперту будет выставлен
    автоматический отзыв 1★).

    Сам заказ статус не меняет — он остаётся «Передача готовой работы», пока
    клиент не отменит его (или пока эксперт не загрузит работу и клиент не
    примет её).
    """
    from apps.orders.models import Order
    from apps.notifications.services import NotificationService
    from apps.notifications.models import NotificationType

    now = timezone.now()
    overdue = Order.objects.filter(
        status=Order.READY_WORK_TRANSFER,
        transfer_deadline__lte=now,
        transfer_deadline_notified_at__isnull=True,
    ).select_related('expert', 'client')

    count = 0
    for order in overdue:
        if order.expert_id is None:
            # Не у кого уведомлять — просто отметимся, чтобы не крутилось вечно.
            order.transfer_deadline_notified_at = now
            order.save(update_fields=['transfer_deadline_notified_at', 'updated_at'])
            continue

        try:
            NotificationService.create_notification(
                recipient=order.expert,
                type=NotificationType.EXPERT_VIOLATION,
                title='Срок передачи готовой работы истёк',
                message=(
                    f'Клиент может в любой момент отменить заказ №{order.id} «{order.title}». '
                    f'В этом случае деньги вернутся покупателю, а вам будет выставлен '
                    f'автоматический отзыв с оценкой 1★.'
                ),
                related_object_id=order.id,
                related_object_type='order',
                data={
                    'order_id': order.id,
                    'reason': 'transfer_deadline_expired',
                },
            )
            order.transfer_deadline_notified_at = now
            order.save(update_fields=['transfer_deadline_notified_at', 'updated_at'])
            count += 1
        except Exception as e:
            logger.error(
                f"Ошибка уведомления эксперта о просрочке передачи заказа {order.id}: {e}"
            )

    if count:
        logger.info(f"Отправлено {count} уведомлений экспертам о просрочке передачи готовой работы")
    return f"Уведомлений о просрочке передачи: {count}"
