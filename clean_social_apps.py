import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

print("=" * 60)
print("ОЧИСТКА SOCIAL APPS")
print("=" * 60)

# Показываем все приложения
all_apps = SocialApp.objects.all()
print(f"\nНайдено приложений: {all_apps.count()}")
for i, app in enumerate(all_apps, 1):
    print(f"{i}. Provider: '{app.provider}', Name: '{app.name}', Client ID: '{app.client_id}'")

# Удаляем ВСЕ
if all_apps.count() > 0:
    all_apps.delete()
    print(f"\n✅ Удалено {all_apps.count()} приложений")

# Создаём ОДНО новое
site = Site.objects.get_current()
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

if not client_id or not client_secret:
    print("\n❌ Credentials не найдены!")
    exit(1)

# Проверяем что нет дубликатов перед созданием
existing = SocialApp.objects.filter(provider='google').count()
if existing > 0:
    print(f"\n⚠️  Уже существует {existing} Google приложений!")
    SocialApp.objects.filter(provider='google').delete()

google_app = SocialApp.objects.create(
    provider='google',
    name='Google OAuth',
    client_id=client_id,
    secret=client_secret,
)
google_app.sites.add(site)

print(f"\n✅ Создано Google OAuth приложение")
print(f"   ID: {google_app.id}")
print(f"   Provider: {google_app.provider}")
print(f"   Client ID: {client_id}")

# Финальная проверка
final_count = SocialApp.objects.count()
print(f"\n📊 Итого в базе: {final_count} приложение(й)")

if final_count != 1:
    print(f"⚠️  ВНИМАНИЕ: Ожидалось 1, найдено {final_count}!")
else:
    print("✅ Всё в порядке!")

print("=" * 60)
