from django.db import models
from django.contrib.auth import get_user_model
import secrets
import string

User = get_user_model()


def generate_ticket_number():
    """Генерирует случайный 16-символьный номер тикета"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(16))


class SupportRequest(models.Model):
    """Запросы в поддержку"""
    STATUS_CHOICES = [
        ('open', 'Открыт'),
        ('in_progress', 'В работе'),
        ('completed', 'Завершен'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]
    
    ticket_number = models.CharField(max_length=16, unique=True, default=generate_ticket_number, verbose_name='Номер тикета')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_requests')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_requests')
    assigned_users = models.ManyToManyField(User, blank=True, related_name='assigned_support_requests', verbose_name='Назначенные сотрудники')
    support_chat = models.ForeignKey('chat.SupportChat', on_delete=models.SET_NULL, null=True, blank=True, related_name='support_request', verbose_name='Чат поддержки')
    subject = models.CharField(max_length=255, verbose_name='Тема')
    description = models.TextField(verbose_name='Описание')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    tags = models.TextField(blank=True, verbose_name='Теги', help_text='Теги через запятую, например: #негатив, #срочно, #баг')
    auto_created = models.BooleanField(default=False, verbose_name='Создан автоматически')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'support_requests'
        ordering = ['-created_at']
        verbose_name = 'Запрос в поддержку'
        verbose_name_plural = 'Запросы в поддержку'
    
    def __str__(self):
        return f"Тикет {self.ticket_number}: {self.subject}"
    
    def get_tags_list(self):
        """Возвращает список тегов"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
    
    def add_tag(self, tag):
        """Добавляет тег"""
        if not tag.startswith('#'):
            tag = f'#{tag}'
        
        current_tags = self.get_tags_list()
        if tag not in current_tags:
            current_tags.append(tag)
            self.tags = ', '.join(current_tags)
            self.save(update_fields=['tags'])
    
    def remove_tag(self, tag):
        """Удаляет тег"""
        if not tag.startswith('#'):
            tag = f'#{tag}'
        
        current_tags = self.get_tags_list()
        if tag in current_tags:
            current_tags.remove(tag)
            self.tags = ', '.join(current_tags)
            self.save(update_fields=['tags'])


class SupportMessage(models.Model):
    """Сообщения в запросах поддержки"""
    request = models.ForeignKey(SupportRequest, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(verbose_name='Сообщение')
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'support_messages'
        ordering = ['created_at']
        verbose_name = 'Сообщение поддержки'
        verbose_name_plural = 'Сообщения поддержки'


class Claim(models.Model):
    """Обращения пользователей (Арбитраж)"""
    STATUS_CHOICES = [
        ('new', 'Новое'),
        ('in_progress', 'В работе'),
        ('completed', 'Завершено'),
        ('pending_approval', 'Ожидает одобрения'),
    ]
    
    TYPE_CHOICES = [
        ('complaint', 'Жалоба'),
        ('refund', 'Возврат средств'),
        ('quality', 'Качество работы'),
        ('other', 'Другое'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]
    
    # Стороны арбитража
    plaintiff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plaintiff_claims', verbose_name='Истец', null=True, blank=True)
    defendant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='defendant_claims', verbose_name='Ответчик', null=True, blank=True)
    
    ticket_number = models.CharField(max_length=16, unique=True, default=generate_ticket_number, verbose_name='Номер тикета')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claims')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_claims')
    assigned_users = models.ManyToManyField(User, blank=True, related_name='assigned_claims', verbose_name='Назначенные сотрудники')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)
    claim_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    
    # Поля для арбитража
    reason = models.CharField(max_length=50, choices=[
        ('order_not_completed', 'Заказ не выполнен'),
        ('poor_quality', 'Низкое качество'),
        ('deadline_violation', 'Нарушение сроков'),
        ('contact_violation', 'Нарушение контактов'),
        ('other', 'Другое'),
    ], verbose_name='Причина претензии', default='other')
    
    # Финансовые требования
    refund_type = models.CharField(max_length=20, choices=[
        ('full', 'Полный возврат'),
        ('partial', 'Частичный возврат'),
        ('none', 'Без возврата'),
    ], verbose_name='Тип возврата', default='none')
    refund_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='Процент возврата')
    refund_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Сумма возврата')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    tags = models.TextField(blank=True, verbose_name='Теги', help_text='Теги через запятую, например: #негатив, #срочно, #баг')
    resolution = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'claims'
        ordering = ['-created_at']
        verbose_name = 'Обращение'
        verbose_name_plural = 'Обращения'
    
    def __str__(self):
        return f"Претензия {self.ticket_number}: {self.subject}"
    
    def get_tags_list(self):
        """Возвращает список тегов"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
    
    def add_tag(self, tag):
        """Добавляет тег"""
        if not tag.startswith('#'):
            tag = f'#{tag}'
        
        current_tags = self.get_tags_list()
        if tag not in current_tags:
            current_tags.append(tag)
            self.tags = ', '.join(current_tags)
            self.save(update_fields=['tags'])
    
    def remove_tag(self, tag):
        """Удаляет тег"""
        if not tag.startswith('#'):
            tag = f'#{tag}'
        
        current_tags = self.get_tags_list()
        if tag in current_tags:
            current_tags.remove(tag)
            self.tags = ', '.join(current_tags)
            self.save(update_fields=['tags'])


class ClaimMessage(models.Model):
    """Сообщения в претензиях"""
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(verbose_name='Сообщение')
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'claim_messages'
        ordering = ['created_at']
        verbose_name = 'Сообщение претензии'
        verbose_name_plural = 'Сообщения претензий'


class TicketActivity(models.Model):
    """Лента активности тикета — все события: смена статуса, тегов, наблюдателей и т.д."""
    ACTIVITY_TYPES = [
        ('status_change', 'Смена статуса'),
        ('priority_change', 'Смена приоритета'),
        ('tag_added', 'Тег добавлен'),
        ('tag_removed', 'Тег удалён'),
        ('observer_added', 'Наблюдатель добавлен'),
        ('observer_removed', 'Наблюдатель удалён'),
        ('assigned', 'Назначен ответственный'),
        ('note', 'Служебная заметка'),
        ('message', 'Сообщение клиенту'),
        ('created', 'Тикет создан'),
        ('completed', 'Тикет завершён'),
    ]

    # Один из двух FK — либо support_request, либо claim
    support_request = models.ForeignKey(
        SupportRequest, on_delete=models.CASCADE,
        null=True, blank=True, related_name='activities'
    )
    claim = models.ForeignKey(
        Claim, on_delete=models.CASCADE,
        null=True, blank=True, related_name='activities'
    )
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    text = models.TextField(blank=True)  # человекочитаемое описание
    meta = models.JSONField(default=dict, blank=True)  # доп. данные (old/new value и т.д.)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_activities'
        ordering = ['created_at']
        verbose_name = 'Активность тикета'
        verbose_name_plural = 'Активность тикетов'

    def __str__(self):
        return f"{self.activity_type} at {self.created_at}"


class AdminChatRoom(models.Model):
    """Комнаты чатов администраторов"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    members = models.ManyToManyField(User, related_name='admin_chat_rooms')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'admin_chat_rooms'
        ordering = ['-created_at']
        verbose_name = 'Чат администраторов'
        verbose_name_plural = 'Чаты администраторов'


class AdminChatMessage(models.Model):
    """Сообщения в чатах администраторов"""
    room = models.ForeignKey(AdminChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'admin_chat_messages'
        ordering = ['created_at']
        verbose_name = 'Сообщение чата'
        verbose_name_plural = 'Сообщения чата'
