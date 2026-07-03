from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0020_extend_transaction'),
        ('shop', '0005_allow_repeat_purchases'),
    ]

    operations = [
        migrations.AddField(
            model_name='readywork',
            name='execution_days',
            field=models.PositiveIntegerField(default=7, verbose_name='Срок выполнения в днях'),
        ),
        migrations.AddField(
            model_name='purchase',
            name='order',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='shop_purchases', to='orders.order', verbose_name='Заказ'),
        ),
    ]
