from django.core.management.base import BaseCommand
from django.db import IntegrityError
from apps.users.models import User


class Command(BaseCommand):
    help = 'Создает тестовых пользователей для разработки'

    def handle(self, *args, **options):
        users_data = [
            {
                'email': 'partner@test.com',
                'username': 'partner',
                'password': 'test123',
                'role': 'partner',
                'first_name': 'Партнер',
                'last_name': 'Тестовый'
            },
            {
                'email': 'admin@test.com',
                'username': 'admin',
                'password': 'test123',
                'role': 'admin',
                'first_name': 'Администратор',
                'last_name': 'Тестовый'
            },
            {
                'email': 'arbitrator@test.com',
                'username': 'arbitrator',
                'password': 'test123',
                'role': 'arbitrator',
                'first_name': 'Арбитр',
                'last_name': 'Тестовый'
            },
            {
                'email': 'director@test.com',
                'username': 'director',
                'password': 'test123',
                'role': 'admin',  # Директор использует роль admin
                'first_name': 'Директор',
                'last_name': 'Тестовый'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for user_data in users_data:
            try:
                # Пытаемся найти пользователя по email
                user, created = User.objects.get_or_create(
                    email=user_data['email'],
                    defaults={
                        'username': user_data['username'],
                        'role': user_data['role'],
                        'first_name': user_data.get('first_name', ''),
                        'last_name': user_data.get('last_name', ''),
                    }
                )
                
                # Устанавливаем пароль (даже если пользователь уже существовал)
                if not user.check_password(user_data['password']):
                    user.set_password(user_data['password'])
                    # Обновляем другие поля, если они изменились
                    user.role = user_data['role']
                    user.first_name = user_data.get('first_name', user.first_name)
                    user.last_name = user_data.get('last_name', user.last_name)
                    user.save()
                    
                    if created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Создан пользователь: {user.email} (роль: {user.get_role_display()})'
                            )
                        )
                    else:
                        updated_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f'↻ Обновлен пользователь: {user.email} (роль: {user.get_role_display()})'
                            )
                        )
                else:
                    if created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Создан пользователь: {user.email} (роль: {user.get_role_display()})'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Пользователь уже существует: {user.email} (роль: {user.get_role_display()})'
                            )
                        )
                        
            except IntegrityError as e:
                # Если пользователь с таким username уже существует
                try:
                    user = User.objects.get(username=user_data['username'])
                    if user.email != user_data['email']:
                        self.stdout.write(
                            self.style.ERROR(
                                f'✗ Ошибка: пользователь с username "{user_data["username"]}" уже существует с другим email: {user.email}'
                            )
                        )
                    else:
                        # Обновляем существующего пользователя
                        user.set_password(user_data['password'])
                        user.role = user_data['role']
                        user.first_name = user_data.get('first_name', user.first_name)
                        user.last_name = user_data.get('last_name', user.last_name)
                        user.save()
                        updated_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f'↻ Обновлен пользователь: {user.email} (роль: {user.get_role_display()})'
                            )
                        )
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(
                            f'✗ Ошибка при создании пользователя {user_data["email"]}: {str(e)}'
                        )
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Ошибка при создании пользователя {user_data["email"]}: {str(e)}'
                    )
                )
        
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f'Готово! Создано: {created_count}, обновлено: {updated_count}'
            )
        )
        self.stdout.write('')
        self.stdout.write('Тестовые пользователи:')
        self.stdout.write('  - Партнер: partner@test.com / test123')
        self.stdout.write('  - Администратор: admin@test.com / test123')
        self.stdout.write('  - Арбитр: arbitrator@test.com / test123')
        self.stdout.write('  - Директор: director@test.com / test123 (роль: admin)')

