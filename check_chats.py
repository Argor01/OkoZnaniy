#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.chat.models import Chat

User = get_user_model()

# Находим пользователя техподдержки по той же логике
qs = User.objects.filter(is_active=True)
support_user = qs.filter(is_staff=True, username__iexact='support').first()
if not support_user:
    support_user = qs.filter(is_staff=True, username__iexact='administrator').first() or qs.filter(
        is_staff=True, username__iexact='admin'
    ).first()
if not support_user:
    support_user = qs.filter(is_staff=True).order_by('id').first()

print(f"=== Пользователь техподдержки ===")
if support_user:
    print(f"ID: {support_user.id}, username: {support_user.username}, role: {support_user.role}")
    
    chats = Chat.objects.filter(participants=support_user)
    print(f"\n=== Чаты с участием техподдержки: {chats.count()} ===")
    for chat in chats:
        participants = ', '.join([p.username for p in chat.participants.all()])
        print(f"\nЧат #{chat.id}")
        print(f"  Участники: {participants}")
        print(f"  Сообщений: {chat.messages.count()}")
        if chat.messages.exists():
            last = chat.messages.last()
            print(f"  Последнее: {last.sender.username}: {last.text[:50]}...")
else:
    print("Пользователь техподдержки не найден!")

print(f"\n=== Все чаты в системе: {Chat.objects.count()} ===")
for chat in Chat.objects.all()[:10]:
    participants = ', '.join([p.username for p in chat.participants.all()])
    print(f"Чат #{chat.id}: {participants}, сообщений: {chat.messages.count()}")
