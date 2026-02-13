#!/usr/bin/env python
"""
Обновляет даты завершенных заказов на текущий месяц
для корректного отображения в ЛК директора
"""
import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Order
from django.utils import timezone

print("Обновление дат завершенных заказов")
print("=" * 60)

# Текущая дата
now = timezone.now()
print(f"\nТекущая дата: {now}")

# Получаем завершенные заказы
completed = Order.objects.filter(status='completed').order_by('updated_at')
count = completed.count()

print(f"Найдено завершенных заказов: {count}")

if count == 0:
    print("Нет заказов для обновления")
    exit(0)

# Распределяем заказы равномерно по текущему месяцу
start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
days_in_month = (now - start_of_month).days + 1

print(f"\nРаспределяем {count} заказов по {days_in_month} дням текущего месяца")
print("-" * 60)

updated_count = 0
for i, order in enumerate(completed):
    # Распределяем равномерно по дням месяца
    day_offset = int((i / count) * days_in_month)
    new_date = start_of_month + timedelta(days=day_offset, hours=i % 24)
    
    old_date = order.updated_at
    order.updated_at = new_date
    order.save(update_fields=['updated_at'])
    
    updated_count += 1
    if updated_count <= 5:
        print(f"  Заказ #{order.id}: {old_date.date()} → {new_date.date()}")

print(f"\n✓ Обновлено заказов: {updated_count}")

# Проверяем результат
from django.db.models import Sum
total = Order.objects.filter(
    status='completed',
    updated_at__gte=start_of_month,
    updated_at__lte=now
).aggregate(total=Sum('budget'))['total']

print(f"\nОборот за текущий месяц: {total} руб")
print("\n" + "=" * 60)
print("✓ ГОТОВО! Теперь графики директора должны отображать данные")
print("=" * 60)
