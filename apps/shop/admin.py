from django.contrib import admin
from .models import ReadyWork, ReadyWorkFile, Purchase


class ReadyWorkFileInline(admin.TabularInline):
    model = ReadyWorkFile
    extra = 0


@admin.register(ReadyWork)
class ReadyWorkAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'subject', 'work_type', 'price', 'is_active', 'created_at']
    list_filter = ['subject', 'work_type', 'is_active', 'created_at']
    search_fields = ['title', 'description', 'author__username']
    inlines = [ReadyWorkFileInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['work', 'buyer', 'price_paid', 'created_at']
    list_filter = ['created_at']
    search_fields = ['work__title', 'buyer__username']
    readonly_fields = ['created_at']