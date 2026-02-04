#!/usr/bin/env python
"""
Скрипт для создания тестовых внутренних сообщений
"""
import os
import sys
import django

# Настройка Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.director.models import InternalMessage

def create_test_messages():
    """Создание тестовых сообщений"""
    
    # Получаем директора и арбитра (если есть)
    try:
        director = User.objects.filter(role='admin').first()
        if not director:
            print("❌ Директор не найден")
            return
        
        print(f"✅ Найден директор: {director.username}")
        
        # Создаем несколько тестовых сообщений
        messages = [
            {
                'sender': director,
                'text': 'Добрый день! Это тестовое сообщение для проверки системы коммуникации.',
                'priority': 'medium',
            },
            {
                'sender': director,
                'text': 'Срочное сообщение! Требуется согласование решения по обращению.',
                'priority': 'high',
            },
            {
                'sender': director,
                'text': 'Информационное сообщение о новых правилах работы.',
                'priority': 'low',
            },
        ]
        
        created_count = 0
        for msg_data in messages:
            msg = InternalMessage.objects.create(**msg_data)
            print(f"✅ Создано сообщение #{msg.id}: {msg.text[:50]}...")
            created_count += 1
        
        print(f"\n✅ Создано {created_count} тестовых сообщений")
        print(f"📊 Всего сообщений в системе: {InternalMessage.objects.count()}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("=" * 60)
    print("🔧 Создание тестовых внутренних сообщений")
    print("=" * 60)
    create_test_messages()
    print("=" * 60)
