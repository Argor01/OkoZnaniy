from django.contrib import admin
from .models import ArbitrationCase, ArbitrationMessage, ArbitrationActivity


@admin.register(ArbitrationCase)
class ArbitrationCaseAdmin(admin.ModelAdmin):
    list_display = [
        'case_number', 'subject', 'plaintiff', 'defendant',
        'status', 'priority', 'assigned_admin', 'created_at'
    ]
    list_filter = ['status', 'priority', 'reason', 'created_at']
    search_fields = [
        'case_number', 'subject', 'description',
        'plaintiff__username', 'plaintiff__email',
        'defendant__username', 'defendant__email'
    ]
    readonly_fields = [
        'case_number', 'created_at', 'updated_at',
        'submitted_at', 'closed_at', 'decision_date'
    ]
    filter_horizontal = ['assigned_users']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('case_number', 'status', 'priority')
        }),
        ('Стороны', {
            'fields': ('plaintiff', 'defendant', 'order')
        }),
        ('Детали претензии', {
            'fields': ('reason', 'subject', 'description', 'deadline_relevant')
        }),
        ('Финансовые требования', {
            'fields': (
                'refund_type',
                'requested_refund_percentage',
                'requested_refund_amount',
                'approved_refund_percentage',
                'approved_refund_amount'
            )
        }),
        ('Администрирование', {
            'fields': ('assigned_admin', 'assigned_users', 'tags')
        }),
        ('Решение', {
            'fields': ('decision', 'decision_made_by', 'decision_date')
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at', 'submitted_at', 'closed_at')
        }),
    )


@admin.register(ArbitrationMessage)
class ArbitrationMessageAdmin(admin.ModelAdmin):
    list_display = ['case', 'sender', 'message_type', 'is_internal', 'created_at']
    list_filter = ['message_type', 'is_internal', 'created_at']
    search_fields = ['case__case_number', 'sender__username', 'text']
    readonly_fields = ['created_at']


@admin.register(ArbitrationActivity)
class ArbitrationActivityAdmin(admin.ModelAdmin):
    list_display = ['case', 'activity_type', 'actor', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['case__case_number', 'actor__username', 'description']
    readonly_fields = ['created_at']
