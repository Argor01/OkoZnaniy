"""
Сидинг тестовых пользователей для финансовых проверок.

Запуск:
    docker compose exec backend python manage.py seed_finance_testers

Пароли (одинаковые для всех):
    client1@test.com   → Finance123!
    client2@test.com   → Finance123!
    client3@test.com   → Finance123!
    expert1@test.com   → Finance123!
    expert2@test.com   → Finance123!
    expert3@test.com   → Finance123!
    partner@test.com   → Finance123!

Партнёрская привязка:
    client1@test.com  → partner@test.com
    expert1@test.com  → partner@test.com
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.wallet.services import WalletService

User = get_user_model()

# ─── Пароли ─────────────────────────────────────────────
PASSWORD = 'Finance123!'

# ─── Тестовые пользователи ──────────────────────────────
USERS = [
    # Клиенты (баланс 100 000)
    {'email': 'client1@test.com', 'role': 'client',  'first_name': 'Иван',   'last_name': 'Петров'},
    {'email': 'client2@test.com', 'role': 'client',  'first_name': 'Мария',  'last_name': 'Сидорова'},
    {'email': 'client3@test.com', 'role': 'client',  'first_name': 'Алексей', 'last_name': 'Козлов'},
    # Эксперты (баланс 100 000)
    {'email': 'expert1@test.com', 'role': 'expert',  'first_name': 'Дмитрий', 'last_name': 'Волков'},
    {'email': 'expert2@test.com', 'role': 'expert',  'first_name': 'Елена',  'last_name': 'Новикова'},
    {'email': 'expert3@test.com', 'role': 'expert',  'first_name': 'Сергей', 'last_name': 'Морозов'},
    # Партнёр (баланс 100 000)
    {'email': 'partner@test.com', 'role': 'partner', 'first_name': 'ООО',    'last_name': 'Партнёр'},
]

# Кому привязать к partner@test.com
PARTNER_REFERRALS = ['client1@test.com', 'expert1@test.com']

TOPUP_AMOUNT = Decimal('100000.00')


class Command(BaseCommand):
    help = 'Создаёт тестовых пользователей с балансом 100 000 ₽ и партнёрской привязкой'

    def handle(self, *args, **options):
        created, updated = 0, 0

        # 1. Создаём / обновляем пользователей
        for data in USERS:
            user = User.objects.filter(email=data['email']).first()
            if user is None:
                user = User.objects.create_user(
                    username=data['email'],
                    email=data['email'],
                    password=PASSWORD,
                    role=data['role'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    is_active=True,
                    email_verified=True,
                )
                created += 1
                self.stdout.write(f'  + {data["email"]} ({data["role"]})')
            else:
                user.set_password(PASSWORD)
                user.role = data['role']
                user.first_name = data['first_name']
                user.last_name = data['last_name']
                user.is_active = True
                user.email_verified = True
                user.save()
                updated += 1
                self.stdout.write(f'  ~ {data["email"]} обновлён')

        # 2. Начисляем баланс 100 000 (если ещё нет)
        for data in USERS:
            user = User.objects.get(email=data['email'])
            if (user.balance or Decimal('0')) < TOPUP_AMOUNT:
                WalletService.topup(user, TOPUP_AMOUNT, description='Seed: начисление 100 000 ₽')
                self.stdout.write(f'  💰 {data["email"]} → +100 000 ₽')
            else:
                self.stdout.write(f'  ✓  {data["email"]} баланс уже >= 100 000 ₽')

        # 3. Привязываем рефералов к партнёру
        partner = User.objects.get(email='partner@test.com')
        for referral_email in PARTNER_REFERRALS:
            user = User.objects.get(email=referral_email)
            if user.partner_id != partner.id:
                user.partner = partner
                user.save(update_fields=['partner'])
                self.stdout.write(f'  🔗 {referral_email} → partner@test.com')
            else:
                self.stdout.write(f'  ✓  {referral_email} уже привязан к partner@test.com')

        # 4. Итоги
        self.stdout.write(self.style.SUCCESS(
            f'\nГотово: создано {created}, обновлено {updated}, '
            f'всего пользователей: {User.objects.count()}'
        ))
