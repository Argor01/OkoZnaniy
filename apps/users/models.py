# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Roles(models.TextChoices):
    CLIENT = 'client'
    EXPERT = 'expert'
    ARBITRATOR = 'arbitrator'
    ADMIN = 'admin'
    PARTNER = 'partner'

class User(AbstractUser):
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.CLIENT)
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Телефон")
    telegram_id = models.BigIntegerField(null=True, blank=True)
    partner = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='referrals', verbose_name="Партнер")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    frozen_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Поля профиля специалиста
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="Аватар")
    bio = models.TextField(blank=True, null=True, verbose_name="О себе")
    experience_years = models.PositiveIntegerField(null=True, blank=True, verbose_name="Опыт работы (лет)")
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Почасовая ставка")
    education = models.TextField(blank=True, null=True, verbose_name="Образование")
    skills = models.TextField(blank=True, null=True, verbose_name="Навыки")
    portfolio_url = models.URLField(blank=True, null=True, verbose_name="Портфолио")
    is_verified = models.BooleanField(default=False, verbose_name="Верифицирован")
    
    # Поля партнерской системы
    referral_code = models.CharField(max_length=20, unique=True, blank=True, null=True, verbose_name="Реферальный код")
    partner_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00, verbose_name="Процент партнера (%)")
    total_referrals = models.PositiveIntegerField(default=0, verbose_name="Всего рефералов")
    active_referrals = models.PositiveIntegerField(default=0, verbose_name="Активных рефералов")
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Общий доход")
    
    def save(self, *args, **kwargs):
        # Генерируем реферальный код для партнеров
        if self.role == 'partner' and not self.referral_code:
            import uuid
            self.referral_code = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)


class PartnerEarning(models.Model):
    """Модель для отслеживания доходов партнера"""
    partner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='earnings', verbose_name="Партнер")
    referral = models.ForeignKey(User, on_delete=models.CASCADE, related_name='partner_earnings', verbose_name="Реферал")
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, null=True, blank=True, verbose_name="Заказ")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Сумма начисления")
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Процент комиссии")
    source_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Исходная сумма")
    earning_type = models.CharField(
        max_length=20,
        choices=[
            ('order', 'Заказ'),
            ('registration', 'Регистрация'),
            ('bonus', 'Бонус'),
        ],
        default='order',
        verbose_name="Тип начисления"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    is_paid = models.BooleanField(default=False, verbose_name="Выплачено")
    
    class Meta:
        verbose_name = "Доход партнера"
        verbose_name_plural = "Доходы партнеров"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.partner.username} - {self.amount} ₽ от {self.referral.username}"


