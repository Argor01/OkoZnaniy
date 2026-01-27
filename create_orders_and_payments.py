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
from apps.catalog.models import Subject, WorkType

def create_orders_and_payments():
    print("🔧 Создание заказов и платежей для директора...")
    
    # Очищаем старые тестовые данные
    print("🗑️ Очищаем старые тестовые данные...")
    Payment.objects.filter(payment_id__startswith='test_payment_').delete()
    Order.objects.filter(title__startswith='Тестовый заказ').delete()
    
    User = get_user_model()
    
    # Получаем пользователей
    clients = list(User.objects.filter(role='client', is_active=True))
    experts = list(User.objects.filter(role='expert', is_active=True))
    partners = list(User.objects.filter(role='partner', is_active=True))
    
    if not clients:
        print("❌ Нет клиентов в системе")
        return
    
    if not experts:
        print("❌ Нет экспертов в системе")
        return
    
    print(f"👥 Пользователи: {len(clients)} клиентов, {len(experts)} экспертов, {len(partners)} партнеров")
    
    # Создаем предметы и типы работ если их нет
    subjects = list(Subject.objects.all())
    work_types = list(WorkType.objects.all())
    
    if not subjects:
        print("📚 Создаем предметы...")
        subject_names = ['Математика', 'Физика', 'Программирование', 'Экономика', 'История']
        for name in subject_names:
            subject, created = Subject.objects.get_or_create(name=name)
            subjects.append(subject)
    
    if not work_types:
        print("📋 Создаем типы работ...")
        work_type_names = ['Курсовая работа', 'Дипломная работа', 'Реферат', 'Эссе']
        for name in work_type_names:
            work_type, created = WorkType.objects.get_or_create(name=name)
            work_types.append(work_type)
    
    # Создаем заказы и платежи за последние 2 месяца
    print("📦 Создаем заказы и платежи...")
    
    now = timezone.now()
    start_date = now - timedelta(days=60)
    
    orders_created = 0
    payments_created = 0
    
    # Отключаем сигналы временно
    from django.db.models.signals import post_save
    from apps.experts import signals
    
    post_save.disconnect(signals.update_expert_stats_on_order_change, sender=Order)
    
    try:
        for day in range(60):
            current_date = start_date + timedelta(days=day)
            
            # Создаем 1-3 заказа в день
            orders_per_day = random.randint(1, 3)
            
            for _ in range(orders_per_day):
                client = random.choice(clients)
                expert = random.choice(experts) if random.random() > 0.3 else None
                subject = random.choice(subjects) if subjects else None
                work_type = random.choice(work_types) if work_types else None
                
                # Определяем статус заказа
                statuses = ['new', 'waiting_payment', 'in_progress', 'review', 'completed', 'cancelled']
                weights = [0.1, 0.1, 0.2, 0.1, 0.4, 0.1]  # 40% завершенных заказов
                status = random.choices(statuses, weights=weights)[0]
                
                # Цена заказа
                base_price = random.randint(5000, 50000)
                final_price = Decimal(str(base_price))
                
                # Создаем заказ
                order = Order(
                    client=client,
                    expert=expert,
                    subject=subject,
                    work_type=work_type,
                    title=f'Тестовый заказ #{orders_created + 1}',
                    description=f'Описание тестового заказа #{orders_created + 1}',
                    budget=final_price,
                    final_price=final_price,
                    status=status,
                    created_at=current_date,
                    updated_at=current_date + timedelta(hours=random.randint(1, 48)),
                    deadline=current_date + timedelta(days=random.randint(3, 14))
                )
                
                # Сохраняем без сигналов
                order.save()
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
    
    finally:
        # Включаем сигналы обратно
        post_save.connect(signals.update_expert_stats_on_order_change, sender=Order)
    
    # Назначаем партнеров некоторым клиентам
    if partners:
        print("🤝 Назначаем партнеров клиентам...")
        partner_clients = 0
        for client in clients[:len(clients)//3]:  # 1/3 клиентов через партнеров
            if not client.partner:  # Только если еще не назначен партнер
                partner = random.choice(partners)
                client.partner = partner
                client.save()
                partner_clients += 1
        
        print(f"   Назначено {partner_clients} клиентов партнерам")
    
    print("\n📊 Статистика созданных данных:")
    print(f"   Заказов создано: {orders_created}")
    print(f"   Платежей создано: {payments_created}")
    
    # Показываем финансовую статистику
    total_payments = Payment.objects.filter(status='completed').aggregate(
        total=models.Sum('amount')
    )['total'] or Decimal('0.00')
    
    print(f"\n💰 Финансовая статистика:")
    print(f"   Общий оборот от платежей: {total_payments:,.2f} ₽")
    
    print("\n✅ Заказы и платежи созданы!")

if __name__ == '__main__':
    create_orders_and_payments()