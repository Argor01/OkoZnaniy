from django.db import models
from django.conf import settings
from django.utils import timezone
from .crypto import PaymentCrypto


class PaymentMethod(models.TextChoices):
    SBP = 'sbp', 'Система быстрых платежей'
    CARD = 'card', 'Банковская карта'


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Ожидает оплаты'
    PROCESSING = 'processing', 'Обрабатывается'
    COMPLETED = 'completed', 'Оплачен'
    FAILED = 'failed', 'Ошибка'
    REFUNDED = 'refunded', 'Возвращен'


class Payment(models.Model):
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name="Заказ"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Сумма"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        verbose_name="Способ оплаты"
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name="Статус"
    )
    payment_id = models.CharField(
        max_length=255,
        unique=True,
        verbose_name="ID платежа в платежной системе"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Создан"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Обновлен"
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата оплаты"
    )
    refunded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата возврата"
    )
    metadata = models.JSONField(
        default=dict,
        verbose_name="Дополнительные данные"
    )
    encrypted_data = models.TextField(
        null=True,
        blank=True,
        verbose_name="Зашифрованные данные"
    )

    class Meta:
        verbose_name = "Платеж"
        verbose_name_plural = "Платежи"
        ordering = ['-created_at']

    def __str__(self):
        return f"Платеж {self.payment_id} ({self.get_status_display()})"

    def set_sensitive_data(self, data: dict):
        """
        Безопасно сохраняет чувствительные данные платежа
        """
        crypto = PaymentCrypto()
        self.encrypted_data = crypto.encrypt_data(data)
        # Сохраняем замаскированные данные в metadata
        self.metadata.update(crypto.mask_sensitive_data(data))
        self.save()

    def get_sensitive_data(self) -> dict:
        """
        Получает расшифрованные данные платежа
        """
        if not self.encrypted_data:
            return {}
        crypto = PaymentCrypto()
        return crypto.decrypt_data(self.encrypted_data)
