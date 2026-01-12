from django.core.management.base import BaseCommand
from apps.users.models import User, Roles

class Command(BaseCommand):
    help = 'Creates test users for each role'

    def handle(self, *args, **options):
        password = 'testpass123'
        
        self.stdout.write("Test Users Credentials (Email/Password):")
        self.stdout.write("-" * 40)

        for role_choice in Roles.choices:
            role_value = role_choice[0]
            username = f"{role_value}_test"
            email = f"{role_value}@test.com"
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'role': role_value,
                    'email_verified': True,
                    'is_active': True
                }
            )
            
            if created:
                user.set_password(password)
                user.save()
            else:
                # Ensure password and role are correct even if user exists
                user.set_password(password)
                user.email = email
                user.role = role_value
                user.email_verified = True
                user.is_active = True
                user.save()
            
            self.stdout.write(f"{role_value.ljust(12)}: {email}/{password}")

        # Create admin superuser
        superuser_email = 'admin@test.com'
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
            superuser.is_staff = True
            superuser.is_superuser = True
            superuser.save()
        
        self.stdout.write(f"{'superuser'.ljust(12)}: {superuser_email}/{password}")
        self.stdout.write("-" * 40)
