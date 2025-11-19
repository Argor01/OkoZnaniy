import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

print("=" * 60)
print("DEBUG: Поиск дубликатов")
print("=" * 60)

# Все приложения
all_apps = SocialApp.objects.all()
print(f"\n1. Всего SocialApp: {all_apps.count()}")
for app in all_apps:
    print(f"   - ID: {app.id}, Provider: '{app.provider}', Name: '{app.name}'")
    print(f"     Client ID: {app.client_id}")
    print(f"     Sites: {[s.domain for s in app.sites.all()]}")

# Фильтр по provider='google'
google_apps = SocialApp.objects.filter(provider='google')
print(f"\n2. Google apps (filter): {google_apps.count()}")
for app in google_apps:
    print(f"   - ID: {app.id}, Name: '{app.name}'")

# Попробуем получить как в allauth
print(f"\n3. Попытка get() как в allauth:")
try:
    app = SocialApp.objects.get(provider='google')
    print(f"   ✅ Получено: ID={app.id}, Name='{app.name}'")
except SocialApp.MultipleObjectsReturned as e:
    print(f"   ❌ MultipleObjectsReturned!")
    # Покажем все что нашлось
    apps = SocialApp.objects.filter(provider='google')
    print(f"   Найдено {apps.count()} объектов:")
    for app in apps:
        print(f"      - ID: {app.id}, Provider: '{app.provider}', Name: '{app.name}', Client: '{app.client_id}'")
except SocialApp.DoesNotExist:
    print(f"   ❌ DoesNotExist!")

# Проверим Sites
print(f"\n4. Sites:")
sites = Site.objects.all()
for site in sites:
    print(f"   - ID: {site.id}, Domain: '{site.domain}', Name: '{site.name}'")
    apps_for_site = site.socialapp_set.all()
    print(f"     Apps: {apps_for_site.count()}")
    for app in apps_for_site:
        print(f"       - {app.provider}: {app.name}")

print("=" * 60)
