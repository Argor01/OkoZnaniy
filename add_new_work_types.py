#!/usr/bin/env python
"""
Скрипт для добавления новых типов работ
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import WorkType

def add_new_work_types():
    """Добавляет новые типы работ"""
    new_work_types_data = [
        # Новые типы работ, которых еще нет в базе
        {'name': 'Практическое задание', 'slug': 'prakticheskoe-zadanie', 'base_price': 1200, 'estimated_time': 5},
        {'name': 'Тест', 'slug': 'test', 'base_price': 300, 'estimated_time': 1},
        {'name': 'Зачётная работа', 'slug': 'zachyotnaya-rabota', 'base_price': 1500, 'estimated_time': 7},
        {'name': 'Проектная работа', 'slug': 'proektnaya-rabota', 'base_price': 4000, 'estimated_time': 21},
        {'name': 'Расчётно-графическая работа', 'slug': 'raschyotno-graficheskaya-rabota', 'base_price': 2500, 'estimated_time': 10},
        {'name': 'Домашняя работа', 'slug': 'domashnyaya-rabota', 'base_price': 400, 'estimated_time': 2},
        {'name': 'Индивидуальное задание', 'slug': 'individualnoe-zadanie', 'base_price': 800, 'estimated_time': 3},
        {'name': 'Модульная работа', 'slug': 'modulnaya-rabota', 'base_price': 1200, 'estimated_time': 5},
        {'name': 'Чертёж или графическое задание', 'slug': 'chertyozh-ili-graficheskoe-zadanie', 'base_price': 2000, 'estimated_time': 7},
        {'name': 'Компьютерное моделирование', 'slug': 'kompyuternoe-modelirovanie', 'base_price': 3500, 'estimated_time': 10},
        {'name': 'Социальный или творческий проект', 'slug': 'socialnyy-ili-tvorcheskiy-proekt', 'base_price': 3000, 'estimated_time': 14},
        {'name': 'Отчёт по практике (учебной, производственной, преддипломной)', 'slug': 'otchet-po-praktike-polnyy', 'base_price': 2000, 'estimated_time': 7},
    ]
    
    # Обновляем существующие типы работ с новыми названиями
    updates = [
        {'old_name': 'Дипломная работа', 'new_name': 'Дипломная работа (ВКР – выпускная квалификационная работа)'},
    ]
    
    created_count = 0
    updated_count = 0
    
    # Добавляем новые типы работ
    for data in new_work_types_data:
        work_type, created = WorkType.objects.get_or_create(
            slug=data['slug'],
            defaults={
                'name': data['name'],
                'base_price': data['base_price'],
                'estimated_time': data['estimated_time']
            }
        )
        if created:
            created_count += 1
            print(f"✅ Создан тип работы: {work_type.name} (ID: {work_type.id}, цена: {work_type.base_price}₽)")
        else:
            print(f"ℹ️  Тип работы уже существует: {work_type.name} (ID: {work_type.id})")
    
    # Обновляем существующие типы работ
    for update in updates:
        try:
            work_type = WorkType.objects.get(name=update['old_name'])
            work_type.name = update['new_name']
            work_type.save()
            updated_count += 1
            print(f"🔄 Обновлен тип работы: {update['old_name']} → {update['new_name']}")
        except WorkType.DoesNotExist:
            print(f"⚠️  Тип работы не найден для обновления: {update['old_name']}")
    
    return created_count, updated_count

def main():
    print("=" * 60)
    print("📝 Добавление новых типов работ")
    print("=" * 60)
    print()
    
    created_count, updated_count = add_new_work_types()
    
    print(f"\n✅ Создано новых типов работ: {created_count}")
    print(f"🔄 Обновлено типов работ: {updated_count}")
    print(f"📊 Всего типов работ в БД: {WorkType.objects.count()}")
    print()
    
    print("=" * 60)
    print("✅ Типы работ успешно обновлены!")
    print("=" * 60)

if __name__ == '__main__':
    main()