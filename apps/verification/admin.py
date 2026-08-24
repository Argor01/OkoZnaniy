from django.contrib import admin

from .models import IdentityVerification, NpdStatusCheck


class NpdStatusCheckInline(admin.TabularInline):
    model = NpdStatusCheck
    extra = 0
    can_delete = False
    readonly_fields = ("inn", "checked_at", "is_self_employed", "message", "withdrawal")
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(IdentityVerification)
class IdentityVerificationAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "inn", "tax_status", "status", "npd_confirmed", "npd_checked_at")
    list_filter = ("status", "tax_status", "npd_confirmed")
    search_fields = ("last_name", "first_name", "inn", "user__email")
    readonly_fields = ("npd_confirmed", "npd_checked_at", "npd_message", "created_at", "updated_at")
    inlines = [NpdStatusCheckInline]


@admin.register(NpdStatusCheck)
class NpdStatusCheckAdmin(admin.ModelAdmin):
    list_display = ("inn", "checked_at", "is_self_employed", "withdrawal")
    list_filter = ("is_self_employed",)
    search_fields = ("inn",)
    readonly_fields = ("verification", "inn", "checked_at", "is_self_employed", "message", "raw_response", "withdrawal")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
