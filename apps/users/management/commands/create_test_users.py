from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Создает тестовых пользователей для разработки'

    def handle(self, *args, **options):
        test_users = [
            {
                'email': 'client@test.com',
                'password': 'test123',
                'role': 'client',
                'first_name': 'Тестовый',
                'last_name': 'Клиент',
            },
            {
                'email': 'expert@test.com',
                'password': 'test123',
                'role': 'expert',
                'first_name': 'Тестовый',
                'last_name': 'Эксперт',
            },
            {
                'email': 'partner@test.com',
                'password': 'test123',
                'role': 'partner',
                'first_name': 'Тестовый',
                'last_name': 'Партнер',
            },
            {
                'email': 'administrator@test.com',
                'password': 'test123',
                'role': 'admin',
                'first_name': 'Тестовый',
                'last_name': 'Администратор',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'director@test.com',
                'password': 'test123',
                'role': 'director',
                'first_name': 'Тестовый',
                'last_name': 'Директор',
                'is_staff': True,
            },
            {
                'email': 'arbitrator@test.com',
                'password': 'test123',
                'role': 'arbitrator',
                'first_name': 'Тестовый',
                'last_name': 'Арбитр',
                'is_staff': True,
            },
        ]

        created_count = 0
        updated_count = 0

        for user_data in test_users:
            email = user_data.pop('email')
            password = user_data.pop('password')
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults=user_data
            )
            
            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Создан пользователь: {email} ({user_data["role"]})')
                )
            else:
                # Обновляем существующего пользователя
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.set_password(password)
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Обновлен пользователь: {email} ({user_data["role"]})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Готово! Создано: {created_count}, Обновлено: {updated_count}'
            )
        )
