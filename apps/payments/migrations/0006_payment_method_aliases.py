from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_alter_payment_payment_method'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('sbp', 'РЎРёСЃС‚РµРјР° Р±С‹СЃС‚СЂС‹С… РїР»Р°С‚РµР¶РµР№'),
                    ('card', 'Р‘Р°РЅРєРѕРІСЃРєР°СЏ РєР°СЂС‚Р°'),
                    ('sberbank', 'Sberbank'),
                    ('sberpay_qr', 'SberPay QR'),
                ],
                max_length=20,
                verbose_name='РЎРїРѕСЃРѕР± РѕРїР»Р°С‚С‹',
            ),
        ),
    ]
