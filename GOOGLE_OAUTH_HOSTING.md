# Настройка Google OAuth для хостинга

## Проблема
После входа через Google редирект идет на localhost вместо IP хостинга.

## Решение

### 1. Обновите Google OAuth настройки в Google Cloud Console

Перейдите: https://console.cloud.google.com/apis/credentials

Найдите ваш OAuth 2.0 Client ID и добавьте:

**Authorized JavaScript origins:**
```
http://45.12.239.226
```

**Authorized redirect URIs:**
```
http://45.12.239.226/auth/google/callback
http://45.12.239.226/api/accounts/google/login/callback/
```

### 2. Проверьте .env на хостинге

На сервере проверьте файл `.env`:

```bash
ssh root@45.12.239.226
cd ~/OkoZnaniy
cat .env | grep FRONTEND_URL
```

Должно быть:
```
FRONTEND_URL=http://45.12.239.226
```

Если нет, исправьте:
```bash
nano .env
# Измените FRONTEND_URL=http://45.12.239.226
# Сохраните: Ctrl+O, Enter, Ctrl+X
```

### 3. Перезапустите backend

```bash
docker-compose restart backend
```

### 4. Проверьте настройки в Django Admin

1. Откройте: http://45.12.239.226/admin/
2. Войдите как суперпользователь
3. Перейдите в **Sites** → **example.com**
4. Измените:
   - **Domain name:** `45.12.239.226`
   - **Display name:** `OkoZnaniy`
5. Сохраните

6. Перейдите в **Social applications** → **Google**
7. Проверьте:
   - **Client id:** ваш Google Client ID
   - **Secret key:** ваш Google Client Secret
   - **Sites:** должен быть выбран `45.12.239.226`
8. Сохраните

### 5. Проверьте работу

1. Откройте http://45.12.239.226/login
2. Нажмите "Войти через Google"
3. После авторизации должен быть редирект на http://45.12.239.226/expert

## Если проблема осталась

### Проверьте логи backend
```bash
docker-compose logs backend | grep -i google
```

### Проверьте переменные окружения в контейнере
```bash
docker-compose exec backend env | grep FRONTEND_URL
```

Должно быть: `FRONTEND_URL=http://45.12.239.226`

### Пересоздайте контейнеры
```bash
docker-compose down
docker-compose up -d --build
```

## Для будущего домена

Когда получите домен (например, okoznaniy.ru):

1. **Google Console** - добавьте:
   - `https://okoznaniy.ru`
   - `https://okoznaniy.ru/auth/google/callback`
   - `https://okoznaniy.ru/api/accounts/google/login/callback/`

2. **.env** - измените:
   ```
   FRONTEND_URL=https://okoznaniy.ru
   ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx,45.12.239.226,okoznaniy.ru,www.okoznaniy.ru
   ```

3. **Django Admin** - обновите Site на `okoznaniy.ru`

4. **Установите SSL:**
   ```bash
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d okoznaniy.ru -d www.okoznaniy.ru
   ```
