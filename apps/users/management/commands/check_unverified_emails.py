"""
Команда для проверки пользователей с неподтвержденными email
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Проверка пользователей с неподтвержденными email'

    def handle(self, *args, **kwargs):
        self.stdout.write('=== Пользователи с неподтвержденными email ===\n')
        
        # Все пользователи с неподтвержденным email
        unverified = User.objects.filter(email_verified=False, email__isnull=False).exclude(email='')
        
        if not unverified.exists():
            self.stdout.write(self.style.SUCCESS('Все пользователи подтвердили свои email!'))
            return
        
        self.stdout.write(f'Всего пользователей с неподтвержденным email: {unverified.count()}\n')
        
        # Группируем по доменам
        domains = {}
        for user in unverified:
            domain = user.email.split('@')[1] if '@' in user.email else 'unknown'
            if domain not in domains:
                domains[domain] = []
            domains[domain].append(user)
        
        self.stdout.write('=== По доменам ===')
        for domain, users in sorted(domains.items(), key=lambda x: -len(x[1])):
            self.stdout.write(f'\n{domain}: {len(users)} пользователей')
            for user in users[:10]:  # Показываем первые 10
                created = user.date_joined.strftime('%Y-%m-%d %H:%M') if user.date_joined else 'N/A'
                self.stdout.write(f'  - {user.email} (id={user.id}, registered={created})')
            if len(users) > 10:
                self.stdout.write(f'  ... и еще {len(users) - 10}')
        
        # Проверяем коды верификации
        from apps.users.models import EmailVerificationCode
        
        self.stdout.write('\n=== Активные коды верификации ===')
        active_codes = EmailVerificationCode.objects.filter(
            is_used=False,
            expires_at__gt=timezone.now()
        ).select_related('user')
        
        self.stdout.write(f'Активных кодов: {active_codes.count()}')
        
        # Последние 20 кодов
        for code in active_codes.order_by('-created_at')[:20]:
            self.stdout.write(
                f'  {code.email}: {code.code} (создан={code.created_at.strftime("%Y-%m-%d %H:%M")}, '
                f'истекает={code.expires_at.strftime("%Y-%m-%d %H:%M")})'
            )
