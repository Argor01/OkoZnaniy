# Generated manually for staged support read tracking.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0010_claim_progress'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportmessage',
            name='read_by_user',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='read_by_admin',
            field=models.BooleanField(default=True),
        ),
    ]
