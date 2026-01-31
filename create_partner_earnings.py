#!/usr/bin/env python
"""
Скрипт для создания тестовых партнерских начислений
"""
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.users.models import PartnerEarning

User = get_user_model()

def create_partner_earnings():
    """Создание тестовых партнерских начислений"""
    print("Создание тестовых партнерских начислений...")
    
    # Получаем пользователей
    try:
        client = User.objects.get(email='client@test.com')
        partner = User.objects.get(email='partner@test.com')
    except User.DoesNotExist as e:
        print(f"Ошибка: пользователь не найден - {e}")
        return
    
    # Получаем завершенные заказы
    completed_orders = Order.objects.filter(status='completed')
    
    if not completed_orders.exists():
        print("Нет завершенных заказов для создания начислений")
        return
    
    created_earnings = []
    
    for order in completed_orders:
        # Создаем партнерское начисление (5% от суммы заказа)
        earning_amount = order.budget * Decimal('0.05')
        
        earning = PartnerEarning.objects.create(
            partner=partner,
            referral=client,
            order=order,
            amount=earning_amount,
            commission_rate=Decimal('5.00'),
            source_amount=order.budget,
            earning_type='order',
            created_at=order.updated_at,
            is_paid=True
        )
        
        created_earnings.append(earning)
        print(f"✅ Создано начисление: {earning.amount} ₽ за заказ #{order.id}")
    
    print(f"\n🎉 Создано {len(created_earnings)} партнерских начислений!")
    
    # Статистика
    total_earnings = sum(e.amount for e in created_earnings)
    total_source = sum(e.source_amount for e in created_earnings)
    
    print(f"\n📊 Статистика:")
    print(f"   Общая сумма начислений: {total_earnings} ₽")
    print(f"   Общая сумма заказов: {total_source} ₽")
    print(f"   Средняя комиссия: {(total_earnings / total_source * 100):.2f}%")

if __name__ == '__main__':
    create_partner_earnings()