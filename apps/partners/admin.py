from django.contrib import admin
from .models import PartnerChatRoom, PartnerChatMessage


@admin.register(PartnerChatRoom)
class PartnerChatRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'room_type', 'created_by', 'is_active', 'created_at']
    list_filter = ['room_type', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'created_by__username']
    filter_horizontal = ['members']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'room_type', 'is_active')
        }),
        ('Участники', {
            'fields': ('created_by', 'members')
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PartnerChatMessage)
class PartnerChatMessageAdmin(admin.ModelAdmin):
    list_display = ['room', 'sender', 'message_preview', 'is_system', 'is_pinned', 'created_at']
    list_filter = ['is_system', 'is_pinned', 'created_at', 'room']
    search_fields = ['message', 'sender__username', 'room__name']
    readonly_fields = ['created_at']
    
    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Сообщение'