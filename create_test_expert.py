"""
Скрипт для создания тестового эксперта
Запустите: python manage.py shell < create_test_expert.py
"""

from apps.users.models import User
from apps.experts.models import Specialization
from apps.catalog.models import Subject

# Создаем тестового эксперта
expert, created = User.objects.get_or_create(
    username='test_expert',
    defaults={
        'email': 'expert@test.com',
        'role': 'expert',
        'first_name': 'Тест',
        'last_name': 'Эксперт',
        'balance': 10000,
        'frozen_balance': 2000
    }
)

if created:
    expert.set_password('Password123!@#')
    expert.save()
    print(f"✅ Создан эксперт: {expert.username}")
else:
    print(f"ℹ️ Эксперт уже существует: {expert.username}")

# Создаем специализацию
try:
    subject = Subject.objects.first()
    if subject:
        spec, created = Specialization.objects.get_or_create(
            expert=expert,
            subject=subject,
            defaults={
                'experience_years': 5,
                'hourly_rate': 1000,
                'is_verified': True
            }
        )
        if created:
            print(f"✅ Создана специализация: {subject.name}")
except Exception as e:
    print(f"⚠️ Ошибка создания специализации: {e}")

print("\n📝 Данные для входа:")
print(f"Username: {expert.username}")
print(f"Password: Password123!@#")
print(f"\n🔗 Получить токен:")
print(f"POST http://127.0.0.1:8000/api/token/")
print(f'Body: {{"username": "{expert.username}", "password": "Password123!@#"}}')
