from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from .models import ExpertReview, ExpertStatistics


@receiver([post_save, post_delete], sender=ExpertReview)
def update_expert_rating(sender, instance, **kwargs):
    """
    Автоматически пересчитывает средний рейтинг эксперта
    при создании, обновлении или удалении отзыва
    """
    expert = instance.expert

    # Получаем или создаем статистику эксперта
    stats, created = ExpertStatistics.objects.get_or_create(expert=expert)

    # Пересчитываем рейтинг (только опубликованные отзывы)
    ratings_data = ExpertReview.objects.filter(
        expert=expert, is_published=True
    ).aggregate(
        avg_rating=Avg('rating'),
        total=Count('id')
    )
    
    # Обновляем статистику
    stats.average_rating = round(float(ratings_data['avg_rating'] or 0), 2)
    stats.total_ratings = ratings_data['total'] or 0
    stats.save(update_fields=['average_rating', 'total_ratings', 'last_updated'])
