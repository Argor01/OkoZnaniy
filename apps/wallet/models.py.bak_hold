from django.conf import settings
from django.db import models


class WithdrawalRequest(models.Model):
    """A user's request to cash out available balance to a card.

    Balance is debited immediately when the request is created (via
    WalletService.withdraw). Finance then pays the card out of band and marks
    the request PAID. If REJECTED, the amount is refunded back to the balance.
    """
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает выплаты"
        PAID = "paid", "Выплачено"
        REJECTED = "rejected", "Отклонено"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="withdrawal_requests", verbose_name="Пользователь",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Сумма")
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Списано с кошелька")
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Комиссия платформы")
    acquiring_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Комиссия эквайринга")
    card_number = models.CharField(max_length=32, verbose_name="Карта (маскированная)")
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, verbose_name="Статус",
    )
    comment = models.TextField(blank=True, default="", verbose_name="Комментарий")
    transaction = models.ForeignKey(
        "orders.Transaction", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="withdrawal_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "wallet_withdrawal_requests"
        ordering = ["-created_at"]
        verbose_name = "Заявка на вывод"
        verbose_name_plural = "Заявки на вывод"

    def __str__(self):
        return f"Вывод {self.amount} ({self.get_status_display()}) — {self.user_id}"


class Settlement(models.Model):
    """Immutable allocation snapshot used for refunds after escrow release."""
    order = models.OneToOneField('orders.Order', null=True, blank=True, on_delete=models.PROTECT, related_name='wallet_settlement')
    purchase = models.OneToOneField('shop.Purchase', null=True, blank=True, on_delete=models.PROTECT, related_name='wallet_settlement')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='client_settlements')
    expert = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='expert_settlements')
    fee_recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='fee_settlements')
    base_amount = models.DecimalField(max_digits=12, decimal_places=2)
    service_fee = models.DecimalField(max_digits=12, decimal_places=2)
    refunded_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refunded_service_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    funded_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    funded_service_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_released = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.CheckConstraint(
            check=(models.Q(order__isnull=False, purchase__isnull=True) | models.Q(order__isnull=True, purchase__isnull=False)),
            name='settlement_exactly_one_source',
        )]
