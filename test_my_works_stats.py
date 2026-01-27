#!/usr/bin/env python
"""
Тест для проверки статистики на странице "Мои работы"
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

def create_test_data():
    """Создаем тестовые данные"""
    print("Создаем тестовые данные...")
    
    # Создаем клиента
    client = User.objects.create_user(
        username='test_client',
        email='client@test.com',
        password='testpass123',
        role='client'
    )
    
    # Создаем эксперта
    expert = User.objects.create_user(
        username='test_expert',
        email='expert@test.com',
        password='testpass123',
        role='expert'
    )
    
    # Создаем предмет и тип работы
    subject = Subject.objects.get_or_create(
        name='Математика',
        defaults={'slug': 'matematika'}
    )[0]
    
    work_type = WorkType.objects.get_or_create(
        name='Контрольная работа',
        defaults={
            'slug': 'kontrolnaya',
            'base_price': 1000,
            'estimated_time': 3
        }
    )[0]
    
    # Создаем завершенные заказы
    completed_orders = []
    for i in range(5):
        order = Order.objects.create(
            client=client,
            expert=expert,
            subject=subject,
            work_type=work_type,
            title=f'Тестовый заказ {i+1}',
            description=f'Описание заказа {i+1}',
            budget=Decimal('2000') + Decimal(str(i * 500)),
            deadline=timezone.now() + timedelta(days=7),
            status='completed'
        )
        completed_orders.append(order)
        
        # Добавляем рейтинг для каждого завершенного заказа
        ExpertRating.objects.create(
            expert=expert,
            client=client,
            order=order,
            rating=4 + (i % 2),  # Рейтинги 4 и 5
            comment=f'Отличная работа {i+1}'
        )
    
    # Создаем заказы в работе
    for i in range(5):
        Order.objects.create(
            client=client,
            expert=expert,
            subject=subject,
            work_type=work_type,
            title=f'Заказ в работе {i+1}',
            description=f'Описание заказа в работе {i+1}',
            budget=Decimal('1500') + Decimal(str(i * 300)),
            deadline=timezone.now() + timedelta(days=5),
            status='in_progress'
        )
    
    # Обновляем статистику эксперта
    stats, created = ExpertStatistics.objects.get_or_create(expert=expert)
    stats.update_statistics()
    
    return expert, completed_orders

def test_statistics():
    """Тестируем статистику"""
    print("\n=== Тестирование статистики ===")
    
    expert, completed_orders = create_test_data()
    
    # Получаем заказы эксперта
    completed_works = Order.objects.filter(expert=expert, status='completed').select_related('expert_rating')
    in_progress_works = Order.objects.filter(expert=expert, status='in_progress')
    
    print(f"Завершенные работы: {completed_works.count()}")
    print(f"В работе: {in_progress_works.count()}")
    
    # Считаем общий доход
    total_income = sum(float(work.budget) for work in completed_works)
    print(f"Общий доход: {total_income:,.0f} ₽")
    
    # Считаем средний рейтинг
    ratings = []
    for work in completed_works:
        if hasattr(work, 'expert_rating') and work.expert_rating:
            ratings.append(work.expert_rating.rating)
            print(f"  Заказ {work.id}: рейтинг {work.expert_rating.rating}")
    
    if ratings:
        avg_rating = sum(ratings) / len(ratings)
        print(f"Средний рейтинг: {avg_rating:.1f}")
    else:
        print("Средний рейтинг: 0.0 (нет рейтингов)")
    
    # Проверяем статистику эксперта
    try:
        stats = expert.statistics
        print(f"\nСтатистика эксперта:")
        print(f"  Всего заказов: {stats.total_orders}")
        print(f"  Завершенных заказов: {stats.completed_orders}")
        print(f"  Средний рейтинг: {stats.average_rating}")
        print(f"  Общий заработок: {stats.total_earnings}")
    except Exception as e:
        print(f"Ошибка при получении статистики: {e}")

def test_api_response():
    """Тестируем API ответ"""
    print("\n=== Тестирование API ===")
    
    from django.test import Client
    from django.contrib.auth import authenticate
    
    client = Client()
    
    # Получаем эксперта
    expert = User.objects.filter(role='expert').first()
    if not expert:
        print("Эксперт не найден")
        return
    
    # Логинимся как эксперт
    client.force_login(expert)
    
    # Тестируем API завершенных работ
    response = client.get('/api/orders/orders/', {'status': 'completed'})
    print(f"API завершенных работ: статус {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"Количество завершенных работ: {len(results)}")
        
        for work in results[:3]:  # Показываем первые 3
            rating = work.get('rating', 'Нет рейтинга')
            print(f"  Заказ {work['id']}: бюджет {work['budget']} ₽, рейтинг {rating}")
    
    # Тестируем API работ в процессе
    response = client.get('/api/orders/orders/', {'status': 'in_progress'})
    print(f"\nAPI работ в процессе: статус {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"Количество работ в процессе: {len(results)}")

def cleanup():
    """Очищаем тестовые данные"""
    print("\n=== Очистка тестовых данных ===")
    
    # Удаляем тестовых пользователей и связанные данные
    User.objects.filter(username__in=['test_client', 'test_expert']).delete()
    print("Тестовые данные удалены")

if __name__ == '__main__':
    try:
        test_statistics()
        test_api_response()
    finally:
        cleanup()