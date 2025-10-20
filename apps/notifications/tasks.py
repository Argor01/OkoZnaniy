from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from apps.orders.models import Order
from .models import Notification
from .services import NotificationService

logger = logging.getLogger(__name__)


@shared_task
def check_deadlines():
    """
    Проверяет заказы на приближающиеся дедлайны и отправляет уведомления
    """
    now = timezone.now()
    
    # Проверяем разные временные интервалы
    intervals = [
        (24, "24 часа"),  # За день до дедлайна
        (12, "12 часов"), # За 12 часов
        (6, "6 часов"),   # За 6 часов
        (2, "2 часа")     # За 2 часа
    ]
    
    notifications_sent = 0
    for hours, label in intervals:
        deadline_threshold = now + timedelta(hours=hours)
        orders = Order.objects.filter(
            status__in=['in_progress', 'revision'],
            deadline__gt=now,
            deadline__lte=deadline_threshold
        ).exclude(
            # Исключаем заказы, для которых уже есть активные уведомления о дедлайне
            Q(notifications__type=NotificationType.DEADLINE_SOON) &
            Q(notifications__created_at__gte=now - timedelta(hours=hours))
        )

        for order in orders:
            try:
                NotificationService.notify_deadline_soon(order, hours)
                notifications_sent += 1
            except Exception as e:
                logger.error(f"Ошибка отправки уведомления о дедлайне для заказа {order.id}: {str(e)}")

    logger.info(f"Отправлено {notifications_sent} уведомлений о приближающихся дедлайнах")
    return f"Отправлено {notifications_sent} уведомлений о приближающихся дедлайнах"


@shared_task
def cleanup_old_notifications():
    """
    Удаляет старые прочитанные уведомления и истекшие уведомления
    """
    now = timezone.now()
    
    # Настройки хранения для разных типов уведомлений
    retention_periods = {
        NotificationType.NEW_ORDER: 30,  # 30 дней для новых заказов
        NotificationType.ORDER_TAKEN: 90,  # 90 дней для принятых заказов
        NotificationType.ORDER_COMPLETED: 180,  # 180 дней для завершенных заказов
        NotificationType.REVIEW_RECEIVED: 365,  # 365 дней для отзывов
        'default': 30  # По умолчанию храним 30 дней
    }
    
    total_deleted = 0
    
    # Удаляем по типам уведомлений
    for notification_type, days in retention_periods.items():
        cutoff_date = now - timedelta(days=days)
        deleted_count, _ = Notification.objects.filter(
            type=notification_type,
            is_read=True,
            created_at__lt=cutoff_date
        ).delete()
        total_deleted += deleted_count
        logger.info(f"Удалено {deleted_count} уведомлений типа {notification_type}")
    
    # Удаляем остальные старые прочитанные уведомления
    default_cutoff = now - timedelta(days=retention_periods['default'])
    deleted_default, _ = Notification.objects.filter(
        is_read=True,
        created_at__lt=default_cutoff
    ).exclude(
        type__in=retention_periods.keys()
    ).delete()
    total_deleted += deleted_default
    
    # Удаляем истекшие уведомления
    deleted_expired, _ = Notification.objects.filter(
        expires_at__lt=now
    ).delete()
    total_deleted += deleted_expired
    
    logger.info(
        f"Всего удалено {total_deleted} уведомлений "
        f"(по типам: {total_deleted - deleted_expired}, истекших: {deleted_expired})"
    )
    return f"Удалено {total_deleted} старых уведомлений" 