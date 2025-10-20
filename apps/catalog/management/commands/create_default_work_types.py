from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import WorkType

class Command(BaseCommand):
    help = 'Создает базовые типы работ'

    def handle(self, *args, **options):
        # Сначала удаляем все существующие типы работ
        WorkType.objects.all().delete()
        
        work_types = [
            {
                'name': 'Контрольная работа',
                'slug': 'test-work',
                'description': 'Письменная работа для проверки знаний по конкретной теме',
                'base_price': 500,
                'estimated_time': 2,
                'icon': 'fa-pen-to-square'
            },
            {
                'name': 'Курсовая работа',
                'slug': 'course-work',
                'description': 'Самостоятельная научная работа с элементами исследования',
                'base_price': 2000,
                'estimated_time': 72,
                'icon': 'fa-book'
            },
            {
                'name': 'Дипломная работа',
                'slug': 'diploma',
                'description': 'Выпускная квалификационная работа',
                'base_price': 8000,
                'estimated_time': 240,
                'icon': 'fa-graduation-cap'
            },
            {
                'name': 'Реферат',
                'slug': 'essay',
                'description': 'Краткое изложение содержания научной работы',
                'base_price': 800,
                'estimated_time': 24,
                'icon': 'fa-file-lines'
            },
            {
                'name': 'Эссе',
                'slug': 'composition',
                'description': 'Прозаическое сочинение небольшого объема',
                'base_price': 400,
                'estimated_time': 4,
                'icon': 'fa-feather'
            },
            {
                'name': 'Лабораторная работа',
                'slug': 'lab-work',
                'description': 'Практическая работа с проведением опытов или расчетов',
                'base_price': 600,
                'estimated_time': 3,
                'icon': 'fa-flask-vial'
            },
            {
                'name': 'Презентация',
                'slug': 'presentation',
                'description': 'Наглядное представление информации',
                'base_price': 700,
                'estimated_time': 4,
                'icon': 'fa-presentation-screen'
            },
            {
                'name': 'Отчет по практике',
                'slug': 'practice-report',
                'description': 'Документ о прохождении учебной или производственной практики',
                'base_price': 1500,
                'estimated_time': 48,
                'icon': 'fa-clipboard'
            },
            {
                'name': 'Решение задач',
                'slug': 'problem-solving',
                'description': 'Выполнение математических, физических или других задач',
                'base_price': 300,
                'estimated_time': 1,
                'icon': 'fa-calculator'
            },
            {
                'name': 'Магистерская диссертация',
                'slug': 'masters-thesis',
                'description': 'Научно-исследовательская работа для получения степени магистра',
                'base_price': 15000,
                'estimated_time': 360,
                'icon': 'fa-award'
            }
        ]

        created_count = 0
        for work_type_data in work_types:
            try:
                # Создаем тип работы с уникальным slug'ом
                work_type = WorkType.objects.create(
                    name=work_type_data['name'],
                    slug=work_type_data['slug'],
                    description=work_type_data['description'],
                    base_price=work_type_data['base_price'],
                    estimated_time=work_type_data['estimated_time'],
                    icon=work_type_data['icon'],
                    is_active=True
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Создан тип работы "{work_type.name}" (slug: {work_type.slug}, базовая цена: {work_type.base_price})'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при создании типа работы "{work_type_data["name"]}": {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Создано {created_count} новых типов работ')
        ) 