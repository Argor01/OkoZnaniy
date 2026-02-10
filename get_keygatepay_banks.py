#!/usr/bin/env python
"""
Скрипт для получения списка банков (рек) через API KeyGatePay
"""
import os
import sys
import requests
import json
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем ключи из .env
MERCHANT_ID = os.getenv('KEYGATEPAY_MERCHANT_ID')
MERCHANT_NAME = os.getenv('KEYGATEPAY_MERCHANT_NAME')
SECRET_KEY = os.getenv('KEYGATEPAY_SECRET_KEY')
API_KEY = os.getenv('KEYGATEPAY_API_KEY')

# API endpoint для получения списка банков
API_BASE_URL = 'https://api.keygatepay.com'  # Замените на реальный URL API

def get_banks_list():
    """Получить список банков через API"""
    
    print("=" * 60)
    print("🏦 Получение списка банков через KeyGatePay API")
    print("=" * 60)
    
    # Проверяем наличие ключей
    if not all([MERCHANT_ID, API_KEY, SECRET_KEY]):
        print("❌ Ошибка: Не все ключи API настроены в .env файле")
        print(f"MERCHANT_ID: {'✓' if MERCHANT_ID else '✗'}")
        print(f"API_KEY: {'✓' if API_KEY else '✗'}")
        print(f"SECRET_KEY: {'✓' if SECRET_KEY else '✗'}")
        return
    
    print(f"✅ Merchant ID: {MERCHANT_ID}")
    print(f"✅ Merchant Name: {MERCHANT_NAME}")
    print(f"✅ API Key: {API_KEY[:10]}...")
    print(f"✅ Secret Key: {SECRET_KEY[:10]}...")
    print()
    
    # Заголовки для запроса
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Merchant-ID': MERCHANT_ID,
    }
    
    try:
        # Пробуем разные возможные endpoints
        endpoints = [
            '/api/v1/banks',
            '/api/banks',
            '/v1/banks',
            '/banks',
            '/api/v1/requisites',
            '/api/requisites',
        ]
        
        print("🔍 Пробуем найти правильный endpoint...")
        print()
        
        for endpoint in endpoints:
            url = f"{API_BASE_URL}{endpoint}"
            print(f"Попытка: {url}")
            
            try:
                response = requests.get(url, headers=headers, timeout=10)
                
                print(f"  Статус: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"  ✅ Успешно!")
                    data = response.json()
                    print()
                    print("📋 Полученные данные:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                    print()
                    print("=" * 60)
                    return data
                elif response.status_code == 404:
                    print(f"  ⚠️ Endpoint не найден")
                elif response.status_code == 401:
                    print(f"  ❌ Ошибка авторизации")
                    print(f"  Ответ: {response.text}")
                else:
                    print(f"  ⚠️ Код ответа: {response.status_code}")
                    print(f"  Ответ: {response.text[:200]}")
                
            except requests.exceptions.RequestException as e:
                print(f"  ❌ Ошибка запроса: {e}")
            
            print()
        
        print("❌ Не удалось найти рабочий endpoint")
        print()
        print("💡 Рекомендации:")
        print("1. Проверьте документацию API KeyGatePay")
        print("2. Убедитесь, что API_BASE_URL правильный")
        print("3. Проверьте, что ключи API активны")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 60)


def test_api_connection():
    """Тестовый запрос для проверки подключения"""
    
    print("=" * 60)
    print("🔌 Тест подключения к API")
    print("=" * 60)
    
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Merchant-ID': MERCHANT_ID,
    }
    
    # Пробуем базовый endpoint
    test_urls = [
        'https://api.keygatepay.com',
        'https://keygatepay.com/api',
        'https://api.keygatepay.ru',
    ]
    
    for url in test_urls:
        print(f"\nПроверка: {url}")
        try:
            response = requests.get(url, headers=headers, timeout=5)
            print(f"  Статус: {response.status_code}")
            if response.status_code != 404:
                print(f"  Ответ: {response.text[:200]}")
        except Exception as e:
            print(f"  Ошибка: {e}")
    
    print("=" * 60)


if __name__ == '__main__':
    # Сначала тестируем подключение
    test_api_connection()
    print()
    
    # Затем пробуем получить список банков
    get_banks_list()
