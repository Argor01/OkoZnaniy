"""
Модели для внутренней коммуникации администраторов и директора
"""
from django.db import models
from django.conf import settings


class InternalMessage(models.Model):
    """Внутреннее сообщение между администраторами и директором"""
    
    MESSAGE_TYPE_CHOICES = [
        ('question', 'Вопрос'),
        ('report', 'Отчёт'),
        ('request', 'Запрос'),
        ('notification', 'Уведомление'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
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
        verbose_name='Получатель'
    )
    subject = models.CharField(
        max_length=255,
        verbose_name='Тема'
    )
    message = models.TextField(
        verbose_name='Сообщение'
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='question',
        verbose_name='Тип сообщения'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='Приоритет'
    )
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name='Родительское сообщение'
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )
    is_archived = models.BooleanField(
        default=False,
        verbose_name='В архиве'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата прочтения'
    )
    
    class Meta:
        verbose_name = 'Внутреннее сообщение'
        verbose_name_plural = 'Внутренние сообщения'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['is_archived', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.sender.username} -> {self.recipient.username}: {self.subject}"


class MeetingRequest(models.Model):
    """Запрос на встречу с директором"""
    
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
        ('completed', 'Завершено'),
        ('cancelled', 'Отменено'),
    ]
    
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='meeting_requests',
        verbose_name='Инициатор'
    )
    director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='director_meetings',
        verbose_name='Директор'
    )
    subject = models.CharField(
        max_length=255,
        verbose_name='Тема встречи'
    )
    description = models.TextField(
        verbose_name='Описание'
    )
    proposed_date = models.DateTimeField(
        verbose_name='Предложенная дата'
    )
    approved_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Утверждённая дата'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус'
    )
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name='Причина отклонения'
    )
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name='Заметки'
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
        verbose_name = 'Запрос на встречу'
        verbose_name_plural = 'Запросы на встречи'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['requester', '-created_at']),
            models.Index(fields=['director', 'status']),
        ]
    
    def __str__(self):
        return f"Встреча: {self.subject} ({self.get_status_display()})"


class MessageAttachment(models.Model):
    """Вложение к внутреннему сообщению"""
    
    message = models.ForeignKey(
        InternalMessage,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Сообщение'
    )
    file = models.FileField(
        upload_to='internal_messages/',
        verbose_name='Файл'
    )
    file_name = models.CharField(
        max_length=255,
        verbose_name='Имя файла'
    )
    file_size = models.IntegerField(
        verbose_name='Размер файла'
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата загрузки'
    )
    
    class Meta:
        verbose_name = 'Вложение'
        verbose_name_plural = 'Вложения'
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} ({self.file_size} bytes)"
