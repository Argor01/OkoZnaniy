from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_add_sberpay_qr'),
        ('orders', '0019_set_paid_amount_default'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='purpose',
            field=models.CharField(
                max_length=20,
                choices=[('order', 'Оплата заказа'), ('topup', 'Пополнение кошелька')],
                default='order',
                verbose_name='Назначение платежа',
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='user',
            field=models.ForeignKey(
                null=True, blank=True, related_name='payments',
                on_delete=models.SET_NULL, to=settings.AUTH_USER_MODEL,
                verbose_name='Плательщик',
            ),
        ),
        migrations.AlterField(
            model_name='payment',
            name='order',
            field=models.ForeignKey(
                null=True, blank=True, related_name='payments',
                on_delete=models.PROTECT, to='orders.order',
                verbose_name='Заказ',
            ),
        ),
    ]
