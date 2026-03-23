from django.core.management.base import BaseCommand
from apps.users.models import User
from decimal import Decimal
from apps.partners.models import PartnerEarning


class Command(BaseCommand):
    help = 'Создает тестовых партнеров с городами для проверки карты'

    def handle(self, *args, **options):
        test_partners = [
            {
                'username': 'partner_moscow',
                'email': 'partner.moscow@example.com',
                'city': 'Москва',
                'phone': '+7 (495) 123-45-67',
                'password': 'testpass123',
            },
            {
                'username': 'partner_spb',
                'email': 'partner.spb@example.com',
                'city': 'Санкт-Петербург',
                'phone': '+7 (812) 234-56-78',
                'password': 'testpass123',
            },
            {
                'username': 'partner_novosibirsk',
                'email': 'partner.novosibirsk@example.com',
                'city': 'Новосибирск',
                'phone': '+7 (383) 345-67-89',
                'password': 'testpass123',
            },
            {
                'username': 'partner_ekb',
                'email': 'partner.ekb@example.com',
                'city': 'Екатеринбург',
                'phone': '+7 (343) 456-78-90',
                'password': 'testpass123',
            },
            {
                'username': 'partner_krasnodar',
                'email': 'partner.krasnodar@example.com',
                'city': 'Краснодар',
                'phone': '+7 (861) 567-89-01',
                'password': 'testpass123',
            },
            {
                'username': 'partner_vladivostok',
                'email': 'partner.vladivostok@example.com',
                'city': 'Владивосток',
                'phone': '+7 (423) 678-90-12',
                'password': 'testpass123',
            },
            {
                'username': 'partner_kazan',
                'email': 'partner.kazan@example.com',
                'city': 'Казань',
                'phone': '+7 (843) 789-01-23',
                'password': 'testpass123',
            },
        ]

        created_count = 0
        updated_count = 0

        for partner_data in test_partners:
            username = partner_data['username']
            password = partner_data.pop('password')
            
            partner, created = User.objects.update_or_create(
                username=username,
                defaults={
                    **partner_data,
                    'role': 'partner',
                    'is_active': True,
                }
            )
            
            if created:
                partner.set_password(password)
                partner.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Создан партнер: {username} ({partner_data["city"]})')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'→ Обновлен партнер: {username} ({partner_data["city"]})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nГотово! Создано: {created_count}, Обновлено: {updated_count}'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                'Все партнеры имеют пароль: testpass123'
            )
        )
