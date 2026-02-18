import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

admin = User.objects.get(username='admin')
admin.set_password('admin123')
admin.save()

print(f"Password for {admin.username} has been reset to: admin123")
