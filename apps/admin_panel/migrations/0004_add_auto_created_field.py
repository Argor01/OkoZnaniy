# Generated manually for auto_created field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0003_supportrequest_support_chat'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportrequest',
            name='auto_created',
            field=models.BooleanField(default=False, verbose_name='Создан автоматически'),
        ),
    ]