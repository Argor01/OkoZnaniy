from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.chat.models import Chat, Message
from apps.orders.models import Order

User = get_user_model()


class Command(BaseCommand):
    help = 'Создает тестовые чаты с сообщениями'

    def handle(self, *args, **options):
        self.stdout.write('Создание тестовых чатов...')
        
        # Получаем пользователей
        try:
            client = User.objects.get(email='client@test.com')
            expert = User.objects.get(email='expert@test.com')
            admin = User.objects.get(email='admin@test.com')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Тестовые пользователи не найдены. Запустите create_admin_accounts'))
            return
        
        # Создаем чат 1: Клиент - Эксперт
        chat1, created = Chat.objects.get_or_create(
            client=client,
            expert=expert,
            defaults={'context_title': 'Консультация по математике'}
        )
        if created:
            chat1.participants.add(client, expert)
            
            Message.objects.create(
                chat=chat1,
                sender=client,
                text='Здравствуйте! Мне нужна помощь с решением задач по математике.',
                message_type='text'
            )
            Message.objects.create(
                chat=chat1,
                sender=expert,
                text='Добрый день! Конечно, помогу. Какие именно задачи вас интересуют?',
                message_type='text'
            )
            Message.objects.create(
                chat=chat1,
                sender=client,
                text='Нужно решить систему уравнений и построить график функции.',
                message_type='text'
            )
            Message.objects.create(
                chat=chat1,
                sender=expert,
                text='Хорошо, отправьте мне условия задач, и я помогу вам разобраться.',
                message_type='text'
            )
            
            self.stdout.write(self.style.SUCCESS(f'✅ Создан чат #{chat1.id}: {chat1.context_title}'))
        
        # Создаем чат 2: Другая пара пользователей
        try:
            client2 = User.objects.filter(role='client').exclude(id=client.id).first()
            expert2 = User.objects.filter(role='expert').exclude(id=expert.id).first()
            
            if client2 and expert2:
                chat2, created = Chat.objects.get_or_create(
                    client=client2,
                    expert=expert2,
                    defaults={'context_title': 'Помощь с курсовой работой'}
                )
                if created:
                    chat2.participants.add(client2, expert2)
                    
                    Message.objects.create(
                        chat=chat2,
                        sender=client2,
                        text='Добрый день! Нужна помощь с курсовой по экономике.',
                        message_type='text'
                    )
                    Message.objects.create(
                        chat=chat2,
                        sender=expert2,
                        text='Здравствуйте! Расскажите подробнее о теме курсовой.',
                        message_type='text'
                    )
                    Message.objects.create(
                        chat=chat2,
                        sender=client2,
                        text='Тема: "Анализ финансовых показателей предприятия"',
                        message_type='text'
                    )
                    
                    self.stdout.write(self.style.SUCCESS(f'✅ Создан чат #{chat2.id}: {chat2.context_title}'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Не удалось создать второй чат: {e}'))
        
        # Создаем чат 3: С заказом
        try:
            order = Order.objects.filter(client=client, expert=expert).first()
            if order:
                chat3, created = Chat.objects.get_or_create(
                    order=order,
                    client=client,
                    expert=expert,
                    defaults={'context_title': f'Чат по заказу #{order.id}'}
                )
                if created:
                    chat3.participants.add(client, expert)
                    
                    Message.objects.create(
                        chat=chat3,
                        sender=client,
                        text='Здравствуйте! Хочу уточнить детали заказа.',
                        message_type='text'
                    )
                    Message.objects.create(
                        chat=chat3,
                        sender=expert,
                        text='Добрый день! Слушаю вас.',
                        message_type='text'
                    )
                    Message.objects.create(
                        chat=chat3,
                        sender=client,
                        text='Когда примерно будет готова работа?',
                        message_type='text'
                    )
                    Message.objects.create(
                        chat=chat3,
                        sender=expert,
                        text='Работа будет готова через 3 дня, как и договаривались.',
                        message_type='text'
                    )
                    
                    self.stdout.write(self.style.SUCCESS(f'✅ Создан чат #{chat3.id} по заказу #{order.id}'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Не удалось создать чат с заказом: {e}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Тестовые чаты созданы!'))
        self.stdout.write('\nТеперь вы можете просмотреть их в ЛК администратора:')
        self.stdout.write('Раздел: Переписки пользователей')
