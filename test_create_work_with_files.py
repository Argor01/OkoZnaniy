#!/usr/bin/env python
"""
Тест создания работы с файлами через API
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
    image = Image.new('RGB', (200, 200), color='green')
    image_io = io.BytesIO()
    image.save(image_io, format='JPEG')
    image_io.seek(0)
    return image_io.getvalue()

def create_test_document():
    """Создает тестовый документ"""
    content = """
    Тестовый документ для работы
    
    Это содержимое тестового документа, который будет загружен как файл работы.
    
    Содержит различную информацию о работе.
    """
    return content.encode('utf-8')

def test_create_work_with_files():
    """Тестирует создание работы с файлами через API"""
    try:
        # Создаем пользователя
        user, created = User.objects.get_or_create(
            email='test_files@example.com',
            defaults={
                'username': 'testfiles',
                'first_name': 'Test',
                'last_name': 'Files'
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
        
        # Получаем или создаем предмет и тип работы
        subject, _ = Subject.objects.get_or_create(
            name='Физика',
            defaults={'description': 'Тестовый предмет'}
        )
        
        work_type, _ = WorkType.objects.get_or_create(
            name='Реферат',
            defaults={'description': 'Тестовый тип работы'}
        )
        
        # Логинимся
        login_response = requests.post('http://127.0.0.1:8000/api/users/token/', {
            'username': 'testfiles',
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
        
        # Создаем тестовые файлы
        image_data = create_test_image()
        doc_data = create_test_document()
        
        # Подготавливаем файлы для загрузки
        files = [
            ('preview', ('preview.jpg', image_data, 'image/jpeg')),
            ('work_files', ('document1.txt', doc_data, 'text/plain')),
            ('work_files', ('document2.txt', doc_data, 'text/plain')),
        ]
        
        data = {
            'title': 'Работа с файлами',
            'description': 'Тестовая работа с несколькими файлами',
            'price': '2000.00',
            'subject': str(subject.id),
            'work_type': str(work_type.id)
        }
        
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # Создаем работу с файлами
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
            print(f"📁 Файлов: {len(work_data.get('files', []))}")
            
            for i, file_info in enumerate(work_data.get('files', []), 1):
                print(f"  Файл {i}: {file_info['name']} ({file_info['file_size']} байт)")
            
            return True
        else:
            print(f"❌ Ошибка создания работы: {create_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🧪 Тестирование создания работы с файлами...")
    success = test_create_work_with_files()
    
    if success:
        print("\n✅ Тест создания работы с файлами прошел успешно!")
    else:
        print("\n❌ Тест создания работы с файлами не прошел!")
        sys.exit(1)