"""
Wire ``Payment`` lifecycle into the wallet:

* When a Payment whose ``purpose='topup'`` flips to ``completed`` we credit
  the linked user's balance.
* For order payments the legacy behaviour is preserved (handled in
  ``payments.services.PaymentService.process_payment_callback``).
"""

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.payments.models import Payment, PaymentStatus

from .services import WalletService

log = logging.getLogger(__name__)


@receiver(post_save, sender=Payment, dispatch_uid='wallet.topup_on_payment_completed')
def _topup_on_payment_completed(sender, instance: Payment, created, **kwargs):
    if created:
        return
    if instance.status != PaymentStatus.COMPLETED:
        return
    if getattr(instance, 'purpose', None) != Payment.Purpose.TOPUP:
        return
    if not getattr(instance, 'user_id', None):
        return
    if getattr(instance, '_wallet_credited', False):
        return

    with transaction.atomic():
        from apps.orders.models import Transaction
        from django.contrib.auth import get_user_model
        User = get_user_model()
        _lock = User.objects.select_for_update().get(pk=instance.user_id)
        if Transaction.objects.filter(payment_id=instance.pk).exists():
            return
        try:
            WalletService.topup(
                _lock, instance.amount,
                payment=instance,
                description=f'Пополнение {instance.payment_method.upper()} #{instance.payment_id}',
            )
            log.info('Wallet credited: user=%s amount=%s payment=%s',
                     instance.user_id, instance.amount, instance.payment_id)
        except Exception:
            log.exception('Wallet top-up failed for payment %s', instance.pk)
