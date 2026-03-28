from django.core.management.base import BaseCommand
from apps.director.models import DirectorChatRoom, DirectorChatMessage
from apps.users.models import User


class Command(BaseCommand):
    help = 'Удаляет дубликаты чатов администрации, оставляя только один общий чат'

    def handle(self, *args, **options):
        # Находим все чаты с названиями "Админ" или "Общий чат администрации"
        admin_chats = DirectorChatRoom.objects.filter(
            name__in=['Админ', 'Общий чат администрации'],
            is_active=True
        ).order_by('id')

        if not admin_chats.exists():
            self.stdout.write(
                self.style.WARNING('Чаты администрации не найдены. Создаю новый чат...')
            )
            # Вызываем команду создания чата
            from django.core.management import call_command
            call_command('create_admin_chat')
            return

        if admin_chats.count() == 1:
            self.stdout.write(
                self.style.SUCCESS(f'Найден только один чат: {admin_chats.first().name} (ID: {admin_chats.first().id})')
            )
            # Обновляем участников
            admins = User.objects.filter(role__in=['admin', 'director'], is_active=True)
            admin_chats.first().members.set(admins)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Обновлены участники чата: {admins.count()} пользователей')
            )
            return

        # Есть дубликаты - оставляем только первый чат
        main_chat = admin_chats.first()
        duplicate_chats = admin_chats.exclude(id=main_chat.id)

        self.stdout.write(
            self.style.WARNING(f'Найдено дубликатов чатов: {duplicate_chats.count()}')
        )
        self.stdout.write(f'Основной чат: {main_chat.name} (ID: {main_chat.id})')

        # Собираем всех участников из всех чатов
        all_members = set(main_chat.members.all())
        for chat in duplicate_chats:
            for member in chat.members.all():
                all_members.add(member)

        # Переносим всех участников в основной чат
        main_chat.members.set(all_members)

        # Переносим все сообщения в основной чат
        messages_moved = 0
        for chat in duplicate_chats:
            for message in chat.messages.all():
                # Проверяем, не дублируется ли сообщение
                if not DirectorChatMessage.objects.filter(
                    room=main_chat,
                    sender=message.sender,
                    message=message.message,
                    created_at=message.created_at
                ).exists():
                    message.room = main_chat
                    message.save()
                    messages_moved += 1

        # Удаляем дубликаты чатов
        deleted_count = duplicate_chats.count()
        duplicate_chats.delete()

        self.stdout.write(
            self.style.SUCCESS(f'✓ Удалено дубликатов: {deleted_count}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✓ Перенесено сообщений: {messages_moved}')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✓ Обновлены участники: {len(all_members)} пользователей')
        )
        self.stdout.write(
            self.style.SUCCESS(f'✓ Остался чат: {main_chat.name} (ID: {main_chat.id})')
        )
