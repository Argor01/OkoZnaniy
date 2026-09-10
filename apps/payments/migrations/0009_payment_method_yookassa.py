from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0008_alter_payment_payment_method'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('sbp', 'Система быстрых платежей'),
                    ('card', 'Банковская карта'),
                    ('sberbank', 'Sberbank'),
                    ('sberpay_qr', 'SberPay QR'),
                    ('tbank', 'Т-Банк'),
                    ('yookassa', 'ЮKassa'),
                ],
                max_length=20,
                verbose_name='Способ оплаты',
            ),
        ),
    ]
