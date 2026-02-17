"""
Модели для системы технической поддержки
"""
from django.db import models
from django.conf import settings


class SupportChat(models.Model):
    """Чат технической поддержки"""
    
    STATUS_CHOICES = [
        ('open', 'Открыт'),
        ('in_progress', 'В работе'),
        ('resolved', 'Решен'),
        ('closed', 'Закрыт'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]
    
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_chats',
        verbose_name='Клиент'
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_support_chats',
        verbose_name='Администратор'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='open',
        verbose_name='Статус'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='Приоритет'
    )
    subject = models.CharField(
        max_length=255,
        verbose_name='Тема'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    class Meta:
        verbose_name = 'Чат поддержки'
        verbose_name_plural = 'Чаты поддержки'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['status', '-updated_at']),
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['admin', 'status']),
        ]
    
    def __str__(self):
        return f"Чат #{self.id} - {self.subject} ({self.get_status_display()})"
    
    @property
    def unread_count(self):
        """Количество непрочитанных сообщений для клиента"""
        return self.messages.filter(
            sender__role='admin',
            is_read=False
        ).count()


class SupportMessage(models.Model):
    """Сообщение в чате поддержки"""
    
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Текст'),
        ('file', 'Файл'),
        ('system', 'Системное'),
    ]
    
    chat = models.ForeignKey(
        SupportChat,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Чат'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_messages',
        verbose_name='Отправитель'
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='text',
        verbose_name='Тип сообщения'
    )
    text = models.TextField(
        verbose_name='Текст сообщения'
    )
    file = models.FileField(
        upload_to='support_files/',
        null=True,
        blank=True,
        verbose_name='Файл'
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    class Meta:
        verbose_name = 'Сообщение поддержки'
        verbose_name_plural = 'Сообщения поддержки'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat', 'created_at']),
            models.Index(fields=['sender', '-created_at']),
        ]
    
    def __str__(self):
        return f"Сообщение от {self.sender.username} в чате #{self.chat.id}"
