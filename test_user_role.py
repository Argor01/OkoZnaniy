#!/usr/bin/env python3
"""
Тест для проверки роли пользователя
"""
import os
import sys
import django
from django.conf import settings

# Добавляем корневую директорию проекта в путь
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.users.serializers import UserSerializer

User = get_user_model()

def test_user_role():
    """Тестируем роль пользователя"""
    
    # Создаем тестового пользователя-эксперта
    user = User.objects.create_user(
        username='test_expert_role',
        email='test_role@example.com',
        password='testpass123',
        role='expert'
    )
    
    print(f"Создан пользователь: {user.username}")
    print(f"Роль пользователя: {user.role}")
    print(f"Роль == 'expert': {user.role == 'expert'}")
    
    # Проверяем сериализатор
    serializer = UserSerializer(user)
    data = serializer.data
    
    print(f"\nДанные из сериализатора:")
    print(f"Роль: {data.get('role')}")
    print(f"Роль == 'expert': {data.get('role') == 'expert'}")
    
    # Проверяем все поля профиля
    profile_fields = ['bio', 'experience_years', 'hourly_rate', 'education', 'skills', 'portfolio_url']
    print(f"\nПоля профиля в сериализаторе:")
    for field in profile_fields:
        value = data.get(field)
        print(f"  {field}: {value} (тип: {type(value)})")
    
    # Очистка
    user.delete()
    
    return data.get('role') == 'expert'

if __name__ == '__main__':
    try:
        success = test_user_role()
        if success:
            print("\n✅ Роль пользователя корректна!")
        else:
            print("\n❌ Проблема с ролью пользователя")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Ошибка при выполнении теста: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)