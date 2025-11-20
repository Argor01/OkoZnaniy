import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from allauth.socialaccount.models import SocialApp
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.test import RequestFactory

print("=" * 60)
print("TEST: allauth get_app()")
print("=" * 60)

# Создаём фейковый request
factory = RequestFactory()
request = factory.get('/api/accounts/google/login/')

# Создаём adapter
adapter = DefaultSocialAccountAdapter()

print("\n1. Попытка получить app через adapter:")
try:
    app = adapter.get_app(request, provider='google')
    print(f"   ✅ Успех! App ID: {app.id}, Name: {app.name}")
except Exception as e:
    print(f"   ❌ Ошибка: {type(e).__name__}: {e}")
    
    # Попробуем понять что ищет allauth
    print("\n2. Отладка - что в базе:")
    apps = SocialApp.objects.filter(provider='google')
    print(f"   Найдено apps: {apps.count()}")
    for app in apps:
        print(f"      - ID: {app.id}, Provider: '{app.provider}'")
        print(f"        Client ID: '{app.client_id}'")
        print(f"        Sites: {list(app.sites.values_list('id', 'domain'))}")

print("=" * 60)
