#!/usr/bin/env python
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

try:
    director = User.objects.filter(email='director@test.com').first()
    if director:
        print(f"✅ Директор найден:")
        print(f"   Email: {director.email}")
        print(f"   Username: {director.username}")
        print(f"   Роль: {director.role}")
        print(f"   Активен: {director.is_active}")
        print(f"   Суперпользователь: {director.is_superuser}")
        print(f"   Персонал: {director.is_staff}")
    else:
        print("❌ Директор не найден")
        print("Создаем директора...")
        
        director = User.objects.create_user(
            username='director',
            email='director@test.com',
            password='test123',
            role='admin',
            is_staff=True,
            is_superuser=True,
            first_name='Директор',
            last_name='Тестовый'
        )
        print(f"✅ Директор создан:")
        print(f"   Email: {director.email}")
        print(f"   Username: {director.username}")
        print(f"   Роль: {director.role}")
        
except Exception as e:
    print(f"❌ Ошибка: {e}")