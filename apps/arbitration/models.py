from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import secrets
import string

User = get_user_model()


def generate_arbitration_number():
    """Генерирует уникальный номер арбитража формата ARB-XXXXXXXX"""
    characters = string.ascii_uppercase + string.digits
    return 'ARB-' + ''.join(secrets.choice(characters) for _ in range(8))


class ArbitrationCase(models.Model):
    """Арбитражное дело - отдельная сущность от техподдержки"""
    
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('submitted', 'Подано'),
        ('under_review', 'На рассмотрении'),
        ('awaiting_response', 'Ожидает ответа'),
        ('in_arbitration', 'В арбитраже'),
        ('decision_made', 'Решение принято'),
        ('closed', 'Закрыто'),
        ('rejected', 'Отклонено'),
    ]
    
    REASON_CHOICES = [
        ('order_not_completed', 'Заказ не выполнен'),
        ('poor_quality', 'Низкое качество работы'),
        ('deadline_violation', 'Нарушение сроков'),
        ('payment_dispute', 'Спор по оплате'),
        ('contract_violation', 'Нарушение условий договора'),
        ('other', 'Другое'),
    ]
    
    REFUND_TYPE_CHOICES = [
        ('none', 'Без возврата'),
        ('partial', 'Частичный возврат'),
        ('full', 'Полный возврат'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]
    
    # Основная информация
    case_number = models.CharField(
        max_length=20, 
        unique=True, 
        default=generate_arbitration_number,
        verbose_name='Номер дела'
    )
    
    # Стороны
    plaintiff = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='plaintiff_cases',
        verbose_name='Истец'
    )
    defendant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='defendant_cases',
        verbose_name='Ответчик',
        null=True,
        blank=True
    )
    
    # Связанный заказ
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='arbitration_cases',
        verbose_name='Связанный заказ'
    )
    
    # Детали претензии
    reason = models.CharField(
        max_length=50,
        choices=REASON_CHOICES,
        verbose_name='Причина обращения'
    )
    subject = models.CharField(
        max_length=255,
        verbose_name='Тема обращения'
    )
    description = models.TextField(
        verbose_name='Описание проблемы'
    )
    
    # Финансовые требования
    refund_type = models.CharField(
        max_length=20,
        choices=REFUND_TYPE_CHOICES,
        default='none',
        verbose_name='Тип возврата'
    )
    requested_refund_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name='Запрошенный процент возврата'
    )
    requested_refund_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Запрошенная сумма возврата'
    )
    
    # Решение арбитража
    approved_refund_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Одобренный процент возврата'
    )
    approved_refund_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Одобренная сумма возврата'
    )
    
    # Статус и приоритет
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Статус'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='Приоритет'
    )
    
    # Администрирование
    assigned_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_arbitration_cases',
        verbose_name='Назначенный администратор'
    )
    assigned_users = models.ManyToManyField(
        User,
        blank=True,
        related_name='observed_arbitration_cases',
        verbose_name='Наблюдатели'
    )
    
    # Решение
    decision = models.TextField(
        blank=True,
        verbose_name='Решение арбитража'
    )
    decision_made_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='arbitration_decisions',
        verbose_name='Решение принял'
    )
    decision_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата решения'
    )
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Подано')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='Закрыто')
    
    # Дополнительные поля
    deadline_relevant = models.BooleanField(
        default=False,
        verbose_name='Актуальность сроков'
    )
    evidence_files = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Файлы доказательств'
    )
    tags = models.TextField(
        blank=True,
        verbose_name='Теги'
    )
    
    class Meta:
        db_table = 'arbitration_cases'
        ordering = ['-created_at']
        verbose_name = 'Арбитражное дело'
        verbose_name_plural = 'Арбитражные дела'
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['plaintiff', '-created_at']),
            models.Index(fields=['defendant', '-created_at']),
            models.Index(fields=['assigned_admin', 'status']),
        ]
    
    def __str__(self):
        return f"{self.case_number}: {self.subject}"
    
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
    
    def submit(self):
        """Подать претензию"""
        if self.status == 'draft':
            self.status = 'submitted'
            self.submitted_at = timezone.now()
            self.save(update_fields=['status', 'submitted_at'])


class ArbitrationMessage(models.Model):
    """Сообщения в арбитражном деле"""
    
    MESSAGE_TYPE_CHOICES = [
        ('plaintiff', 'От истца'),
        ('defendant', 'От ответчика'),
        ('admin', 'От администратора'),
        ('system', 'Системное'),
    ]
    
    case = models.ForeignKey(
        ArbitrationCase,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Дело'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='Отправитель'
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        verbose_name='Тип сообщения'
    )
    text = models.TextField(verbose_name='Текст сообщения')
    is_internal = models.BooleanField(
        default=False,
        verbose_name='Внутреннее (не видно сторонам)'
    )
    attachments = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Вложения'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    
    class Meta:
        db_table = 'arbitration_messages'
        ordering = ['created_at']
        verbose_name = 'Сообщение арбитража'
        verbose_name_plural = 'Сообщения арбитража'
    
    def __str__(self):
        return f"Сообщение в {self.case.case_number} от {self.sender}"


class ArbitrationActivity(models.Model):
    """Лента активности арбитражного дела"""
    
    ACTIVITY_TYPE_CHOICES = [
        ('created', 'Дело создано'),
        ('submitted', 'Дело подано'),
        ('status_changed', 'Статус изменен'),
        ('priority_changed', 'Приоритет изменен'),
        ('admin_assigned', 'Назначен администратор'),
        ('observer_added', 'Добавлен наблюдатель'),
        ('observer_removed', 'Удален наблюдатель'),
        ('message_sent', 'Отправлено сообщение'),
        ('decision_made', 'Принято решение'),
        ('refund_processed', 'Оформлен возврат'),
        ('closed', 'Дело закрыто'),
        ('tag_added', 'Добавлен тег'),
        ('tag_removed', 'Удален тег'),
    ]
    
    case = models.ForeignKey(
        ArbitrationCase,
        on_delete=models.CASCADE,
        related_name='activities',
        verbose_name='Дело'
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Инициатор'
    )
    activity_type = models.CharField(
        max_length=30,
        choices=ACTIVITY_TYPE_CHOICES,
        verbose_name='Тип активности'
    )
    description = models.TextField(verbose_name='Описание')
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Метаданные'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    
    class Meta:
        db_table = 'arbitration_activities'
        ordering = ['created_at']
        verbose_name = 'Активность арбитража'
        verbose_name_plural = 'Активности арбитража'
    
    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.case.case_number}"
