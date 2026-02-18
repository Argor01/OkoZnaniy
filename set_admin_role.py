import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

admin = User.objects.get(username='admin')
admin.role = 'admin'
admin.is_staff = True
admin.is_superuser = True
admin.save()

print(f"User {admin.username} now has role: {admin.role}")
print(f"Is staff: {admin.is_staff}")
print(f"Is superuser: {admin.is_superuser}")
