#!/usr/bin/env python
"""
Простой скрипт для создания тестовых данных без Celery
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
from django.db import connection
from apps.catalog.models import Subject, WorkType
from apps.orders.models import Complexity
from apps.users.models import PartnerEarning

User = get_user_model()

def create_simple_test_data():
    """Создание простых тестовых данных"""
    print("Создание простых тестовых данных...")
    
    # Создаем базовых пользователей
    users_data = [
        ('client@test.com', 'client', 'Клиент', 'Тестовый', 'client'),
        ('expert@test.com', 'expert', 'Эксперт', 'Тестовый', 'expert'),
        ('client2@test.com', 'client2', 'Клиент2', 'Тестовый', 'client'),
        ('expert2@test.com', 'expert2', 'Эксперт2', 'Тестовый', 'expert'),
        ('client3@test.com', 'client3', 'Клиент3', 'Тестовый', 'client'),
    ]
    
    created_users = {}
    for email, username, first_name, last_name, role in users_data:
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
                'is_active': True
            }
        )
        if created:
            user.set_password('test123')
            user.save()
        created_users[role + ('2' if '2' in username else '3' if '3' in username else '')] = user
        print(f"✅ Пользователь {username} ({role})")
    
    # Создаем предметы и типы работ
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
    
    # Создаем заказы напрямую через SQL, чтобы избежать сигналов
    now = datetime.now()
    cursor = connection.cursor()
    
    import random
    
    orders_data = []
    for i in range(50):
        days_ago = random.randint(1, 60)
        amount = Decimal(str(random.randint(2000, 25000)))
        status = random.choice(['completed', 'completed', 'completed', 'in_progress', 'pending'])
        
        client = random.choice([created_users['client'], created_users['client2'], created_users['client3']])
        expert = random.choice([created_users['expert'], created_users['expert2']]) if status != 'pending' else None
        
        created_at = now - timedelta(days=days_ago)
        updated_at = created_at + timedelta(hours=random.randint(1, 48)) if status == 'completed' else created_at
        
        cursor.execute("""
            INSERT INTO orders_order 
            (title, description, budget, final_price, client_id, expert_id, 
             subject_id, work_type_id, complexity_id, status, created_at, updated_at, deadline, discount_amount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, [
            f'Тестовый заказ #{i+1}',
            f'Описание тестового заказа #{i+1}',
            amount,
            amount,
            client.id,
            expert.id if expert else None,
            random.choice(subjects).id,
            random.choice(work_types).id,
            complexity.id,
            status,
            created_at,
            updated_at,
            created_at + timedelta(days=7),
            0  # discount_amount
        ])
        
        order_id = cursor.fetchone()[0]
        
        # Создаем партнерские начисления для завершенных заказов
        if status == 'completed' and random.choice([True, False]):
            partner = User.objects.get(email='partner@test.com')
            earning_amount = amount * Decimal('0.05')
            
            PartnerEarning.objects.create(
                partner=partner,
                referral=client,
                order_id=order_id,
                amount=earning_amount,
                commission_rate=Decimal('5.00'),
                source_amount=amount,
                earning_type='order',
                created_at=updated_at,
                is_paid=True
            )
    
    print(f"✅ Создано 50 заказов")
    
    # Статистика
    from django.db.models import Sum, Count
    from apps.orders.models import Order
    
    total_orders = Order.objects.count()
    completed_orders = Order.objects.filter(status='completed').count()
    total_revenue = Order.objects.filter(status='completed').aggregate(total=Sum('budget'))['total'] or 0
    partner_earnings = PartnerEarning.objects.count()
    
    print(f"\n📊 Статистика:")
    print(f"   Всего пользователей: {User.objects.count()}")
    print(f"   Всего заказов: {total_orders}")
    print(f"   Завершенных заказов: {completed_orders}")
    print(f"   Общий оборот: {total_revenue}")
    print(f"   Партнерских начислений: {partner_earnings}")
    print(f"\n✅ Тестовые данные созданы!")

if __name__ == '__main__':
    create_simple_test_data()