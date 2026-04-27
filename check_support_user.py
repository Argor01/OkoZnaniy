#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.chat.models import Chat

User = get_user_model()

print("=== Проверка пользователя техподдержки ===")
support_users = User.objects.filter(username__icontains='support')
print(f"Найдено пользователей с 'support': {support_users.count()}")
for u in support_users:
    print(f"  - {u.username} (ID: {u.id}, role: {u.role})")

if support_users.exists():
    support = support_users.first()
    chats = Chat.objects.filter(participants=support)
    print(f"\nЧатов с участием {support.username}: {chats.count()}")
    for chat in chats[:5]:
        print(f"  Чат #{chat.id}, сообщений: {chat.messages.count()}")
        if chat.messages.exists():
            last = chat.messages.last()
            print(f"    Последнее: {last.text[:50]}...")
