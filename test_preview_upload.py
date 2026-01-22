#!/usr/bin/env python
"""
Простой тест для проверки загрузки превью работы
"""
import os
import sys
import django
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import ReadyWork
from apps.catalog.models import Subject, WorkType
from apps.users.models import User

def create_test_image():
    """Создает тестовое изображение"""
    image = Image.new('RGB', (200, 200), color='red')
    image_io = io.BytesIO()
    image.save(image_io, format='JPEG')
    image_io.seek(0)
    
    return SimpleUploadedFile(
        name='test_preview.jpg',
        content=image_io.getvalue(),
        content_type='image/jpeg'
    )

def test_preview_upload():
    """Тестирует загрузку превью"""
    try:
        # Получаем или создаем тестовые данные
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        
        subject, created = Subject.objects.get_or_create(
            name='Математика',
            defaults={'description': 'Тестовый предмет'}
        )
        
        work_type, created = WorkType.objects.get_or_create(
            name='Курсовая работа',
            defaults={'description': 'Тестовый тип работы'}
        )
        
        # Создаем тестовое изображение
        test_image = create_test_image()
        
        # Создаем работу с превью
        work = ReadyWork.objects.create(
            title='Тестовая работа с превью',
            description='Описание тестовой работы',
            price=1000.00,
            subject=subject,
            work_type=work_type,
            author=user,
            preview=test_image
        )
        
        print(f"✅ Работа создана успешно: {work.title}")
        print(f"📁 Превью сохранено: {work.preview.url if work.preview else 'Нет'}")
        
        # Проверяем, что файл действительно сохранился
        if work.preview and os.path.exists(work.preview.path):
            print(f"✅ Файл превью существует: {work.preview.path}")
            print(f"📏 Размер файла: {os.path.getsize(work.preview.path)} байт")
        else:
            print("❌ Файл превью не найден")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
        return False

if __name__ == '__main__':
    print("🧪 Тестирование загрузки превью работы...")
    success = test_preview_upload()
    
    if success:
        print("\n✅ Тест прошел успешно!")
    else:
        print("\n❌ Тест не прошел!")
        sys.exit(1)