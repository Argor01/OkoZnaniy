from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import SubjectCategory

class Command(BaseCommand):
    help = 'Создает базовые категории предметов'

    def handle(self, *args, **options):
        # Сначала удаляем все существующие категории
        SubjectCategory.objects.all().delete()
        
        categories = [
            {
                'name': 'Технические науки',
                'description': 'Математика, физика, информатика и другие технические дисциплины',
                'order': 1,
                'slug': 'technical-sciences'
            },
            {
                'name': 'Гуманитарные науки',
                'description': 'История, философия, литература, языки и другие гуманитарные дисциплины',
                'order': 2,
                'slug': 'humanities'
            },
            {
                'name': 'Естественные науки',
                'description': 'Биология, химия, география и другие естественные науки',
                'order': 3,
                'slug': 'natural-sciences'
            },
            {
                'name': 'Общественные науки',
                'description': 'Экономика, социология, политология, право и другие общественные науки',
                'order': 4,
                'slug': 'social-sciences'
            },
            {
                'name': 'Медицина и здравоохранение',
                'description': 'Медицина, фармакология, психология и другие науки о здоровье',
                'order': 5,
                'slug': 'medicine-and-healthcare'
            },
            {
                'name': 'Искусство и дизайн',
                'description': 'Изобразительное искусство, музыка, архитектура, дизайн',
                'order': 6,
                'slug': 'art-and-design'
            }
        ]

        created_count = 0
        for category_data in categories:
            try:
                category = SubjectCategory.objects.create(
                    name=category_data['name'],
                    slug=category_data['slug'],
                    description=category_data['description'],
                    order=category_data['order']
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Создана категория "{category.name}" (slug: {category.slug})')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при создании категории "{category_data["name"]}": {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Создано {created_count} новых категорий')
        ) 