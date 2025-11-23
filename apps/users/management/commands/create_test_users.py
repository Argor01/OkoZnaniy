from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Create test users for development'

    def handle(self, *args, **options):
        test_users = [
            {
                'username': 'administrator',
                'email': 'administrator@test.com',
                'password': 'test123',
                'role': 'admin',
                'first_name': 'Администратор',
                'last_name': 'Тестовый',
            },
            {
                'username': 'director',
                'email': 'director@test.com',
                'password': 'test123',
                'role': 'admin',  # Director is also admin role
                'first_name': 'Директор',
                'last_name': 'Тестовый',
            },
            {
                'username': 'partner',
                'email': 'partner@test.com',
                'password': 'test123',
                'role': 'partner',
                'first_name': 'Партнер',
                'last_name': 'Тестовый',
            },
        ]

        for user_data in test_users:
            email = user_data['email']
            username = user_data['username']
            if User.objects.filter(email=email).exists():
                self.stdout.write(
                    self.style.WARNING(f'User {email} already exists')
                )
            else:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=user_data['password'],
                    role=user_data['role'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    is_active=True,
                    email_verified=True,
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created user {email}')
                )

        self.stdout.write(self.style.SUCCESS('Test users creation completed'))
