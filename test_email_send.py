#!/usr/bin/env python
"""Тест отправки email"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.email_verification import create_verification_code, send_verification_code
from django.contrib.auth import get_user_model

User = get_user_model()

# Создаем тестового пользователя
test_email = 'test-debug-2026@yandex.ru'
user, created = User.objects.get_or_create(
    email=test_email, 
    defaults={'username': 'test_debug_2026', 'role': 'client'}
)
print(f'User: {user.id}, email: {user.email}, verified: {user.email_verified}')

# Создаем и отправляем код
code = create_verification_code(user)
print(f'Created code: {code.code}')
result = send_verification_code(user.email, code.code)
print(f'Send result: {result}')
