from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.users.models import User
from apps.orders.models import Order, Dispute, OrderComment
from apps.catalog.models import Subject, WorkType, Complexity


class Command(BaseCommand):
    help = 'Создает тестовые данные для личного кабинета арбитра'

    def handle(self, *args, **options):
        # Получаем пользователей
        try:
            arbitrator = User.objects.get(email='arbitrator@test.com')
            client = User.objects.get(email='partner@test.com')
            
            # Создаем эксперта если его нет
            expert, _ = User.objects.get_or_create(
                email='expert@test.com',
                defaults={
                    'username': 'expert',
                    'role': 'expert',
                    'first_name': 'Эксперт',
                    'last_name': 'Тестовый'
                }
            )
            expert.set_password('test123')
            expert.save()
            
        except User.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f'Ошибка: {e}'))
            return

        # Получаем или создаем справочники
        subject, _ = Subject.objects.get_or_create(
            name='Математика',
            defaults={'description': 'Высшая математика'}
        )
        
        work_type, _ = WorkType.objects.get_or_create(
            name='Контрольная работа',
            defaults={'base_price': Decimal('1000.00')}
        )
        
        complexity, _ = Complexity.objects.get_or_create(
            name='Средняя',
            defaults={'multiplier': Decimal('1.0')}
        )

        # Создаем тестовые заказы со спорами
        disputes_data = [
            # Новые обращения (не назначен арбитр)
            {
                'title': 'Решение задач по математическому анализу',
                'description': 'Необходимо решить 10 задач по теме "Производные и интегралы"',
                'reason': 'Клиент утверждает, что решение содержит ошибки в задачах 3, 5 и 7. Эксперт настаивает, что решение верное.',
                'budget': Decimal('2500.00'),
                'resolved': False,
                'assigned': False,
                'days_ago': 1,
            },
            {
                'title': 'Курсовая работа по линейной алгебре',
                'description': 'Курсовая работа на тему "Системы линейных уравнений"',
                'reason': 'Работа сдана с опозданием на 2 дня. Клиент требует возврат средств.',
                'budget': Decimal('5000.00'),
                'resolved': False,
                'assigned': False,
                'days_ago': 2,
            },
            {
                'title': 'Реферат по истории России',
                'description': 'Реферат на 15 страниц по теме "Великая Отечественная война"',
                'reason': 'Клиент считает, что работа не соответствует требованиям по уникальности (менее 70%).',
                'budget': Decimal('1200.00'),
                'resolved': False,
                'assigned': False,
                'days_ago': 0,
            },
            {
                'title': 'Лабораторная работа по физике',
                'description': 'Выполнение лабораторной работы по механике',
                'reason': 'Эксперт не предоставил расчеты и графики, как было указано в требованиях.',
                'budget': Decimal('1800.00'),
                'resolved': False,
                'assigned': False,
                'days_ago': 3,
            },
            # В работе (назначен арбитр, но не решено)
            {
                'title': 'Контрольная работа по химии',
                'description': 'Решение задач по органической химии',
                'reason': 'Клиент не согласен с методом решения задач 2 и 4.',
                'budget': Decimal('2000.00'),
                'resolved': False,
                'assigned': True,
                'days_ago': 5,
            },
            {
                'title': 'Эссе по английскому языку',
                'description': 'Эссе на тему "Modern technologies"',
                'reason': 'Работа содержит грамматические ошибки и не соответствует уровню B2.',
                'budget': Decimal('1500.00'),
                'resolved': False,
                'assigned': True,
                'days_ago': 4,
            },
            {
                'title': 'Презентация по маркетингу',
                'description': 'Создание презентации для защиты проекта',
                'reason': 'Дизайн презентации не соответствует корпоративному стилю, указанному в ТЗ.',
                'budget': Decimal('3500.00'),
                'resolved': False,
                'assigned': True,
                'days_ago': 6,
            },
            # Завершенные
            {
                'title': 'Контрольная работа по теории вероятностей',
                'description': 'Решение 5 задач по теории вероятностей',
                'reason': 'Клиент не согласен с оформлением работы, требует переделать.',
                'budget': Decimal('1500.00'),
                'resolved': True,
                'assigned': True,
                'result': 'Решено в пользу эксперта. Оформление соответствует требованиям.',
                'days_ago': 15,
            },
            {
                'title': 'Задачи по дифференциальным уравнениям',
                'description': 'Решить 8 задач по дифференциальным уравнениям',
                'reason': 'Эксперт не предоставил подробные пояснения к решению.',
                'budget': Decimal('3000.00'),
                'resolved': True,
                'assigned': True,
                'result': 'Решено в пользу клиента. Эксперт обязан предоставить пояснения.',
                'days_ago': 20,
            },
            {
                'title': 'Дипломная работа по программированию',
                'description': 'Разработка веб-приложения на React',
                'reason': 'Клиент утверждает, что функционал не полностью реализован.',
                'budget': Decimal('15000.00'),
                'resolved': True,
                'assigned': True,
                'result': 'Решено компромиссно. Эксперт доработает функционал, клиент доплатит 20%.',
                'days_ago': 10,
            },
            {
                'title': 'Курсовая по экономике',
                'description': 'Курсовая работа "Анализ финансовых показателей предприятия"',
                'reason': 'Работа сдана на 3 дня позже срока.',
                'budget': Decimal('4000.00'),
                'resolved': True,
                'assigned': True,
                'result': 'Решено в пользу клиента. Возврат 30% стоимости за нарушение сроков.',
                'days_ago': 25,
            },
            {
                'title': 'Решение задач по статистике',
                'description': 'Статистический анализ данных в Excel',
                'reason': 'Клиент не может открыть файл с решением.',
                'budget': Decimal('2200.00'),
                'resolved': True,
                'assigned': True,
                'result': 'Решено в пользу клиента. Эксперт предоставил файл в правильном формате.',
                'days_ago': 30,
            },
        ]

        created_count = 0
        
        for dispute_data in disputes_data:
            days_ago = dispute_data.get('days_ago', 5)
            
            # Создаем заказ
            order, created = Order.objects.get_or_create(
                title=dispute_data['title'],
                defaults={
                    'client': client,
                    'expert': expert,
                    'subject': subject,
                    'work_type': work_type,
                    'complexity': complexity,
                    'description': dispute_data['description'],
                    'budget': dispute_data['budget'],
                    'status': 'disputed',
                    'deadline': timezone.now() + timedelta(days=7),
                    'created_at': timezone.now() - timedelta(days=days_ago + 5),
                }
            )
            
            if created:
                # Создаем спор
                assigned_arbitrator = None
                if dispute_data.get('assigned', False):
                    assigned_arbitrator = arbitrator
                
                dispute, dispute_created = Dispute.objects.get_or_create(
                    order=order,
                    defaults={
                        'reason': dispute_data['reason'],
                        'resolved': dispute_data['resolved'],
                        'result': dispute_data.get('result', ''),
                        'arbitrator': assigned_arbitrator,
                        'created_at': timezone.now() - timedelta(days=days_ago),
                    }
                )
                
                # Добавляем комментарии
                OrderComment.objects.get_or_create(
                    order=order,
                    author=client,
                    defaults={
                        'text': f'Я не согласен с результатом работы. {dispute_data["reason"]}',
                        'created_at': timezone.now() - timedelta(days=days_ago),
                    }
                )
                
                OrderComment.objects.get_or_create(
                    order=order,
                    author=expert,
                    defaults={
                        'text': 'Работа выполнена качественно и в срок, согласно всем требованиям.',
                        'created_at': timezone.now() - timedelta(days=days_ago - 1),
                    }
                )
                
                if dispute_data['resolved']:
                    OrderComment.objects.get_or_create(
                        order=order,
                        author=arbitrator,
                        defaults={
                            'text': f'Решение арбитра: {dispute_data["result"]}',
                            'created_at': timezone.now() - timedelta(days=max(1, days_ago - 3)),
                        }
                    )
                
                created_count += 1
                status = "новый" if not dispute_data.get('assigned') else ("завершен" if dispute_data['resolved'] else "в работе")
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Создан спор ({status}): {order.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'↻ Спор уже существует: {order.title}')
                )

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(f'Готово! Создано споров: {created_count}')
        )
        self.stdout.write('')
        self.stdout.write('Тестовые данные для арбитра:')
        self.stdout.write(f'  - Всего споров: {Dispute.objects.count()}')
        self.stdout.write(f'  - Новых обращений: {Dispute.objects.filter(resolved=False, arbitrator__isnull=True).count()}')
        self.stdout.write(f'  - В работе: {Dispute.objects.filter(resolved=False, arbitrator__isnull=False).count()}')
        self.stdout.write(f'  - Завершенных: {Dispute.objects.filter(resolved=True).count()}')
        self.stdout.write('')
        self.stdout.write('Для входа используйте:')
        self.stdout.write('  - Арбитр: arbitrator@test.com / test123')
        self.stdout.write('  - Эксперт: expert@test.com / test123')
