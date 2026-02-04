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
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat', '-created_at']),
            models.Index(fields=['sender', 'is_read']),
        ]

    def clean(self):
        if not (self.text or self.file):
            raise ValidationError("Укажите текст сообщения или прикрепите файл.")
        if self.text:
            import re
            if re.search(r"(?:@|\+7|https?://|\d{9,})", self.text, re.I):
                raise ValidationError("Контактные данные запрещены в чате.")

    def __str__(self):
        preview = (self.text or (self.file_name or "файл"))[:30]
        return f"{self.sender.username}: {preview}"
