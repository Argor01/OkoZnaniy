from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0019_set_paid_amount_default'),
        ('payments', '0004_topup_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='order',
            field=models.ForeignKey(
                null=True, blank=True, related_name='transactions',
                on_delete=models.CASCADE, to='orders.order',
            ),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('hold', 'Заморозка'),
                    ('release', 'Разморозка'),
                    ('payout', 'Выплата'),
                    ('commission', 'Комиссия'),
                    ('refund', 'Возврат'),
                    ('topup', 'Пополнение'),
                    ('withdrawal', 'Вывод средств'),
                    ('purchase', 'Покупка'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='description',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='transaction',
            name='balance_after',
            field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='payment',
            field=models.ForeignKey(
                null=True, blank=True, related_name='transactions',
                on_delete=models.SET_NULL, to='payments.payment',
            ),
        ),
    ]
