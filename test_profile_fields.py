#!/usr/bin/env python3
"""
Тест для проверки полей профиля эксперта
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
from apps.users.serializers import UserUpdateSerializer

User = get_user_model()

def test_profile_fields():
    """Тестируем поля профиля эксперта"""
    
    # Создаем тестового пользователя-эксперта
    user = User.objects.create_user(
        username='test_expert',
        email='test@example.com',
        password='testpass123',
        role='expert'
    )
    
    # Тестовые данные для обновления профиля
    test_data = {
        'bio': 'Опытный специалист в области математики и программирования',
        'experience_years': 5,
        'hourly_rate': 1500.00,
        'education': 'МГУ, факультет ВМК, специальность "Прикладная математика"',
        'skills': 'Python, JavaScript, Математический анализ, Алгебра',
        'portfolio_url': 'https://github.com/testexpert'
    }
    
    # Проверяем сериализатор
    serializer = UserUpdateSerializer(user, data=test_data, partial=True)
    
    if serializer.is_valid():
        updated_user = serializer.save()
        
        print("✅ Тест успешно пройден!")
        print(f"Пользователь: {updated_user.username}")
        print(f"Опыт: {updated_user.experience_years} лет")
        print(f"Ставка: {updated_user.hourly_rate} ₽/час")
        print(f"Образование: {updated_user.education}")
        print(f"Навыки: {updated_user.skills}")
        print(f"Портфолио: {updated_user.portfolio_url}")
        print(f"О себе: {updated_user.bio}")
        
        # Проверяем, что все поля сохранились правильно
        assert updated_user.experience_years == 5
        assert float(updated_user.hourly_rate) == 1500.00
        assert updated_user.education == test_data['education']
        assert updated_user.skills == test_data['skills']
        assert updated_user.portfolio_url == test_data['portfolio_url']
        assert updated_user.bio == test_data['bio']
        
        print("\n✅ Все поля сохранены корректно!")
        
    else:
        print("❌ Ошибки валидации:")
        for field, errors in serializer.errors.items():
            print(f"  {field}: {errors}")
        return False
    
    # Очистка
    user.delete()
    return True

if __name__ == '__main__':
    try:
        success = test_profile_fields()
        if success:
            print("\n🎉 Все тесты пройдены успешно!")
        else:
            print("\n❌ Тесты не пройдены")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Ошибка при выполнении теста: {e}")
        sys.exit(1)