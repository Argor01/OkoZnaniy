from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.users.models import User
from apps.experts.models import (
    Specialization, ExpertDocument, ExpertReview, ExpertRating,
    ExpertStatistics, ExpertApplication, Education
)
from apps.catalog.models import Subject, SubjectCategory, WorkType, Complexity, Topic
from apps.orders.models import Order


class Command(BaseCommand):
    help = 'Создает тестовые данные для личного кабинета эксперта'

    def handle(self, *args, **options):
        # Создаем или получаем тестового эксперта
        expert_email = 'expert@test.com'
        expert_username = 'expert'
        
        try:
            expert, created = User.objects.get_or_create(
                email=expert_email,
                defaults={
                    'username': expert_username,
                    'role': 'expert',
                    'first_name': 'Иван',
                    'last_name': 'Экспертов',
                    'phone': '+7 (999) 123-45-67',
                    'bio': '''Опытный специалист с более чем 10-летним стажем в области академического письма и научных исследований. 
                    Специализируюсь на написании курсовых, дипломных работ, диссертаций и научных статей. 
                    Имею высшее образование в области филологии и педагогики. 
                    Гарантирую высокое качество, уникальность и соблюдение всех требований.''',
                    'experience_years': 10,
                    'hourly_rate': Decimal('1500.00'),
                    'education': '''Московский государственный университет им. М.В. Ломоносова
                    Факультет филологии, специальность "Русский язык и литература"
                    Год окончания: 2013
                    
                    Аспирантура МГУ
                    Специальность: "Теория и методика преподавания русского языка"
                    Год окончания: 2016''',
                    'skills': 'Академическое письмо, Научные исследования, Редактирование, Корректура, Анализ литературы, Методология исследования, Статистический анализ, Работа с источниками',
                    'portfolio_url': 'https://portfolio.example.com/expert',
                    'is_verified': True,
                    'has_submitted_application': True,
                    'application_approved': True,
                    'application_submitted_at': timezone.now() - timedelta(days=30),
                    'application_reviewed_at': timezone.now() - timedelta(days=25),
                }
            )
            
            if not created:
                # Обновляем данные существующего эксперта
                expert.role = 'expert'
                expert.first_name = 'Иван'
                expert.last_name = 'Экспертов'
                expert.phone = '+7 (999) 123-45-67'
                expert.bio = '''Опытный специалист с более чем 10-летним стажем в области академического письма и научных исследований. 
                    Специализируюсь на написании курсовых, дипломных работ, диссертаций и научных статей. 
                    Имею высшее образование в области филологии и педагогики. 
                    Гарантирую высокое качество, уникальность и соблюдение всех требований.'''
                expert.experience_years = 10
                expert.hourly_rate = Decimal('1500.00')
                expert.education = '''Московский государственный университет им. М.В. Ломоносова
                    Факультет филологии, специальность "Русский язык и литература"
                    Год окончания: 2013
                    
                    Аспирантура МГУ
                    Специальность: "Теория и методика преподавания русского языка"
                    Год окончания: 2016'''
                expert.skills = 'Академическое письмо, Научные исследования, Редактирование, Корректура, Анализ литературы, Методология исследования, Статистический анализ, Работа с источниками'
                expert.portfolio_url = 'https://portfolio.example.com/expert'
                expert.is_verified = True
                expert.has_submitted_application = True
                expert.application_approved = True
                expert.save()
            
            # Устанавливаем пароль
            expert.set_password('test123')
            expert.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ {"Создан" if created else "Обновлен"} эксперт: {expert.email}')
            )
            
        except IntegrityError:
            expert = User.objects.get(username=expert_username)
            expert.set_password('test123')
            expert.save()
            self.stdout.write(
                self.style.WARNING(f'↻ Обновлен существующий эксперт: {expert.email}')
            )
        
        # Создаем или получаем предметы
        subjects_data = [
            {'name': 'Русский язык', 'description': 'Написание работ по русскому языку и литературе'},
            {'name': 'Математика', 'description': 'Решение задач по математике, алгебре, геометрии'},
            {'name': 'История', 'description': 'Исторические исследования и эссе'},
            {'name': 'Экономика', 'description': 'Экономические расчеты и анализ'},
            {'name': 'Психология', 'description': 'Психологические исследования и работы'},
        ]
        
        subjects = []
        for subj_data in subjects_data:
            try:
                # Пытаемся найти существующий предмет
                subject = Subject.objects.get(name=subj_data['name'])
            except Subject.DoesNotExist:
                # Создаем новый предмет
                from django.utils.text import slugify
                slug = slugify(subj_data['name'])
                # Проверяем уникальность slug
                base_slug = slug
                n = 1
                while Subject.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{n}"
                    n += 1
                
                subject = Subject.objects.create(
                    name=subj_data['name'],
                    slug=slug,
                    description=subj_data['description'],
                    is_active=True,
                )
            subjects.append(subject)
            self.stdout.write(f'  ✓ Предмет: {subject.name}')
        
        # Создаем специализации
        specializations_data = [
            {
                'subject': subjects[0],  # Русский язык
                'experience_years': 10,
                'hourly_rate': Decimal('1500.00'),
                'description': 'Специализируюсь на написании курсовых и дипломных работ по русскому языку и литературе. Опыт работы более 10 лет.',
                'is_verified': True,
            },
            {
                'subject': subjects[1],  # Математика
                'experience_years': 8,
                'hourly_rate': Decimal('1800.00'),
                'description': 'Решение задач по высшей математике, алгебре, геометрии, математическому анализу.',
                'is_verified': True,
            },
            {
                'subject': subjects[2],  # История
                'experience_years': 7,
                'hourly_rate': Decimal('1400.00'),
                'description': 'Написание исторических эссе, рефератов, курсовых работ по истории России и всемирной истории.',
                'is_verified': True,
            },
        ]
        
        for spec_data in specializations_data:
            spec, created = Specialization.objects.get_or_create(
                expert=expert,
                subject=spec_data['subject'],
                defaults={
                    'experience_years': spec_data['experience_years'],
                    'hourly_rate': spec_data['hourly_rate'],
                    'description': spec_data['description'],
                    'is_verified': spec_data['is_verified'],
                }
            )
            if not created:
                # Обновляем существующую специализацию
                spec.experience_years = spec_data['experience_years']
                spec.hourly_rate = spec_data['hourly_rate']
                spec.description = spec_data['description']
                spec.is_verified = spec_data['is_verified']
                spec.save()
            
            self.stdout.write(f'  ✓ Специализация: {spec.subject.name}')
        
        # Создаем анкету эксперта
        application, created = ExpertApplication.objects.get_or_create(
            expert=expert,
            defaults={
                'full_name': f'{expert.first_name} {expert.last_name}',
                'work_experience_years': 10,
                'specializations': 'Русский язык, Математика, История, Экономика, Психология',
                'status': 'approved',
                'reviewed_at': timezone.now() - timedelta(days=25),
            }
        )
        
        if not created:
            application.full_name = f'{expert.first_name} {expert.last_name}'
            application.work_experience_years = 10
            application.specializations = 'Русский язык, Математика, История, Экономика, Психология'
            application.status = 'approved'
            application.reviewed_at = timezone.now() - timedelta(days=25)
            application.save()
        
        # Создаем образование в анкете
        educations_data = [
            {
                'university': 'Московский государственный университет им. М.В. Ломоносова',
                'start_year': 2009,
                'end_year': 2013,
                'degree': 'Бакалавр филологии',
            },
            {
                'university': 'Московский государственный университет им. М.В. Ломоносова',
                'start_year': 2013,
                'end_year': 2016,
                'degree': 'Магистр филологии',
            },
        ]
        
        for edu_data in educations_data:
            edu, _ = Education.objects.get_or_create(
                application=application,
                university=edu_data['university'],
                start_year=edu_data['start_year'],
                defaults={
                    'end_year': edu_data['end_year'],
                    'degree': edu_data['degree'],
                }
            )
            self.stdout.write(f'  ✓ Образование: {edu.university} ({edu.start_year}-{edu.end_year})')
        
        # Создаем статистику эксперта
        stats, created = ExpertStatistics.objects.get_or_create(
            expert=expert,
            defaults={
                'total_orders': 45,
                'completed_orders': 42,
                'average_rating': Decimal('4.85'),
                'success_rate': Decimal('93.33'),
                'total_earnings': Decimal('125000.00'),
                'response_time_avg': timedelta(hours=2, minutes=30),
            }
        )
        
        if not created:
            stats.total_orders = 45
            stats.completed_orders = 42
            stats.average_rating = Decimal('4.85')
            stats.success_rate = Decimal('93.33')
            stats.total_earnings = Decimal('125000.00')
            stats.response_time_avg = timedelta(hours=2, minutes=30)
            stats.save()
        
        self.stdout.write(f'  ✓ Статистика создана: {stats.total_orders} заказов, рейтинг {stats.average_rating}')
        
        # Создаем документы эксперта (без файлов, только метаданные)
        documents_data = [
            {
                'document_type': 'diploma',
                'title': 'Диплом о высшем образовании',
                'description': 'Диплом МГУ по специальности "Русский язык и литература"',
                'is_verified': True,
            },
            {
                'document_type': 'certificate',
                'title': 'Сертификат о повышении квалификации',
                'description': 'Сертификат по академическому письму и научной коммуникации',
                'is_verified': True,
            },
            {
                'document_type': 'award',
                'title': 'Грамота за лучшую научную работу',
                'description': 'Грамота за участие в научной конференции',
                'is_verified': True,
            },
        ]
        
        # Удаляем старые документы без файлов
        ExpertDocument.objects.filter(expert=expert, file='').delete()
        
        self.stdout.write(f'  ✓ Документы: {len(documents_data)} записей (без файлов)')
        
        # Создаем тестового клиента для заказов и отзывов
        try:
            client, _ = User.objects.get_or_create(
                email='client@test.com',
                defaults={
                    'username': 'client',
                    'role': 'client',
                    'first_name': 'Анна',
                    'last_name': 'Клиентова',
                    'phone': '+7 (999) 765-43-21',
                }
            )
            client.set_password('test123')
            client.save()
            self.stdout.write(f'  ✓ Тестовый клиент: {client.email}')
        except IntegrityError:
            client = User.objects.get(username='client')
            self.stdout.write(f'  ✓ Используется существующий клиент: {client.email}')
        
        # Создаем типы работ и сложности
        work_types = []
        work_types_data = [
            {'name': 'Курсовая работа', 'base_price': Decimal('3000.00')},
            {'name': 'Дипломная работа', 'base_price': Decimal('8000.00')},
            {'name': 'Реферат', 'base_price': Decimal('1500.00')},
            {'name': 'Контрольная работа', 'base_price': Decimal('2000.00')},
        ]
        
        for wt_data in work_types_data:
            from django.utils.text import slugify
            try:
                wt = WorkType.objects.get(name=wt_data['name'])
            except WorkType.DoesNotExist:
                slug = slugify(wt_data['name'])
                base_slug = slug
                n = 1
                while WorkType.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{n}"
                    n += 1
                wt = WorkType.objects.create(
                    name=wt_data['name'],
                    slug=slug,
                    base_price=wt_data['base_price'],
                    is_active=True,
                )
            work_types.append(wt)
        
        complexities = []
        complexities_data = [
            {'name': 'Простая', 'multiplier': Decimal('1.0')},
            {'name': 'Средняя', 'multiplier': Decimal('1.5')},
            {'name': 'Сложная', 'multiplier': Decimal('2.0')},
        ]
        
        for comp_data in complexities_data:
            from django.utils.text import slugify
            try:
                comp = Complexity.objects.get(name=comp_data['name'])
            except Complexity.DoesNotExist:
                slug = slugify(comp_data['name'])
                base_slug = slug
                n = 1
                while Complexity.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{n}"
                    n += 1
                comp = Complexity.objects.create(
                    name=comp_data['name'],
                    slug=slug,
                    multiplier=comp_data['multiplier'],
                    is_active=True,
                )
            complexities.append(comp)
        
        # Создаем темы для предметов
        topics = []
        for subject in subjects[:3]:  # Для первых 3 предметов
            from django.utils.text import slugify
            try:
                topic = Topic.objects.get(subject=subject, name=f'Общая тема по {subject.name}')
            except Topic.DoesNotExist:
                slug = slugify(f'obshtaya-tema-{subject.slug}')
                base_slug = slug
                n = 1
                while Topic.objects.filter(subject=subject, slug=slug).exists():
                    slug = f"{base_slug}-{n}"
                    n += 1
                topic = Topic.objects.create(
                    subject=subject,
                    name=f'Общая тема по {subject.name}',
                    slug=slug,
                    is_active=True,
                )
            topics.append(topic)
        
        # Создаем тестовые заказы
        orders_data = [
            {
                'title': 'Курсовая работа по русскому языку',
                'description': 'Требуется написать курсовую работу на тему "Современные тенденции в русской литературе" объемом 25-30 страниц.',
                'status': 'completed',
                'budget': Decimal('3500.00'),
                'work_type': work_types[0],
                'complexity': complexities[1],
                'subject': subjects[0],
                'topic': topics[0] if topics else None,
                'days_ago': 15,
            },
            {
                'title': 'Дипломная работа по математике',
                'description': 'Дипломная работа на тему "Применение математических методов в экономике". Объем 60-70 страниц.',
                'status': 'completed',
                'budget': Decimal('9000.00'),
                'work_type': work_types[1],
                'complexity': complexities[2],
                'subject': subjects[1],
                'topic': topics[1] if len(topics) > 1 else None,
                'days_ago': 30,
            },
            {
                'title': 'Реферат по истории России',
                'description': 'Реферат на тему "Роль Петра I в развитии России". Объем 15-20 страниц.',
                'status': 'completed',
                'budget': Decimal('1800.00'),
                'work_type': work_types[2],
                'complexity': complexities[0],
                'subject': subjects[2],
                'topic': topics[2] if len(topics) > 2 else None,
                'days_ago': 45,
            },
            {
                'title': 'Контрольная работа по математике',
                'description': 'Решение задач по математическому анализу. 10 задач различной сложности.',
                'status': 'in_progress',
                'budget': Decimal('2500.00'),
                'work_type': work_types[3],
                'complexity': complexities[1],
                'subject': subjects[1],
                'topic': topics[1] if len(topics) > 1 else None,
                'days_ago': 5,
            },
            {
                'title': 'Курсовая работа по экономике',
                'description': 'Курсовая работа на тему "Инфляция и методы её регулирования". Объем 30-35 страниц.',
                'status': 'review',
                'budget': Decimal('4000.00'),
                'work_type': work_types[0],
                'complexity': complexities[1],
                'subject': subjects[3],
                'topic': None,
                'days_ago': 2,
            },
        ]
        
        created_orders = []
        for order_data in orders_data:
            # Проверяем, существует ли заказ с таким названием и экспертом
            existing_order = Order.objects.filter(
                expert=expert,
                title=order_data['title']
            ).first()
            
            if not existing_order:
                order = Order.objects.create(
                    client=client,
                    expert=expert,
                    title=order_data['title'],
                    description=order_data['description'],
                    status=order_data['status'],
                    budget=order_data['budget'],
                    work_type=order_data['work_type'],
                    complexity=order_data['complexity'],
                    subject=order_data['subject'],
                    topic=order_data['topic'],
                    created_at=timezone.now() - timedelta(days=order_data['days_ago']),
                    deadline=timezone.now() + timedelta(days=7),
                )
                created_orders.append(order)
                self.stdout.write(f'  ✓ Заказ: {order.title} ({order.get_status_display()})')
            else:
                created_orders.append(existing_order)
                self.stdout.write(f'  ↻ Заказ уже существует: {existing_order.title}')
        
        # Создаем отзывы для завершенных заказов
        completed_orders = Order.objects.filter(expert=expert, status='completed')[:3]
        reviews_data = [
            {
                'rating': 5,
                'comment': 'Отличная работа! Все требования выполнены, работа сдана в срок. Очень доволен результатом.',
            },
            {
                'rating': 5,
                'comment': 'Прекрасное качество! Эксперт учел все пожелания и требования. Рекомендую!',
            },
            {
                'rating': 4,
                'comment': 'Хорошая работа, выполнена качественно. Небольшие замечания были учтены при доработке.',
            },
        ]
        
        for i, order in enumerate(completed_orders):
            if i < len(reviews_data):
                # Создаем рейтинг (используем ExpertRating, так как ExpertReview требует rating поле в User)
                rating, created = ExpertRating.objects.get_or_create(
                    expert=expert,
                    order=order,
                    defaults={
                        'client': client,
                        'rating': reviews_data[i]['rating'],
                        'comment': reviews_data[i]['comment'],
                    }
                )
                if created:
                    self.stdout.write(f'  ✓ Рейтинг: {rating.rating} звезд от {rating.client.first_name}')
                
                # Создаем отзыв
                try:
                    # Удаляем старый отзыв, если он существует
                    ExpertReview.objects.filter(expert=expert, order=order).delete()
                    
                    review = ExpertReview.objects.create(
                        expert=expert,
                        order=order,
                        client=client,
                        rating=reviews_data[i]['rating'],
                        comment=reviews_data[i]['comment'],
                        is_published=True,
                        created_at=order.created_at + timedelta(days=1),
                    )
                    self.stdout.write(f'  ✓ Отзыв: {review.rating} звезд от {review.client.first_name}')
                except Exception as e:
                    # Если не получается создать отзыв, пропускаем
                    self.stdout.write(f'  ⚠ Отзыв не создан (ошибка: {str(e)})')
        
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS('✓ Тестовые данные для эксперта успешно созданы!')
        )
        self.stdout.write('')
        self.stdout.write('Данные для входа:')
        self.stdout.write(f'  Email: {expert_email}')
        self.stdout.write('  Password: test123')
        self.stdout.write('')
        self.stdout.write('Созданные данные:')
        self.stdout.write(f'  - Профиль эксперта с полной информацией')
        self.stdout.write(f'  - {len(specializations_data)} специализаций')
        self.stdout.write(f'  - Анкета эксперта (одобрена)')
        self.stdout.write(f'  - {len(educations_data)} записей об образовании')
        self.stdout.write(f'  - Статистика: {stats.total_orders} заказов, рейтинг {stats.average_rating}')
        self.stdout.write(f'  - {len(created_orders)} тестовых заказов')
        completed_orders_count = Order.objects.filter(expert=expert, status='completed').count()
        ratings_count = ExpertRating.objects.filter(expert=expert).count()
        self.stdout.write(f'  - {completed_orders_count} завершенных заказов')
        self.stdout.write(f'  - {ratings_count} рейтингов от клиентов')

