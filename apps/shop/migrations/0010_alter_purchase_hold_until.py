from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0009_purchase_status_paid_at_hold_until'),
    ]

    operations = [
        migrations.AlterField(
            model_name='purchase',
            name='hold_until',
            field=models.DateTimeField(
                help_text='До этой даты покупатель может открыть спор. После — средства переводятся эксперту.',
                verbose_name='Удержание до',
            ),
        ),
    ]
