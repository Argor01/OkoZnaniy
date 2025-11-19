#!/usr/bin/env python
"""
Скрипт для настройки Google OAuth в Django allauth
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

def setup_google_oauth():
    """Настройка Google OAuth приложения"""
    
    # Получаем или создаем Site
    site, created = Site.objects.get_or_create(
        id=1,
        defaults={
            'domain': 'localhost:8000',
            'name': 'OkoZnaniy Local'
        }
    )
    
    if created:
        print(f"✅ Создан Site: {site.domain}")
    else:
        print(f"ℹ️  Site уже существует: {site.domain}")
    
    # Получаем credentials из .env
    client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET', '')
    
    if not client_id or not client_secret:
        print("\n⚠️  ВНИМАНИЕ: GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET не установлены в .env")
        print("\nДля настройки Google OAuth:")
        print("1. Перейдите в Google Cloud Console: https://console.cloud.google.com/")
        print("2. Создайте новый проект или выберите существующий")
        print("3. Включите Google+ API")
        print("4. Создайте OAuth 2.0 credentials:")
        print("   - Application type: Web application")
        print("   - Authorized redirect URIs: http://localhost:8000/api/accounts/google/login/callback/")
        print("5. Скопируйте Client ID и Client Secret в .env файл:")
        print("   GOOGLE_CLIENT_ID=your_client_id")
        print("   GOOGLE_CLIENT_SECRET=your_client_secret")
        print("\n6. Запустите этот скрипт снова")
        return
    
    # Создаем или обновляем Google OAuth приложение
    google_app, created = SocialApp.objects.get_or_create(
        provider='google',
        defaults={
            'name': 'Google OAuth',
            'client_id': client_id,
            'secret': client_secret,
        }
    )
    
    if not created:
        # Обновляем существующее приложение
        google_app.client_id = client_id
        google_app.secret = client_secret
        google_app.save()
        print(f"✅ Обновлено Google OAuth приложение")
    else:
        print(f"✅ Создано Google OAuth приложение")
    
    # Добавляем site к приложению
    if site not in google_app.sites.all():
        google_app.sites.add(site)
        print(f"✅ Site добавлен к Google OAuth приложению")
    
    print("\n🎉 Google OAuth настроен успешно!")
    print(f"\nClient ID: {client_id[:20]}...")
    print(f"Redirect URI: http://localhost:8000/api/accounts/google/login/callback/")
    print(f"\n✨ Теперь вы можете использовать авторизацию через Google!")

if __name__ == '__main__':
    setup_google_oauth()
