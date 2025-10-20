from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from .models import User, PartnerEarning


@receiver(post_save, sender='orders.Order')
def create_partner_earning_on_order_completion(sender, instance, created, **kwargs):
    """
    Создает начисление партнеру при завершении заказа его рефералом
    """
    # Проверяем, что заказ завершен и имеет клиента с партнером
    if instance.status == 'completed' and instance.client and instance.client.partner:
        partner = instance.client.partner
        
        # Проверяем, что начисление еще не было создано
        existing_earning = PartnerEarning.objects.filter(
            partner=partner,
            referral=instance.client,
            order=instance
        ).first()
        
        if not existing_earning:
            # Рассчитываем сумму начисления
            order_amount = Decimal(str(instance.budget))
            commission_rate = partner.partner_commission_rate / 100
            earning_amount = order_amount * commission_rate
            
            # Создаем начисление
            PartnerEarning.objects.create(
                partner=partner,
                referral=instance.client,
                order=instance,
                amount=earning_amount,
                commission_rate=partner.partner_commission_rate,
                source_amount=order_amount,
                earning_type='order'
            )
            
            # Обновляем статистику партнера
            update_partner_statistics(partner)


@receiver(post_save, sender=User)
def create_registration_bonus_for_partner(sender, instance, created, **kwargs):
    """
    Создает бонус партнеру за регистрацию нового реферала
    """
    if created and instance.partner:
        partner = instance.partner
        
        # Создаем бонус за регистрацию (фиксированная сумма)
        registration_bonus = Decimal('50.00')  # 50 рублей за регистрацию
        
        PartnerEarning.objects.create(
            partner=partner,
            referral=instance,
            amount=registration_bonus,
            commission_rate=Decimal('0.00'),
            source_amount=registration_bonus,
            earning_type='registration'
        )
        
        # Обновляем статистику партнера
        update_partner_statistics(partner)


def update_partner_statistics(partner):
    """
    Обновляет статистику партнера
    """
    # Подсчитываем общее количество рефералов
    total_referrals = partner.referrals.count()
    
    # Подсчитываем активных рефералов (у которых есть заказы)
    active_referrals = partner.referrals.filter(
        client_orders__isnull=False
    ).distinct().count()
    
    # Подсчитываем общий доход
    total_earnings = sum(
        earning.amount for earning in partner.earnings.all()
    )
    
    # Обновляем поля партнера
    partner.total_referrals = total_referrals
    partner.active_referrals = active_referrals
    partner.total_earnings = total_earnings
    partner.save(update_fields=['total_referrals', 'active_referrals', 'total_earnings'])
