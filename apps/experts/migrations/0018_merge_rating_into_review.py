"""
Сливаем модель ExpertRating в ExpertReview.

Шаги:
1. Добавляем `updated_at` в ExpertReview, чтобы сохранить семантику ExpertRating.
2. Переносим данные из ExpertRating → ExpertReview (по ключу expert+order):
   - если запись в ExpertReview уже есть, дозаливаем недостающие reply/appeal-поля и берём
     более раннюю дату создания;
   - если нет, создаём новую с is_published=True.
3. Меняем related_name OneToOne `ExpertReview.order` с 'expert_review' на 'expert_rating',
   чтобы сохранить обратную совместимость по уже используемому в коде/фронте `order.expert_rating`.
4. Удаляем модель ExpertRating.
"""

from django.conf import settings
from django.db import migrations, models


def copy_ratings_to_reviews(apps, schema_editor):
    ExpertRating = apps.get_model('experts', 'ExpertRating')
    ExpertReview = apps.get_model('experts', 'ExpertReview')

    for rating in ExpertRating.objects.all().iterator():
        review = ExpertReview.objects.filter(
            expert_id=rating.expert_id,
            order_id=rating.order_id,
        ).first()

        if review is None:
            ExpertReview.objects.create(
                expert_id=rating.expert_id,
                order_id=rating.order_id,
                client_id=rating.client_id,
                rating=rating.rating,
                comment=rating.comment or '',
                created_at=rating.created_at,
                is_published=True,
                reply_text=getattr(rating, 'reply_text', '') or '',
                reply_at=getattr(rating, 'reply_at', None),
                is_appealed=bool(getattr(rating, 'is_appealed', False)),
                appeal_reason=getattr(rating, 'appeal_reason', '') or '',
                appeal_at=getattr(rating, 'appeal_at', None),
                appeal_resolved=bool(getattr(rating, 'appeal_resolved', False)),
                appeal_resolution=getattr(rating, 'appeal_resolution', '') or '',
            )
            continue

        # Дозаливаем недостающие поля и берём более раннюю дату создания
        changed = False
        if not review.comment and rating.comment:
            review.comment = rating.comment
            changed = True
        if not review.reply_text and getattr(rating, 'reply_text', ''):
            review.reply_text = rating.reply_text
            review.reply_at = getattr(rating, 'reply_at', None) or review.reply_at
            changed = True
        if not review.is_appealed and getattr(rating, 'is_appealed', False):
            review.is_appealed = True
            review.appeal_reason = getattr(rating, 'appeal_reason', '') or review.appeal_reason
            review.appeal_at = getattr(rating, 'appeal_at', None) or review.appeal_at
            review.appeal_resolved = bool(getattr(rating, 'appeal_resolved', False))
            review.appeal_resolution = (
                getattr(rating, 'appeal_resolution', '') or review.appeal_resolution
            )
            changed = True
        if rating.created_at and rating.created_at < review.created_at:
            review.created_at = rating.created_at
            changed = True
        if changed:
            review.save()


def noop_reverse(apps, schema_editor):
    # Обратная миграция данных не реализуется — возвращать удалённую модель назад смысла нет.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('experts', '0017_review_reply_appeal'),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='expertreview',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='Обновлён'),
        ),
        migrations.RunPython(copy_ratings_to_reviews, noop_reverse),
        migrations.DeleteModel(name='ExpertRating'),
        migrations.AlterField(
            model_name='expertreview',
            name='order',
            field=models.OneToOneField(
                on_delete=models.deletion.CASCADE,
                related_name='expert_rating',
                to='orders.order',
                verbose_name='Заказ',
            ),
        ),
    ]
