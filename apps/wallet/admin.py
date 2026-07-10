from django.contrib import admin

# Wallet "ledger" lives on orders.Transaction (already registered there if
# admin entry exists). We don't register anything new here to avoid
# duplicating the admin surface, but the import has to exist for Django's
# app config to import cleanly.


from django.utils import timezone
from .models import WithdrawalRequest
from .services import WalletService


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'card_number', 'status', 'created_at', 'processed_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'card_number')
    actions = ('mark_paid', 'reject_and_refund')

    @admin.action(description='Отметить как выплаченные')
    def mark_paid(self, request, queryset):
        for wr in queryset.filter(status=WithdrawalRequest.Status.PENDING):
            wr.status = WithdrawalRequest.Status.PAID
            wr.processed_at = timezone.now()
            wr.save(update_fields=['status', 'processed_at'])

    @admin.action(description='Отклонить и вернуть средства')
    def reject_and_refund(self, request, queryset):
        for wr in queryset.filter(status=WithdrawalRequest.Status.PENDING):
            WalletService.topup(wr.user, wr.amount, description=f'Возврат по отклонённому выводу #{wr.id}')
            wr.status = WithdrawalRequest.Status.REJECTED
            wr.processed_at = timezone.now()
            wr.save(update_fields=['status', 'processed_at'])
