from celery import shared_task
import logging
from .services import ExpertStatisticsService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def update_expert_statistics(self, expert_id):
    """Обновляет статистику конкретного эксперта"""
    from apps.users.models import User
    try:
        expert = User.objects.get(id=expert_id, role='expert')
        statistics = ExpertStatisticsService.update_expert_statistics(expert)
        logger.info(f"Обновлена статистика эксперта {expert_id}: рейтинг={statistics.average_rating}, "
                   f"выполнено={statistics.orders_completed}")
    except User.DoesNotExist:
        logger.warning(f"Эксперт {expert_id} не найден")
    except Exception as e:
        logger.error(f"Ошибка обновления статистики эксперта {expert_id}: {str(e)}")
        self.retry(exc=e, countdown=60)


@shared_task(bind=True)
def update_all_experts_statistics(self):
    """Обновляет статистику всех экспертов"""
    try:
        updated_count = ExpertStatisticsService.update_all_experts_statistics()
        logger.info(f"Обновлена статистика {updated_count} экспертов")
    except Exception as e:
        logger.error(f"Ошибка массового обновления статистики: {str(e)}")
        raise self.retry(exc=e, countdown=300) 