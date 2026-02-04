from django.db import models
from django.conf import settings
from apps.orders.models import Order


class InternalMessage(models.Model):
    """Внутренние сообщения между директором и арбитрами"""
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
    ]
    
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_internal_messages',
        verbose_name='Отправитель'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_internal_messages',
        verbose_name='Получатель',
        null=True,
        blank=True,
        help_text='Если не указан, сообщение видно всем арбитрам/директорам'
    )
    text = models.TextField(verbose_name='Текст сообщения')
    claim_id = models.IntegerField(
        verbose_name='ID обращения',
        null=True,
        blank=True,
        help_text='Связанное обращение (если есть)'
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='internal_messages',
        verbose_name='Связанный заказ'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='Приоритет'
    )
    is_read = models.BooleanField(default=False, verbose_name='Прочитано')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='Время прочтения')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    class Meta:
        db_table = 'director_internal_messages'
        verbose_name = 'Внутреннее сообщение'
        verbose_name_plural = 'Внутренние сообщения'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['is_read']),
            models.Index(fields=['claim_id']),
        ]
    
    def __str__(self):
        return f"Сообщение от {self.sender.username} ({self.created_at.strftime('%d.%m.%Y %H:%M')})"


class InternalMessageAttachment(models.Model):
    """Вложения к внутренним сообщениям"""
    
    message = models.ForeignKey(
        InternalMessage,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Сообщение'
    )
    file = models.FileField(
        upload_to='internal_messages/%Y/%m/%d/',
        verbose_name='Файл'
    )
    filename = models.CharField(max_length=255, verbose_name='Имя файла')
    file_size = models.IntegerField(verbose_name='Размер файла (байты)')
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')
    
    class Meta:
        db_table = 'director_internal_message_attachments'
        verbose_name = 'Вложение к сообщению'
        verbose_name_plural = 'Вложения к сообщениям'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"Вложение {self.filename} к сообщению #{self.message.id}"
