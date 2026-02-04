#!/usr/bin/env python
"""
Упрощенный скрипт для создания тестовых заказов
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
        }
    ]
    
    created_orders = []
    
    # Отключаем сигналы временно
    from django.db import transaction
    
    for order_data in orders_data:
        created_at = now - timedelta(days=order_data['days_ago'])
        updated_at = created_at + timedelta(hours=2) if order_data['status'] == 'completed' else created_at
        
        with transaction.atomic():
            # Создаем заказ напрямую в базе
            from django.db import connection
            cursor = connection.cursor()
            
            cursor.execute("""
                INSERT INTO orders_order 
                (title, description, budget, final_price, client_id, expert_id, 
                 subject_id, work_type_id, complexity_id, status, created_at, updated_at, deadline, discount_amount)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, [
                order_data['title'],
                order_data['description'],
                order_data['amount'],
                order_data['amount'],
                client.id,
                expert.id,
                subject.id,
                work_type.id,
                complexity.id,
                order_data['status'],
                created_at,
                updated_at,
                created_at + timedelta(days=7),
                0  # discount_amount
            ])
            
            order_id = cursor.fetchone()[0]
            print(f"✅ Создан заказ: {order_data['title']} - {order_data['amount']} ₽ ({order_data['status']})")
    
    print(f"\n🎉 Создано {len(orders_data)} тестовых заказов!")

if __name__ == '__main__':
    create_test_orders()