#!/usr/bin/env python
"""
Тест создания работы через API
"""
import os
import sys
import django
import requests
from PIL import Image
import io

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.catalog.models import Subject, WorkType

User = get_user_model()

def create_test_image():
    """Создает тестовое изображение"""
    image = Image.new('RGB', (200, 200), color='blue')
    image_io = io.BytesIO()
    image.save(image_io, format='JPEG')
    image_io.seek(0)
    return image_io.getvalue()

def test_create_work():
    """Тестирует создание работы через API"""
    try:
        # Создаем пользователя
        user, created = User.objects.get_or_create(
            email='test_create@example.com',
            defaults={
                'username': 'testcreate',
                'first_name': 'Test',
                'last_name': 'Create'
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
        
        # Получаем или создаем предмет и тип работы
        subject, _ = Subject.objects.get_or_create(
            name='Информатика',
            defaults={'description': 'Тестовый предмет'}
        )
        
        work_type, _ = WorkType.objects.get_or_create(
            name='Лабораторная работа',
            defaults={'description': 'Тестовый тип работы'}
        )
        
        # Логинимся
        login_response = requests.post('http://127.0.0.1:8000/api/users/token/', {
            'username': 'testcreate',
            'password': 'testpass123'
        })
        
        if login_response.status_code != 200:
            print(f"❌ Ошибка логина: {login_response.status_code} - {login_response.text}")
            return False
        
        # Получаем токен
        token_data = login_response.json()
        token = token_data.get('access')
        
        if not token:
            print("❌ Не получен токен доступа")
            return False
        
        print(f"✅ Успешный логин, токен получен")
        
        # Создаем тестовое изображение
        image_data = create_test_image()
        
        # Подготавливаем данные для создания работы
        files = {
            'preview': ('test_preview.jpg', image_data, 'image/jpeg')
        }
        
        data = {
            'title': 'Тестовая работа с API',
            'description': 'Описание тестовой работы через API',
            'price': '1500.00',
            'subject': str(subject.id),
            'work_type': str(work_type.id)
        }
        
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # Создаем работу
        create_response = requests.post(
            'http://127.0.0.1:8000/api/shop/works/',
            data=data,
            files=files,
            headers=headers
        )
        
        print(f"📡 Статус создания работы: {create_response.status_code}")
        
        if create_response.status_code == 201:
            work_data = create_response.json()
            print(f"✅ Работа создана: {work_data['title']}")
            print(f"🖼️ Превью: {work_data.get('preview', 'Нет')}")
            return True
        else:
            print(f"❌ Ошибка создания работы: {create_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == '__main__':
    print("🧪 Тестирование создания работы через API...")
    success = test_create_work()
    
    if success:
        print("\n✅ Тест создания работы прошел успешно!")
    else:
        print("\n❌ Тест создания работы не прошел!")
        sys.exit(1)