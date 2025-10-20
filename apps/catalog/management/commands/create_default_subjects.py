from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import Subject, SubjectCategory

class Command(BaseCommand):
    help = 'Создает базовые предметы для каждой категории'

    def handle(self, *args, **options):
        # Сначала удаляем все существующие предметы
        Subject.objects.all().delete()
        
        subjects_data = {
            'technical-sciences': [
                {
                    'name': 'Математика',
                    'slug': 'mathematics',
                    'description': 'Высшая математика, алгебра, геометрия, математический анализ',
                    'min_price': 500,
                    'icon': 'fa-square-root-variable'
                },
                {
                    'name': 'Физика',
                    'slug': 'physics',
                    'description': 'Механика, электричество, оптика, квантовая физика',
                    'min_price': 600,
                    'icon': 'fa-atom'
                },
                {
                    'name': 'Информатика',
                    'slug': 'computer-science',
                    'description': 'Программирование, алгоритмы, базы данных, компьютерные сети',
                    'min_price': 700,
                    'icon': 'fa-code'
                }
            ],
            'humanities': [
                {
                    'name': 'История',
                    'slug': 'history',
                    'description': 'Всемирная история, история России, археология',
                    'min_price': 450,
                    'icon': 'fa-landmark'
                },
                {
                    'name': 'Философия',
                    'slug': 'philosophy',
                    'description': 'История философии, этика, логика, философия науки',
                    'min_price': 500,
                    'icon': 'fa-brain'
                },
                {
                    'name': 'Иностранные языки',
                    'slug': 'foreign-languages',
                    'description': 'Английский, немецкий, французский, испанский и другие языки',
                    'min_price': 400,
                    'icon': 'fa-language'
                }
            ],
            'natural-sciences': [
                {
                    'name': 'Биология',
                    'slug': 'biology',
                    'description': 'Анатомия, генетика, экология, ботаника, зоология',
                    'min_price': 550,
                    'icon': 'fa-dna'
                },
                {
                    'name': 'Химия',
                    'slug': 'chemistry',
                    'description': 'Неорганическая и органическая химия, биохимия',
                    'min_price': 600,
                    'icon': 'fa-flask'
                },
                {
                    'name': 'География',
                    'slug': 'geography',
                    'description': 'Физическая и экономическая география, геология',
                    'min_price': 450,
                    'icon': 'fa-earth-americas'
                }
            ],
            'social-sciences': [
                {
                    'name': 'Экономика',
                    'slug': 'economics',
                    'description': 'Микро- и макроэкономика, финансы, менеджмент',
                    'min_price': 600,
                    'icon': 'fa-chart-line'
                },
                {
                    'name': 'Право',
                    'slug': 'law',
                    'description': 'Гражданское, уголовное, административное право',
                    'min_price': 700,
                    'icon': 'fa-scale-balanced'
                },
                {
                    'name': 'Социология',
                    'slug': 'sociology',
                    'description': 'Общая социология, методы исследований, статистика',
                    'min_price': 550,
                    'icon': 'fa-users'
                }
            ],
            'medicine-and-healthcare': [
                {
                    'name': 'Анатомия',
                    'slug': 'anatomy',
                    'description': 'Анатомия человека, гистология, эмбриология',
                    'min_price': 700,
                    'icon': 'fa-person'
                },
                {
                    'name': 'Фармакология',
                    'slug': 'pharmacology',
                    'description': 'Общая фармакология, фармацевтическая химия',
                    'min_price': 800,
                    'icon': 'fa-pills'
                },
                {
                    'name': 'Психология',
                    'slug': 'psychology',
                    'description': 'Общая психология, психодиагностика, психотерапия',
                    'min_price': 600,
                    'icon': 'fa-brain'
                }
            ],
            'art-and-design': [
                {
                    'name': 'Изобразительное искусство',
                    'slug': 'fine-arts',
                    'description': 'Живопись, графика, скульптура, история искусств',
                    'min_price': 500,
                    'icon': 'fa-palette'
                },
                {
                    'name': 'Архитектура',
                    'slug': 'architecture',
                    'description': 'История архитектуры, проектирование, дизайн среды',
                    'min_price': 800,
                    'icon': 'fa-building'
                },
                {
                    'name': 'Музыка',
                    'slug': 'music',
                    'description': 'Теория музыки, история музыки, композиция',
                    'min_price': 450,
                    'icon': 'fa-music'
                }
            ]
        }

        created_count = 0
        for category_slug, subjects in subjects_data.items():
            try:
                category = SubjectCategory.objects.get(slug=category_slug)
                for subject_data in subjects:
                    # Создаем предмет с уникальным slug'ом
                    subject = Subject.objects.create(
                        name=subject_data['name'],
                        slug=subject_data['slug'],
                        description=subject_data['description'],
                        category=category,
                        min_price=subject_data['min_price'],
                        icon=subject_data['icon'],
                        is_active=True
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Создан предмет "{subject.name}" (slug: {subject.slug}) в категории "{category.name}"'
                        )
                    )
            except SubjectCategory.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Категория со slug="{category_slug}" не найдена')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при создании предметов для категории "{category_slug}": {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Создано {created_count} новых предметов')
        ) 