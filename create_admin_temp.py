
from django.contrib.auth import get_user_model
User = get_user_model()

# Удаляем существующего админа если есть
try:
    admin_user = User.objects.get(username='testadmin')
    admin_user.delete()
    print('Старый админ удален')
except User.DoesNotExist:
    pass

# Создаем нового админа
admin_user = User.objects.create_user(
    username='testadmin',
    email='admin@test.com',
    password='testpass123',
    is_staff=True,
    is_superuser=True
)
admin_user.role = 'admin'
admin_user.save()
print(f'Админ создан: {admin_user.username}')
