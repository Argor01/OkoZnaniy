from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Создает тестовых пользователей для разработки'

    def handle(self, *args, **kwargs):
        self.stdout.write('Создание тестовых пользователей...')
        
        users_data = [
            {'username': 'client@test.com', 'email': 'client@test.com', 'password': 'test123', 'role': 'client'},
            {'username': 'expert@test.com', 'email': 'expert@test.com', 'password': 'test123', 'role': 'expert'},
            {'username': 'partner@test.com', 'email': 'partner@test.com', 'password': 'test123', 'role': 'partner'},
            {'username': 'administrator@test.com', 'email': 'administrator@test.com', 'password': 'test123', 'role': 'admin'},
            {'username': 'director@test.com', 'email': 'director@test.com', 'password': 'test123', 'role': 'director'},
            {'username': 'arbitrator@test.com', 'email': 'arbitrator@test.com', 'password': 'test123', 'role': 'arbitrator'},
        ]
        
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'role': user_data['role'],
                }
            )
            user.set_password(user_data['password'])
            user.role = user_data['role']
            user.save()
            
            status = 'Создан' if created else 'Обновлен'
            self.stdout.write(f'{status}: {user_data["username"]} (роль: {user_data["role"]})')
        
        self.stdout.write(self.style.SUCCESS(f'Всего пользователей: {User.objects.count()}'))
