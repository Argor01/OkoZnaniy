# 🚨 ИСПРАВЛЕНИЕ РЕДИРЕКТА GOOGLE

## Быстрое решение на хостинге:

```bash
# 1. Подключитесь
ssh root@45.12.239.226
cd ~/OkoZnaniy

# 2. Проверьте .env
cat .env | grep FRONTEND_URL

# 3. Если не http://45.12.239.226, исправьте:
nano .env
# Найдите строку FRONTEND_URL и измените на:
# FRONTEND_URL=http://45.12.239.226

# 4. Перезапустите backend
docker-compose restart backend

# 5. Проверьте
docker-compose exec backend env | grep FRONTEND_URL
```

## В Google Cloud Console:

1. Откройте: https://console.cloud.google.com/apis/credentials
2. Найдите ваш OAuth 2.0 Client
3. Добавьте в **Authorized redirect URIs:**
   ```
   http://45.12.239.226/auth/google/callback
   http://45.12.239.226/api/accounts/google/login/callback/
   ```
4. Добавьте в **Authorized JavaScript origins:**
   ```
   http://45.12.239.226
   ```
5. Сохраните

## В Django Admin:

1. Откройте: http://45.12.239.226/admin/
2. **Sites** → измените domain на `45.12.239.226`
3. **Social applications** → проверьте что выбран правильный Site

## Проверка:

Откройте http://45.12.239.226/login и войдите через Google.
Должен быть редирект на http://45.12.239.226/expert ✅

Подробная инструкция: `GOOGLE_OAUTH_HOSTING.md`
