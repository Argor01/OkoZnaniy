import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

print("=" * 60)
print("🔍 ПРОВЕРКА GOOGLE OAUTH НАСТРОЕК")
print("=" * 60)

# 1. Проверка переменных окружения
print("\n1️⃣ Переменные окружения:")
client_id = os.getenv('GOOGLE_CLIENT_ID')
client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
print(f"   GOOGLE_CLIENT_ID: {client_id}")
print(f"   GOOGLE_CLIENT_SECRET: {'✅ SET' if client_secret else '❌ NOT SET'}")

# 2. Проверка Social Apps в базе
print("\n2️⃣ Social Applications в базе данных:")
apps = SocialApp.objects.all()
print(f"   Всего приложений: {apps.count()}")
for app in apps:
    print(f"   - Provider: {app.provider}")
    print(f"     Name: {app.name}")
    print(f"     Client ID: {app.client_id}")
    print(f"     Sites: {[s.domain for s in app.sites.all()]}")

# 3. Проверка Site
print("\n3️⃣ Django Sites:")
sites = Site.objects.all()
for site in sites:
    print(f"   - ID: {site.id}, Domain: {site.domain}, Name: {site.name}")

# 4. Проверка настроек Django
print("\n4️⃣ Django Settings:")
from django.conf import settings
print(f"   SITE_ID: {settings.SITE_ID}")
print(f"   SOCIALACCOUNT_PROVIDERS: {list(settings.SOCIALACCOUNT_PROVIDERS.keys())}")
print(f"   LOGIN_REDIRECT_URL: {settings.LOGIN_REDIRECT_URL}")
print(f"   ACCOUNT_LOGOUT_REDIRECT_URL: {settings.ACCOUNT_LOGOUT_REDIRECT_URL}")

# 5. Проверка URL
print("\n5️⃣ Проверка URL:")
from django.urls import reverse
try:
    google_login_url = reverse('google_login')
    print(f"   ✅ Google Login URL: {google_login_url}")
except:
    print(f"   ❌ Google Login URL не найден")

print("\n" + "=" * 60)
print("✅ ПРОВЕРКА ЗАВЕРШЕНА")
print("=" * 60)
