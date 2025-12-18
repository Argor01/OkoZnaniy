#!/usr/bin/env python
"""
Скрипт для заполнения справочников предметов и типов работ
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Subject, WorkType

def populate_subjects():
    """Создаёт базовые предметы"""
    subjects_data = [
        {'name': 'Математика', 'slug': 'matematika'},
        {'name': 'Другое', 'slug': 'drugoe'},
        {'name': 'Физика', 'slug': 'fizika'},
        {'name': 'Химия', 'slug': 'himiya'},
        {'name': 'Биология', 'slug': 'biologiya'},
        {'name': 'История', 'slug': 'istoriya'},
        {'name': 'Литература', 'slug': 'literatura'},
        {'name': 'Русский язык', 'slug': 'russkiy-yazyk'},
        {'name': 'Английский язык', 'slug': 'angliyskiy-yazyk'},
        {'name': 'Информатика', 'slug': 'informatika'},
        {'name': 'Экономика', 'slug': 'ekonomika'},
        {'name': 'Право', 'slug': 'pravo'},
        {'name': 'Философия', 'slug': 'filosofiya'},
        {'name': 'Психология', 'slug': 'psihologiya'},
        {'name': 'Социология', 'slug': 'sociologiya'},
    ]
    
    created_count = 0
    for data in subjects_data:
        subject, created = Subject.objects.get_or_create(
            slug=data['slug'],
            defaults={'name': data['name']}
        )
        if created:
            created_count += 1
            print(f"✅ Создан предмет: {subject.name} (ID: {subject.id})")
        else:
            print(f"ℹ️  Предмет уже существует: {subject.name} (ID: {subject.id})")
    
    return created_count

def populate_work_types():
    """Создаёт базовые типы работ"""
    work_types_data = [
        {'name': 'Курсовая работа', 'slug': 'kursovaya-rabota', 'base_price': 3000, 'estimated_time': 14},
        {'name': 'Другое', 'slug': 'drugoe', 'base_price': 1000, 'estimated_time': 7},
        {'name': 'Дипломная работа', 'slug': 'diplomnaya-rabota', 'base_price': 15000, 'estimated_time': 30},
        {'name': 'Реферат', 'slug': 'referat', 'base_price': 500, 'estimated_time': 3},
        {'name': 'Эссе', 'slug': 'esse', 'base_price': 800, 'estimated_time': 3},
        {'name': 'Контрольная работа', 'slug': 'kontrolnaya-rabota', 'base_price': 1000, 'estimated_time': 5},
        {'name': 'Лабораторная работа', 'slug': 'laboratornaya-rabota', 'base_price': 1500, 'estimated_time': 7},
        {'name': 'Решение задач', 'slug': 'reshenie-zadach', 'base_price': 500, 'estimated_time': 2},
        {'name': 'Презентация', 'slug': 'prezentaciya', 'base_price': 1000, 'estimated_time': 3},
        {'name': 'Отчёт по практике', 'slug': 'otchet-po-praktike', 'base_price': 2000, 'estimated_time': 7},
    ]
    
    created_count = 0
    for data in work_types_data:
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
    
    return created_count

def main():
    print("=" * 60)
    print("📚 Заполнение справочников предметов и типов работ")
    print("=" * 60)
    print()
    
    print("📖 Создание предметов...")
    subjects_created = populate_subjects()
    print(f"\n✅ Создано предметов: {subjects_created}")
    print(f"📊 Всего предметов в БД: {Subject.objects.count()}")
    print()
    
    print("📝 Создание типов работ...")
    work_types_created = populate_work_types()
    print(f"\n✅ Создано типов работ: {work_types_created}")
    print(f"📊 Всего типов работ в БД: {WorkType.objects.count()}")
    print()
    
    print("=" * 60)
    print("✅ Справочники успешно заполнены!")
    print("=" * 60)
    print()
    print("Теперь можно создавать заказы через интерфейс")

if __name__ == '__main__':
    main()
