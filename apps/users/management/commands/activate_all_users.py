from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Активирует все неактивные аккаунты пользователей'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет сделано без фактического изменения',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Находим всех неактивных пользователей
        inactive_users = User.objects.filter(is_active=False)
        count = inactive_users.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('Все пользователи уже активны!'))
            return
        
        self.stdout.write(f'Найдено неактивных пользователей: {count}')
        
        for user in inactive_users:
            if dry_run:
                self.stdout.write(f'[DRY RUN] Активировал бы: {user.email} (ID: {user.id}, роль: {user.role})')
            else:
                user.is_active = True
                user.save(update_fields=['is_active'])
                self.stdout.write(f'✓ Активирован: {user.email} (ID: {user.id}, роль: {user.role})')
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'\n[DRY RUN] Было бы активировано: {count} пользователей'))
            self.stdout.write('Запустите без --dry-run для фактической активации')
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Успешно активировано пользователей: {count}'))
