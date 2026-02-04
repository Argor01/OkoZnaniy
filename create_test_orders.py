#!/usr/bin/env python
"""
Скрипт для создания тестовых заказов для проверки статистики директора
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
from apps.orders.models import Order, Complexity
from apps.catalog.models import Subject, WorkType
from apps.users.models import PartnerEarning

User = get_user_model()

def create_test_orders():
    """Создание тестовых заказов"""
    print("Создание тестовых заказов...")
    
    # Получаем пользователей
    try:
        client = User.objects.get(email='client@test.com')
        expert = User.objects.get(email='expert@test.com')
        partner = User.objects.get(email='partner@test.com')
    except User.DoesNotExist as e:
        print(f"Ошибка: пользователь не найден - {e}")
        return
    
    # Получаем или создаем предметы и типы работ
    subject, _ = Subject.objects.get_or_create(
        name='Экономика',
        defaults={'description': 'Экономические дисциплины'}
    )
    
    work_type, _ = WorkType.objects.get_or_create(
        name='Дипломная работа',
        defaults={'description': 'Дипломная работа'}
    )
    
    # Получаем сложность
    complexity, _ = Complexity.objects.get_or_create(
        name='Средняя',
        defaults={'multiplier': 1.0}
    )
    
    # Создаем заказы за последние 30 дней
    now = datetime.now()
    orders_data = [
        {
            'title': 'Дипломная работа по экономике',
            'description': 'Анализ современных тенденций развития малого бизнеса',
            'amount': Decimal('15000'),
            'status': 'completed',
            'days_ago': 5
        },
        {
            'title': 'Курсовая работа по менеджменту',
            'description': 'Управление персоналом в современных условиях',
            'amount': Decimal('8000'),
            'status': 'completed',
            'days_ago': 10
        },
        {
            'title': 'Реферат по маркетингу',
            'description': 'Цифровой маркетинг в социальных сетях',
            'amount': Decimal('3000'),
            'status': 'completed',
            'days_ago': 15
        },
        {
            'title': 'Контрольная работа по статистике',
            'description': 'Статистический анализ данных',
            'amount': Decimal('2500'),
            'status': 'completed',
            'days_ago': 20
        },
        {
            'title': 'Эссе по философии',
            'description': 'Современные философские концепции',
            'amount': Decimal('4000'),
            'status': 'completed',
            'days_ago': 25
        },
        {
            'title': 'Активный заказ 1',
            'description': 'Заказ в работе',
            'amount': Decimal('12000'),
            'status': 'in_progress',
            'days_ago': 3
        },
        {
            'title': 'Активный заказ 2',
            'description': 'Заказ на рассмотрении',
            'amount': Decimal('7000'),
            'status': 'pending',
            'days_ago': 1
        }
    ]
    
    created_orders = []
    
    for order_data in orders_data:
        created_at = now - timedelta(days=order_data['days_ago'])
        updated_at = created_at + timedelta(hours=2) if order_data['status'] == 'completed' else created_at
        
        order = Order.objects.create(
            title=order_data['title'],
            description=order_data['description'],
            budget=order_data['amount'],
            final_price=order_data['amount'],
            client=client,
            expert=expert if order_data['status'] != 'pending' else None,
            subject=subject,
            work_type=work_type,
            status=order_data['status'],
            created_at=created_at,
            updated_at=updated_at,
            deadline=created_at + timedelta(days=7),
            complexity=complexity
        )
        
        created_orders.append(order)
        print(f"✅ Создан заказ: {order.title} - {order.amount} ₽ ({order.status})")
        
        # Создаем партнерские начисления для завершенных заказов
        if order.status == 'completed':
            earning = PartnerEarning.objects.create(
                partner=partner,
                referral=client,
                order=order,
                amount=order.budget * Decimal('0.05'),  # 5% комиссия
                commission_rate=Decimal('5.00'),
                source_amount=order.budget,
                earning_type='order',
                created_at=updated_at,
                is_paid=True
            )
            print(f"   💰 Партнерское начисление: {earning.amount} ₽")
    
    print(f"\n🎉 Создано {len(created_orders)} тестовых заказов!")
    
    # Статистика
    completed_orders = [o for o in created_orders if o.status == 'completed']
    total_revenue = sum(o.budget for o in completed_orders)
    total_partner_earnings = sum(o.budget * Decimal('0.05') for o in completed_orders)
    
    print(f"\n📊 Статистика:")
    print(f"   Завершенных заказов: {len(completed_orders)}")
    print(f"   Общий оборот: {total_revenue} ₽")
    print(f"   Партнерские выплаты: {total_partner_earnings} ₽")
    print(f"   Активных заказов: {len([o for o in created_orders if o.status in ['pending', 'in_progress']])}")

if __name__ == '__main__':
    create_test_orders()