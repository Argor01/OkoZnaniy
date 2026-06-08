from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_add_sberbank_payment_method'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('sbp', 'Система быстрых платежей'),
                    ('card', 'Банковская карта'),
                    ('sberbank', 'Сбербанк'),
                    ('sberpay_qr', 'SberPay QR'),
                ],
                max_length=20,
                verbose_name='Способ оплаты',
            ),
        ),
    ]
