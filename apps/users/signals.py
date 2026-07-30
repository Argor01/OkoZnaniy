import logging
from decimal import Decimal

from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import PartnerEarning, User

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

    order_amount = instance.final_price if instance.final_price is not None else instance.budget
    order_amount = Decimal(str(order_amount or '0')).quantize(Decimal('0.01'))
    if order_amount <= 0:
        return
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

    _add_pending_balance(partner, earning)
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

    _add_pending_balance(partner, earning)
    update_partner_statistics(partner)


def _add_pending_balance(partner, earning):
    User.objects.filter(pk=partner.pk).update(
        pending_balance=models.F('pending_balance') + earning.amount
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
