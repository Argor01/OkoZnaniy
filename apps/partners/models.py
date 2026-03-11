from django.db import models
from django.conf import settings


class PartnerChatRoom(models.Model):
    """Модель чат-комнаты для партнеров"""
    
    ROOM_TYPE_CHOICES = [
        ('general', 'Общий'),
        ('department', 'Отдел'),
        ('project', 'Проект'),
        ('private', 'Приватный'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    room_type = models.CharField(
        max_length=20,
        choices=ROOM_TYPE_CHOICES,
        default='general',
        verbose_name='Тип комнаты'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='partner_chat_rooms',
        verbose_name='Участники'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_partner_chat_rooms',
        verbose_name='Создатель'
    )
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    class Meta:
        verbose_name = 'Чат-комната партнеров'
        verbose_name_plural = 'Чат-комнаты партнеров'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['is_active', '-updated_at']),
            models.Index(fields=['room_type', '-updated_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_room_type_display()})"


class PartnerChatMessage(models.Model):
    """Модель сообщения в чат-комнате партнеров"""
    
    room = models.ForeignKey(
        PartnerChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Комната'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='partner_chat_messages',
        verbose_name='Отправитель'
    )
    message = models.TextField(verbose_name='Сообщение')
    is_system = models.BooleanField(default=False, verbose_name='Системное сообщение')
    is_pinned = models.BooleanField(default=False, verbose_name='Закреплено')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    
    class Meta:
        verbose_name = 'Сообщение в чате партнеров'
        verbose_name_plural = 'Сообщения в чатах партнеров'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['is_pinned', '-created_at']),
        ]
    
    def __str__(self):
        return f"Сообщение от {self.sender.username} в {self.room.name}"