#!/usr/bin/env python
"""
Простой тест без аутентификации
"""
import requests

def test_simple():
    try:
        # Тест health check
        response = requests.get('http://127.0.0.1:8000/api/health/')
        print(f"Health check: {response.status_code} - {response.text}")
        
        # Тест shop API без аутентификации
        response = requests.get('http://127.0.0.1:8000/api/shop/works/')
        print(f"Shop API: {response.status_code}")
        
        if response.status_code == 401:
            print("Требуется аутентификация - это нормально")
        elif response.status_code == 200:
            data = response.json()
            print(f"Получено работ: {len(data)}")
        else:
            print(f"Ошибка: {response.text}")
            
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == '__main__':
    test_simple()