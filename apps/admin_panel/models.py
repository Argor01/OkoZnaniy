from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


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
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_requests')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_requests')
    subject = models.CharField(max_length=255, verbose_name='Тема')
    description = models.TextField(verbose_name='Описание')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'support_requests'
        ordering = ['-created_at']
        verbose_name = 'Запрос в поддержку'
        verbose_name_plural = 'Запросы в поддержку'
    
    def __str__(self):
        return f"Запрос #{self.id}: {self.subject}"


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
    """Обращения пользователей"""
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
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claims')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_claims')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)
    claim_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    resolution = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'claims'
        ordering = ['-created_at']
        verbose_name = 'Обращение'
        verbose_name_plural = 'Обращения'


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
