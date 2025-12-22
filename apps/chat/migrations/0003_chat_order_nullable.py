# Generated migration for making order field nullable in Chat model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_message_is_read_and_indexes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chat',
            name='order',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='orders.order'),
        ),
    ]
