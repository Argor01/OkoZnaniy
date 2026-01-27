#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

def test_director_api():
    print("🔍 Тестирование API директора...")
    
    # Создаем клиента для тестирования
    client = Client()
    
    # Логинимся как директор
    User = get_user_model()
    director = User.objects.get(email='director@test.com')
    client.force_login(director)
    
    print(f"✅ Авторизован как: {director.email} (роль: {director.role})")
    
    # Тестируем основные endpoints
    endpoints = [
        '/api/director/personnel/',
        '/api/director/personnel/expert-applications/',
        '/api/director/personnel/archive/',
    ]
    
    for endpoint in endpoints:
        try:
            response = client.get(endpoint)
            print(f"📡 {endpoint}: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'results' in data:
                    print(f"   📊 Результатов: {len(data['results'])}")
                elif isinstance(data, list):
                    print(f"   📊 Результатов: {len(data)}")
                else:
                    print(f"   📊 Данные: {type(data)}")
            else:
                print(f"   ❌ Ошибка: {response.content.decode()}")
        except Exception as e:
            print(f"   ❌ Исключение: {e}")
    
    # Тестируем создание сотрудника
    print("\n🧪 Тестирование создания сотрудника...")
    try:
        response = client.post('/api/director/personnel/register/', {
            'email': 'test-employee@example.com',
            'first_name': 'Тестовый',
            'last_name': 'Сотрудник',
            'role': 'expert',
            'password': 'testpass123'
        })
        print(f"📡 Создание сотрудника: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"   ✅ Создан сотрудник: {data.get('email')} (ID: {data.get('id')})")
        else:
            print(f"   ❌ Ошибка: {response.content.decode()}")
    except Exception as e:
        print(f"   ❌ Исключение: {e}")
    
    print("\n✅ Тестирование API завершено")

if __name__ == '__main__':
    test_director_api()