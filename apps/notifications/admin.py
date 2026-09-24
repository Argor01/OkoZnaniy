from django.contrib import admin
from .models import LandingInquiry

@admin.register(LandingInquiry)
class LandingInquiryAdmin(admin.ModelAdmin):
    list_display = ('id', 'kind', 'vacancy', 'name', 'phone', 'email', 'created_at', 'emailed_at', 'processed')
    list_filter = ('kind', 'processed', 'created_at')
    search_fields = ('name', 'phone', 'email', 'vacancy')
    readonly_fields = ('created_at', 'emailed_at', 'consent')
    list_editable = ('processed',)
