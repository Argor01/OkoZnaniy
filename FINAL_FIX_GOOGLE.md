# 🎯 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ GOOGLE OAUTH

## Что было исправлено в коде:

1. ✅ Добавлен метод `get_callback_url` в `CustomSocialAccountAdapter` для правильного формирования callback URL
2. ✅ Добавлены настройки `ACCOUNT_DEFAULT_HTTP_PROTOCOL` и `SOCIALACCOUNT_CALLBACK_URL` в settings.py
3. ✅ Создан скрипт `setup_site.py` для автоматической настройки Django Site

## Команды для хостинга (выполните по порядку):

```bash
# 1. Подключитесь к серверу
ssh root@45.12.239.226

# 2. Перейдите в проект
cd ~/OkoZnaniy

# 3. Получите последние изменения
git pull

# 4. Убедитесь что .env правильный
cat .env | grep FRONTEND_URL
# Должно быть: FRONTEND_URL=http://45.12.239.226

# Если нет, исправьте:
nano .env
# Измените на: FRONTEND_URL=http://45.12.239.226
# Также убедитесь: DEBUG=False

# 5. Пересоберите и перезапустите
docker-compose down
docker-compose up -d --build

# 6. Подождите пока контейнеры запустятся
sleep 15

# 7. Настройте Django Site автоматически
docker-compose exec backend python setup_site.py

# 8. Проверьте статус
docker-compose ps
```

## В Google Cloud Console:

1. Откройте: https://console.cloud.google.com/apis/credentials
2. Выберите ваш OAuth 2.0 Client ID
3. В **Authorized redirect URIs** добавьте:
   ```
   http://45.12.239.226/api/accounts/google/login/callback/
   ```
4. В **Authorized JavaScript origins** добавьте:
   ```
   http://45.12.239.226
   ```
5. Нажмите **SAVE**

## Проверка:

1. Откройте: http://45.12.239.226/login
2. Нажмите "Войти через Google"
3. После авторизации должен быть редирект на: http://45.12.239.226/expert

## Если всё равно не работает:

### Проверьте логи backend:
```bash
docker-compose logs backend | grep -i google
docker-compose logs backend | grep -i redirect
```

### Проверьте что Site настроен правильно:
```bash
docker-compose exec backend python manage.py shell
```

В shell выполните:
```python
from django.contrib.sites.models import Site
site = Site.objects.get(id=1)
print(f"Domain: {site.domain}")
# Должно быть: Domain: 45.12.239.226
```

### Проверьте Social App:
```bash
docker-compose exec backend python manage.py shell
```

В shell:
```python
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site

apps = SocialApp.objects.filter(provider='google')
for app in apps:
    print(f"App: {app.name}")
    print(f"Sites: {[s.domain for s in app.sites.all()]}")
# Должно содержать: 45.12.239.226
```

### Очистите кеш браузера:
- Откройте DevTools (F12)
- Правый клик на кнопке обновления → "Очистить кеш и жесткая перезагрузка"

### Пересоздайте контейнеры полностью:
```bash
docker-compose down -v
docker system prune -f
docker-compose up -d --build
docker-compose exec backend python setup_site.py
```

## Для будущего домена:

Когда получите домен, просто:
1. Измените в .env: `FRONTEND_URL=https://yourdomain.com`
2. Обновите Google Console redirect URIs
3. Запустите: `docker-compose exec backend python setup_site.py`
4. Установите SSL сертификат

Всё! 🎉
