from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0027_order_transfer_deadline_notified_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='order',
            name='transfer_started_at',
        ),
        migrations.RemoveField(
            model_name='order',
            name='transfer_deadline',
        ),
        migrations.RemoveField(
            model_name='order',
            name='is_ready_work_purchase',
        ),
        migrations.RemoveField(
            model_name='order',
            name='transfer_deadline_notified_at',
        ),
        migrations.RemoveField(
            model_name='order',
            name='auto_bad_review_issued',
        ),
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
                max_length=30,
            ),
        ),
    ]
