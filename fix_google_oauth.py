#!/usr/bin/env python
"""
Скрипт для исправления проблемы с Google OAuth
Удаляет все существующие Google приложения и создает новое
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

def fix_google_oauth():
    """Исправление Google OAuth"""
    
    print("🔍 Проверяем существующие Google приложения...")
    
    # Удаляем все Google приложения
    google_apps = SocialApp.objects.filter(provider='google')
    count = google_apps.count()
    
    if count > 0:
        print(f"❌ Найдено {count} Google приложений. Удаляем...")
        google_apps.delete()
        print("✅ Все Google приложения удалены")
    else:
        print("ℹ️  Google приложений не найдено")
    
    # Получаем или создаем Site
    site, created = Site.objects.get_or_create(
        id=1,
        defaults={
            'domain': 'localhost:8000',
            'name': 'OkoZnaniy Local'
        }
    )
    
    if not created and site.domain != 'localhost:8000':
        site.domain = 'localhost:8000'
        site.name = 'OkoZnaniy Local'
        site.save()
        print(f"✅ Site обновлен: {site.domain}")
    else:
        print(f"✅ Site: {site.domain}")
    
    # Получаем credentials из .env
    client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET', '')
    
    if not client_id or not client_secret:
        print("\n⚠️  ВНИМАНИЕ: GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET не установлены в .env")
        return
    
    # Создаем новое Google OAuth приложение
    google_app = SocialApp.objects.create(
        provider='google',
        name='Google OAuth',
        client_id=client_id,
        secret=client_secret,
    )
    
    # Добавляем site
    google_app.sites.add(site)
    
    print(f"✅ Создано новое Google OAuth приложение (ID: {google_app.id})")
    print(f"\n🎉 Google OAuth исправлен!")
    print(f"\nClient ID: {client_id[:20]}...")
    print(f"Site: {site.domain}")
    print(f"Redirect URI: http://localhost:8000/api/accounts/google/login/callback/")

if __name__ == '__main__':
    fix_google_oauth()
