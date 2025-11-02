from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Specialization, ExpertDocument, ExpertReview, ExpertStatistics, ExpertApplication, Education

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


class EducationInline(admin.TabularInline):
    model = Education
    extra = 1
    fields = ('university', 'start_year', 'end_year', 'degree')


@admin.register(ExpertApplication)
class ExpertApplicationAdmin(admin.ModelAdmin):
    list_display = ('expert', 'full_name', 'status_display', 'work_experience_years', 'created_at', 'reviewed_at')
    list_filter = ('status', 'created_at', 'reviewed_at')
    search_fields = ('expert__username', 'full_name', 'expert__email')
    raw_id_fields = ('expert', 'reviewed_by')
    readonly_fields = ('created_at', 'updated_at', 'reviewed_at')
    inlines = [EducationInline]
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('expert', 'full_name', 'work_experience_years')
        }),
        ('Специальности', {
            'fields': ('specializations',)
        }),
        ('Статус', {
            'fields': ('status', 'rejection_reason', 'reviewed_by', 'reviewed_at')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def status_display(self, obj):
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'Статус'


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ('application', 'university', 'start_year', 'end_year', 'degree')
    list_filter = ('start_year', 'end_year')
    search_fields = ('university', 'degree', 'application__expert__username')
    raw_id_fields = ('application',)
    ordering = ('-end_year', '-start_year')
