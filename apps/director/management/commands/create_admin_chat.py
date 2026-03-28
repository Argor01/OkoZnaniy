from django.core.management.base import BaseCommand
from apps.director.models import DirectorChatRoom
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
            admins = User.objects.filter(role__in=['admin', 'director'])
            existing_chat.members.set(admins)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Обновлены участники чата: {admins.count()} пользователей')
            )
            return

        # Создаем новый чат
        chat = DirectorChatRoom.objects.create(
            name='Общий чат администрации',
            description='Канал связи для администраторов и директоров компании'
        )

        # Добавляем всех админов и директоров
        admins = User.objects.filter(role__in=['admin', 'director'])
        chat.members.set(admins)

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
