from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0003_notification_data_alter_notification_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("new_order", "Новый заказ"),
                    ("new_bid", "Новый отклик"),
                    ("order_taken", "Заказ принят"),
                    ("order_assigned", "Заказ назначен"),
                    ("file_uploaded", "Загружен файл"),
                    ("new_comment", "Новый комментарий"),
                    ("status_changed", "Изменен статус"),
                    ("deadline_soon", "Скоро дедлайн"),
                    ("document_verified", "Документ проверен"),
                    ("specialization_verified", "Специализация подтверждена"),
                    ("review_received", "Получен отзыв"),
                    ("new_rating", "Новый рейтинг"),
                    ("rating_milestone", "Достижение рейтинга"),
                    ("payment_received", "Получена оплата"),
                    ("order_completed", "Заказ завершен"),
                    ("new_contact", "Новое обращение"),
                    ("application_approved", "Анкета одобрена"),
                    ("application_rejected", "Анкета отклонена"),
                ],
                max_length=30,
                verbose_name="Тип уведомления",
            ),
        ),
    ]
