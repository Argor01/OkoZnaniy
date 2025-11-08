import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.users.serializers import CustomTokenObtainPairSerializer

User = get_user_model()

# Проверяем пользователя
user = User.objects.get(username='amueva3')
print(f'User: {user.username}')
print(f'Password check: {user.check_password("password123")}')

# Проверяем serializer
s = CustomTokenObtainPairSerializer(data={'username': 'amueva3', 'password': 'password123'})
print(f'Serializer valid: {s.is_valid()}')
if not s.is_valid():
    print(f'Errors: {s.errors}')
else:
    print('Token generated successfully!')











