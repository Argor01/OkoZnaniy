from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0020_add_vk_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='has_custom_username',
            field=models.BooleanField(default=False, verbose_name='Пользователь задал никнейм вручную'),
        ),
    ]
