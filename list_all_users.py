#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print("=== Все пользователи ===")
users = User.objects.all()
print(f"Всего: {users.count()}")
for u in users:
    print(f"ID: {u.id}, username: {u.username}, role: {u.role}, email: {u.email}")
