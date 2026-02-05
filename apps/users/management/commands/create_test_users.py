from django.core.management.base import BaseCommand
from apps.users.models import User, Roles

class Command(BaseCommand):
    help = 'Creates test users for each role'

    def add_arguments(self, parser):
        parser.add_argument('--per-role', type=int, default=1)
        parser.add_argument('--password', type=str, default='testpass123')
        parser.add_argument('--domain', type=str, default='test.com')
        parser.add_argument('--prefix', type=str, default='test')

    def handle(self, *args, **options):
        per_role = int(options.get('per_role') or 1)
        password = str(options.get('password') or 'testpass123')
        domain = str(options.get('domain') or 'test.com')
        prefix = str(options.get('prefix') or 'test')
        
        self.stdout.write("Test Users Credentials (Email/Password):")
        self.stdout.write("-" * 40)

        partners = []
        created_or_updated = []
        for role_choice in Roles.choices:
            role_value = role_choice[0]
            base_username = f"{role_value}_test"
            base_email = f"{role_value}@{domain}"

            users_to_create = [(base_username, base_email)]
            for i in range(1, per_role + 1):
                username = f"{role_value}_{prefix}{i}"
                email = f"{role_value}{i}@{domain}"
                users_to_create.append((username, email))

            for username, email in users_to_create:
                defaults = {
                    'email': email,
                    'role': role_value,
                    'email_verified': True,
                    'is_active': True
                }
                if role_value == Roles.ADMIN:
                    defaults['is_staff'] = True
                if role_value == Roles.EXPERT:
                    defaults['bio'] = f"Test expert profile: {username}"
                    defaults['experience_years'] = 3
                    defaults['hourly_rate'] = 1200
                    defaults['is_verified'] = True

                user, created = User.objects.get_or_create(username=username, defaults=defaults)
                user.set_password(password)
                user.email = email
                user.role = role_value
                user.email_verified = True
                user.is_active = True
                if role_value == Roles.ADMIN:
                    user.is_staff = True
                if role_value == Roles.EXPERT:
                    user.bio = user.bio or f"Test expert profile: {username}"
                    user.experience_years = user.experience_years or 3
                    user.hourly_rate = user.hourly_rate or 1200
                    user.is_verified = True
                user.save()

                created_or_updated.append(user)
                if role_value == Roles.PARTNER:
                    partners.append(user)

            self.stdout.write(f"{role_value.ljust(12)}: {base_email}/{password}")

        superuser_email = f"superuser@{domain}"
        superuser, created = User.objects.get_or_create(
            username='superuser_test',
            defaults={
                'email': superuser_email,
                'role': Roles.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'email_verified': True,
                'is_active': True
            }
        )
        if created:
            superuser.set_password(password)
            superuser.save()
        else:
            superuser.set_password(password)
            superuser.email = superuser_email
            superuser.is_staff = True
            superuser.is_superuser = True
            superuser.save()

        if partners:
            referral_candidates = [
                u for u in created_or_updated
                if u.role in (Roles.CLIENT, Roles.EXPERT) and u.partner_id is None
            ]
            for idx, u in enumerate(referral_candidates):
                u.partner = partners[idx % len(partners)]
                u.save(update_fields=['partner'])
        
        self.stdout.write(f"{'superuser'.ljust(12)}: {superuser_email}/{password}")
        self.stdout.write("-" * 40)
