from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import Order
from .models import ExpertReview
from .tasks import update_expert_statistics


@receiver(post_save, sender=Order)
def update_expert_stats_on_order_change(sender, instance, **kwargs):
    """
    Обновляет статистику эксперта при изменении заказа
    """
    if instance.expert_id:
        update_expert_statistics.delay(instance.expert_id)


@receiver(post_save, sender=ExpertReview)
def update_expert_stats_on_review_change(sender, instance, **kwargs):
    """
    Обновляет статистику эксперта при добавлении или изменении отзыва
    """
    update_expert_statistics.delay(instance.expert_id) 