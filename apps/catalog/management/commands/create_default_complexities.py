from django.core.management.base import BaseCommand
from apps.catalog.models import Complexity


class Command(BaseCommand):
    help = 'Создает уровни сложности'

    def handle(self, *args, **options):
        self.stdout.write('Добавляем уровни сложности...')
        
        complexities = [
            {
                'name': 'Легко',
                'slug': 'legko',
                'description': 'Базовый уровень сложности',
                'multiplier': 1.0,
                'icon': 'fa-feather',
            },
            {
                'name': 'Средне',
                'slug': 'sredne',
                'description': 'Средний уровень сложности',
                'multiplier': 1.5,
                'icon': 'fa-scale-balanced',
            },
            {
                'name': 'Сложно',
                'slug': 'slozhno',
                'description': 'Высокий уровень сложности',
                'multiplier': 2.0,
                'icon': 'fa-dumbbell',
            },
            {
                'name': 'Очень сложно',
                'slug': 'ochen-slozhno',
                'description': 'Максимальный уровень сложности',
                'multiplier': 2.5,
                'icon': 'fa-triangle-exclamation',
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for complexity_data in complexities:
            try:
                complexity, created = Complexity.objects.update_or_create(
                    slug=complexity_data['slug'],
                    defaults={
                        'name': complexity_data['name'],
                        'description': complexity_data['description'],
                        'multiplier': complexity_data['multiplier'],
                        'icon': complexity_data['icon'],
                        'is_active': True,
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Создан уровень сложности: {complexity.name}')
                    )
                else:
                    updated_count += 1
                    self.stdout.write(f'  Обновлён уровень сложности: {complexity.name}')
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при создании уровня сложности "{complexity_data["name"]}": {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nСоздано: {created_count}, Обновлено: {updated_count}')
        )
        self.stdout.write(f'Всего уровней сложности: {Complexity.objects.count()}')
