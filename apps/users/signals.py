import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from decimal import Decimal
from .models import User, PartnerEarning

log = logging.getLogger(__name__)


@receiver(post_save, sender='orders.Order')
def create_partner_earning_on_order_completion(sender, instance, created, **kwargs):
    if instance.status != 'completed':
        return
    if not instance.client or not instance.client.partner:
        return

    partner = instance.client.partner

    existing_earning = PartnerEarning.objects.filter(
        partner=partner,
        referral=instance.client,
        order=instance,
    ).first()
    if existing_earning:
        return

    order_amount = Decimal(str(instance.budget))
    commission_rate = partner.partner_commission_rate / 100
    earning_amount = order_amount * commission_rate

    earning = PartnerEarning.objects.create(
        partner=partner,
        referral=instance.client,
        order=instance,
        amount=earning_amount,
        commission_rate=partner.partner_commission_rate,
        source_amount=order_amount,
        earning_type='order',
    )

    _credit_partner_wallet(partner, earning)

    update_partner_statistics(partner)


@receiver(post_save, sender=User)
def create_registration_bonus_for_partner(sender, instance, created, **kwargs):
    if not created or not instance.partner:
        return

    partner = instance.partner

    registration_bonus = Decimal('50.00')

    earning = PartnerEarning.objects.create(
        partner=partner,
        referral=instance,
        amount=registration_bonus,
        commission_rate=Decimal('0.00'),
        source_amount=registration_bonus,
        earning_type='registration',
    )

    _credit_partner_wallet(partner, earning)

    update_partner_statistics(partner)


def _credit_partner_wallet(partner, earning):
    from apps.wallet.services import WalletService

    description = (
        f'Начисление от реферала {earning.referral.display_username} '
        f'({earning.get_earning_type_display()})'
    )
    try:
        WalletService.topup(partner, earning.amount, description=description)
    except Exception:
        log.exception(
            'Failed to credit wallet for partner %s earning #%s',
            partner.pk, earning.pk,
        )


def update_partner_statistics(partner):
    total_referrals = partner.referrals.count()

    active_referrals = partner.referrals.filter(
        models.Q(client_orders__isnull=False) | models.Q(expert_orders__isnull=False)
    ).distinct().count()

    total_earnings = sum(
        earning.amount for earning in partner.earnings.all()
    )

    partner.total_referrals = total_referrals
    partner.active_referrals = active_referrals
    partner.total_earnings = total_earnings
    partner.save(update_fields=['total_referrals', 'active_referrals', 'total_earnings'])
