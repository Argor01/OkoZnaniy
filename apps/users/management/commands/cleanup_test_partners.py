from django.core.management.base import BaseCommand
from django.db import models
from apps.users.models import User


class Command(BaseCommand):
    help = 'Удаляет старых тестовых партнеров из базы данных'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Подтвердить удаление без запроса',
        )

    def handle(self, *args, **options):
        # Список имен тестовых партнеров
        test_usernames = [
            'Тестовый партнер 1',
            'Тестовый партнер 2', 
            'Тестовый партнер 3',
            'test1@example.com',
            'test2@example.com',
            'test3@example.com',
        ]
        
        # Ищем тестовых партнеров по username или email
        test_partners = User.objects.filter(
            role='partner'
        ).filter(
            models.Q(username__in=test_usernames) |
            models.Q(email__in=test_usernames) |
            models.Q(username__icontains='Тестовый') |
            models.Q(username__icontains='тестовый') |
            models.Q(email__icontains='test') & models.Q(email__icontains='example.com')
        )
        
        count = test_partners.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('✓ Тестовых партнеров не найдено')
            )
            return
        
        self.stdout.write(
            self.style.WARNING(f'\nНайдено тестовых партнеров: {count}')
        )
        
        for partner in test_partners:
            self.stdout.write(f'  - {partner.username} ({partner.email})')
        
        if not options['confirm']:
            confirm = input('\nУдалить этих партнеров? (yes/no): ')
            if confirm.lower() not in ['yes', 'y', 'да']:
                self.stdout.write(
                    self.style.WARNING('Отменено')
                )
                return
        
        deleted_count = test_partners.delete()[0]
        
        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Удалено партнеров: {deleted_count}')
        )
