"""
Команда для создания тестовых забаненных пользователей
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import User


class Command(BaseCommand):
    help = 'Создает тестовых пользователей, забаненных за обмен контактами'

    def handle(self, *args, **options):
        # Получаем или создаем админа, который будет банить
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'role': 'admin',
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if not admin_user.check_password('admin'):
            admin_user.set_password('admin')
            admin_user.save()

        # Создаем тестовых забаненных пользователей
        test_users = [
            {
                'username': 'banned_client1',
                'email': 'banned1@example.com',
                'first_name': 'Иван',
                'last_name': 'Петров',
                'role': 'client',
                'contact_ban_reason': 'Попытка передать номер телефона в чате: +79991234567',
                'contact_violations_count': 1,
            },
            {
                'username': 'banned_expert1',
                'email': 'banned_expert1@example.com',
                'first_name': 'Мария',
                'last_name': 'Сидорова',
                'role': 'expert',
                'contact_ban_reason': 'Отправка email адреса в переписке: maria@gmail.com',
                'contact_violations_count': 2,
            },
            {
                'username': 'banned_client2',
                'email': 'banned2@example.com',
                'first_name': 'Алексей',
                'last_name': 'Иванов',
                'role': 'client',
                'contact_ban_reason': 'Многократные попытки обмена контактами через ссылки',
                'contact_violations_count': 5,
            },
            {
                'username': 'banned_expert2',
                'email': 'banned_expert2@example.com',
                'first_name': 'Елена',
                'last_name': 'Козлова',
                'role': 'expert',
                'contact_ban_reason': 'Попытка передать Telegram: @myusername',
                'contact_violations_count': 1,
            },
            {
                'username': 'banned_partner1',
                'email': 'banned_partner@example.com',
                'first_name': 'Дмитрий',
                'last_name': 'Смирнов',
                'role': 'partner',
                'contact_ban_reason': 'Спам с контактными данными в нескольких чатах',
                'contact_violations_count': 3,
            },
        ]

        created_count = 0
        for user_data in test_users:
            username = user_data.pop('username')
            user, created = User.objects.get_or_create(
                username=username,
                defaults=user_data
            )
            
            if created or not user.is_banned_for_contacts:
                user.is_banned_for_contacts = True
                user.contact_ban_reason = user_data.get('contact_ban_reason', '')
                user.contact_ban_date = timezone.now()
                user.contact_violations_count = user_data.get('contact_violations_count', 1)
                user.banned_by = admin_user
                user.email = user_data.get('email', '')
                user.first_name = user_data.get('first_name', '')
                user.last_name = user_data.get('last_name', '')
                user.role = user_data.get('role', 'client')
                user.set_password('testpass123')
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Создан/обновлен забаненный пользователь: {username}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Всего обработано: {created_count} пользователей')
        )
        self.stdout.write(
            self.style.SUCCESS('✓ Тестовые данные успешно созданы!')
        )
