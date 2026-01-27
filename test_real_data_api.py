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

def test_real_data_api():
    print("🔍 Тестирование API директора с реальными данными...")
    
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
    client.force_authenticate(user=director)
    
    print("🔑 Авторизация установлена")
    
    # Тестируем финансовые endpoints
    endpoints = [
        ('/api/director/finance/turnover/', 'GET', 'Оборот за период'),
        ('/api/director/finance/net-profit/', 'GET', 'Чистая прибыль'),
        ('/api/director/finance/income/', 'GET', 'Детализация доходов'),
        ('/api/director/finance/expense/', 'GET', 'Детализация расходов'),
        ('/api/director/statistics/kpi/', 'GET', 'KPI показатели'),
        ('/api/director/partners/turnover/', 'GET', 'Оборот партнеров'),
    ]
    
    for endpoint, method, description in endpoints:
        try:
            print(f"\n📡 Тестируем: {description}")
            print(f"   URL: {method} {endpoint}")
            
            if method == 'GET':
                response = client.get(endpoint)
            else:
                response = client.post(endpoint)
                
            print(f"   Статус: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Анализируем ответ
                    if isinstance(data, dict):
                        if 'total' in data:
                            print(f"   💰 Общая сумма: {data['total']:,.2f} ₽")
                        if 'change_percent' in data:
                            print(f"   📈 Изменение: {data['change_percent']}%")
                        if 'results' in data:
                            print(f"   📊 Результатов: {len(data['results'])}")
                        elif isinstance(data, dict) and len(data) > 0:
                            print(f"   📊 Полей в ответе: {len(data.keys())}")
                            # Показываем первые несколько ключей
                            keys = list(data.keys())[:5]
                            print(f"   🔑 Ключи: {', '.join(keys)}")
                    elif isinstance(data, list):
                        print(f"   📊 Записей: {len(data)}")
                        if data and isinstance(data[0], dict):
                            print(f"   🔑 Поля записи: {', '.join(data[0].keys())}")
                    
                except Exception as e:
                    print(f"   📊 Ответ получен, но не JSON: {str(e)}")
                    print(f"   📄 Содержимое: {response.content[:200]}...")
            else:
                print(f"   ❌ Ошибка: {response.content.decode()[:200]}...")
                
        except Exception as e:
            print(f"   ❌ Исключение: {e}")
    
    print("\n✅ Тестирование API завершено")

if __name__ == '__main__':
    test_real_data_api()