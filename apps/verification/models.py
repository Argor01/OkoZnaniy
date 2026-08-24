from django.conf import settings
from django.db import models


class IdentityVerification(models.Model):
    """Подтверждение личности и налогового статуса получателя выплат.

    Отвечает на вопрос «кому мы платим и на каком основании».
    Квалификация эксперта (дипломы, специализации) — это отдельная
    история, она живёт в apps.experts.

    Без подтверждённого налогового статуса платформа при выплате
    физлицу становится налоговым агентом по НДФЛ и плательщиком
    страховых взносов, поэтому запись обязательна до первой выплаты.
    """

    class Status(models.TextChoices):
        NOT_SUBMITTED = "not_submitted", "Не подана"
        PENDING = "pending", "На проверке"
        APPROVED = "approved", "Подтверждена"
        REJECTED = "rejected", "Отклонена"

    class TaxStatus(models.TextChoices):
        SELF_EMPLOYED = "self_employed", "Самозанятый (НПД)"
        ENTREPRENEUR = "entrepreneur", "Индивидуальный предприниматель"
        INDIVIDUAL = "individual", "Физическое лицо"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="identity_verification",
        verbose_name="Пользователь",
    )

    last_name = models.CharField(max_length=100, verbose_name="Фамилия")
    first_name = models.CharField(max_length=100, verbose_name="Имя")
    middle_name = models.CharField(max_length=100, blank=True, default="", verbose_name="Отчество")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Дата рождения")

    inn = models.CharField(max_length=12, db_index=True, verbose_name="ИНН")
    tax_status = models.CharField(
        max_length=20,
        choices=TaxStatus.choices,
        default=TaxStatus.SELF_EMPLOYED,
        verbose_name="Налоговый статус",
    )

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Статус проверки",
    )

    # Последний известный ответ ФНС по статусу НПД.
    npd_confirmed = models.BooleanField(
        null=True, blank=True,
        verbose_name="Подтверждён как плательщик НПД",
        help_text="null — проверить не удалось",
    )
    npd_checked_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата проверки в ФНС")
    npd_message = models.TextField(blank=True, default="", verbose_name="Ответ ФНС")

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_verifications",
        verbose_name="Кто проверил",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата проверки")
    rejection_reason = models.TextField(blank=True, default="", verbose_name="Причина отказа")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "verification_identity"
        verbose_name = "Верификация личности"
        verbose_name_plural = "Верификации личности"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.get_status_display()})"

    @property
    def full_name(self) -> str:
        parts = [self.last_name, self.first_name, self.middle_name]
        return " ".join(p for p in parts if p).strip()

    @property
    def is_approved(self) -> bool:
        return self.status == self.Status.APPROVED

    @property
    def requires_npd_check(self) -> bool:
        """Для самозанятых статус подтверждается перед каждой выплатой."""
        return self.tax_status == self.TaxStatus.SELF_EMPLOYED


class NpdStatusCheck(models.Model):
    """Журнал обращений к ФНС за статусом НПД.

    Хранится ради доказуемости: при налоговой проверке нужно показать,
    что на дату каждой выплаты статус самозанятого был подтверждён.
    Записи не удаляются и не редактируются.
    """

    verification = models.ForeignKey(
        IdentityVerification,
        on_delete=models.CASCADE,
        related_name="npd_checks",
        verbose_name="Верификация",
    )
    inn = models.CharField(max_length=12, verbose_name="ИНН")
    checked_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Момент проверки")
    is_self_employed = models.BooleanField(
        null=True, blank=True,
        verbose_name="Плательщик НПД",
        help_text="null — ФНС недоступна",
    )
    message = models.TextField(blank=True, default="", verbose_name="Ответ ФНС")
    raw_response = models.JSONField(default=dict, blank=True, verbose_name="Сырой ответ")
    withdrawal = models.ForeignKey(
        "wallet.WithdrawalRequest",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="npd_checks",
        verbose_name="Заявка на вывод",
    )

    class Meta:
        db_table = "verification_npd_checks"
        verbose_name = "Проверка статуса НПД"
        verbose_name_plural = "Проверки статуса НПД"
        ordering = ["-checked_at"]

    def __str__(self):
        state = {True: "подтверждён", False: "не подтверждён", None: "неизвестно"}[self.is_self_employed]
        return f"{self.inn} — {state} ({self.checked_at:%d.%m.%Y %H:%M})"
