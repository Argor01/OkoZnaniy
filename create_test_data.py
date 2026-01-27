#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.experts.models import ExpertApplication

def create_test_data():
    print("🔧 Создание тестовых данных для демонстрации...")
    
    User = get_user_model()
    
    # Создаем тестовых пользователей разных ролей
    test_users = [
        {
            'username': 'test_expert_1',
            'email': 'expert1@test.com',
            'password': 'test123',
            'role': 'expert',
            'first_name': 'Мария',
            'last_name': 'Смирнова',
            'is_active': True
        },
        {
            'username': 'test_expert_2',
            'email': 'expert2@test.com',
            'password': 'test123',
            'role': 'expert',
            'first_name': 'Алексей',
            'last_name': 'Петров',
            'is_active': True
        },
        {
            'username': 'test_partner_1',
            'email': 'partner1@test.com',
            'password': 'test123',
            'role': 'partner',
            'first_name': 'Елена',
            'last_name': 'Козлова',
            'is_active': True,
            'referral_code': 'PARTNER001',
            'partner_commission_rate': Decimal('10.00')
        },
        {
            'username': 'test_arbitrator_1',
            'email': 'arbitrator1@test.com',
            'password': 'test123',
            'role': 'arbitrator',
            'first_name': 'Дмитрий',
            'last_name': 'Арбитров',
            'is_active': True
        },
        {
            'username': 'test_client_1',
            'email': 'client1@test.com',
            'password': 'test123',
            'role': 'client',
            'first_name': 'Анна',
            'last_name': 'Клиентова',
            'is_active': True
        },
        {
            'username': 'test_client_2',
            'email': 'client2@test.com',
            'password': 'test123',
            'role': 'client',
            'first_name': 'Игорь',
            'last_name': 'Заказчиков',
            'is_active': True
        }
    ]
    
    created_users = []
    for user_data in test_users:
        try:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                print(f"✅ Создан пользователь: {user.email} ({user.role})")
            else:
                print(f"ℹ️  Пользователь уже существует: {user.email} ({user.role})")
            created_users.append(user)
        except Exception as e:
            print(f"❌ Ошибка создания пользователя {user_data['email']}: {e}")
    
    # Создаем тестовые заявки экспертов
    print("\n🔧 Создание тестовых заявок экспертов...")
    
    # Находим экспертов без заявок
    experts_without_applications = User.objects.filter(
        role='expert'
    ).exclude(
        id__in=ExpertApplication.objects.values_list('expert_id', flat=True)
    )
    
    for expert in experts_without_applications[:2]:  # Создаем заявки для первых 2 экспертов
        try:
            application, created = ExpertApplication.objects.get_or_create(
                expert=expert,
                defaults={
                    'full_name': f'{expert.first_name} {expert.last_name}',
                    'work_experience_years': 5,
                    'specializations': 'Python, Django, React, JavaScript',
                    'status': 'pending'
                }
            )
            if created:
                print(f"✅ Создана заявка для эксперта: {expert.email}")
            else:
                print(f"ℹ️  Заявка уже существует для: {expert.email}")
        except Exception as e:
            print(f"❌ Ошибка создания заявки для {expert.email}: {e}")
    
    # Создаем заявку, требующую рассмотрения
    try:
        pending_expert = User.objects.create_user(
            username='pending_expert',
            email='pending@test.com',
            password='test123',
            role='client',  # Пока клиент, станет экспертом после одобрения
            first_name='Ожидающий',
            last_name='Одобрения',
            has_submitted_application=True,
            application_approved=False
        )
        
        application, created = ExpertApplication.objects.get_or_create(
            expert=pending_expert,
            defaults={
                'full_name': f'{pending_expert.first_name} {pending_expert.last_name}',
                'work_experience_years': 3,
                'specializations': 'Копирайтинг, редактирование, SEO',
                'status': 'pending'
            }
        )
        if created:
            print(f"✅ Создана заявка на рассмотрение: {pending_expert.email}")
        else:
            print(f"ℹ️  Заявка на рассмотрение уже существует: {pending_expert.email}")
            
    except Exception as e:
        print(f"❌ Ошибка создания заявки на рассмотрение: {e}")
    
    print("\n📊 Статистика созданных данных:")
    print(f"   Всего пользователей: {User.objects.count()}")
    print(f"   Клиентов: {User.objects.filter(role='client').count()}")
    print(f"   Экспертов: {User.objects.filter(role='expert').count()}")
    print(f"   Партнеров: {User.objects.filter(role='partner').count()}")
    print(f"   Арбитров: {User.objects.filter(role='arbitrator').count()}")
    print(f"   Администраторов: {User.objects.filter(role='admin').count()}")
    print(f"   Заявок экспертов: {ExpertApplication.objects.count()}")
    print(f"   Заявок на рассмотрении: {ExpertApplication.objects.filter(status='pending').count()}")
    
    print("\n✅ Тестовые данные созданы!")

if __name__ == '__main__':
    create_test_data()