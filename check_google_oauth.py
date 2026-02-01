#!/usr/bin/env python
"""
Проверка настроек Google OAuth
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

print("=== ПРОВЕРКА GOOGLE OAUTH ===\n")

# Проверяем Social Apps
apps = SocialApp.objects.all()
print(f"Всего Social Apps: {apps.count()}")
for app in apps:
    print(f"- Provider: {app.provider}")
    print(f"  Name: {app.name}")
    print(f"  Client ID: {app.client_id[:20]}...")
    print(f"  Sites: {[site.domain for site in app.sites.all()]}")
    print()

# Проверяем Sites
sites = Site.objects.all()
print(f"\nВсего Sites: {sites.count()}")
for site in sites:
    print(f"- ID: {site.id}, Domain: {site.domain}, Name: {site.name}")

# Проверяем переменные окружения
print("\n=== ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ===")
print(f"GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID', 'NOT SET')[:20]}...")
print(f"GOOGLE_CLIENT_SECRET: {os.getenv('GOOGLE_CLIENT_SECRET', 'NOT SET')[:20]}...")
print(f"FRONTEND_URL: {os.getenv('FRONTEND_URL', 'NOT SET')}")
