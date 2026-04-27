#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

# Находим клиента
client_user = User.objects.get(username='brait.2005')
print(f"=== Тестирование от имени {client_user.username} ===")

api_client = APIClient()
api_client.force_authenticate(user=client_user)

# Получаем список чатов
response = api_client.get('/api/chat/chats/')
print(f"\nGET /api/chat/chats/")
print(f"Статус: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"Тип данных: {type(data)}")
    print(f"Данные: {json.dumps(data, indent=2, ensure_ascii=False)[:1000]}")
