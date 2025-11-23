"""
Скрипт для создания тестовых пользователей для быстрого входа
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

# Тестовые пользователи
test_users = [
    {
        'username': 'admin_test',
        'email': 'admin@test.com',
        'password': 'test123',
        'role': 'admin',
        'first_name': 'Администратор',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'username': 'partner_test',
        'email': 'partner@test.com',
        'password': 'test123',
        'role': 'partner',
        'first_name': 'Партнер',
    },
    {
        'username': 'director_test',
        'email': 'director@test.com',
        'password': 'test123',
        'role': 'admin',
        'first_name': 'Директор',
        'is_staff': True,
    },
    {
        'username': 'expert_test',
        'email': 'expert@test.com',
        'password': 'test123',
        'role': 'expert',
        'first_name': 'Эксперт',
    },
    {
        'username': 'client_test',
        'email': 'client@test.com',
        'password': 'test123',
        'role': 'client',
        'first_name': 'Клиент',
    },
]

print("Создание тестовых пользователей...")
print("=" * 50)

for user_data in test_users:
    username = user_data['username']
    email = user_data['email']
    
    # Проверяем существует ли пользователь
    if User.objects.filter(username=username).exists():
        print(f"✓ Пользователь {username} уже существует")
        continue
    
    if User.objects.filter(email=email).exists():
        print(f"✓ Email {email} уже используется")
        continue
    
    # Создаем пользователя
    password = user_data.pop('password')
    user = User.objects.create_user(**user_data)
    user.set_password(password)
    user.email_verified = True
    user.save()
    
    print(f"✅ Создан: {username} ({email}) - роль: {user.role}")
    print(f"   Пароль: {password}")

print("=" * 50)
print("Готово!")
print("\nТестовые учетные данные:")
print("-" * 50)
for user_data in test_users:
    print(f"{user_data['first_name']:15} | {user_data['email']:20} | {user_data.get('password', 'N/A')}")
