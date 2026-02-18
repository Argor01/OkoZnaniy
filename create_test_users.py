#!/usr/bin/env python
"""
Создание тестовых пользователей для локальной разработки
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

def create_test_users():
    print("=" * 60)
    print("СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ")
    print("=" * 60)
    print()
    
    # Тестовый клиент
    client_data = {
        'username': 'test_client',
        'email': 'client@test.com',
        'first_name': 'Иван',
        'last_name': 'Клиентов',
        'role': 'client',
        'is_active': True,
    }
    
    client, created = User.objects.get_or_create(
        username=client_data['username'],
        defaults=client_data
    )
    
    if created:
        client.set_password('test123')
        client.save()
        print(f"✅ Создан клиент: {client.username}")
    else:
        print(f"ℹ️  Клиент уже существует: {client.username}")
    
    print(f"   Email: {client.email}")
    print(f"   Пароль: test123")
    print(f"   Роль: {client.role}")
    print()
    
    # Тестовый эксперт
    expert_data = {
        'username': 'test_expert',
        'email': 'expert@test.com',
        'first_name': 'Мария',
        'last_name': 'Экспертова',
        'role': 'expert',
        'is_active': True,
        'is_verified': True,
        'hourly_rate': Decimal('500.00'),
        'experience_years': 5,
        'bio': 'Опытный эксперт по написанию студенческих работ',
    }
    
    expert, created = User.objects.get_or_create(
        username=expert_data['username'],
        defaults=expert_data
    )
    
    if created:
        expert.set_password('test123')
        expert.save()
        print(f"✅ Создан эксперт: {expert.username}")
    else:
        print(f"ℹ️  Эксперт уже существует: {expert.username}")
    
    print(f"   Email: {expert.email}")
    print(f"   Пароль: test123")
    print(f"   Роль: {expert.role}")
    print(f"   Ставка: {expert.hourly_rate} руб/час")
    print()
    
    # Проверяем существующих пользователей
    print("=" * 60)
    print("ВСЕ ПОЛЬЗОВАТЕЛИ В СИСТЕМЕ:")
    print("=" * 60)
    
    all_users = User.objects.all().order_by('role', 'username')
    
    for user in all_users:
        role_emoji = {
            'admin': '👑',
            'director': '💼',
            'expert': '🎓',
            'client': '👤',
            'partner': '🤝',
        }.get(user.role, '❓')
        
        print(f"{role_emoji} {user.username:20} | {user.role:10} | {user.email:30} | {user.first_name} {user.last_name}")
    
    print()
    print("=" * 60)
    print("✅ ГОТОВО!")
    print("=" * 60)
    print()
    print("📝 Данные для входа:")
    print()
    print("КЛИЕНТ:")
    print("  Username: test_client")
    print("  Email: client@test.com")
    print("  Пароль: test123")
    print()
    print("ЭКСПЕРТ:")
    print("  Username: test_expert")
    print("  Email: expert@test.com")
    print("  Пароль: test123")
    print()
    print("АДМИНИСТРАТОР:")
    print("  Username: administrator")
    print("  Пароль: test123")
    print()
    print("🌐 Откройте: http://localhost:5173")
    print()

if __name__ == '__main__':
    create_test_users()
