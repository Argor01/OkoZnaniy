#!/usr/bin/env python
"""
Скрипт для заполнения каталога предметов и типов работ
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Subject, WorkType

# Предметы
SUBJECTS = [
    'Математика',
    'Физика',
    'Информатика',
    'Химия',
    'История',
    'Английский язык',
    'Философия',
    'Маркетинг',
    'Экономика',
    'Русский язык',
    'Литература',
    'Биология',
    'География',
    'Обществознание',
    'Право',
    'Психология',
    'Менеджмент',
    'Бухгалтерский учет',
]

# Типы работ
WORK_TYPES = [
    'Реферат',
    'Курсовая работа',
    'Лабораторная работа',
    'Контрольная работа',
    'Дипломная работа',
    'Решение задач',
    'Эссе',
    'Презентация',
    'Отчет',
    'Статья',
    'Доклад',
    'Чертеж',
    'Перевод',
    'Бизнес-план',
]

def populate_subjects():
    """Создать предметы"""
    print('Создание предметов...')
    for i, name in enumerate(SUBJECTS, start=1):
        try:
            subject, created = Subject.objects.get_or_create(
                name=name,
                defaults={'slug': f'subject-{i}'}
            )
            if created:
                print(f'  ✓ Создан предмет: {name} (ID: {subject.id})')
            else:
                print(f'  - Предмет уже существует: {name} (ID: {subject.id})')
        except Exception as e:
            print(f'  ✗ Ошибка при создании предмета {name}: {e}')

def populate_work_types():
    """Создать типы работ"""
    print('\nСоздание типов работ...')
    for i, name in enumerate(WORK_TYPES, start=1):
        try:
            work_type, created = WorkType.objects.get_or_create(
                name=name,
                defaults={'slug': f'work-type-{i}'}
            )
            if created:
                print(f'  ✓ Создан тип работы: {name} (ID: {work_type.id})')
            else:
                print(f'  - Тип работы уже существует: {name} (ID: {work_type.id})')
        except Exception as e:
            print(f'  ✗ Ошибка при создании типа работы {name}: {e}')

if __name__ == '__main__':
    print('=' * 60)
    print('Заполнение каталога предметов и типов работ')
    print('=' * 60)
    
    populate_subjects()
    populate_work_types()
    
    print('\n' + '=' * 60)
    print('Готово!')
    print('=' * 60)
    print(f'\nВсего предметов: {Subject.objects.count()}')
    print(f'Всего типов работ: {WorkType.objects.count()}')
