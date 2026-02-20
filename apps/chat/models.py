# Create your models here.
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order


def chat_message_file_path(instance, filename):
    """Путь для сохранения файлов сообщений чата."""
    ext = (filename.split('.')[-1] if '.' in filename else '') or 'bin'
    safe_ext = ext[:20]
    return f"chat/{timezone.now().strftime('%Y/%m/%d')}/{uuid.uuid4().hex}.{safe_ext}"

class Chat(models.Model):
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='chats')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='client_chats')
    expert = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='expert_chats')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL)
    context_title = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order', 'client', 'expert'],
                condition=models.Q(order__isnull=False, client__isnull=False, expert__isnull=False),
                name='unique_chat_per_order_client_expert'
            )
        ]

    def __str__(self):
        if self.order:
            return f"Чат по заказу #{self.order.id}"
        return f"Чат #{self.id}"

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    file = models.FileField(upload_to=chat_message_file_path, blank=True, null=True, verbose_name="Файл")
    file_name = models.CharField(max_length=255, blank=True, verbose_name="Имя файла")
    
    MESSAGE_TYPES = [
        ('text', 'Текст'),
        ('offer', 'Индивидуальное предложение'),
        ('work_offer', 'Предложение готовой работы'),
        ('work_delivery', 'Отправка готовой работы'),
    ]
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text', verbose_name="Тип сообщения")
    offer_data = models.JSONField(blank=True, null=True, verbose_name="Данные предложения")
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat', '-created_at']),
            models.Index(fields=['sender', 'is_read']),
        ]

    def clean(self):
        if not (self.text or self.file or (self.message_type in ['offer', 'work_offer'] and self.offer_data)):
            raise ValidationError("Укажите текст сообщения, прикрепите файл или создайте предложение.")
        if self.text:
            import re
            if re.search(r"(?:@|\+7|https?://|\d{9,})", self.text, re.I):
                raise ValidationError("Контактные данные запрещены в чате.")

    def __str__(self):
        preview = (self.text or (self.file_name or "файл"))[:30]
        return f"{self.sender.username}: {preview}"


# Модели для системы технической поддержки

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
        return self.support_messages.filter(
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
        related_name='support_messages',
        verbose_name='Чат'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_support_messages',
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


class ContactViolationLog(models.Model):
    """Лог нарушений обмена контактными данными"""
    
    ACTION_CHOICES = [
        ('warning', 'Предупреждение'),
        ('ban', 'Бан'),
        ('message_blocked', 'Сообщение заблокировано'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contact_violations',
        verbose_name='Пользователь'
    )
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='violations',
        verbose_name='Чат'
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='violations',
        verbose_name='Сообщение'
    )
    violation_text = models.TextField(verbose_name='Текст нарушения')
    detected_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата обнаружения')
    action_taken = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='Принятое действие'
    )
    notes = models.TextField(blank=True, null=True, verbose_name='Заметки')
    
    class Meta:
        verbose_name = 'Лог нарушения обмена контактами'
        verbose_name_plural = 'Логи нарушений обмена контактами'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['user', '-detected_at']),
            models.Index(fields=['chat', '-detected_at']),
        ]
    
    def __str__(self):
        return f"Нарушение от {self.user.username} в чате #{self.chat.id}"
