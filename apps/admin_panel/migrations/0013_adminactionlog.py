from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0012_support_files_and_sla'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AdminActionLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=80)),
                ('object_type', models.CharField(blank=True, max_length=80)),
                ('object_id', models.CharField(blank=True, max_length=80)),
                ('description', models.TextField(blank=True)),
                ('meta', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='admin_action_logs', to=settings.AUTH_USER_MODEL)),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='admin_targeted_action_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Admin action log',
                'verbose_name_plural': 'Admin action logs',
                'db_table': 'admin_action_logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
