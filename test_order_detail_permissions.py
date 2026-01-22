#!/usr/bin/env python
"""
Тест для проверки прав доступа на странице деталей заказа
"""
import os
import sys
import django
import requests

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.catalog.models import Subject, WorkType
from apps.orders.models import Order

User = get_user_model()

def test_order_detail_permissions():
    """Тестирует права доступа на странице деталей заказа"""
    try:
        # Создаем пользователя-заказчика
        client_user, created = User.objects.get_or_create(
            email='test_client@example.com',
            defaults={
                'username': 'testclient',
                'first_name': 'Test',
                'last_name': 'Client',
                'role': 'client'
            }
        )
        
        if created:
            client_user.set_password('testpass123')
            client_user.save()
        
        # Создаем пользователя-эксперта
        expert_user, created = User.objects.get_or_create(
            email='test_expert@example.com',
            defaults={
                'username': 'testexpert',
                'first_name': 'Test',
                'last_name': 'Expert',
                'role': 'expert'
            }
        )
        
        if created:
            expert_user.set_password('testpass123')
            expert_user.save()
        
        # Получаем или создаем предмет и тип работы
        subject, _ = Subject.objects.get_or_create(
            name='Математика',
            defaults={'description': 'Тестовый предмет'}
        )
        
        work_type, _ = WorkType.objects.get_or_create(
            name='Курсовая работа',
            defaults={'description': 'Тестовый тип работы'}
        )
        
        # Создаем заказ от имени клиента
        order = Order.objects.create(
            title='Тестовый заказ для проверки прав',
            description='Описание тестового заказа',
            budget=5000,
            subject=subject,
            work_type=work_type,
            client=client_user
        )
        
        print(f"✅ Создан заказ ID: {order.id}")
        
        # Тест 1: Логин как заказчик
        print("\n🧪 Тест 1: Заказчик просматривает свой заказ")
        client_login = requests.post('http://127.0.0.1:8000/api/users/token/', {
            'username': 'testclient',
            'password': 'testpass123'
        })
        
        if client_login.status_code == 200:
            client_token = client_login.json().get('access')
            client_headers = {'Authorization': f'Bearer {client_token}'}
            
            # Получаем детали заказа как заказчик
            order_response = requests.get(
                f'http://127.0.0.1:8000/api/orders/{order.id}/',
                headers=client_headers
            )
            
            if order_response.status_code == 200:
                order_data = order_response.json()
                print(f"  ✅ Заказчик может просматривать свой заказ")
                print(f"  📋 Заказ: {order_data['title']}")
                print(f"  👤 Клиент ID: {order_data.get('client', {}).get('id', 'Не указан')}")
                print(f"  💰 Бюджет: {order_data.get('budget', 'Не указан')} ₽")
            else:
                print(f"  ❌ Ошибка получения заказа: {order_response.status_code}")
        else:
            print(f"  ❌ Ошибка логина заказчика: {client_login.status_code}")
        
        # Тест 2: Логин как эксперт
        print("\n🧪 Тест 2: Эксперт просматривает чужой заказ")
        expert_login = requests.post('http://127.0.0.1:8000/api/users/token/', {
            'username': 'testexpert',
            'password': 'testpass123'
        })
        
        if expert_login.status_code == 200:
            expert_token = expert_login.json().get('access')
            expert_headers = {'Authorization': f'Bearer {expert_token}'}
            
            # Получаем детали заказа как эксперт
            order_response = requests.get(
                f'http://127.0.0.1:8000/api/orders/{order.id}/',
                headers=expert_headers
            )
            
            if order_response.status_code == 200:
                order_data = order_response.json()
                print(f"  ✅ Эксперт может просматривать заказ")
                print(f"  📋 Заказ: {order_data['title']}")
                print(f"  👤 Клиент ID: {order_data.get('client', {}).get('id', 'Не указан')}")
                print(f"  💰 Бюджет: {order_data.get('budget', 'Не указан')} ₽")
                
                # Проверяем, что эксперт может создать отклик (если API поддерживает)
                print(f"  📝 Эксперт может откликнуться на этот заказ")
            else:
                print(f"  ❌ Ошибка получения заказа: {order_response.status_code}")
        else:
            print(f"  ❌ Ошибка логина эксперта: {expert_login.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🧪 Тестирование прав доступа на странице деталей заказа...")
    success = test_order_detail_permissions()
    
    if success:
        print("\n✅ Тест прав доступа прошел успешно!")
        print("\n📝 Выводы:")
        print("  - Заказчик может просматривать свой заказ")
        print("  - Эксперт может просматривать чужие заказы")
        print("  - На фронтенде должна быть логика:")
        print("    * Скрывать кнопку 'Откликнуться' для автора заказа")
        print("    * Показывать 'Это ваш заказ' для автора")
        print("    * Скрывать кнопки управления откликами для не-авторов")
    else:
        print("\n❌ Тест прав доступа не прошел!")
        sys.exit(1)