#!/usr/bin/env python
import os
import sys
import django
import json

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

def test_director_api():
    print("🔍 Тестирование API директора...")
    
    # Получаем директора
    User = get_user_model()
    try:
        director = User.objects.get(email='director@test.com')
        print(f"✅ Найден директор: {director.email} (роль: {director.role})")
    except User.DoesNotExist:
        print("❌ Директор не найден")
        return
    
    # Создаем API клиента
    client = APIClient()
    
    # Получаем JWT токен
    refresh = RefreshToken.for_user(director)
    access_token = str(refresh.access_token)
    
    # Устанавливаем авторизацию
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    print(f"🔑 Токен получен: {access_token[:20]}...")
    
    # Тестируем endpoints
    endpoints = [
        ('/api/director/personnel/', 'GET'),
        ('/api/director/personnel/expert-applications/', 'GET'),
    ]
    
    for endpoint, method in endpoints:
        try:
            if method == 'GET':
                response = client.get(endpoint)
            else:
                response = client.post(endpoint)
                
            print(f"📡 {method} {endpoint}: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict) and 'results' in data:
                        print(f"   📊 Результатов: {len(data['results'])}")
                    elif isinstance(data, list):
                        print(f"   📊 Результатов: {len(data)}")
                    else:
                        print(f"   📊 Тип данных: {type(data)}")
                except:
                    print(f"   📊 Ответ: {response.content[:100]}...")
            else:
                print(f"   ❌ Ошибка: {response.content.decode()[:200]}...")
                
        except Exception as e:
            print(f"   ❌ Исключение: {e}")
    
    print("\n✅ Тестирование завершено")

if __name__ == '__main__':
    test_director_api()