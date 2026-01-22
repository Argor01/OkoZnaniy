#!/usr/bin/env python
"""
Тест API для проверки возврата превью
"""
import os
import sys
import django
import json
from django.test import Client
from django.contrib.auth import get_user_model

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import ReadyWork
from apps.catalog.models import Subject, WorkType

User = get_user_model()

def test_api_preview():
    """Тестирует API для получения работ с превью"""
    try:
        client = Client()
        
        # Создаем пользователя
        user = User.objects.create_user(
            email='api_test@example.com',
            username='apitest',
            password='testpass123'
        )
        
        # Логинимся
        client.login(email='api_test@example.com', password='testpass123')
        
        # Получаем работы через API
        response = client.get('/api/shop/works/')
        
        print(f"📡 Статус ответа API: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📊 Количество работ: {len(data)}")
            
            # Проверяем работы с превью
            works_with_preview = [work for work in data if work.get('preview')]
            print(f"🖼️ Работ с превью: {len(works_with_preview)}")
            
            if works_with_preview:
                for work in works_with_preview[:3]:  # Показываем первые 3
                    print(f"  - {work['title']}: {work['preview']}")
            
            return True
        else:
            print(f"❌ Ошибка API: {response.status_code}")
            print(response.content.decode())
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании API: {e}")
        return False

if __name__ == '__main__':
    print("🧪 Тестирование API для превью...")
    success = test_api_preview()
    
    if success:
        print("\n✅ API тест прошел успешно!")
    else:
        print("\n❌ API тест не прошел!")
        sys.exit(1)