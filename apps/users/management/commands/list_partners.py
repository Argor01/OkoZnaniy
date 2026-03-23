from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Показывает список всех партнеров в базе данных'

    def handle(self, *args, **options):
        partners = User.objects.filter(role='partner').order_by('username')
        
        count = partners.count()
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING('В базе данных нет партнеров')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'\nВсего партнеров: {count}\n')
        )
        
        self.stdout.write(
            f"{'ID':<5} {'Username':<30} {'Email':<35} {'Город':<20}"
        )
        self.stdout.write('-' * 90)
        
        for partner in partners:
            city = partner.city or '(не указан)'
            self.stdout.write(
                f"{partner.id:<5} {partner.username:<30} {partner.email:<35} {city:<20}"
            )
        
        self.stdout.write('')
