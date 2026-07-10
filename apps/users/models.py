# apps/users/models.py
import hashlib

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class Roles(models.TextChoices):
    CLIENT = 'client'
    EXPERT = 'expert'
    ADMIN = 'admin'
    DIRECTOR = 'director'
    PARTNER = 'partner'

class User(AbstractUser):
    # Переопределяем username чтобы сделать необязательным и разрешить пробелы
    username = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Имя пользователя",
        validators=[]  # Убираем валидатор UnicodeUsernameValidator для разрешения пробелов
    )
    # Переопределяем email чтобы сделать необязательным
    email = models.EmailField(blank=True, null=True, verbose_name="Email")
    has_custom_username = models.BooleanField(default=False, verbose_name="Пользователь задал никнейм вручную")
    
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.CLIENT)
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Телефон")
    telegram_id = models.BigIntegerField(null=True, blank=True)
    max_id = models.BigIntegerField(null=True, blank=True)
    vk_id = models.BigIntegerField(
        null=True, blank=True, unique=True,
        verbose_name="VK ID"
    )
    vk_notifications_enabled = models.BooleanField(
        default=True,
        verbose_name="VK уведомления включены"
    )
    partner = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='referrals', verbose_name="Партнер")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    frozen_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    email_verified = models.BooleanField(default=False, verbose_name="Email подтвержден")
    
    # Поля профиля специалиста
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="Аватар")
    bio = models.TextField(blank=True, null=True, verbose_name="О себе")
    experience_years = models.PositiveIntegerField(null=True, blank=True, verbose_name="Опыт работы (лет)")
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Почасовая ставка")
    education = models.TextField(blank=True, null=True, verbose_name="Образование")
    skills = models.TextField(blank=True, null=True, verbose_name="Навыки")
    portfolio_url = models.URLField(blank=True, null=True, verbose_name="Портфолио")
    is_verified = models.BooleanField(default=False, verbose_name="Верифицирован")
    
    # Поля анкеты эксперта
    has_submitted_application = models.BooleanField(default=False, verbose_name="Анкета подана")
    application_approved = models.BooleanField(default=False, verbose_name="Анкета одобрена")
    application_submitted_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата подачи анкеты")
    application_reviewed_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_applications', verbose_name="Кто рассмотрел анкету")
    application_reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата рассмотрения анкеты")
    application_notes = models.TextField(blank=True, null=True, verbose_name="Заметки по анкете")
    
    # Поля партнерской системы
    referral_code = models.CharField(max_length=20, unique=True, blank=True, null=True, verbose_name="Реферальный код")
    partner_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00, verbose_name="Процент партнера (%)")
    total_referrals = models.PositiveIntegerField(default=0, verbose_name="Всего рефералов")
    active_referrals = models.PositiveIntegerField(default=0, verbose_name="Активных рефералов")
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Общий доход")
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="Город проживания")
    
    # Поля для бана за обмен контактами
    is_banned_for_contacts = models.BooleanField(default=False, verbose_name="Забанен за обмен контактами")
    contact_ban_reason = models.TextField(blank=True, null=True, verbose_name="Причина бана за контакты")
    contact_ban_date = models.DateTimeField(blank=True, null=True, verbose_name="Дата бана за контакты")
    contact_ban_until = models.DateTimeField(blank=True, null=True, verbose_name="Действителен до (временный бан)")
    contact_violations_count = models.PositiveIntegerField(default=0, verbose_name="Количество нарушений")
    banned_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='banned_users', verbose_name="Кто забанил")
    blocked_at = models.DateTimeField(blank=True, null=True, verbose_name="Дата блокировки")
    block_reason = models.TextField(blank=True, null=True, verbose_name="Причина блокировки")
    unblock_date = models.DateTimeField(blank=True, null=True, verbose_name="Дата разблокировки")
    blocked_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='blocked_users_by_admin', verbose_name="Кто заблокировал")

    @property
    def display_username(self):
        raw_username = (self.username or '').strip()
        if self.has_custom_username and raw_username:
            return raw_username

        seed_source = f'{self.id or ""}|{raw_username}|{self.email or ""}' or 'user'
        digest = hashlib.sha256(seed_source.encode('utf-8')).hexdigest()
        stable_number = 1000 + (int(digest[:8], 16) % 9000)
        return f'user{stable_number}'
    
    def save(self, *args, **kwargs):
        # Генерируем реферальный код для партнеров
        if self.role == 'partner' and not self.referral_code:
            import uuid
            self.referral_code = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    def is_temporary_block_active(self):
        return bool(not self.is_active and self.unblock_date and self.unblock_date > timezone.now())

    def _contact_ban_scope_reason(self, reason=None):
        return reason or self.contact_ban_reason or "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d \u0437\u0430 \u043e\u0431\u043c\u0435\u043d \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u043c\u0438 \u0434\u0430\u043d\u043d\u044b\u043c\u0438"

    def freeze_contact_scope(self, reason=None):
        """Freeze all chats and orders involving this user after a contact violation."""
        stats = {'chats': 0, 'orders': 0}
        freeze_reason = self._contact_ban_scope_reason(reason)
        try:
            from django.db.models import Q
            from apps.chat.models import Chat as ChatModel
            from apps.orders.models import Order

            chats = ChatModel.objects.filter(
                Q(expert=self) | Q(client=self) | Q(participants=self),
                is_frozen=False,
            ).distinct()
            for chat in chats:
                chat.freeze(freeze_reason)
                stats['chats'] += 1

            orders = Order.objects.filter(
                Q(expert=self) | Q(client=self),
                is_frozen=False,
            ).distinct()
            for order in orders:
                order.freeze(freeze_reason)
                stats['orders'] += 1
        except Exception:
            pass
        return stats

    def unfreeze_contact_scope(self):
        """Unfreeze all chats and orders involving this user after contact ban removal."""
        stats = {'chats': 0, 'orders': 0}
        try:
            from django.db.models import Q
            from apps.chat.models import Chat as ChatModel
            from apps.orders.models import Order

            chats = ChatModel.objects.filter(is_frozen=True).filter(
                Q(expert=self) | Q(client=self) | Q(participants=self)
            ).distinct()
            for chat in chats:
                chat.unfreeze()
                stats['chats'] += 1

            orders = Order.objects.filter(is_frozen=True).filter(
                Q(expert=self) | Q(client=self)
            ).distinct()
            for order in orders:
                order.unfreeze()
                stats['orders'] += 1
        except Exception:
            pass
        return stats

    def clear_contact_ban(self, *, unfreeze_related=True):
        """Clear contact ban fields and optionally unfreeze related chats/orders."""
        was_banned = bool(self.is_banned_for_contacts)
        self.is_banned_for_contacts = False
        self.contact_ban_reason = None
        self.contact_ban_date = None
        self.contact_ban_until = None
        self.banned_by = None
        self.save(update_fields=[
            'is_banned_for_contacts', 'contact_ban_reason',
            'contact_ban_date', 'contact_ban_until', 'banned_by',
        ])
        stats = {'chats': 0, 'orders': 0, 'was_banned': was_banned}
        if unfreeze_related:
            stats.update(self.unfreeze_contact_scope())
        return stats

    def is_contact_ban_active(self):
        """Return True for an active contact ban, auto-clearing expired temporary bans."""
        if not self.is_banned_for_contacts:
            return False
        if self.contact_ban_until and self.contact_ban_until <= timezone.now():
            self.clear_contact_ban(unfreeze_related=True)
            return False
        return True

    def unban_for_contacts_if_expired(self):
        """Clear an expired temporary contact ban and unfreeze related chats/orders."""
        if not self.is_banned_for_contacts:
            return False
        if not self.contact_ban_until or self.contact_ban_until > timezone.now():
            return False
        self.clear_contact_ban(unfreeze_related=True)
        return True

    def unblock_if_expired(self):
        if self.is_active or not self.unblock_date or self.unblock_date > timezone.now():
            return False
        self.is_active = True
        self.blocked_at = None
        self.block_reason = ''
        self.unblock_date = None
        self.blocked_by = None
        self.save(update_fields=['is_active', 'blocked_at', 'block_reason', 'unblock_date', 'blocked_by'])
        return True


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


class EmailVerificationCode(models.Model):
    """Модель для хранения кодов подтверждения email"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_codes', verbose_name="Пользователь")
    email = models.EmailField(verbose_name="Email")
    code = models.CharField(max_length=6, verbose_name="Код подтверждения")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    expires_at = models.DateTimeField(verbose_name="Срок действия")
    is_used = models.BooleanField(default=False, verbose_name="Использован")
    attempts = models.PositiveIntegerField(default=0, verbose_name="Попыток ввода")
    
    class Meta:
        verbose_name = "Код подтверждения email"
        verbose_name_plural = "Коды подтверждения email"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'code', 'is_used']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.email} - {self.code} ({'использован' if self.is_used else 'активен'})"
    
    def is_valid(self):
        """Проверяет, действителен ли код"""
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now() and self.attempts < 3


class ImprovementSuggestion(models.Model):
    class ImprovementArea(models.TextChoices):
        UI_UX = 'ui_ux', 'Интерфейс и удобство'
        FUNCTIONALITY = 'functionality', 'Функциональность'
        PERFORMANCE = 'performance', 'Производительность'
        CONTENT = 'content', 'Контент'
        SUPPORT = 'support', 'Поддержка'
        OTHER = 'other', 'Другое'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='improvement_suggestions', verbose_name='Пользователь')
    area = models.CharField(max_length=32, choices=ImprovementArea.choices, verbose_name='Область улучшения')
    comment = models.TextField(verbose_name='Комментарий')
    attachment = models.FileField(upload_to='improvements/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Рекомендация по улучшению'
        verbose_name_plural = 'Рекомендации по улучшению'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} | {self.get_area_display()}'


class Friendship(models.Model):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_sent')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_received')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Дружба'
        verbose_name_plural = 'Дружба'
        unique_together = ('from_user', 'to_user')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.from_user.username} -> {self.to_user.username}'
