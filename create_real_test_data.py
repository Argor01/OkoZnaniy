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
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.shop.models import ReadyWork
from apps.catalog.models import Subject, WorkType

def create_real_test_data():
    print("🔧 Создание реальных тестовых данных для директора...")
    
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
    
    # Создаем предметы и типы работ если их нет
    subjects = list(Subject.objects.all())
    work_types = list(WorkType.objects.all())
    
    if not subjects:
        print("📚 Создаем предметы...")
        subject_names = ['Математика', 'Физика', 'Программирование', 'Экономика', 'История', 'Литература']
        for name in subject_names:
            subject, created = Subject.objects.get_or_create(name=name)
            subjects.append(subject)
    
    if not work_types:
        print("📋 Создаем типы работ...")
        work_type_names = ['Курсовая работа', 'Дипломная работа', 'Реферат', 'Эссе', 'Контрольная работа']
        for name in work_type_names:
            work_type, created = WorkType.objects.get_or_create(name=name)
            work_types.append(work_type)
    
    # Создаем заказы за последние 2 месяца
    print("📦 Создаем тестовые заказы...")
    
    now = timezone.now()
    start_date = now - timedelta(days=60)
    
    orders_created = 0
    payments_created = 0
    
    for day in range(60):
        current_date = start_date + timedelta(days=day)
        
        # Создаем 1-5 заказов в день
        orders_per_day = random.randint(1, 5)
        
        for _ in range(orders_per_day):
            client = random.choice(clients)
            expert = random.choice(experts) if random.random() > 0.3 else None  # 70% заказов имеют эксперта
            subject = random.choice(subjects)
            work_type = random.choice(work_types)
            
            # Определяем статус заказа
            statuses = ['new', 'waiting_payment', 'in_progress', 'review', 'completed', 'cancelled']
            weights = [0.1, 0.1, 0.2, 0.1, 0.4, 0.1]  # 40% завершенных заказов
            status = random.choices(statuses, weights=weights)[0]
            
            # Цена заказа
            base_price = random.randint(5000, 50000)
            final_price = Decimal(str(base_price))
            
            # Создаем заказ
            order = Order.objects.create(
                client=client,
                expert=expert,
                subject=subject,
                work_type=work_type,
                title=f'{work_type.name} по {subject.name}',
                description=f'Тестовый заказ #{orders_created + 1}',
                budget=final_price,
                final_price=final_price,
                status=status,
                created_at=current_date,
                updated_at=current_date + timedelta(hours=random.randint(1, 48)),
                deadline=current_date + timedelta(days=random.randint(3, 14))
            )
            
            orders_created += 1
            
            # Создаем платеж для завершенных заказов
            if status in ['completed', 'in_progress', 'review']:
                payment_date = current_date + timedelta(hours=random.randint(1, 24))
                
                payment = Payment.objects.create(
                    order=order,
                    amount=final_price,
                    payment_method='card',
                    status='completed',
                    payment_id=f'test_payment_{payments_created + 1}',
                    created_at=payment_date,
                    paid_at=payment_date
                )
                
                payments_created += 1
    
    # Создаем готовые работы в магазине
    print("🛍️ Создаем готовые работы в магазине...")
    
    works_created = 0
    
    for i in range(20):  # Создаем 20 готовых работ
        expert = random.choice(experts)
        subject = random.choice(subjects)
        work_type = random.choice(work_types)
        
        price = Decimal(str(random.randint(2000, 15000)))
        
        work = ReadyWork.objects.create(
            author=expert,
            title=f'{work_type.name} по {subject.name} (готовая работа)',
            description=f'Готовая работа #{i+1} для продажи',
            subject=subject,
            work_type=work_type,
            price=price,
            is_active=True,
            created_at=start_date + timedelta(days=random.randint(0, 50))
        )
        
        works_created += 1
    
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
    print(f"   Заказов создано: {orders_created}")
    print(f"   Платежей создано: {payments_created}")
    print(f"   Готовых работ создано: {works_created}")
    
    # Показываем финансовую статистику
    total_payments = Payment.objects.filter(status='completed').aggregate(
        total=models.Sum('amount')
    )['total'] or Decimal('0.00')
    
    print(f"\n💰 Финансовая статистика:")
    print(f"   Общий оборот от заказов: {total_payments:,.2f} ₽")
    print(f"   Общий оборот: {total_payments:,.2f} ₽")
    
    print("\n✅ Реальные тестовые данные созданы!")

if __name__ == '__main__':
    create_real_test_data()