from django.core.management.base import BaseCommand
from apps.director.models import DirectorChatRoom, DirectorChatMessage
from apps.users.models import User


class Command(BaseCommand):
    help = 'Создает общий чат для администраторов и директоров'

    def handle(self, *args, **options):
        # Проверяем, существует ли уже чат
        existing_chat = DirectorChatRoom.objects.filter(
            name='Общий чат администрации'
        ).first()

        if existing_chat:
            self.stdout.write(
                self.style.WARNING(f'Чат уже существует: {existing_chat.name} (ID: {existing_chat.id})')
            )
            # Обновляем участников
            admins = User.objects.filter(role__in=['admin', 'director'], is_active=True)
            existing_chat.members.set(admins)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Обновлены участники чата: {admins.count()} пользователей')
            )
            return

        # Получаем первого админа для created_by
        first_admin = User.objects.filter(role='admin', is_active=True).first()
        if not first_admin:
            self.stdout.write(
                self.style.ERROR('✗ Не найден ни один активный администратор')
            )
            return

        # Создаем новый чат
        chat = DirectorChatRoom.objects.create(
            name='Общий чат администрации',
            description='Канал связи для администраторов и директоров компании',
            room_type='general',
            created_by=first_admin,
            is_active=True
        )

        # Добавляем всех админов и директоров
        admins = User.objects.filter(role__in=['admin', 'director'], is_active=True)
        chat.members.set(admins)
        
        # Создаем приветственное сообщение
        DirectorChatMessage.objects.create(
            room=chat,
            sender=first_admin,
            message='Добро пожаловать в общий чат администрации!',
            is_system=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Создан чат: {chat.name} (ID: {chat.id})\n'
                f'✓ Добавлено участников: {admins.count()}'
            )
        )

        # Выводим список участников
        for user in admins:
            self.stdout.write(
                f'  - {user.first_name} {user.last_name} ({user.email}) - {user.role}'
            )

