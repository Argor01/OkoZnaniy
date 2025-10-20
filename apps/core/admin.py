from django.contrib import admin
from .models import StaticPage, FAQCategory, FAQ, Contact

@admin.register(StaticPage)
class StaticPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'is_published', 'created_at', 'updated_at')
    list_filter = ('is_published',)
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(FAQCategory)
class FAQCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'order')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'is_published', 'order')
    list_filter = ('category', 'is_published')
    search_fields = ('question', 'answer')
    raw_id_fields = ('category',)

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('subject', 'name', 'email', 'created_at', 'processed')
    list_filter = ('processed',)
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('created_at',)
    
    def save_model(self, request, obj, form, change):
        if not change:  # Если это новый объект
            obj.processed_by = request.user
        super().save_model(request, obj, form, change)
