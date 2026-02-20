from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.catalog.models import Subject
from apps.orders.utils import FileValidator, get_file_path

class Specialization(models.Model):
    """Специализация эксперта в определенном предмете"""
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='specializations',
        verbose_name="Эксперт"
    )
    custom_name = models.CharField(
        max_length=255,
        verbose_name="Название специализации",
        blank=True,
        null=True,
        help_text="Укажите название специализации, если оно отличается от названия предмета"
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='experts',
        verbose_name="Предмет",
        null=True,
        blank=True
    )
    experience_years = models.PositiveIntegerField(
        default=0,
        verbose_name="Опыт работы (лет)"
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Часовая ставка",
        default=0
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание опыта"
    )
    skills = models.TextField(
        blank=True,
        null=True,
        verbose_name="Навыки"
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Проверен"
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_specializations',
        verbose_name="Кто проверил"
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Создан"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Обновлен"
    )

    class Meta:
        verbose_name = "Специализация"
        verbose_name_plural = "Специализации"
        ordering = ['-is_verified', '-experience_years']

    def __str__(self):
        return f"{self.expert.username} - {self.subject.name}"

class ExpertDocument(models.Model):
    """Документы, подтверждающие квалификацию эксперта"""
    DOCUMENT_TYPES = [
        ('diploma', 'Диплом'),
        ('certificate', 'Сертификат'),
        ('award', 'Награда'),
        ('other', 'Другое'),
    ]

    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name="Эксперт"
    )
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES,
        verbose_name="Тип документа"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Название"
    )
    file = models.FileField(
        upload_to='experts/documents/',
        validators=[FileValidator()],
        verbose_name="Файл"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Проверен"
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents',
        verbose_name="Кто проверил"
    )
    notes = models.TextField(
        verbose_name="Заметки",
        blank=True
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Загружен"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Обновлен"
    )

    class Meta:
        verbose_name = "Документ эксперта"
        verbose_name_plural = "Документы экспертов"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.expert.username}"

class ExpertReview(models.Model):
    """Отзывы о работе эксперта"""
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name="Эксперт"
    )
    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='expert_review',
        verbose_name="Заказ"
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_given',
        verbose_name="Клиент"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Оценка"
    )
    comment = models.TextField(
        verbose_name="Комментарий",
        blank=True,
        default=""
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Создан"
    )
    is_published = models.BooleanField(
        default=True,
        verbose_name="Опубликован"
    )

    class Meta:
        verbose_name = "Отзыв об эксперте"
        verbose_name_plural = "Отзывы об экспертах"
        ordering = ['-created_at']
        unique_together = ['expert', 'order']
        indexes = [
            models.Index(fields=['expert', 'is_published', '-created_at']),
        ]

    def __str__(self):
        return f"Отзыв на {self.expert.username} от {self.client.username}"

    def save(self, *args, **kwargs):
        # Если клиент не указан, берем его из заказа
        if not self.client and self.order:
            self.client = self.order.client
        super().save(*args, **kwargs)
        # Пересчитываем средний рейтинг эксперта через статистику
        # Не пытаемся обновить rating напрямую в User, так как этого поля может не быть
        try:
            from apps.experts.models import ExpertStatistics
            stats, _ = ExpertStatistics.objects.get_or_create(expert=self.expert)
            avg_rating = ExpertReview.objects.filter(
                expert=self.expert,
                is_published=True
            ).aggregate(models.Avg('rating'))['rating__avg']
            if avg_rating:
                stats.average_rating = round(float(avg_rating), 2)
                stats.save()
        except Exception:
            # Игнорируем ошибки при обновлении статистики
            pass

class ExpertRating(models.Model):
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_ratings',
        verbose_name="Эксперт"
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_ratings',
        verbose_name="Клиент"
    )
    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='expert_rating',
        verbose_name="Заказ"
    )
    rating = models.PositiveSmallIntegerField(
        "Оценка",
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(
        "Комментарий",
        blank=True
    )
    created_at = models.DateTimeField(
        "Дата создания",
        default=timezone.now
    )
    updated_at = models.DateTimeField(
        "Дата обновления",
        auto_now=True
    )

    class Meta:
        verbose_name = "Рейтинг эксперта"
        verbose_name_plural = "Рейтинги экспертов"
        ordering = ['-created_at']
        unique_together = ['expert', 'order']
        indexes = [
            models.Index(fields=['expert', '-created_at']),
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return f"Рейтинг {self.rating} для {self.expert.username} от {self.client.username}"

class ExpertStatistics(models.Model):
    expert = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='statistics',
        verbose_name="Эксперт"
    )
    total_orders = models.PositiveIntegerField(
        "Всего заказов",
        default=0
    )
    completed_orders = models.PositiveIntegerField(
        "Выполненные заказы",
        default=0
    )
    average_rating = models.DecimalField(
        "Средний рейтинг",
        max_digits=3,
        decimal_places=2,
        default=0
    )
    total_ratings = models.PositiveIntegerField(
        "Всего отзывов",
        default=0
    )
    success_rate = models.DecimalField(
        "Процент успешных заказов",
        max_digits=5,
        decimal_places=2,
        default=0
    )
    total_earnings = models.DecimalField(
        "Общий заработок",
        max_digits=10,
        decimal_places=2,
        default=0
    )
    response_time_avg = models.DurationField(
        "Среднее время ответа",
        null=True,
        blank=True
    )
    last_updated = models.DateTimeField(
        "Последнее обновление",
        auto_now=True
    )

    class Meta:
        verbose_name = "Статистика эксперта"
        verbose_name_plural = "Статистика экспертов"

    def __str__(self):
        return f"Статистика {self.expert.username}"

    def update_statistics(self):
        from apps.orders.models import Order
        
        # Обновляем статистику заказов
        orders = Order.objects.filter(expert=self.expert)
        self.total_orders = orders.count()
        self.completed_orders = orders.filter(status='completed').count()
        
        # Обновляем рейтинг
        ratings = ExpertRating.objects.filter(expert=self.expert)
        if ratings.exists():
            avg_rating = ratings.aggregate(
                avg_rating=models.Avg('rating')
            )['avg_rating']
            self.average_rating = round(float(avg_rating), 2) if avg_rating else 0
            self.total_ratings = ratings.count()
        else:
            self.average_rating = 0
            self.total_ratings = 0
        
        # Обновляем процент успешных заказов
        if self.total_orders > 0:
            self.success_rate = round((self.completed_orders / self.total_orders) * 100, 2)
        else:
            self.success_rate = 0
        
        # Обновляем общий заработок
        from apps.orders.models import Transaction
        earnings = Transaction.objects.filter(
            user=self.expert,
            type='payout'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        self.total_earnings = earnings
        
        self.save()


class ExpertApplication(models.Model):
    """Анкета эксперта для регистрации"""
    STATUS_CHOICES = [
        ('pending', 'В рассмотрении'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
        ('deactivated', 'Деактивировано'),
    ]
    
    expert = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expert_application',
        verbose_name="Эксперт"
    )
    full_name = models.CharField(
        max_length=255,
        verbose_name="ФИО"
    )
    work_experience_years = models.PositiveIntegerField(
        verbose_name="Опыт работы (лет)",
        validators=[MinValueValidator(0)]
    )
    specializations = models.TextField(
        verbose_name="Специальности",
        help_text="Укажите специальности, которые вы пишете (можно через запятую или каждую на новой строке)",
        blank=True,
        default=''
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Статус"
    )
    rejection_reason = models.TextField(
        blank=True,
        null=True,
        verbose_name="Причина отклонения"
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_expert_applications',
        verbose_name="Кто рассмотрел"
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата рассмотрения"
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Создан"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Обновлен"
    )

    class Meta:
        verbose_name = "Анкета эксперта"
        verbose_name_plural = "Анкеты экспертов"
        ordering = ['-created_at']

    def __str__(self):
        return f"Анкета {self.expert.username} - {self.get_status_display()}"


class Education(models.Model):
    """Образование эксперта"""
    application = models.ForeignKey(
        ExpertApplication,
        on_delete=models.CASCADE,
        related_name='educations',
        verbose_name="Анкета"
    )
    university = models.CharField(
        max_length=255,
        verbose_name="ВУЗ"
    )
    start_year = models.IntegerField(
        verbose_name="Год начала обучения",
        validators=[MinValueValidator(1950), MaxValueValidator(2100)]
    )
    end_year = models.IntegerField(
        verbose_name="Год окончания обучения",
        null=True,
        blank=True,
        validators=[MinValueValidator(1950), MaxValueValidator(2100)]
    )
    degree = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Степень/Квалификация"
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Создан"
    )

    class Meta:
        verbose_name = "Образование"
        verbose_name_plural = "Образования"
        ordering = ['-end_year', '-start_year']

    def __str__(self):
        if self.end_year:
            return f"{self.university} ({self.start_year}-{self.end_year})"
        return f"{self.university} ({self.start_year}-н.в.)"