from django.core.validators import FileExtensionValidator
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.catalog.models import Subject, Topic, WorkType, Complexity, DiscountRule
from .utils import FileValidator, get_file_path
import os


class OrderStatus(models.TextChoices):
    NEW = 'new', 'Новый'
    IN_PROGRESS = 'in_progress', 'В работе'
    DONE = 'done', 'Выполнен'
    DISPUTE = 'disputed', 'Арбитраж'
    CANCELED = 'canceled', 'Отменен'


WORK_TYPES = [
    ("task", "Задача"),
    ("test", "Контрольная работа"),
    ("course", "Курсовая работа"),
]



class Order(models.Model):
    STATUS_CHOICES = [
        ('new', 'Новый'),
        ('waiting_payment', 'Ожидает оплаты'),
        ('in_progress', 'В работе'),
        ('review', 'На проверке'),
        ('revision', 'На доработке'),
        ('completed', 'Выполнен'),
        ('cancelled', 'Отменен')
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_orders',
        verbose_name="Клиент"
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expert_orders',
        verbose_name="Эксперт"
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="Предмет"
    )
    topic = models.ForeignKey(
        Topic,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="Тема"
    )
    custom_topic = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Произвольная тема"
    )
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="Тип работы"
    )
    complexity = models.ForeignKey(
        Complexity,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="Сложность"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Название",
        null=True,
        blank=True
    )
    description = models.TextField(
        verbose_name="Описание",
        null=True,
        blank=True
    )
    additional_requirements = models.JSONField(
        verbose_name="Дополнительные требования",
        null=True,
        blank=True,
        help_text="Дополнительные требования к заказу (уникальность, форматирование и т.д.)"
    )
    deadline = models.DateTimeField(
        verbose_name="Срок сдачи",
        default=timezone.now
    )
    budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Бюджет",
        default=0
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new',
        verbose_name="Статус"
    )
    created_at = models.DateTimeField(
        verbose_name="Создан",
        default=timezone.now
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Обновлен"
    )
    discount = models.ForeignKey(
        DiscountRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="Примененная скидка"
    )
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Изначальная цена",
        null=True,
        blank=True
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Сумма скидки",
        default=0
    )
    final_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Итоговая цена",
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title or 'Без названия'} ({self.get_status_display()})"

    def get_status_display(self):
        return self.status.capitalize()

    def apply_discount(self, discount: DiscountRule) -> bool:
        """
        Применяет скидку к заказу
        Возвращает True если скидка успешно применена
        """
        if not discount.is_active:
            return False

        if discount.valid_until and discount.valid_until < timezone.now():
            return False

        if discount.work_types.exists() and self.work_type not in discount.work_types.all():
            return False

        self.discount = discount
        self.original_price = self.budget

        if discount.discount_type == 'percentage':
            self.discount_amount = (self.original_price * discount.value) / 100
        else:
            self.discount_amount = min(discount.value, self.original_price)

        self.final_price = self.original_price - self.discount_amount
        self.budget = self.final_price
        self.save()
        return True

    def remove_discount(self):
        """Удаляет примененную скидку"""
        if self.discount and self.original_price:
            self.budget = self.original_price
            self.discount = None
            self.original_price = None
            self.discount_amount = 0
            self.final_price = None
            self.save()

    def clean(self):
        # Валидация дедлайна на уровне модели
        if self.deadline and self.deadline <= timezone.now():
            from django.core.exceptions import ValidationError
            raise ValidationError({'deadline': 'Дедлайн не может быть в прошлом'})

class OrderFile(models.Model):
    FILE_TYPES = [
        ('task', 'Задание'),
        ('solution', 'Решение'),
        ('revision', 'Доработка'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name="Заказ"
    )
    file = models.FileField(
        upload_to=get_file_path,
        validators=[FileValidator()],
        verbose_name="Файл"
    )
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPES,
        verbose_name="Тип файла"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Загрузил"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Загружен"
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Описание"
    )

    class Meta:
        verbose_name = "Файл заказа"
        verbose_name_plural = "Файлы заказа"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_file_type_display()} для заказа {self.order.id}"

    def filename(self):
        return os.path.basename(self.file.name)

class OrderComment(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name="Заказ"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Автор"
    )
    text = models.TextField(
        verbose_name="Текст комментария"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Создан"
    )

    class Meta:
        verbose_name = "Комментарий к заказу"
        verbose_name_plural = "Комментарии к заказу"
        ordering = ['created_at']

    def __str__(self):
        return f"Комментарий от {self.author} к заказу {self.order.id}"

class TransactionType(models.TextChoices):
    HOLD = "hold", "Заморозка"
    RELEASE = "release", "Разморозка"
    PAYOUT = "payout", "Выплата"
    COMMISSION = "commission", "Комиссия"
    REFUND = "refund", "Возврат"

class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="transactions")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=20, choices=TransactionType.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — {self.get_type_display()} — {self.amount}"

class Bid(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="bids", verbose_name="Заказ")
    expert = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bids", verbose_name="Эксперт")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ставка")
    comment = models.TextField(blank=True, null=True, verbose_name="Комментарий")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")

    class Meta:
        verbose_name = "Ставка"
        verbose_name_plural = "Ставки"
        unique_together = ("order", "expert")
        ordering = ['-created_at']

    def __str__(self):
        return f"Bid {self.amount} by {self.expert_id} for order {self.order_id}"

class Dispute(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    reason = models.TextField()
    resolved = models.BooleanField(default=False)
    result = models.TextField(blank=True, null=True)
    arbitrator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dispute for order #{self.order.id}"

