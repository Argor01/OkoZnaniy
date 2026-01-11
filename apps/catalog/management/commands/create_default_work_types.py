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
                'name': 'Курсовая работа',
                'slug': 'kursovaya-rabota',
                'description': 'Самостоятельная научная работа с элементами исследования',
                'base_price': 3000,
                'estimated_time': 14,
                'icon': 'fa-book'
            },
            {
                'name': 'Дипломная работа (ВКР)',
                'slug': 'diplomnaya-rabota-vkr',
                'description': 'Выпускная квалификационная работа',
                'base_price': 15000,
                'estimated_time': 30,
                'icon': 'fa-graduation-cap'
            },
            {
                'name': 'Реферат',
                'slug': 'referat',
                'description': 'Краткое изложение содержания научной работы',
                'base_price': 500,
                'estimated_time': 3,
                'icon': 'fa-file-lines'
            },
            {
                'name': 'Доклад',
                'slug': 'doklad',
                'description': 'Публичное сообщение на определенную тему',
                'base_price': 600,
                'estimated_time': 2,
                'icon': 'fa-microphone'
            },
            {
                'name': 'Эссе',
                'slug': 'esse',
                'description': 'Прозаическое сочинение небольшого объема',
                'base_price': 800,
                'estimated_time': 3,
                'icon': 'fa-feather'
            },
            {
                'name': 'Лабораторная работа',
                'slug': 'laboratornaya-rabota',
                'description': 'Практическая работа с проведением опытов или расчетов',
                'base_price': 1500,
                'estimated_time': 7,
                'icon': 'fa-flask-vial'
            },
            {
                'name': 'Практическое задание',
                'slug': 'prakticheskoe-zadanie',
                'description': 'Выполнение практических задач по предмету',
                'base_price': 1200,
                'estimated_time': 5,
                'icon': 'fa-list-check'
            },
            {
                'name': 'Контрольная работа',
                'slug': 'kontrolnaya-rabota',
                'description': 'Письменная работа для проверки знаний',
                'base_price': 1000,
                'estimated_time': 5,
                'icon': 'fa-pen-to-square'
            },
            {
                'name': 'Тест',
                'slug': 'test',
                'description': 'Проверка знаний в тестовой форме',
                'base_price': 300,
                'estimated_time': 1,
                'icon': 'fa-check-double'
            },
            {
                'name': 'Зачётная работа',
                'slug': 'zachyotnaya-rabota',
                'description': 'Итоговая работа для получения зачета',
                'base_price': 1500,
                'estimated_time': 7,
                'icon': 'fa-clipboard-check'
            },
            {
                'name': 'Проектная работа',
                'slug': 'proektnaya-rabota',
                'description': 'Разработка проекта по заданной теме',
                'base_price': 4000,
                'estimated_time': 21,
                'icon': 'fa-project-diagram'
            },
            {
                'name': 'Отчёт по практике',
                'slug': 'otchet-po-praktike',
                'description': 'Документ о прохождении практики (учебной, производственной)',
                'base_price': 2000,
                'estimated_time': 7,
                'icon': 'fa-clipboard'
            },
            {
                'name': 'Расчётно-графическая работа',
                'slug': 'raschyotno-graficheskaya-rabota',
                'description': 'Выполнение расчетов и графических построений',
                'base_price': 2500,
                'estimated_time': 10,
                'icon': 'fa-chart-pie'
            },
            {
                'name': 'Домашняя работа',
                'slug': 'domashnyaya-rabota',
                'description': 'Выполнение домашнего задания',
                'base_price': 400,
                'estimated_time': 2,
                'icon': 'fa-house-laptop'
            },
            {
                'name': 'Индивидуальное задание',
                'slug': 'individualnoe-zadanie',
                'description': 'Персональное задание от преподавателя',
                'base_price': 800,
                'estimated_time': 3,
                'icon': 'fa-user-pen'
            },
            {
                'name': 'Презентация',
                'slug': 'prezentaciya',
                'description': 'Наглядное представление информации в слайдах',
                'base_price': 1000,
                'estimated_time': 3,
                'icon': 'fa-presentation-screen'
            },
            {
                'name': 'Модульная работа',
                'slug': 'modulnaya-rabota',
                'description': 'Работа по итогам учебного модуля',
                'base_price': 1200,
                'estimated_time': 5,
                'icon': 'fa-layer-group'
            },
            {
                'name': 'Бизнес-план',
                'slug': 'biznes-plan',
                'description': 'Разработка плана развития бизнеса',
                'base_price': 5000,
                'estimated_time': 14,
                'icon': 'fa-briefcase'
            },
            {
                'name': 'Чертёж',
                'slug': 'chertyozh-ili-graficheskoe-zadanie',
                'description': 'Выполнение чертежей и графических заданий',
                'base_price': 2000,
                'estimated_time': 7,
                'icon': 'fa-compass-drafting'
            },
            {
                'name': 'Компьютерное моделирование',
                'slug': 'kompyuternoe-modelirovanie',
                'description': 'Создание моделей в специализированном ПО',
                'base_price': 3500,
                'estimated_time': 10,
                'icon': 'fa-laptop-code'
            },
            {
                'name': 'Социальный проект',
                'slug': 'socialnyy-ili-tvorcheskiy-proekt',
                'description': 'Разработка социального или творческого проекта',
                'base_price': 3000,
                'estimated_time': 14,
                'icon': 'fa-users-gear'
            },
            {
                'name': 'Магистерская диссертация',
                'slug': 'masters-thesis',
                'description': 'Научно-исследовательская работа магистра',
                'base_price': 15000,
                'estimated_time': 30,
                'icon': 'fa-award'
            },
            {
                'name': 'Другое',
                'slug': 'drugoe',
                'description': 'Другой тип работы',
                'base_price': 1000,
                'estimated_time': 7,
                'icon': 'fa-circle-question'
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