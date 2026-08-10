import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('orders', '0032_alter_transaction_type')]

    operations = [
        migrations.AlterField(
            model_name='bid',
            name='prepayment_percent',
            field=models.PositiveSmallIntegerField(
                default=50,
                validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)],
                verbose_name='Процент предоплаты',
            ),
        ),
    ]
