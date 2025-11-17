import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

# Получаем или создаем Site
site = Site.objects.get_current()

# Получаем credentials из переменных окружения
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

if not client_id or not client_secret:
    print("❌ GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не установлены в .env")
    exit(1)

# Создаем или обновляем Google Social App
google_app, created = SocialApp.objects.update_or_create(
    provider='google',
    defaults={
        'name': 'Google OAuth',
        'client_id': client_id,
        'secret': client_secret,
    }
)

# Добавляем site к приложению
google_app.sites.add(site)

if created:
    print(f"✅ Google OAuth приложение создано успешно!")
else:
    print(f"✅ Google OAuth приложение обновлено!")

print(f"   Client ID: {client_id}")
print(f"   Site: {site.domain}")
