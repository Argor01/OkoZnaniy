from django.db import models
from django.utils.text import slugify
from django.urls import reverse
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class SubjectCategory(models.Model):
    """Категория предметов (например, Технические науки, Гуманитарные науки и т.д.)"""
    name = models.CharField("Название", max_length=100)
    slug = models.SlugField("URL", max_length=100, unique=True, blank=True)
    description = models.TextField("Описание", blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)
    created_at = models.DateTimeField("Дата создания", default=timezone.now)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Категория предметов"
        verbose_name_plural = "Категории предметов"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            n = 1
            while SubjectCategory.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('catalog:category-detail', kwargs={'slug': self.slug})


class Subject(models.Model):
    """Модель предмета (например, Математика, Физика и т.д.)"""
    name = models.CharField("Название предмета", max_length=100)
    slug = models.SlugField("URL", max_length=100, unique=True, blank=True)
    description = models.TextField("Описание", blank=True)
    category = models.ForeignKey(
        SubjectCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='subjects',
        verbose_name="Категория"
    )
    icon = models.CharField("Иконка", max_length=50, blank=True, help_text="Название иконки из библиотеки Font Awesome")
    is_active = models.BooleanField("Активен", default=True)
    min_price = models.DecimalField(
        "Минимальная цена",
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)
    
    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('catalog:subject-detail', kwargs={'slug': self.slug})

    @property
    def active_topics_count(self):
        return self.topics.filter(is_active=True).count()

    @property
    def verified_experts_count(self):
        return self.experts.filter(is_verified=True).count()


class Topic(models.Model):
    """Модель темы в рамках предмета"""
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='topics',
        verbose_name="Предмет"
    )
    name = models.CharField("Название темы", max_length=200)
    slug = models.SlugField("URL", max_length=200, blank=True)
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активна", default=True)
    complexity_level = models.PositiveSmallIntegerField(
        "Уровень сложности",
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    keywords = models.CharField(
        "Ключевые слова",
        max_length=255,
        blank=True,
        help_text="Ключевые слова через запятую"
    )
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)
    
    class Meta:
        verbose_name = "Тема"
        verbose_name_plural = "Темы"
        ordering = ['subject', 'name']
        unique_together = ['subject', 'slug']
    
    def __str__(self):
        return f"{self.subject.name} - {self.name}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('catalog:topic-detail', kwargs={
            'subject_slug': self.subject.slug,
            'slug': self.slug
        })

    @property
    def orders_count(self):
        return self.orders.count()

    @property
    def completed_orders_count(self):
        return self.orders.filter(status='completed').count()


class WorkType(models.Model):
    """Модель типа работы (например, Контрольная, Курсовая и т.д.)"""
    name = models.CharField("Название", max_length=100, unique=True)
    slug = models.SlugField("URL", max_length=100, unique=True, blank=True)
    description = models.TextField("Описание", blank=True)
    base_price = models.DecimalField(
        "Базовая цена",
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    estimated_time = models.PositiveIntegerField(
        "Примерное время выполнения (часов)",
        default=1,
        validators=[MinValueValidator(1)]
    )
    is_active = models.BooleanField("Активен", default=True)
    icon = models.CharField(
        "Иконка",
        max_length=50,
        blank=True,
        help_text="Название иконки из библиотеки Font Awesome"
    )
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)
    
    class Meta:
        verbose_name = "Тип работы"
        verbose_name_plural = "Типы работ"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('catalog:worktype-detail', kwargs={'slug': self.slug})

    @property
    def orders_count(self):
        return self.orders.count()

    @property
    def average_completion_time(self):
        completed_orders = self.orders.filter(status='completed')
        if not completed_orders.exists():
            return None
        total_time = sum((order.completed_at - order.created_at).total_seconds() / 3600
                        for order in completed_orders if order.completed_at)
        return total_time / completed_orders.count()


class Complexity(models.Model):
    """Модель сложности работы"""
    name = models.CharField("Название", max_length=50, unique=True)
    slug = models.SlugField("URL", max_length=50, unique=True, blank=True)
    multiplier = models.DecimalField(
        "Множитель стоимости",
        max_digits=3,
        decimal_places=2,
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(5.0)]
    )
    description = models.TextField("Описание", blank=True)
    icon = models.CharField(
        "Иконка",
        max_length=50,
        blank=True,
        help_text="Название иконки из библиотеки Font Awesome"
    )
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField("Дата создания", default=timezone.now)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)
    
    class Meta:
        verbose_name = "Сложность"
        verbose_name_plural = "Сложности"
        ordering = ['multiplier']
    
    def __str__(self):
        return f"{self.name} (x{self.multiplier})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('catalog:complexity-detail', kwargs={'slug': self.slug})

    @property
    def orders_count(self):
        return self.orders.count()

    @property
    def average_rating(self):
        completed_orders = self.orders.filter(status='completed', expert_review__isnull=False)
        if not completed_orders.exists():
            return None
        return completed_orders.aggregate(models.Avg('expert_review__rating'))['expert_review__rating__avg']


class DiscountRule(models.Model):
    """Модель правил скидок"""
    name = models.CharField("Название", max_length=100)
    description = models.TextField("Описание", blank=True)
    discount_type = models.CharField(
        "Тип скидки",
        max_length=20,
        choices=[
            ('percentage', 'Процент'),
            ('fixed', 'Фиксированная сумма'),
        ],
        default='percentage'
    )
    value = models.DecimalField(
        "Значение скидки",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    min_orders = models.PositiveIntegerField(
        "Минимальное количество заказов",
        default=0,
        help_text="Минимальное количество выполненных заказов для получения скидки"
    )
    min_total_spent = models.DecimalField(
        "Минимальная сумма заказов",
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Минимальная общая сумма выполненных заказов для получения скидки"
    )
    valid_from = models.DateTimeField(
        "Действует с",
        default=timezone.now
    )
    valid_until = models.DateTimeField(
        "Действует до",
        null=True,
        blank=True
    )
    is_active = models.BooleanField("Активна", default=True)
    work_types = models.ManyToManyField(
        WorkType,
        verbose_name="Типы работ",
        blank=True,
        help_text="Оставьте пустым для применения ко всем типам работ"
    )
    created_at = models.DateTimeField(
        "Дата создания",
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        "Дата обновления",
        auto_now=True
    )

    class Meta:
        verbose_name = "Правило скидки"
        verbose_name_plural = "Правила скидок"
        ordering = ['-value', 'min_orders', 'min_total_spent']

    def __str__(self):
        return f"{self.name} ({self.get_discount_display()})"

    def get_discount_display(self):
        if self.discount_type == 'percentage':
            return f"{self.value}%"
        return f"{self.value} ₽"

    def is_valid_for_user(self, user):
        """Проверяет, подходит ли скидка для пользователя"""
        if not self.is_active:
            return False

        now = timezone.now()
        if self.valid_until and self.valid_until < now:
            return False

        if self.valid_from > now:
            return False

        # Проверяем количество выполненных заказов
        completed_orders = user.client_orders.filter(status='completed').count()
        if completed_orders < self.min_orders:
            return False

        # Проверяем общую сумму выполненных заказов
        total_spent = user.client_orders.filter(
            status='completed'
        ).aggregate(
            total=models.Sum('budget')
        )['total'] or 0

        if total_spent < self.min_total_spent:
            return False

        return True

    def calculate_discount(self, base_price):
        """Рассчитывает сумму скидки"""
        if self.discount_type == 'percentage':
            return (base_price * self.value) / 100
        return min(self.value, base_price)  # Не даем скидке превысить базовую цену

