#!/usr/bin/env python
"""
Простой тест для проверки статистики на странице "Мои работы"
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

def test_statistics_calculation():
    """Тестируем расчет статистики"""
    print("=== Тестирование расчета статистики ===")
    
    # Создаем тестовых пользователей или получаем существующих
    client, created = User.objects.get_or_create(
        username='test_client_stats',
        defaults={
            'email': 'client_stats@test.com',
            'role': 'client'
        }
    )
    if created:
        client.set_password('testpass123')
        client.save()
    
    expert, created = User.objects.get_or_create(
        username='test_expert_stats',
        defaults={
            'email': 'expert_stats@test.com',
            'role': 'expert'
        }
    )
    if created:
        expert.set_password('testpass123')
        expert.save()
    
    # Создаем предмет и тип работы
    subject, _ = Subject.objects.get_or_create(
        name='Тестовый предмет',
        defaults={'slug': 'test-subject'}
    )
    
    work_type, _ = WorkType.objects.get_or_create(
        name='Тестовая работа',
        defaults={
            'slug': 'test-work',
            'base_price': 1000,
            'estimated_time': 3
        }
    )
    
    # Создаем завершенные заказы с разными бюджетами
    budgets = [2000, 2500, 3000, 3500, 4000]
    ratings = [4, 5, 4, 5, 4]
    
    completed_orders = []
    for i, (budget, rating) in enumerate(zip(budgets, ratings)):
        order = Order.objects.create(
            client=client,
            expert=expert,
            subject=subject,
            work_type=work_type,
            title=f'Завершенный заказ {i+1}',
            description=f'Описание заказа {i+1}',
            budget=Decimal(str(budget)),
            deadline=timezone.now() + timedelta(days=7),
            status='completed'
        )
        completed_orders.append(order)
        
        # Добавляем рейтинг
        ExpertRating.objects.create(
            expert=expert,
            client=client,
            order=order,
            rating=rating,
            comment=f'Комментарий {i+1}'
        )
    
    # Создаем заказы в работе
    in_progress_budgets = [1500, 1800, 2200, 2600, 3000]
    in_progress_orders = []
    for i, budget in enumerate(in_progress_budgets):
        order = Order.objects.create(
            client=client,
            expert=expert,
            subject=subject,
            work_type=work_type,
            title=f'Заказ в работе {i+1}',
            description=f'Описание заказа в работе {i+1}',
            budget=Decimal(str(budget)),
            deadline=timezone.now() + timedelta(days=5),
            status='in_progress'
        )
        in_progress_orders.append(order)
    
    print(f"Создано завершенных заказов: {len(completed_orders)}")
    print(f"Создано заказов в работе: {len(in_progress_orders)}")
    
    # Тестируем логику из фронтенда
    print("\n--- Тестирование логики фронтенда ---")
    
    # Получаем заказы как на фронтенде
    completed_works = Order.objects.filter(expert=expert, status='completed').select_related('expert_rating')
    in_progress_works = Order.objects.filter(expert=expert, status='in_progress')
    
    print(f"Завершенные работы: {completed_works.count()}")
    print(f"В работе: {in_progress_works.count()}")
    
    # Считаем общий доход как на фронтенде
    total_income = sum(float(work.budget) for work in completed_works)
    print(f"Общий доход: {total_income:,.0f} ₽")
    
    # Считаем средний рейтинг как на фронтенде
    ratings_list = []
    for work in completed_works:
        if hasattr(work, 'expert_rating') and work.expert_rating:
            ratings_list.append(work.expert_rating.rating)
            print(f"  Заказ {work.id}: бюджет {work.budget} ₽, рейтинг {work.expert_rating.rating}")
    
    if ratings_list:
        avg_rating = sum(ratings_list) / len(ratings_list)
        print(f"Средний рейтинг: {avg_rating:.1f}")
    else:
        print("Средний рейтинг: 0.0")
    
    # Проверяем статистику эксперта
    print("\n--- Статистика эксперта ---")
    stats, created = ExpertStatistics.objects.get_or_create(expert=expert)
    stats.update_statistics()
    
    print(f"Всего заказов: {stats.total_orders}")
    print(f"Завершенных заказов: {stats.completed_orders}")
    print(f"Средний рейтинг: {stats.average_rating}")
    print(f"Общий заработок: {stats.total_earnings}")
    
    # Проверяем сериализатор
    print("\n--- Тестирование сериализатора ---")
    from apps.orders.serializers import OrderSerializer
    
    for order in completed_orders[:3]:  # Проверяем первые 3
        serializer = OrderSerializer(order)
        data = serializer.data
        rating = data.get('rating')
        print(f"Заказ {order.id}: бюджет {data['budget']} ₽, рейтинг {rating}")
    
    # Очистка
    print("\n--- Очистка ---")
    User.objects.filter(username__in=['test_client_stats', 'test_expert_stats']).delete()
    print("Тестовые данные удалены")

if __name__ == '__main__':
    test_statistics_calculation()