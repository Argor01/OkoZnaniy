from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0013_order_has_issues'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_frozen',
            field=models.BooleanField(default=False, verbose_name='Заморожен'),
        ),
        migrations.AddField(
            model_name='order',
            name='frozen_reason',
            field=models.TextField(blank=True, verbose_name='Причина заморозки'),
        ),
        migrations.AddField(
            model_name='order',
            name='frozen_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата заморозки'),
        ),
    ]
