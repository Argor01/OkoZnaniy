import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.experts.models import Specialization
from apps.catalog.models import Subject

# Создаем тестового эксперта
expert, created = User.objects.get_or_create(
    username='test_expert2',
    defaults={
        'email': 'expert2@test.com',
        'role': 'expert',
        'first_name': 'Мария',
        'last_name': 'Иванова',
        'balance': 15000,
        'frozen_balance': 3000,
        'bio': 'Опытный преподаватель математики с 10-летним стажем. Специализируюсь на высшей математике, линейной алгебре и математическом анализе. Помогаю студентам разобраться в сложных темах и успешно сдать экзамены.',
        'experience_years': 10,
        'hourly_rate': 1500,
        'education': 'МГУ им. М.В. Ломоносова, механико-математический факультет, 2010-2015',
        'skills': 'Математический анализ, Линейная алгебра, Дифференциальные уравнения, Теория вероятностей',
        'portfolio_url': 'https://example.com/portfolio',
        'is_verified': True
    }
)

if created:
    expert.set_password('Password123!@#')
    expert.save()
    print(f"Created expert: {expert.username}")
else:
    print(f"Expert already exists: {expert.username}")
    # Обновляем пароль на всякий случай
    expert.set_password('Password123!@#')
    expert.save()

# Создаем специализации
try:
    # Математика
    math_subject = Subject.objects.filter(name__icontains='математика').first()
    if math_subject:
        spec, created = Specialization.objects.get_or_create(
            expert=expert,
            subject=math_subject,
            defaults={
                'experience_years': 10,
                'hourly_rate': 1500,
                'is_verified': True,
                'description': 'Высшая математика, математический анализ, линейная алгебра'
            }
        )
        if created:
            print(f"Created specialization: {math_subject.name}")
    
    # Физика
    physics_subject = Subject.objects.filter(name__icontains='физика').first()
    if physics_subject:
        spec, created = Specialization.objects.get_or_create(
            expert=expert,
            subject=physics_subject,
            defaults={
                'experience_years': 8,
                'hourly_rate': 1400,
                'is_verified': True,
                'description': 'Механика, электродинамика, термодинамика'
            }
        )
        if created:
            print(f"Created specialization: {physics_subject.name}")
            
except Exception as e:
    print(f"Error creating specializations: {e}")

print("\nLogin credentials:")
print(f"Username: {expert.username}")
print(f"Email: {expert.email}")
print(f"Password: Password123!@#")
print(f"Role: {expert.role}")
print(f"Balance: {expert.balance}")
