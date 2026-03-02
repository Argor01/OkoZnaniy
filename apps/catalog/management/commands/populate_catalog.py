from django.core.management.base import BaseCommand
from apps.catalog.models import WorkType, Subject, SubjectCategory, Complexity


class Command(BaseCommand):
    help = 'Заполняет каталог типами работ, предметами и уровнями сложности'

    def handle(self, *args, **options):
        self.stdout.write('Начинаем заполнение каталога...')

        # Типы работ
        work_types = [
            {'name': 'Курсовая работа', 'base_price': 3000, 'estimated_time': 72},
            {'name': 'Дипломная работа (ВКР)', 'base_price': 15000, 'estimated_time': 240},
            {'name': 'Реферат', 'base_price': 500, 'estimated_time': 8},
            {'name': 'Доклад', 'base_price': 400, 'estimated_time': 6},
            {'name': 'Эссе', 'base_price': 600, 'estimated_time': 8},
            {'name': 'Лабораторная работа', 'base_price': 800, 'estimated_time': 12},
            {'name': 'Практическое задание', 'base_price': 700, 'estimated_time': 10},
            {'name': 'Контрольная работа', 'base_price': 1000, 'estimated_time': 16},
            {'name': 'Тест', 'base_price': 300, 'estimated_time': 2},
            {'name': 'Зачётная работа', 'base_price': 1500, 'estimated_time': 24},
            {'name': 'Проектная работа', 'base_price': 2500, 'estimated_time': 48},
            {'name': 'Отчёт по практике', 'base_price': 2000, 'estimated_time': 36},
            {'name': 'Расчётно-графическая работа', 'base_price': 1800, 'estimated_time': 30},
            {'name': 'Домашняя работа', 'base_price': 400, 'estimated_time': 6},
            {'name': 'Индивидуальное задание', 'base_price': 900, 'estimated_time': 14},
            {'name': 'Презентация', 'base_price': 600, 'estimated_time': 8},
            {'name': 'Модульная работа', 'base_price': 1200, 'estimated_time': 20},
            {'name': 'Бизнес-план', 'base_price': 3500, 'estimated_time': 60},
            {'name': 'Чертёж или графическое задание', 'base_price': 1500, 'estimated_time': 24},
            {'name': 'Компьютерное моделирование', 'base_price': 2000, 'estimated_time': 36},
            {'name': 'Социальный или творческий проект', 'base_price': 2200, 'estimated_time': 40},
        ]

        # Типы работ уже созданы, пропускаем
        self.stdout.write('Типы работ уже существуют, пропускаем...')
        
        # for wt_data in work_types:
        #     work_type, created = WorkType.objects.update_or_create(
        #         name=wt_data['name'],
        #         defaults={
        #             'base_price': wt_data['base_price'],
        #             'estimated_time': wt_data['estimated_time'],
        #             'is_active': True
        #         }
        #     )
        #     if created:
        #         self.stdout.write(self.style.SUCCESS(f'✓ Создан тип работы: {work_type.name}'))
        #     else:
        #         self.stdout.write(f'  Тип работы обновлён: {work_type.name}')

        # Категории предметов
        categories_data = [
            {'name': 'Точные науки', 'order': 1},
            {'name': 'Естественные науки', 'order': 2},
            {'name': 'Гуманитарные науки', 'order': 3},
            {'name': 'Социальные науки', 'order': 4},
            {'name': 'Технические науки', 'order': 5},
            {'name': 'Экономика и управление', 'order': 6},
            {'name': 'Языки', 'order': 7},
        ]

        categories = {}
        for cat_data in categories_data:
            category, created = SubjectCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={'order': cat_data['order']}
            )
            categories[cat_data['name']] = category
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Создана категория: {category.name}'))

        # Предметы
        subjects_data = [
            # Точные науки
            {'name': 'Математика', 'category': 'Точные науки', 'min_price': 500},
            {'name': 'Высшая математика', 'category': 'Точные науки', 'min_price': 800},
            {'name': 'Алгебра', 'category': 'Точные науки', 'min_price': 500},
            {'name': 'Геометрия', 'category': 'Точные науки', 'min_price': 500},
            {'name': 'Математический анализ', 'category': 'Точные науки', 'min_price': 800},
            {'name': 'Теория вероятностей', 'category': 'Точные науки', 'min_price': 700},
            {'name': 'Статистика', 'category': 'Точные науки', 'min_price': 700},
            {'name': 'Аналитическая геометрия', 'category': 'Точные науки', 'min_price': 700},
            {'name': 'Математическая логика', 'category': 'Точные науки', 'min_price': 800},
            
            # Естественные науки
            {'name': 'Физика', 'category': 'Естественные науки', 'min_price': 600},
            {'name': 'Химия', 'category': 'Естественные науки', 'min_price': 600},
            {'name': 'Биология', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'География', 'category': 'Естественные науки', 'min_price': 400},
            {'name': 'Астрономия', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Экология', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Биохимия', 'category': 'Естественные науки', 'min_price': 700},
            {'name': 'Физика твёрдого тела', 'category': 'Естественные науки', 'min_price': 800},
            {'name': 'Физическая география', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Геология', 'category': 'Естественные науки', 'min_price': 600},
            {'name': 'Почвоведение', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Картография', 'category': 'Естественные науки', 'min_price': 600},
            
            # Технические науки
            {'name': 'Информатика', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Программирование', 'category': 'Технические науки', 'min_price': 1000},
            {'name': 'Базы данных', 'category': 'Технические науки', 'min_price': 900},
            {'name': 'Сети и телекоммуникации', 'category': 'Технические науки', 'min_price': 800},
            {'name': 'Электротехника', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Механика', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Архитектура', 'category': 'Технические науки', 'min_price': 1000},
            {'name': 'Инженерная графика', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Техническое черчение', 'category': 'Технические науки', 'min_price': 600},
            {'name': 'Техническая механика', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Механика материалов', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Материаловедение', 'category': 'Технические науки', 'min_price': 600},
            {'name': 'Сопротивление материалов', 'category': 'Технические науки', 'min_price': 800},
            {'name': 'ИТ-безопасность', 'category': 'Технические науки', 'min_price': 900},
            {'name': 'Безопасность информационных систем', 'category': 'Технические науки', 'min_price': 900},
            {'name': 'Системы искусственного интеллекта', 'category': 'Технические науки', 'min_price': 1000},
            {'name': 'Геоинформационные системы', 'category': 'Технические науки', 'min_price': 800},
            {'name': 'Физические основы техники', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Конструкторская документация', 'category': 'Технические науки', 'min_price': 600},
            {'name': 'Градостроительство', 'category': 'Технические науки', 'min_price': 800},
            
            # Гуманитарные науки
            {'name': 'История', 'category': 'Гуманитарные науки', 'min_price': 500},
            {'name': 'Литература', 'category': 'Гуманитарные науки', 'min_price': 500},
            {'name': 'Философия', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Культурология', 'category': 'Гуманитарные науки', 'min_price': 500},
            {'name': 'Искусствоведение', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Этика и эстетика', 'category': 'Гуманитарные науки', 'min_price': 500},
            {'name': 'Эстетика', 'category': 'Гуманитарные науки', 'min_price': 500},
            {'name': 'Филология', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Религиоведение', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Иностранная литература', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'История государства и права', 'category': 'Гуманитарные науки', 'min_price': 700},
            {'name': 'Педагогика', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Логика', 'category': 'Гуманитарные науки', 'min_price': 600},
            
            # Социальные науки
            {'name': 'Психология', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Социология', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Политология', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Право', 'category': 'Социальные науки', 'min_price': 800},
            {'name': 'Юриспруденция', 'category': 'Социальные науки', 'min_price': 900},
            {'name': 'Правоведение', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Трудовое право', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Социальная работа', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Социальная психология', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Психология профессиональной деятельности', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Этнопсихология', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Антропология', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Демография', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Международные отношения', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Экологическое право', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Теория государства и права', 'category': 'Социальные науки', 'min_price': 800},
            
            # Экономика и управление
            {'name': 'Экономика', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Менеджмент', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Маркетинг', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Бухгалтерский учёт', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Финансы', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Инвестиции и финансы', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Экономическая теория', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Экономика организации', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Основы предпринимательской деятельности', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Основы предпринимательства', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Управление проектами', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Управление персоналом', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Управленческий учет', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Финансы и кредит', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Страхование', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Антикризисное управление', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Управление инновациями', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Основы менеджмента', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Инженерная экономика', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Организация производства', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Трудовые ресурсы', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Корпоративная культура', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Лидершип и тимбилдинг', 'category': 'Экономика и управление', 'min_price': 700},
            
            # Языки
            {'name': 'Русский язык', 'category': 'Языки', 'min_price': 400},
            {'name': 'Английский язык', 'category': 'Языки', 'min_price': 600},
            {'name': 'Немецкий язык', 'category': 'Языки', 'min_price': 600},
            {'name': 'Французский язык', 'category': 'Языки', 'min_price': 600},
            {'name': 'Испанский язык', 'category': 'Языки', 'min_price': 600},
            {'name': 'Китайский язык', 'category': 'Языки', 'min_price': 700},
            {'name': 'Иностранный язык', 'category': 'Языки', 'min_price': 600},
            
            # Общие дисциплины (добавим новую категорию или используем существующую)
            {'name': 'Безопасность жизнедеятельности', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Основы безопасности жизнедеятельности', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Физическая культура', 'category': 'Естественные науки', 'min_price': 400},
            {'name': 'Гражданская оборона', 'category': 'Естественные науки', 'min_price': 500},
            {'name': 'Правила дорожного движения', 'category': 'Естественные науки', 'min_price': 400},
            {'name': 'Охрана труда', 'category': 'Технические науки', 'min_price': 600},
            {'name': 'Стандартизация и сертификация', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Стандартизация и метрология', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Метрология', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Стандартизация и контроль качества', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Химия материалов', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Технология производства', 'category': 'Технические науки', 'min_price': 700},
            {'name': 'Современные технологические процессы', 'category': 'Технические науки', 'min_price': 800},
            {'name': 'Инновационные технологии', 'category': 'Технические науки', 'min_price': 800},
            {'name': 'Делопроизводство и документационное обеспечение', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Обязательное делопроизводство', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Оораторское искусство', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Риторика', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Основы деловой коммуникации', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Этика делового общения', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Деловая этика', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Проектная деятельность', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Методология и методика научных исследований', 'category': 'Гуманитарные науки', 'min_price': 700},
            {'name': 'Введение в специальность', 'category': 'Гуманитарные науки', 'min_price': 500},
            {'name': 'Теория систем и системный анализ', 'category': 'Технические науки', 'min_price': 800},
            {'name': 'Идеология и практика инноваций', 'category': 'Экономика и управление', 'min_price': 700},
            {'name': 'Медицинская этика', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Основы профориентации и адаптации', 'category': 'Социальные науки', 'min_price': 500},
            {'name': 'Антикоррупционная политика', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Поликультурное образование', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Организация здравоохранения', 'category': 'Социальные науки', 'min_price': 700},
            {'name': 'Гуманитарные технологии', 'category': 'Гуманитарные науки', 'min_price': 600},
            {'name': 'Креативные индустрии', 'category': 'Гуманитарные науки', 'min_price': 700},
            {'name': 'Теория и практика коммуникации', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Производственная практика', 'category': 'Экономика и управление', 'min_price': 600},
            {'name': 'Имиджология', 'category': 'Социальные науки', 'min_price': 600},
            {'name': 'Основы социальных наук', 'category': 'Социальные науки', 'min_price': 500},
            {'name': 'Управление проектами и программами', 'category': 'Экономика и управление', 'min_price': 800},
            {'name': 'Цифровая грамотность', 'category': 'Технические науки', 'min_price': 600},
            {'name': 'Базовые курсы по soft skills', 'category': 'Социальные науки', 'min_price': 600},
        ]

        for subj_data in subjects_data:
            category = categories.get(subj_data['category'])
            subject, created = Subject.objects.update_or_create(
                name=subj_data['name'],
                defaults={
                    'category': category,
                    'min_price': subj_data['min_price'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Создан предмет: {subject.name}'))
            else:
                self.stdout.write(f'  Предмет обновлён: {subject.name}')

        # Уровни сложности
        self.stdout.write('Уровни сложности уже существуют, пропускаем...')

        self.stdout.write(self.style.SUCCESS('\n✅ Каталог успешно заполнен!'))
        self.stdout.write(f'Типов работ: {WorkType.objects.count()}')
        self.stdout.write(f'Категорий: {SubjectCategory.objects.count()}')
        self.stdout.write(f'Предметов: {Subject.objects.count()}')
        self.stdout.write(f'Уровней сложности: {Complexity.objects.count()}')
