from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0006_alter_claim_ticket_number_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TicketActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(choices=[
                    ('status_change', 'Смена статуса'),
                    ('priority_change', 'Смена приоритета'),
                    ('tag_added', 'Тег добавлен'),
                    ('tag_removed', 'Тег удалён'),
                    ('observer_added', 'Наблюдатель добавлен'),
                    ('observer_removed', 'Наблюдатель удалён'),
                    ('assigned', 'Назначен ответственный'),
                    ('note', 'Служебная заметка'),
                    ('message', 'Сообщение клиенту'),
                    ('created', 'Тикет создан'),
                    ('completed', 'Тикет завершён'),
                ], max_length=30)),
                ('text', models.TextField(blank=True)),
                ('meta', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('claim', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='admin_panel.claim')),
                ('support_request', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='admin_panel.supportrequest')),
            ],
            options={
                'verbose_name': 'Активность тикета',
                'verbose_name_plural': 'Активность тикетов',
                'db_table': 'ticket_activities',
                'ordering': ['created_at'],
            },
        ),
    ]
