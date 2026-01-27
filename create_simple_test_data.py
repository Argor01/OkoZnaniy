#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timedelta
import random

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from apps.payments.models import Payment

def create_simple_test_data():
    print("🔧 Создание простых тестовых данных для директора...")
    
    # Очищаем старые платежи
    print("🗑️ Очищаем старые тестовые платежи...")
    Payment.objects.filter(payment_id__startswith='test_payment_').delete()
    
    User = get_user_model()
    
    # Создаем дополнительных пользователей если их мало
    clients_count = User.objects.filter(role='client').count()
    experts_count = User.objects.filter(role='expert').count()
    
    if clients_count < 10:
        print(f"📝 Создаем дополнительных клиентов (текущее количество: {clients_count})")
        for i in range(10 - clients_count):
            User.objects.get_or_create(
                email=f'client_{i+clients_count+1}@test.com',
                defaults={
                    'username': f'client_{i+clients_count+1}',
                    'first_name': f'Клиент{i+clients_count+1}',
                    'last_name': f'Тестовый{i+clients_count+1}',
                    'role': 'client',
                    'is_active': True
                }
            )
    
    if experts_count < 5:
        print(f"📝 Создаем дополнительных экспертов (текущее количество: {experts_count})")
        for i in range(5 - experts_count):
            User.objects.get_or_create(
                email=f'expert_{i+experts_count+1}@test.com',
                defaults={
                    'username': f'expert_{i+experts_count+1}',
                    'first_name': f'Эксперт{i+experts_count+1}',
                    'last_name': f'Тестовый{i+experts_count+1}',
                    'role': 'expert',
                    'is_active': True
                }
            )
    
    # Получаем пользователей
    clients = list(User.objects.filter(role='client', is_active=True))
    experts = list(User.objects.filter(role='expert', is_active=True))
    partners = list(User.objects.filter(role='partner', is_active=True))
    
    print(f"👥 Пользователи: {len(clients)} клиентов, {len(experts)} экспертов, {len(partners)} партнеров")
    
    # Создаем простые заказы (без использования Order модели, чтобы избежать сигналов)
    print("💰 Создаем тестовые платежи...")
    
    now = timezone.now()
    start_date = now - timedelta(days=60)
    
    payments_created = 0
    
    for day in range(60):
        current_date = start_date + timedelta(days=day)
        
        # Создаем 1-3 платежа в день
        payments_per_day = random.randint(1, 3)
        
        for _ in range(payments_per_day):
            # Цена платежа
            amount = Decimal(str(random.randint(5000, 50000)))
            
            # Создаем фиктивный заказ ID
            fake_order_id = payments_created + 1000
            
            # Создаем платеж напрямую
            payment_date = current_date + timedelta(hours=random.randint(1, 24))
            
            # Создаем платеж без связи с заказом (для упрощения)
            Payment.objects.create(
                order_id=fake_order_id,  # Фиктивный ID
                amount=amount,
                payment_method='card',
                status='completed',
                payment_id=f'test_payment_{payments_created + 1}',
                created_at=payment_date,
                paid_at=payment_date
            )
            
            payments_created += 1
    
    # Назначаем партнеров некоторым клиентам
    if partners:
        print("🤝 Назначаем партнеров клиентам...")
        partner_clients = 0
        for client in clients[:len(clients)//3]:  # 1/3 клиентов через партнеров
            partner = random.choice(partners)
            client.partner = partner
            client.save()
            partner_clients += 1
        
        print(f"   Назначено {partner_clients} клиентов партнерам")
    
    print("\n📊 Статистика созданных данных:")
    print(f"   Платежей создано: {payments_created}")
    
    # Показываем финансовую статистику
    total_payments = Payment.objects.filter(status='completed').aggregate(
        total=models.Sum('amount')
    )['total'] or Decimal('0.00')
    
    print(f"\n💰 Финансовая статистика:")
    print(f"   Общий оборот от платежей: {total_payments:,.2f} ₽")
    
    print("\n✅ Простые тестовые данные созданы!")

if __name__ == '__main__':
    create_simple_test_data()