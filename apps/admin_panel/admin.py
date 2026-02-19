from django.contrib import admin
from .models import SupportRequest, SupportMessage, Claim, ClaimMessage, AdminChatRoom, AdminChatMessage


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'subject', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'created_at']
    search_fields = ['subject', 'description', 'user__email']


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'request', 'sender', 'is_admin', 'created_at']
    list_filter = ['is_admin', 'created_at']


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'claim_type', 'subject', 'status', 'created_at']
    list_filter = ['status', 'claim_type', 'created_at']
    search_fields = ['subject', 'description', 'user__email']


@admin.register(AdminChatRoom)
class AdminChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'created_by', 'created_at']
    search_fields = ['name', 'description']


@admin.register(AdminChatMessage)
class AdminChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'sender', 'created_at']
    list_filter = ['created_at']
