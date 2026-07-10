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
