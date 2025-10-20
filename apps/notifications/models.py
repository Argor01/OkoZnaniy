from django.db import models
from django.conf import settings
from django.utils import timezone


class NotificationType(models.TextChoices):
    NEW_ORDER = 'new_order', 'Новый заказ'
    ORDER_TAKEN = 'order_taken', 'Заказ принят'
    FILE_UPLOADED = 'file_uploaded', 'Загружен файл'
    NEW_COMMENT = 'new_comment', 'Новый комментарий'
    STATUS_CHANGED = 'status_changed', 'Изменен статус'
    DEADLINE_SOON = 'deadline_soon', 'Скоро дедлайн'
    DOCUMENT_VERIFIED = 'document_verified', 'Документ проверен'
    SPECIALIZATION_VERIFIED = 'specialization_verified', 'Специализация подтверждена'
    REVIEW_RECEIVED = 'review_received', 'Получен отзыв'
    NEW_RATING = 'new_rating', 'Новый рейтинг'
    RATING_MILESTONE = 'rating_milestone', 'Достижение рейтинга'
    PAYMENT_RECEIVED = 'payment_received', 'Получена оплата'
    ORDER_COMPLETED = 'order_completed', 'Заказ завершен'
    NEW_CONTACT = 'new_contact', 'Новое обращение'


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Получатель"
    )
    type = models.CharField(
        max_length=30,  # Увеличиваем длину для новых типов
        choices=NotificationType.choices,
        verbose_name="Тип уведомления"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Заголовок"
    )
    message = models.TextField(
        verbose_name="Сообщение"
    )
    related_object_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="ID связанного объекта"
    )
    related_object_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="Тип связанного объекта"
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name="Прочитано"
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Создано"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Истекает"
    )

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['type', 'is_read']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_read', 'created_at']),
            models.Index(fields=['related_object_type', 'related_object_id']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"

    def mark_as_read(self):
        self.is_read = True
        self.save(update_fields=['is_read'])

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False 