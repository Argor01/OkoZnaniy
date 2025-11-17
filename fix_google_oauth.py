import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

# Удаляем ВСЕ Social приложения (включая пустые)
all_apps = SocialApp.objects.all()
count = all_apps.count()
print(f"Найдено {count} Social приложений")

if count > 0:
    for app in all_apps:
        print(f"  - {app.provider}: {app.name} (ID: {app.client_id})")
    all_apps.delete()
    print(f"✅ Удалено {count} приложений")

# Создаем одно новое Google приложение
site = Site.objects.get_current()
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

if not client_id or not client_secret:
    print("❌ GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не установлены")
    exit(1)

google_app = SocialApp.objects.create(
    provider='google',
    name='Google OAuth',
    client_id=client_id,
    secret=client_secret,
)
google_app.sites.add(site)

print(f"\n✅ Создано новое Google OAuth приложение")
print(f"   Provider: {google_app.provider}")
print(f"   Name: {google_app.name}")
print(f"   Client ID: {client_id}")
print(f"   Site: {site.domain}")

# Проверка
final_count = SocialApp.objects.count()
print(f"\n📊 Итого Social приложений в базе: {final_count}")
