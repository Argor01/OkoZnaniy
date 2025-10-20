from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Specialization, ExpertDocument, ExpertReview, ExpertStatistics

@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ('expert', 'subject', 'experience_years', 'hourly_rate', 'is_verified', 'verification_status')
    list_filter = ('is_verified', 'subject', 'experience_years')
    search_fields = ('expert__username', 'subject__name', 'description')
    raw_id_fields = ('expert', 'subject', 'verified_by')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-is_verified', '-experience_years')
    
    def verification_status(self, obj):
        if obj.is_verified:
            return format_html(
                '<span style="color: green;">✓ Проверено {}</span>',
                obj.verified_by.username if obj.verified_by else ''
            )
        return format_html('<span style="color: orange;">Ожидает проверки</span>')
    verification_status.short_description = 'Статус проверки'

@admin.register(ExpertDocument)
class ExpertDocumentAdmin(admin.ModelAdmin):
    list_display = ('expert', 'title', 'document_type', 'is_verified', 'verification_status', 'file_link')
    list_filter = ('is_verified', 'document_type', 'created_at')
    search_fields = ('expert__username', 'title', 'description')
    raw_id_fields = ('expert', 'verified_by')
    readonly_fields = ('created_at', 'updated_at', 'file_link')
    ordering = ('-created_at',)

    def verification_status(self, obj):
        if obj.is_verified:
            return format_html(
                '<span style="color: green;">✓ Проверено {}</span>',
                obj.verified_by.username if obj.verified_by else ''
            )
        return format_html('<span style="color: orange;">Ожидает проверки</span>')
    verification_status.short_description = 'Статус проверки'

    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">Скачать файл</a>', obj.file.url)
        return '—'
    file_link.short_description = 'Файл'

@admin.register(ExpertReview)
class ExpertReviewAdmin(admin.ModelAdmin):
    list_display = ('expert', 'client', 'order_link', 'rating_stars', 'is_published', 'created_at')
    list_filter = ('rating', 'is_published', 'created_at')
    search_fields = ('expert__username', 'client__username', 'comment', 'order__title')
    raw_id_fields = ('expert', 'client', 'order')
    readonly_fields = ('created_at', 'order_link')
    ordering = ('-created_at',)

    def rating_stars(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        return format_html('<span style="color: gold;">{}</span>', stars)
    rating_stars.short_description = 'Оценка'

    def order_link(self, obj):
        if obj.order:
            url = reverse('admin:orders_order_change', args=[obj.order.id])
            return format_html('<a href="{}">{}</a>', url, obj.order.title or f'Заказ #{obj.order.id}')
        return '—'
    order_link.short_description = 'Заказ'

@admin.register(ExpertStatistics)
class ExpertStatisticsAdmin(admin.ModelAdmin):
    list_display = ('expert', 'total_orders', 'completed_orders', 'success_rate_display', 'rating_display', 'total_earnings')
    list_filter = ('last_updated',)
    search_fields = ('expert__username',)
    readonly_fields = ('last_updated',)
    ordering = ('-total_orders',)

    def success_rate_display(self, obj):
        color = 'green' if obj.success_rate >= 80 else 'orange' if obj.success_rate >= 50 else 'red'
        return format_html('<span style="color: {};">{:.1f}%</span>', color, obj.success_rate)
    success_rate_display.short_description = 'Успешность'

    def rating_display(self, obj):
        stars = '★' * int(obj.average_rating) + '☆' * (5 - int(obj.average_rating))
        return format_html('<span style="color: gold;">{}</span> ({:.2f})', stars, obj.average_rating)
    rating_display.short_description = 'Рейтинг'
