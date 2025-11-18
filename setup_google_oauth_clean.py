import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

print("Очистка и настройка Google OAuth...")

# Удаляем ВСЕ Social приложения
SocialApp.objects.all().delete()
print("✅ Удалены все старые приложения")

# Создаём одно новое
site = Site.objects.get_current()
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

if client_id and client_secret:
    google_app = SocialApp.objects.create(
        provider='google',
        name='Google OAuth',
        client_id=client_id,
        secret=client_secret,
    )
    google_app.sites.add(site)
    print(f"✅ Создано Google OAuth приложение")
    print(f"   Client ID: {client_id}")
else:
    print("❌ GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не установлены!")

print(f"\n📊 Итого в базе: {SocialApp.objects.count()} приложение(й)")
