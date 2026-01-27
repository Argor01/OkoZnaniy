#!/usr/bin/env python
"""
Создание тестового пользователя для проверки API
"""
import os
import sys
import django
from decimal import Decimal

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append('.')
django.setup()

from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.experts.models import ExpertRating, ExpertStatistics
from apps.catalog.models import Subject, WorkType
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def create_test_user_with_data():
    """Создаем тестового пользователя с данными"""
    print("=== Создание тестового пользователя ===")
    
    # Создаем или обновляем тестового эксперта
    expert, created = User.objects.get_or_create(
        username='testexpert',
        defaults={
            'email': 'testexpert@example.com',
            'role': 'expert',
            'first_name': 'Тест',
            'last_name': 'Эксперт'
        }
    )
    expert.set_password('testpass123')
    expert.save()
    
    # Создаем тестового клиента
    client, created = User.objects.get_or_create(
        username='testclient',
        defaults={
            'email': 'testclient@example.com',
            'role': 'client',
            'first_name': 'Тест',
            'last_name': 'Клиент'
        }
    )
    client.set_password('testpass123')
    client.save()
    
    print(f"Эксперт: {expert.username} (ID: {expert.id})")
    print(f"Клиент: {client.username} (ID: {client.id})")
    
    # Создаем предмет и тип работы
    subject, _ = Subject.objects.get_or_create(
        name='Математика',
        defaults={'slug': 'matematika'}
    )
    
    work_type, _ = WorkType.objects.get_or_create(
        name='Контрольная работа',
        defaults={
            'slug': 'kontrolnaya',
            'base_price': 1000,
            'estimated_time': 3
        }
    )
    
    # Удаляем старые заказы этого эксперта
    Order.objects.filter(expert=expert).delete()
    
    # Создаем завершенные заказы
    print("\nСоздаем завершенные заказы...")
    budgets = [2000, 2500, 3000, 3500, 4000]
    ratings = [4, 5, 4, 5, 4]
    
    for i, (budget, rating) in enumerate(zip(budgets, ratings)):
        order = Order.objects.create(
            client=client,
            expert=expert,
            subject=subject,
            work_type=work_type,
            title=f'Завершенная работа {i+1}',
            description=f'Описание завершенной работы {i+1}',
            budget=Decimal(str(budget)),
            deadline=timezone.now() + timedelta(days=7),
            status='completed'
        )
        
        # Добавляем рейтинг
        ExpertRating.objects.create(
            expert=expert,
            client=client,
            order=order,
            rating=rating,
            comment=f'Отличная работа {i+1}'
        )
        print(f"  Заказ {order.id}: {budget} ₽, рейтинг {rating}")
    
    # Создаем заказы в работе
    print("\nСоздаем заказы в работе...")
    in_progress_budgets = [1500, 1800, 2200, 2600, 3000]
    
    for i, budget in enumerate(in_progress_budgets):
        order = Order.objects.create(
            client=client,
            expert=expert,
            subject=subject,
            work_type=work_type,
            title=f'Работа в процессе {i+1}',
            description=f'Описание работы в процессе {i+1}',
            budget=Decimal(str(budget)),
            deadline=timezone.now() + timedelta(days=5),
            status='in_progress'
        )
        print(f"  Заказ {order.id}: {budget} ₽")
    
    # Обновляем статистику эксперта
    stats, created = ExpertStatistics.objects.get_or_create(expert=expert)
    stats.update_statistics()
    
    print(f"\nСтатистика эксперта:")
    print(f"  Всего заказов: {stats.total_orders}")
    print(f"  Завершенных заказов: {stats.completed_orders}")
    print(f"  Средний рейтинг: {stats.average_rating}")
    
    print(f"\nДанные для входа:")
    print(f"  Логин: testexpert")
    print(f"  Пароль: testpass123")

if __name__ == '__main__':
    create_test_user_with_data()