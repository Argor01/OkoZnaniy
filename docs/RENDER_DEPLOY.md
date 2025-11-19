# Деплой на Render

## Подготовка

1. Убедитесь, что все изменения закоммичены в ветку `main`
2. Создайте аккаунт на [Render.com](https://render.com)
3. Подключите ваш GitHub репозиторий

## Автоматический деплой

Render автоматически обнаружит файл `render.yaml` в корне проекта и создаст все необходимые сервисы:

- **okoznaniy-db** - PostgreSQL база данных
- **okoznaniy-redis** - Redis для кеширования
- **okoznaniy-backend** - Django backend API
- **okoznaniy-bot** - Telegram бот
- **okoznaniy-frontend** - React фронтенд

## Настройка переменных окружения

После создания сервисов, добавьте следующие переменные окружения в Render Dashboard:

### Backend (okoznaniy-backend):
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
EMAIL_HOST_USER=your_email@yandex.ru
EMAIL_HOST_PASSWORD=your_email_password
```

### Telegram Bot (okoznaniy-bot):
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## После деплоя

1. Запустите миграции:
   - Откройте Shell в okoznaniy-backend
   - Выполните: `python manage.py migrate`

2. Создайте суперпользователя:
   ```bash
   python manage.py createsuperuser
   ```

3. Настройте Google OAuth в админке:
   - Перейдите в админку: `https://okoznaniy-backend.onrender.com/admin/`
   - Добавьте Social Application для Google
   - Укажите Client ID и Secret

4. Обновите Redirect URI в Google Cloud Console:
   ```
   https://okoznaniy-backend.onrender.com/api/accounts/google/login/callback/
   ```

## Проверка работоспособности

- Frontend: `https://okoznaniy-frontend.onrender.com`
- Backend API: `https://okoznaniy-backend.onrender.com/api/`
- Health Check: `https://okoznaniy-backend.onrender.com/api/health/`
- Admin: `https://okoznaniy-backend.onrender.com/admin/`

## Troubleshooting

### Проблемы с базой данных
- Проверьте логи okoznaniy-backend
- Убедитесь, что DATABASE_URL правильно настроен

### Проблемы с Redis
- Проверьте, что okoznaniy-redis запущен
- Убедитесь, что REDIS_URL правильно настроен

### Telegram бот не отвечает
- Проверьте логи okoznaniy-bot
- Убедитесь, что TELEGRAM_BOT_TOKEN правильный
- Проверьте, что FRONTEND_URL указывает на правильный домен

### Google OAuth не работает
- Проверьте Redirect URI в Google Cloud Console
- Убедитесь, что Client ID и Secret правильные
- Проверьте настройки в Django Admin
