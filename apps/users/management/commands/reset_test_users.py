from django.core.management.base import BaseCommand
from apps.users.models import User, Roles


class Command(BaseCommand):
    help = 'Deletes all users and recreates test users in role@test.com format'

    def add_arguments(self, parser):
        parser.add_argument('--password', type=str, default='test123')
        parser.add_argument('--domain', type=str, default='test.com')

    def handle(self, *args, **options):
        password = str(options.get('password') or 'test123')
        domain = str(options.get('domain') or 'test.com')

        deleted_count, _ = User.objects.all().delete()
        self.stdout.write(f'Deleted users: {deleted_count}')

        users_to_create = [
            (Roles.CLIENT, False, False),
            (Roles.EXPERT, False, False),
            (Roles.PARTNER, False, False),
            (Roles.DIRECTOR, False, False),
            (Roles.ADMIN, True, True),
        ]

        self.stdout.write('Created users:')
        self.stdout.write('-' * 40)

        for role, is_staff, is_superuser in users_to_create:
            username = role
            email = f'{role}@{domain}'
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role,
                is_staff=is_staff,
                is_superuser=is_superuser,
                is_active=True
            )
            self.stdout.write(f'{user.email}/{password}')

        self.stdout.write('-' * 40)
        self.stdout.write('Done.')
