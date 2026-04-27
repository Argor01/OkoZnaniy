#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

# Находим администратора
admin = User.objects.filter(role='admin').first()
if not admin:
    print("Администратор не найден!")
    exit(1)

print(f"=== Тестирование API от имени {admin.username} ===")

client = APIClient()
client.force_authenticate(user=admin)

# Запрос к API
response = client.get('/api/admin-panel/support-chats/')
print(f"\nGET /api/admin-panel/support-chats/")
print(f"Статус: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"Получено чатов: {len(data)}")
    for chat in data:
        print(f"\nЧат #{chat['id']}:")
        print(f"  Клиент: {chat['client']['username']}")
        print(f"  Тема: {chat['subject']}")
        print(f"  Сообщений: {len(chat['messages'])}")
        for msg in chat['messages']:
            print(f"    - {msg['sender']['first_name']}: {msg['text'][:50]}...")
else:
    print(f"Ошибка: {response.json()}")
