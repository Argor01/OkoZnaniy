from django.db import migrations, models


class Migration(migrations.Migration):
    """Объединяет 0002_add_application_submitted_type + 0005_alter_notification_type
    и расширяет список выборов типа уведомления для системы отзывов и претензий.
    """

    dependencies = [
        ('notifications', '0002_add_application_submitted_type'),
        ('notifications', '0005_alter_notification_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('new_order', 'Новый заказ'),
                    ('new_bid', 'Новый отклик'),
                    ('order_taken', 'Заказ принят'),
                    ('order_assigned', 'Заказ назначен'),
                    ('file_uploaded', 'Загружен файл'),
                    ('new_comment', 'Новый комментарий'),
                    ('status_changed', 'Изменен статус'),
                    ('deadline_soon', 'Скоро дедлайн'),
                    ('document_verified', 'Документ проверен'),
                    ('specialization_verified', 'Специализация подтверждена'),
                    ('review_received', 'Получен отзыв'),
                    ('new_rating', 'Новый рейтинг'),
                    ('rating_milestone', 'Достижение рейтинга'),
                    ('payment_received', 'Получена оплата'),
                    ('order_completed', 'Заказ завершен'),
                    ('new_contact', 'Новое обращение'),
                    ('application_submitted', 'Анкета подана'),
                    ('application_approved', 'Анкета одобрена'),
                    ('application_rejected', 'Анкета отклонена'),
                    ('expert_violation', 'Нарушение правил экспертом'),
                    ('new_answer', 'Новый ответ на вопрос'),
                    ('complaint_filed', 'На вас подана претензия'),
                    ('review_request', 'Оставьте отзыв о работе'),
                    ('review_reply', 'Ответ на ваш отзыв'),
                    ('review_appeal', 'Обжалование отзыва'),
                ],
                max_length=30,
                verbose_name='Тип уведомления',
            ),
        ),
    ]
