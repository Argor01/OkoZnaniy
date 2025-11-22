#!/usr/bin/env python
"""
Скрипт для настройки Django Site на хостинге
Запускать: docker-compose exec backend python setup_site.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.sites.models import Site
from django.conf import settings

def setup_site():
    """Настройка Site для правильного домена"""
    
    # Получаем FRONTEND_URL из настроек
    frontend_url = settings.FRONTEND_URL
    
    # Извлекаем домен из URL
    from urllib.parse import urlparse
    parsed = urlparse(frontend_url)
    domain = parsed.netloc or parsed.path
    
    print(f"🔧 Настройка Django Site...")
    print(f"   FRONTEND_URL: {frontend_url}")
    print(f"   Domain: {domain}")
    
    # Обновляем или создаем Site
    site, created = Site.objects.get_or_create(id=settings.SITE_ID)
    
    if created:
        print(f"✅ Создан новый Site с ID={settings.SITE_ID}")
    else:
        print(f"📝 Обновляем существующий Site (ID={settings.SITE_ID})")
        print(f"   Старый domain: {site.domain}")
    
    site.domain = domain
    site.name = 'OkoZnaniy'
    site.save()
    
    print(f"✅ Site обновлен:")
    print(f"   Domain: {site.domain}")
    print(f"   Name: {site.name}")
    print()
    
    # Проверяем Social Applications
    from allauth.socialaccount.models import SocialApp
    
    google_apps = SocialApp.objects.filter(provider='google')
    
    if google_apps.exists():
        print(f"📱 Найдено Google приложений: {google_apps.count()}")
        for app in google_apps:
            print(f"   - {app.name} (Client ID: {app.client_id[:20]}...)")
            
            # Добавляем текущий site к приложению если его нет
            if site not in app.sites.all():
                app.sites.add(site)
                print(f"     ✅ Добавлен site {domain}")
            else:
                print(f"     ✓ Site {domain} уже добавлен")
    else:
        print("⚠️  Google приложение не найдено!")
        print("   Создайте его в Django Admin: /admin/socialaccount/socialapp/")
    
    print()
    print("✅ Настройка завершена!")
    print(f"🌐 Теперь Google OAuth должен работать с {domain}")

if __name__ == '__main__':
    setup_site()
