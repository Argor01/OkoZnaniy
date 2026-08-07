from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0029_remove_order_ready_work_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'Новый'),
                    ('awaiting_expert_acceptance', 'Ожидает ответа эксперта'),
                    ('waiting_payment', 'Ожидает оплаты'),
                    ('in_progress', 'В работе'),
                    ('review', 'На проверке'),
                    ('revision', 'На доработке'),
                    ('completed', 'Выполнен'),
                    ('cancelled', 'Отменен'),
                    ('expired', 'Истёк срок'),
                ],
                default='new',
                max_length=32,
                verbose_name='Статус',
            ),
        ),
    ]
