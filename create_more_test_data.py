#!/usr/bin/env python
"""
Скрипт для создания дополнительных тестовых данных
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
from django.db.models import Sum
from apps.orders.models import Order, Complexity
from apps.catalog.models import Subject, WorkType
from apps.users.models import PartnerEarning

User = get_user_model()

def create_more_test_data():
    """Создание дополнительных тестовых данных"""
    print("Создание дополнительных тестовых данных...")
    
    # Получаем пользователей
    try:
        client = User.objects.get(email='client@test.com')
        expert = User.objects.get(email='expert@test.com')
        partner = User.objects.get(email='partner@test.com')
    except User.DoesNotExist as e:
        print(f"Ошибка: пользователь не найден - {e}")
        return
    
    # Создаем дополнительных пользователей
    print("Создание дополнительных пользователей...")
    
    # Клиенты
    for i in range(2, 6):
        User.objects.get_or_create(
            email=f'client{i}@test.com',
            defaults={
                'username': f'client{i}',
                'first_name': f'Клиент{i}',
                'last_name': 'Тестовый',
                'role': 'client',
                'is_active': True
            }
        )
    
    # Эксперты
    for i in range(2, 4):
        User.objects.get_or_create(
            email=f'expert{i}@test.com',
            defaults={
                'username': f'expert{i}',
                'first_name': f'Эксперт{i}',
                'last_name': 'Тестовый',
                'role': 'expert',
                'is_active': True
            }
        )
    
    # Партнеры
    for i in range(2, 4):
        User.objects.get_or_create(
            email=f'partner{i}@test.com',
            defaults={
                'username': f'partner{i}',
                'first_name': f'Партнер{i}',
                'last_name': 'Тестовый',
                'role': 'partner',
                'is_active': True,
                'partner_commission_rate': Decimal('5.00'),
                'referral_code': f'PART{i}TEST'
            }
        )
    
    print("✅ Дополнительные пользователи созданы")
    
    # Получаем или создаем предметы и типы работ
    subjects_data = [
        ('Математика', 'Математические дисциплины'),
        ('Физика', 'Физические дисциплины'),
        ('Химия', 'Химические дисциплины'),
        ('История', 'Исторические дисциплины'),
        ('Литература', 'Литературные дисциплины'),
    ]
    
    work_types_data = [
        ('Курсовая работа', 'Курсовая работа'),
        ('Реферат', 'Реферат'),
        ('Контрольная работа', 'Контрольная работа'),
        ('Эссе', 'Эссе'),
        ('Лабораторная работа', 'Лабораторная работа'),
    ]
    
    subjects = []
    for name, desc in subjects_data:
        subject, _ = Subject.objects.get_or_create(
            name=name,
            defaults={'description': desc}
        )
        subjects.append(subject)
    
    work_types = []
    for name, desc in work_types_data:
        work_type, _ = WorkType.objects.get_or_create(
            name=name,
            defaults={'description': desc}
        )
        work_types.append(work_type)
    
    # Получаем сложность
    complexity, _ = Complexity.objects.get_or_create(
        name='Средняя',
        defaults={'multiplier': 1.0}
    )
    
    print("✅ Предметы и типы работ созданы")
    
    # Создаем больше заказов за последние 60 дней
    now = datetime.now()
    all_users = list(User.objects.filter(role='client'))
    all_experts = list(User.objects.filter(role='expert'))
    all_partners = list(User.objects.filter(role='partner'))
    
    import random
    
    orders_data = []
    for i in range(30):  # 30 дополнительных заказов
        days_ago = random.randint(1, 60)
        amount = Decimal(str(random.randint(2000, 25000)))
        status = random.choice(['completed', 'completed', 'completed', 'in_progress', 'pending'])
        
        orders_data.append({
            'title': f'Тестовый заказ #{i+10}',
            'description': f'Описание тестового заказа #{i+10}',
            'amount': amount,
            'status': status,
            'days_ago': days_ago,
            'client': random.choice(all_users),
            'expert': random.choice(all_experts) if status != 'pending' else None,
            'subject': random.choice(subjects),
            'work_type': random.choice(work_types),
        })
    
    created_orders = []
    
    for order_data in orders_data:
        created_at = now - timedelta(days=order_data['days_ago'])
        updated_at = created_at + timedelta(hours=random.randint(1, 48)) if order_data['status'] == 'completed' else created_at
        
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
            order_data['client'].id,
            order_data['expert'].id if order_data['expert'] else None,
            order_data['subject'].id,
            order_data['work_type'].id,
            complexity.id,
            order_data['status'],
            created_at,
            updated_at,
            created_at + timedelta(days=7),
            0  # discount_amount
        ])
        
        order_id = cursor.fetchone()[0]
        created_orders.append({
            'id': order_id,
            'amount': order_data['amount'],
            'status': order_data['status'],
            'updated_at': updated_at,
            'client': order_data['client']
        })
        
        # Создаем партнерские начисления для завершенных заказов
        if order_data['status'] == 'completed' and all_partners:
            partner = random.choice(all_partners)
            earning_amount = order_data['amount'] * Decimal('0.05')
            
            PartnerEarning.objects.create(
                partner=partner,
                referral=order_data['client'],
                order_id=order_id,
                amount=earning_amount,
                commission_rate=Decimal('5.00'),
                source_amount=order_data['amount'],
                earning_type='order',
                created_at=updated_at,
                is_paid=True
            )
    
    print(f"✅ Создано {len(created_orders)} дополнительных заказов")
    
    # Статистика
    completed_orders = [o for o in created_orders if o['status'] == 'completed']
    total_revenue = sum(o['amount'] for o in completed_orders)
    
    print(f"\n📊 Общая статистика:")
    print(f"   Всего пользователей: {User.objects.count()}")
    print(f"   Всего клиентов: {User.objects.filter(role='client').count()}")
    print(f"   Всего экспертов: {User.objects.filter(role='expert').count()}")
    print(f"   Всего партнеров: {User.objects.filter(role='partner').count()}")
    print(f"   Всего заказов: {Order.objects.count()}")
    print(f"   Завершенных заказов: {Order.objects.filter(status='completed').count()}")
    print(f"   Общий оборот: {Order.objects.filter(status='completed').aggregate(total=Sum('budget'))['total'] or 0}")
    print(f"   Партнерских начислений: {PartnerEarning.objects.count()}")

if __name__ == '__main__':
    create_more_test_data()