# Generated manually for ticket features - FIXED VERSION

from django.conf import settings
from django.db import migrations, models
import string
import random


def generate_unique_ticket_number():
    """Генерирует уникальный номер тикета"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))


def populate_ticket_numbers(apps, schema_editor):
    """Заполняет уникальные номера тикетов для существующих записей"""
    SupportRequest = apps.get_model('admin_panel', 'SupportRequest')
    Claim = apps.get_model('admin_panel', 'Claim')
    
    # Обновляем SupportRequest
    used_numbers = set()
    for request in SupportRequest.objects.all():
        while True:
            number = generate_unique_ticket_number()
            if number not in used_numbers:
                used_numbers.add(number)
                request.ticket_number = number
                request.save(update_fields=['ticket_number'])
                break
    
    # Обновляем Claim
    for claim in Claim.objects.all():
        while True:
            number = generate_unique_ticket_number()
            if number not in used_numbers:
                used_numbers.add(number)
                claim.ticket_number = number
                claim.save(update_fields=['ticket_number'])
                break


def reverse_populate_ticket_numbers(apps, schema_editor):
    """Обратная операция - очищает номера тикетов"""
    pass  # Нельзя откатить, так как поля будут удалены


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
            field=models.CharField(max_length=16, null=True, blank=True, verbose_name='Номер тикета'),
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
            field=models.CharField(max_length=16, null=True, blank=True, verbose_name='Номер тикета'),
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
        
        # Заполняем уникальные номера
        migrations.RunPython(populate_ticket_numbers, reverse_populate_ticket_numbers),
        
        # Делаем поля обязательными и уникальными
        migrations.AlterField(
            model_name='supportrequest',
            name='ticket_number',
            field=models.CharField(max_length=16, unique=True, verbose_name='Номер тикета'),
        ),
        migrations.AlterField(
            model_name='claim',
            name='ticket_number',
            field=models.CharField(max_length=16, unique=True, verbose_name='Номер тикета'),
        ),
    ]