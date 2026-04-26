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
    hidden_for_users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='hidden_chats', blank=True)
    context_title = models.CharField(max_length=255, null=True, blank=True)
    
    # Поля для модерации
    is_frozen = models.BooleanField(default=False, verbose_name='Заморожен')
    frozen_reason = models.TextField(blank=True, verbose_name='Причина заморозки')
    frozen_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата заморозки')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order', 'client', 'expert'],
                condition=models.Q(order__isnull=False, client__isnull=False, expert__isnull=False),
                name='unique_chat_per_order_client_expert'
            ),
            models.UniqueConstraint(
                models.functions.Least('client_id', 'expert_id'),
                models.functions.Greatest('client_id', 'expert_id'),
                condition=models.Q(order__isnull=True, client__isnull=False, expert__isnull=False),
                name='unique_direct_chat_pair'
            )
        ]

    def __str__(self):
        if self.order:
            return f"Чат по заказу #{self.order.id}"
        return f"Чат #{self.id}"
    
    def freeze(self, reason: str):
        """Заморозить чат"""
        from django.utils import timezone
        self.is_frozen = True
        self.frozen_reason = reason
        self.frozen_at = timezone.now()
        self.save(update_fields=['is_frozen', 'frozen_reason', 'frozen_at'])
    
    def unfreeze(self):
        """Разморозить чат"""
        was_frozen = self.is_frozen
        self.is_frozen = False
        self.frozen_reason = ''
        self.frozen_at = None
        self.save(update_fields=['is_frozen', 'frozen_reason', 'frozen_at'])

        if was_frozen:
            self._post_unfreeze_system_message()

    def _post_unfreeze_system_message(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        system_user, _ = User.objects.get_or_create(
            username='system',
            defaults={
                'email': 'system@platform.com',
                'first_name': 'Система',
                'last_name': 'Безопасности',
                'is_active': False,
            },
        )
        Message.objects.create(
            chat=self,
            sender=system_user,
            text=(
                "ЧАТ РАЗМОРОЖЕН\n\n"
                "Администратор завершил проверку. "
                "Обмен контактными данными запрещён правилами платформы — "
                "повторные нарушения приведут к блокировке."
            ),
            message_type='system',
        )


class ChatPin(models.Model):
    """Закреплённые чаты пользователей"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pinned_chats',
        verbose_name='Пользователь'
    )
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='pins',
        verbose_name='Чат'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата закрепления'
    )

    class Meta:
        verbose_name = 'Закреплённый чат'
        verbose_name_plural = 'Закреплённые чаты'
        unique_together = ['user', 'chat']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} закрепил чат #{self.chat.id}"

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
        ('system', 'Системное сообщение'),
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
        # Убираем проверку контактов из clean - она будет в сигналах после сохранения

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
    
    STATUS_CHOICES = [
        ('pending', 'Ожидает проверки'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
        ('resolved', 'Решено'),
    ]
    
    VIOLATION_TYPES = [
        ('phone', 'Номер телефона'),
        ('email', 'Email адрес'),
        ('telegram', 'Telegram'),
        ('whatsapp', 'WhatsApp'),
        ('social', 'Социальные сети'),
        ('keywords', 'Подозрительные ключевые слова'),
        ('multiple', 'Несколько типов контактов'),
    ]
    
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='contact_violations',
        verbose_name='Чат'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contact_violations',
        verbose_name='Пользователь'
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_violations',
        verbose_name='Сообщение'
    )
    violation_type = models.CharField(
        max_length=20,
        choices=VIOLATION_TYPES,
        verbose_name='Тип нарушения'
    )
    detected_data = models.JSONField(
        default=dict,
        verbose_name='Обнаруженные данные'
    )
    risk_level = models.CharField(
        max_length=10,
        choices=[
            ('low', 'Низкий'),
            ('medium', 'Средний'),
            ('high', 'Высокий'),
        ],
        default='medium',
        verbose_name='Уровень риска'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус'
    )
    
    # Поля для администратора
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_violations',
        verbose_name='Проверил'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата проверки'
    )
    admin_decision = models.TextField(
        blank=True,
        verbose_name='Решение администратора'
    )
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    class Meta:
        verbose_name = 'Нарушение обмена контактами'
        verbose_name_plural = 'Нарушения обмена контактами'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['chat', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['risk_level', '-created_at']),
        ]
    
    def __str__(self):
        return f"Нарушение в чате #{self.chat.id} от {self.user.username} ({self.get_violation_type_display()})"
    
    def get_detected_contacts_summary(self):
        """Возвращает краткое описание обнаруженных контактов"""
        summary = []
        data = self.detected_data
        
        if 'phones' in data and data['phones']:
            summary.append(f"Телефоны: {len(data['phones'])}")
        if 'emails' in data and data['emails']:
            summary.append(f"Email: {len(data['emails'])}")
        if 'telegram' in data and data['telegram']:
            summary.append(f"Telegram: {len(data['telegram'])}")
        if 'whatsapp' in data and data['whatsapp']:
            summary.append(f"WhatsApp: {len(data['whatsapp'])}")
        if 'social' in data and data['social']:
            summary.append(f"Соц.сети: {len(data['social'])}")
        if 'keywords' in data and data['keywords']:
            summary.append(f"Ключевые слова: {len(data['keywords'])}")
        
        return '; '.join(summary) if summary else 'Нет данных'
    
    def __str__(self):
        return f"Нарушение от {self.user.username} в чате #{self.chat.id}"
