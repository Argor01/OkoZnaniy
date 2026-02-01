#!/usr/bin/env python
"""
Настройка Google OAuth
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

print("=== НАСТРОЙКА GOOGLE OAUTH ===\n")

# Получаем переменные окружения
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
frontend_url = os.getenv('FRONTEND_URL', 'https://okoznaniy.ru')

if not client_id or not client_secret:
    print("❌ GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не установлены!")
    exit(1)

# Обновляем Site
site, created = Site.objects.get_or_create(id=1)
site.domain = frontend_url.replace('https://', '').replace('http://', '')
site.name = site.domain
site.save()
print(f"✅ Site обновлен: {site.domain}")

# Создаем или обновляем Google SocialApp
google_app, created = SocialApp.objects.get_or_create(
    provider='google',
    defaults={
        'name': 'Google OAuth',
        'client_id': client_id,
        'secret': client_secret,
    }
)

if not created:
    google_app.client_id = client_id
    google_app.secret = client_secret
    google_app.save()
    print(f"✅ Google OAuth обновлен")
else:
    print(f"✅ Google OAuth создан")

# Привязываем к сайту
if site not in google_app.sites.all():
    google_app.sites.add(site)
    print(f"✅ Google OAuth привязан к сайту {site.domain}")

print("\n=== НАСТРОЙКА ЗАВЕРШЕНА ===")
print(f"Provider: {google_app.provider}")
print(f"Client ID: {google_app.client_id[:20]}...")
print(f"Sites: {[s.domain for s in google_app.sites.all()]}")
