# Generated manually for chat moderation features

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat', '0012_contactviolationlog_chat_contac_user_id_f5486d_idx_and_more'),
    ]

    operations = [
        # Добавляем поля модерации в Chat
        migrations.AddField(
            model_name='chat',
            name='is_frozen',
            field=models.BooleanField(default=False, verbose_name='Заморожен'),
        ),
        migrations.AddField(
            model_name='chat',
            name='frozen_reason',
            field=models.TextField(blank=True, verbose_name='Причина заморозки'),
        ),
        migrations.AddField(
            model_name='chat',
            name='frozen_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата заморозки'),
        ),
        
        # Удаляем старые поля ContactViolationLog
        migrations.RemoveField(
            model_name='contactviolationlog',
            name='action_taken',
        ),
        migrations.RemoveField(
            model_name='contactviolationlog',
            name='detected_at',
        ),
        migrations.RemoveField(
            model_name='contactviolationlog',
            name='notes',
        ),
        migrations.RemoveField(
            model_name='contactviolationlog',
            name='violation_text',
        ),
        
        # Обновляем связи ContactViolationLog
        migrations.AlterField(
            model_name='contactviolationlog',
            name='chat',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contact_violations', to='chat.chat', verbose_name='Чат'),
        ),
        migrations.AlterField(
            model_name='contactviolationlog',
            name='message',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='contact_violations', to='chat.message', verbose_name='Сообщение'),
        ),
        
        # Добавляем новые поля ContactViolationLog
        migrations.AddField(
            model_name='contactviolationlog',
            name='violation_type',
            field=models.CharField(choices=[('phone', 'Номер телефона'), ('email', 'Email адрес'), ('telegram', 'Telegram'), ('whatsapp', 'WhatsApp'), ('social', 'Социальные сети'), ('keywords', 'Подозрительные ключевые слова'), ('multiple', 'Несколько типов контактов')], default='phone', max_length=20, verbose_name='Тип нарушения'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='detected_data',
            field=models.JSONField(default=dict, verbose_name='Обнаруженные данные'),
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='risk_level',
            field=models.CharField(choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий')], default='medium', max_length=10, verbose_name='Уровень риска'),
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='status',
            field=models.CharField(choices=[('pending', 'Ожидает проверки'), ('approved', 'Одобрено'), ('rejected', 'Отклонено'), ('resolved', 'Решено')], default='pending', max_length=20, verbose_name='Статус'),
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='reviewed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_violations', to=settings.AUTH_USER_MODEL, verbose_name='Проверил'),
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата проверки'),
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='admin_decision',
            field=models.TextField(blank=True, verbose_name='Решение администратора'),
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='Дата создания', null=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='contactviolationlog',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='Дата обновления'),
        ),
        
        # Обновляем Meta класс
        migrations.AlterModelOptions(
            name='contactviolationlog',
            options={'ordering': ['-created_at'], 'verbose_name': 'Нарушение обмена контактами', 'verbose_name_plural': 'Нарушения обмена контактами'},
        ),
        
        # Добавляем новые индексы
        migrations.AddIndex(
            model_name='contactviolationlog',
            index=models.Index(fields=['status', '-created_at'], name='chat_contac_status_f8a9c1_idx'),
        ),
        migrations.AddIndex(
            model_name='contactviolationlog',
            index=models.Index(fields=['risk_level', '-created_at'], name='chat_contac_risk_le_8b2d4f_idx'),
        ),
    ]