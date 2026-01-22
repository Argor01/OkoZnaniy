#!/usr/bin/env python
"""
Тест для проверки отображения деталей работы
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
from apps.shop.models import ReadyWork

User = get_user_model()

def test_work_detail_api():
    """Тестирует API для получения деталей работы"""
    try:
        # Создаем пользователя
        user, created = User.objects.get_or_create(
            email='test_detail@example.com',
            defaults={
                'username': 'testdetail',
                'first_name': 'Test',
                'last_name': 'Detail'
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
        
        # Логинимся
        login_response = requests.post('http://127.0.0.1:8000/api/users/token/', {
            'username': 'testdetail',
            'password': 'testpass123'
        })
        
        if login_response.status_code != 200:
            print(f"❌ Ошибка логина: {login_response.status_code}")
            return False
        
        token_data = login_response.json()
        token = token_data.get('access')
        
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # Получаем список работ
        works_response = requests.get('http://127.0.0.1:8000/api/shop/works/', headers=headers)
        
        if works_response.status_code != 200:
            print(f"❌ Ошибка получения работ: {works_response.status_code}")
            return False
        
        works_data = works_response.json()
        
        # API может возвращать данные в разных форматах
        if isinstance(works_data, dict) and 'results' in works_data:
            works_list = works_data['results']
        elif isinstance(works_data, list):
            works_list = works_data
        else:
            works_list = []
        
        print(f"📊 Получено работ: {len(works_list)}")
        
        if not works_list:
            print("⚠️ Нет работ для тестирования")
            return True
        
        # Берем первую работу для детального просмотра
        work = works_list[0]
        work_id = work['id']
        
        print(f"🔍 Тестируем работу: {work['title']} (ID: {work_id})")
        print(f"📅 Дата создания: {work.get('created_at', 'Не указана')}")
        print(f"📚 Предмет: {work.get('subject_name', work.get('subject', 'Не указан'))}")
        print(f"👤 Автор: {work.get('author_name', 'Не указан')}")
        print(f"🖼️ Превью: {'Есть' if work.get('preview') else 'Нет'}")
        print(f"📁 Файлов: {len(work.get('files', []))}")
        
        # Показываем информацию о файлах
        files = work.get('files', [])
        if files:
            print("📄 Файлы:")
            for i, file_info in enumerate(files, 1):
                print(f"  {i}. {file_info['name']} ({file_info.get('file_type', 'неизвестный тип')}, {file_info.get('file_size', 0)} байт)")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🧪 Тестирование отображения деталей работы...")
    success = test_work_detail_api()
    
    if success:
        print("\n✅ Тест отображения деталей работы прошел успешно!")
    else:
        print("\n❌ Тест отображения деталей работы не прошел!")
        sys.exit(1)