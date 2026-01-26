"""
Django management команда для создания тестовых аккаунтов администраторов
Использование: python manage.py create_admin_accounts
"""

from django.core.management.base import BaseCommand
from apps.users.models import User
import uuid


class Command(BaseCommand):
    help = 'Создает тестовые аккаунты директора, партнера и администратора'

    def handle(self, *args, **options):
        # Данные пользователей для создания
        users_data = [
            {
                'username': 'client',
                'email': 'client@test.com',
                'password': 'test123',
                'role': 'client',
                'first_name': 'Клиент',
                'last_name': 'Тестовый',
                'balance': 0,
                'frozen_balance': 0,
                'email_verified': True,
                'is_active': True,
            },
            {
                'username': 'expert',
                'email': 'expert@test.com',
                'password': 'test123',
                'role': 'expert',
                'first_name': 'Эксперт',
                'last_name': 'Тестовый',
                'balance': 0,
                'frozen_balance': 0,
                'email_verified': True,
                'is_active': True,
            },
            {
                'username': 'arbitrator',
                'email': 'arbitrator@test.com',
                'password': 'test123',
                'role': 'arbitrator',
                'first_name': 'Арбитр',
                'last_name': 'Тестовый',
                'balance': 0,
                'frozen_balance': 0,
                'email_verified': True,
                'is_active': True,
            },
            {
                'username': 'director',
                'email': 'director@test.com',
                'password': 'test123',
                'role': 'admin',  # Директор использует роль admin
                'first_name': 'Директор',
                'last_name': 'Тестовый',
                'is_staff': True,
                'is_superuser': True,
                'balance': 0,
                'frozen_balance': 0,
                'email_verified': True,
            },
            {
                'username': 'administrator',
                'email': 'administrator@test.com',
                'password': 'test123',
                'role': 'admin',
                'first_name': 'Администратор',
                'last_name': 'Тестовый',
                'is_staff': True,
                'is_superuser': True,
                'balance': 0,
                'frozen_balance': 0,
                'email_verified': True,
            },
            {
                'username': 'partner',
                'email': 'partner@test.com',
                'password': 'test123',
                'role': 'partner',
                'first_name': 'Партнер',
                'last_name': 'Тестовый',
                'balance': 5000,
                'frozen_balance': 0,
                'email_verified': True,
                'partner_commission_rate': 10.00,
                'total_referrals': 0,
                'active_referrals': 0,
                'total_earnings': 0,
            },
            {
                'username': 'admin',
                'email': 'admin@test.com',
                'password': 'test123',
                'role': 'admin',
                'first_name': 'Администратор',
                'last_name': 'Тестовый',
                'is_staff': True,
                'is_superuser': True,
                'balance': 0,
                'frozen_balance': 0,
                'email_verified': True,
            }
        ]

        self.stdout.write("Создание тестовых аккаунтов...")
        self.stdout.write("=" * 50)

        for user_data in users_data:
            username = user_data['username']
            email = user_data['email']
            password = user_data.pop('password')
            
            # Проверяем, существует ли пользователь
            user, created = User.objects.get_or_create(
                username=username,
                defaults=user_data
            )
            
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Создан пользователь: {username}")
                )
                self.stdout.write(f"   Email: {email}")
                self.stdout.write(f"   Роль: {user.role}")
                self.stdout.write(f"   Пароль: {password}")
                
                # Генерируем реферальный код для партнера
                if user.role == 'partner' and not user.referral_code:
                    user.referral_code = str(uuid.uuid4())[:8].upper()
                    user.save()
                    self.stdout.write(f"   Реферальный код: {user.referral_code}")
                
                self.stdout.write("")
            else:
                # Обновляем существующего пользователя
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.set_password(password)
                user.save()
                
                # Генерируем реферальный код для партнера если его нет
                if user.role == 'partner' and not user.referral_code:
                    user.referral_code = str(uuid.uuid4())[:8].upper()
                    user.save()
                
                self.stdout.write(
                    self.style.WARNING(f"🔄 Обновлен пользователь: {username}")
                )
                self.stdout.write(f"   Email: {email}")
                self.stdout.write(f"   Роль: {user.role}")
                self.stdout.write(f"   Пароль: {password}")
                
                if user.role == 'partner' and user.referral_code:
                    self.stdout.write(f"   Реферальный код: {user.referral_code}")
                
                self.stdout.write("")

        self.stdout.write("=" * 50)
        self.stdout.write(self.style.SUCCESS("Все аккаунты созданы/обновлены!"))
        self.stdout.write("")
        self.stdout.write("Данные для входа:")
        self.stdout.write("📧 Директор:")
        self.stdout.write("   Email: director@test.com")
        self.stdout.write("   Пароль: test123")
        self.stdout.write("   Роль: admin (директор)")
        self.stdout.write("")
        self.stdout.write("🤝 Партнер:")
        self.stdout.write("   Email: partner@test.com")
        self.stdout.write("   Пароль: test123")
        self.stdout.write("   Роль: partner")
        self.stdout.write("")
        self.stdout.write("⚙️ Администратор:")
        self.stdout.write("   Email: admin@test.com")
        self.stdout.write("   Пароль: test123")
        self.stdout.write("   Роль: admin")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Все аккаунты готовы к использованию!"))