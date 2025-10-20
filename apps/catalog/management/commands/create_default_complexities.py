from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import Complexity

class Command(BaseCommand):
    help = 'Создает базовые уровни сложности'

    def handle(self, *args, **options):
        # Сначала удаляем все существующие уровни сложности
        Complexity.objects.all().delete()
        
        complexities = [
            {
                'name': 'Базовый',
                'slug': 'basic',
                'description': 'Задания школьного уровня или начальных курсов',
                'multiplier': 1.0,
                'icon': 'fa-star'
            },
            {
                'name': 'Средний',
                'slug': 'intermediate',
                'description': 'Задания среднего уровня сложности, требующие углубленных знаний',
                'multiplier': 1.5,
                'icon': 'fa-star-half-stroke'
            },
            {
                'name': 'Продвинутый',
                'slug': 'advanced',
                'description': 'Сложные задания, требующие специализированных знаний',
                'multiplier': 2.0,
                'icon': 'fa-stars'
            },
            {
                'name': 'Экспертный',
                'slug': 'expert',
                'description': 'Задания повышенной сложности для специалистов',
                'multiplier': 2.5,
                'icon': 'fa-award'
            },
            {
                'name': 'Научный',
                'slug': 'scientific',
                'description': 'Задания научно-исследовательского уровня',
                'multiplier': 3.0,
                'icon': 'fa-microscope'
            }
        ]

        created_count = 0
        for complexity_data in complexities:
            try:
                # Создаем уровень сложности с уникальным slug'ом
                complexity = Complexity.objects.create(
                    name=complexity_data['name'],
                    slug=complexity_data['slug'],
                    description=complexity_data['description'],
                    multiplier=complexity_data['multiplier'],
                    icon=complexity_data['icon'],
                    is_active=True
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Создан уровень сложности "{complexity.name}" (slug: {complexity.slug}, множитель: x{complexity.multiplier})'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при создании уровня сложности "{complexity_data["name"]}": {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Создано {created_count} новых уровней сложности')
        ) 