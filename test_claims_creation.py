#!/usr/bin/env python
"""
Скрипт для проверки создания претензий через API
"""
import os
import sys
import django

# Настройка Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.admin_panel.models import Claim
from django.contrib.auth import get_user_model

User = get_user_model()

def test_claims():
    """Проверка претензий в БД"""
    print("\n" + "="*60)
    print("ПРОВЕРКА ПРЕТЕНЗИЙ В БАЗЕ ДАННЫХ")
    print("="*60)
    
    # Получаем все претензии
    claims = Claim.objects.all().order_by('-created_at')
    
    print(f"\nВсего претензий в БД: {claims.count()}")
    
    if claims.count() == 0:
        print("\n⚠️  Претензий пока нет в базе данных")
        print("\nДля создания претензии:")
        print("1. Войдите как эксперт")
        print("2. Откройте чат с технической поддержкой")
        print("3. Нажмите кнопку 'Подать претензию' (красная иконка)")
        print("4. Заполните форму и отправьте")
        return
    
    print("\n" + "-"*60)
    print("ПОСЛЕДНИЕ 10 ПРЕТЕНЗИЙ:")
    print("-"*60)
    
    for claim in claims[:10]:
        print(f"\nПретензия #{claim.id}")
        print(f"  Пользователь: {claim.user.username} (ID: {claim.user.id})")
        print(f"  Тип: {claim.get_claim_type_display()}")
        print(f"  Тема: {claim.subject}")
        print(f"  Статус: {claim.get_status_display()}")
        if claim.order:
            print(f"  Заказ: #{claim.order.id}")
        print(f"  Создана: {claim.created_at.strftime('%d.%m.%Y %H:%M')}")
        print(f"  Описание: {claim.description[:100]}...")
        if claim.admin:
            print(f"  Администратор: {claim.admin.username}")
        print("-"*60)
    
    # Статистика по типам
    print("\nСТАТИСТИКА ПО ТИПАМ ПРЕТЕНЗИЙ:")
    print("-"*60)
    for choice in Claim.TYPE_CHOICES:
        count = claims.filter(claim_type=choice[0]).count()
        print(f"  {choice[1]}: {count}")
    
    # Статистика по статусам
    print("\nСТАТИСТИКА ПО СТАТУСАМ:")
    print("-"*60)
    for choice in Claim.STATUS_CHOICES:
        count = claims.filter(status=choice[0]).count()
        print(f"  {choice[1]}: {count}")

def create_test_claim():
    """Создать тестовую претензию"""
    print("\n" + "="*60)
    print("СОЗДАНИЕ ТЕСТОВОЙ ПРЕТЕНЗИИ")
    print("="*60)
    
    # Находим первого пользователя
    user = User.objects.first()
    if not user:
        print("\n❌ Нет пользователей в БД")
        return
    
    # Создаем претензию
    claim = Claim.objects.create(
        user=user,
        claim_type='other',
        subject='Тестовая претензия',
        description='Это тестовая претензия, созданная через скрипт для проверки функционала',
        status='new'
    )
    
    print(f"\n✅ Создана тестовая претензия #{claim.id}")
    print(f"   Пользователь: {user.username}")
    print(f"   Тип: {claim.get_claim_type_display()}")
    print(f"   Статус: {claim.get_status_display()}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Проверка претензий')
    parser.add_argument('--create', action='store_true', help='Создать тестовую претензию')
    args = parser.parse_args()
    
    if args.create:
        create_test_claim()
    
    test_claims()
    
    print("\n" + "="*60)
    print("ГОТОВО!")
    print("="*60 + "\n")
