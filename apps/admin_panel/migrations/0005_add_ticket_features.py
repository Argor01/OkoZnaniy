# Generated manually for ticket features

from django.conf import settings
from django.db import migrations, models
import apps.admin_panel.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('admin_panel', '0004_add_auto_created_field'),
    ]

    operations = [
        # SupportRequest changes
        migrations.AddField(
            model_name='supportrequest',
            name='ticket_number',
            field=models.CharField(default=apps.admin_panel.models.generate_ticket_number, max_length=16, unique=True, verbose_name='Номер тикета'),
        ),
        migrations.AddField(
            model_name='supportrequest',
            name='assigned_users',
            field=models.ManyToManyField(blank=True, related_name='assigned_support_requests', to=settings.AUTH_USER_MODEL, verbose_name='Назначенные сотрудники'),
        ),
        migrations.AddField(
            model_name='supportrequest',
            name='tags',
            field=models.TextField(blank=True, help_text='Теги через запятую, например: #негатив, #срочно, #баг', verbose_name='Теги'),
        ),
        
        # Claim changes
        migrations.AddField(
            model_name='claim',
            name='ticket_number',
            field=models.CharField(default=apps.admin_panel.models.generate_ticket_number, max_length=16, unique=True, verbose_name='Номер тикета'),
        ),
        migrations.AddField(
            model_name='claim',
            name='assigned_users',
            field=models.ManyToManyField(blank=True, related_name='assigned_claims', to=settings.AUTH_USER_MODEL, verbose_name='Назначенные сотрудники'),
        ),
        migrations.AddField(
            model_name='claim',
            name='tags',
            field=models.TextField(blank=True, help_text='Теги через запятую, например: #негатив, #срочно, #баг', verbose_name='Теги'),
        ),
    ]