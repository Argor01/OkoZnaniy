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
        per_role_opt = options.get('per_role')
        per_role = int(per_role_opt) if per_role_opt is not None else 1
        password = str(options.get('password') or 'testpass123')
        domain = str(options.get('domain') or 'test.com')
        prefix = str(options.get('prefix') or 'test')
        
        self.stdout.write("Test Users Credentials (Email/Password):")
        self.stdout.write("-" * 40)

        partners = []
        created_or_updated = []
        for role_choice in Roles.choices:
            role_value = role_choice[0]
            users_to_create = []
            for i in range(1, per_role + 1):
                if per_role == 1:
                    username = f"{role_value}_{prefix}"
                    email = f"{role_value}@{domain}"
                else:
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
                    defaults['is_superuser'] = True
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
                    user.is_superuser = True
                if role_value == Roles.EXPERT:
                    user.bio = user.bio or f"Test expert profile: {username}"
                    user.experience_years = user.experience_years or 3
                    user.hourly_rate = user.hourly_rate or 1200
                    user.is_verified = True
                user.save()

                created_or_updated.append(user)
                if role_value == Roles.PARTNER:
                    partners.append(user)

            if users_to_create:
                self.stdout.write(f"{role_value.ljust(12)}: {users_to_create[0][1]}/{password}")

        if partners:
            referral_candidates = [
                u for u in created_or_updated
                if u.role in (Roles.CLIENT, Roles.EXPERT) and u.partner_id is None
            ]
            for idx, u in enumerate(referral_candidates):
                u.partner = partners[idx % len(partners)]
                u.save(update_fields=['partner'])
        
        self.stdout.write("-" * 40)
