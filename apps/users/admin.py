from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PartnerEarning, EmailVerificationCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'email_verified', 'telegram_id', 'is_active', 'date_joined']
    list_filter = ['role', 'email_verified', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'telegram_id']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('role', 'phone', 'telegram_id', 'email_verified', 'balance', 'frozen_balance', 'partner')
        }),
        ('Профиль специалиста', {
            'fields': ('avatar', 'bio', 'experience_years', 'hourly_rate', 'education', 'skills', 'portfolio_url', 'is_verified')
        }),
        ('Партнерская программа', {
            'fields': ('referral_code', 'partner_commission_rate', 'total_referrals', 'active_referrals', 'total_earnings')
        }),
    )


@admin.register(PartnerEarning)
class PartnerEarningAdmin(admin.ModelAdmin):
    list_display = ['partner', 'referral', 'amount', 'earning_type', 'created_at', 'is_paid']
    list_filter = ['earning_type', 'is_paid', 'created_at']
    search_fields = ['partner__username', 'referral__username']
    date_hierarchy = 'created_at'


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ['email', 'code', 'user', 'created_at', 'expires_at', 'is_used', 'attempts']
    list_filter = ['is_used', 'created_at', 'expires_at']
    search_fields = ['email', 'code', 'user__username']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False  # Коды создаются только программно
