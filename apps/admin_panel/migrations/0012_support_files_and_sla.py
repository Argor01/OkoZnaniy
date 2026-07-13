# Generated manually for support attachments and first-response SLA.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0011_supportmessage_read_flags'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportrequest',
            name='first_response_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='support_messages/'),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='file_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='file_size',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
