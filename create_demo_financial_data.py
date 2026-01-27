#!/usr/bin/env python3
"""
Создание демонстрационных финансовых данных для кабинета директора
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.payments.models import Payment

User = get_user_model()

def create_demo_data():
    """Создание демонстрационных данных"""
    print("🚀 Создание демонстрационных финансовых данных...")
    
    # Получаем пользователей
    try:
        client = User.objects.filter(role='client').first()
        expert = User.objects.filter(role='expert').first()
        
        if not client:
            client = User.objects.create_user(
                username='demo_client',
                email='client@demo.com',
                password='demo123',
                role='client'
            )
            print("✓ Создан демо-клиент")
        
        if not expert:
            expert = User.objects.create_user(
                username='demo_expert',
                email='expert@demo.com',
                password='demo123',
                role='expert'
            )
            print("✓ Создан демо-эксперт")
        
    except Exception as e:
        print(f"❌ Ошибка создания пользователей: {e}")
        return False
    
    # Создаем завершенные заказы с разными суммами
    orders_data = [
        {
            'title': 'Курсовая работа по математике',
            'description': 'Решение задач по высшей математике',
            'budget': Decimal('5000.00'),
            'final_price': Decimal('5000.00'),
            'status': 'completed',
            'days_ago': 5
        },
        {
            'title': 'Дипломная работа по экономике',
            'description': 'Анализ финансовых показателей предприятия',
            'budget': Decimal('15000.00'),
            'final_price': Decimal('15000.00'),
            'status': 'completed',
            'days_ago': 10
        },
        {
            'title': 'Реферат по истории',
            'description': 'История России в XX веке',
            'budget': Decimal('2500.00'),
            'final_price': Decimal('2500.00'),
            'status': 'completed',
            'days_ago': 3
        },
        {
            'title': 'Контрольная работа по физике',
            'description': 'Решение задач по механике',
            'budget': Decimal('3000.00'),
            'final_price': Decimal('3000.00'),
            'status': 'completed',
            'days_ago': 7
        },
        {
            'title': 'Эссе по философии',
            'description': 'Анализ философских концепций',
            'budget': Decimal('4000.00'),
            'final_price': Decimal('4000.00'),
            'status': 'in_progress',
            'days_ago': 1
        },
        {
            'title': 'Лабораторная работа по химии',
            'description': 'Анализ химических реакций',
            'budget': Decimal('3500.00'),
            'final_price': Decimal('3500.00'),
            'status': 'new',
            'days_ago': 0
        }
    ]
    
    created_orders = []
    
    for order_data in orders_data:
        try:
            # Создаем дату заказа
            created_at = datetime.now() - timedelta(days=order_data['days_ago'])
            
            order = Order.objects.create(
                title=order_data['title'],
                description=order_data['description'],
                budget=order_data['budget'],
                final_price=order_data['final_price'],
                status=order_data['status'],
                client=client,
                expert=expert if order_data['status'] != 'new' else None,
                created_at=created_at,
                updated_at=created_at
            )
            
            created_orders.append(order)
            print(f"✓ Создан заказ: {order.title} - {order.final_price} руб.")
            
        except Exception as e:
            print(f"❌ Ошибка создания заказа {order_data['title']}: {e}")
    
    # Создаем платежи для завершенных заказов
    completed_orders = [o for o in created_orders if o.status == 'completed']
    
    for order in completed_orders:
        try:
            # Создаем платеж
            payment_date = order.created_at + timedelta(days=random.randint(1, 3))
            
            payment = Payment.objects.create(
                order=order,
                amount=order.final_price,
                status='completed',
                payment_method='card',
                created_at=payment_date,
                updated_at=payment_date
            )
            
            print(f"✓ Создан платеж: {payment.amount} руб. за заказ {order.title}")
            
        except Exception as e:
            print(f"❌ Ошибка создания платежа для заказа {order.title}: {e}")
    
    # Статистика созданных данных
    total_orders = len(created_orders)
    completed_orders_count = len(completed_orders)
    total_revenue = sum(o.final_price for o in completed_orders if o.final_price)
    
    print("\n📊 СТАТИСТИКА СОЗДАННЫХ ДАННЫХ:")
    print(f"   Всего заказов: {total_orders}")
    print(f"   Завершенных заказов: {completed_orders_count}")
    print(f"   Общая выручка: {total_revenue} руб.")
    print(f"   Средний чек: {total_revenue/completed_orders_count if completed_orders_count > 0 else 0} руб.")
    
    return True

def verify_data():
    """Проверка созданных данных"""
    print("\n🔍 Проверка созданных данных...")
    
    try:
        # Проверяем заказы
        total_orders = Order.objects.count()
        completed_orders = Order.objects.filter(status='completed').count()
        total_revenue = sum(o.final_price for o in Order.objects.filter(status='completed') if o.final_price)
        
        print(f"✓ Заказов в базе: {total_orders}")
        print(f"✓ Завершенных заказов: {completed_orders}")
        print(f"✓ Общая выручка: {total_revenue} руб.")
        
        # Проверяем платежи
        total_payments = Payment.objects.count()
        completed_payments = Payment.objects.filter(status='completed').count()
        payments_amount = sum(p.amount for p in Payment.objects.filter(status='completed'))
        
        print(f"✓ Платежей в базе: {total_payments}")
        print(f"✓ Завершенных платежей: {completed_payments}")
        print(f"✓ Сумма платежей: {payments_amount} руб.")
        
        # Проверяем пользователей
        users_count = User.objects.count()
        clients_count = User.objects.filter(role='client').count()
        experts_count = User.objects.filter(role='expert').count()
        
        print(f"✓ Пользователей в базе: {users_count}")
        print(f"✓ Клиентов: {clients_count}")
        print(f"✓ Экспертов: {experts_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка проверки данных: {e}")
        return False

def main():
    print("🎯 СОЗДАНИЕ ДЕМОНСТРАЦИОННЫХ ДАННЫХ ДЛЯ КАБИНЕТА ДИРЕКТОРА")
    print("=" * 60)
    
    # Создаем данные
    if create_demo_data():
        print("\n✅ Демонстрационные данные созданы успешно!")
        
        # Проверяем данные
        if verify_data():
            print("\n🎉 ВСЕ ДАННЫЕ СОЗДАНЫ И ПРОВЕРЕНЫ!")
            print("\nТеперь кабинет директора будет отображать:")
            print("• Реальную финансовую статистику")
            print("• Завершенные заказы с платежами")
            print("• Корректные расчеты выручки и прибыли")
            print("\n💡 Перезапустите фронтенд для обновления данных")
        else:
            print("\n⚠️ Данные созданы, но есть проблемы с проверкой")
    else:
        print("\n❌ Ошибка создания демонстрационных данных")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)