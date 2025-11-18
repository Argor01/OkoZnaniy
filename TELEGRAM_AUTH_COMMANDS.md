# 🔧 Telegram Авторизация - Команды

## 🚀 Быстрые команды

### Запуск проекта

```bash
# Запуск всех контейнеров
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f backend

# Остановка
docker-compose down
```

### Проверка работоспособности

```bash
# Проверка импорта модуля
docker-compose exec backend python manage.py shell -c "from apps.users.telegram_auth import verify_telegram_auth; print('✅ OK')"

# Проверка API endpoint (Windows PowerShell)
Invoke-WebRequest -Uri "http://localhost:8000/api/users/telegram_auth/" -Method OPTIONS

# Проверка API endpoint (Linux/Mac)
curl -X OPTIONS http://localhost:8000/api/users/telegram_auth/

# Тестовый скрипт
python test_telegram_auth.py
```

### База данных

```bash
# Применить миграции
docker-compose exec backend python manage.py migrate

# Создать миграции
docker-compose exec backend python manage.py makemigrations

# Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Django shell
docker-compose exec backend python manage.py shell
```

### Проверка пользователей

```bash
# Проверить пользователей с Telegram ID
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
users = User.objects.filter(telegram_id__isnull=False)
for u in users:
    print(f'{u.username} - Telegram ID: {u.telegram_id}')
"

# Количество пользователей с Telegram
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
count = User.objects.filter(telegram_id__isnull=False).count()
print(f'Пользователей с Telegram: {count}')
"
```

## 🧪 Тестирование

### Backend тесты

```bash
# Тест модуля авторизации
docker-compose exec backend python -c "
import django
django.setup()
from apps.users.telegram_auth import verify_telegram_auth
print('✅ Module imported successfully')
"

# Тест создания пользователя
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
user = User.objects.create(
    username='test_telegram',
    telegram_id=123456789,
    first_name='Test',
    role='client'
)
print(f'✅ User created: {user.username}')
user.delete()
print('✅ User deleted')
"
```

### Frontend тесты

```bash
# Запуск frontend в режиме разработки
cd frontend-react
npm run dev

# Сборка frontend
npm run build

# Проверка типов TypeScript
npm run type-check

# Линтинг
npm run lint
```

### API тесты

```bash
# Тест с curl (Linux/Mac)
curl -X POST http://localhost:8000/api/users/telegram_auth/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "first_name": "Test",
    "username": "testuser",
    "auth_date": 1234567890,
    "hash": "test_hash"
  }'

# Тест с PowerShell (Windows)
$body = @{
    id = 123456789
    first_name = "Test"
    username = "testuser"
    auth_date = 1234567890
    hash = "test_hash"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/users/telegram_auth/" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

## 🔍 Отладка

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend

# Последние 100 строк
docker-compose logs --tail=100 backend

# Логи с временными метками
docker-compose logs -f -t backend
```

### Проверка переменных окружения

```bash
# Проверка TELEGRAM_BOT_TOKEN
docker-compose exec backend python -c "
import os
from django.conf import settings
print(f'TELEGRAM_BOT_TOKEN: {settings.TELEGRAM_BOT_TOKEN[:20]}...')
"

# Все переменные окружения
docker-compose exec backend env | grep TELEGRAM
```

### Проверка базы данных

```bash
# Подключение к PostgreSQL
docker-compose exec postgres psql -U postgres -d oko_db

# Проверка таблицы users
docker-compose exec postgres psql -U postgres -d oko_db -c "
SELECT id, username, telegram_id, role 
FROM users_user 
WHERE telegram_id IS NOT NULL;
"

# Количество пользователей
docker-compose exec postgres psql -U postgres -d oko_db -c "
SELECT COUNT(*) FROM users_user WHERE telegram_id IS NOT NULL;
"
```

## 🔧 Настройка

### Обновление токена бота

```bash
# Редактировать .env
nano .env
# или
notepad .env

# Перезапустить backend
docker-compose restart backend
```

### Обновление кода

```bash
# Обновить backend
docker-compose exec backend python manage.py migrate
docker-compose restart backend

# Обновить frontend
cd frontend-react
npm install
npm run build
cd ..
docker-compose restart frontend
```

### Очистка и перезапуск

```bash
# Остановить все контейнеры
docker-compose down

# Удалить volumes (ВНИМАНИЕ: удалит данные БД!)
docker-compose down -v

# Пересобрать образы
docker-compose build --no-cache

# Запустить заново
docker-compose up -d
```

## 📊 Мониторинг

### Статистика использования

```bash
# Количество авторизаций через Telegram
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
from django.utils import timezone
from datetime import timedelta

# За последние 24 часа
yesterday = timezone.now() - timedelta(days=1)
count = User.objects.filter(
    telegram_id__isnull=False,
    last_login__gte=yesterday
).count()
print(f'Авторизаций за 24 часа: {count}')
"

# Топ пользователей
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
users = User.objects.filter(telegram_id__isnull=False).order_by('-last_login')[:10]
for u in users:
    print(f'{u.username} - {u.last_login}')
"
```

### Проверка производительности

```bash
# Время ответа API
time curl -X OPTIONS http://localhost:8000/api/users/telegram_auth/

# Использование ресурсов контейнерами
docker stats

# Размер образов
docker images | grep oko
```

## 🛠️ Утилиты

### Создание тестовых данных

```bash
# Создать тестового пользователя с Telegram
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
user, created = User.objects.get_or_create(
    telegram_id=999999999,
    defaults={
        'username': 'telegram_test',
        'first_name': 'Telegram',
        'last_name': 'Test',
        'role': 'client'
    }
)
print(f'User: {user.username}, Created: {created}')
"
```

### Экспорт/Импорт данных

```bash
# Экспорт пользователей с Telegram
docker-compose exec backend python manage.py dumpdata users.User \
  --indent 2 \
  --output telegram_users.json

# Импорт данных
docker-compose exec backend python manage.py loaddata telegram_users.json
```

### Бэкап базы данных

```bash
# Создать бэкап
docker-compose exec postgres pg_dump -U postgres oko_db > backup.sql

# Восстановить из бэкапа
docker-compose exec -T postgres psql -U postgres oko_db < backup.sql
```

## 📝 Полезные алиасы

Добавьте в ваш `.bashrc` или `.zshrc`:

```bash
# Алиасы для Telegram авторизации
alias tg-logs='docker-compose logs -f backend'
alias tg-test='python test_telegram_auth.py'
alias tg-shell='docker-compose exec backend python manage.py shell'
alias tg-restart='docker-compose restart backend'
alias tg-users='docker-compose exec backend python manage.py shell -c "from apps.users.models import User; print(User.objects.filter(telegram_id__isnull=False).count())"'
```

## 🔗 Быстрые ссылки

```bash
# Открыть документацию
start TELEGRAM_AUTH_INDEX.md          # Windows
open TELEGRAM_AUTH_INDEX.md           # Mac
xdg-open TELEGRAM_AUTH_INDEX.md       # Linux

# Открыть в браузере
start http://localhost:8000/admin     # Django Admin
start http://localhost:3000           # Frontend
start http://localhost:8080           # Nginx
```

## 📚 Справка

### Получить помощь

```bash
# Django команды
docker-compose exec backend python manage.py help

# Docker команды
docker-compose help

# Документация
cat TELEGRAM_AUTH_INDEX.md
```

### Версии

```bash
# Python версия
docker-compose exec backend python --version

# Django версия
docker-compose exec backend python -c "import django; print(django.get_version())"

# Node версия
docker-compose exec frontend node --version

# PostgreSQL версия
docker-compose exec postgres psql --version
```

---

**Совет:** Сохраните этот файл в закладки для быстрого доступа к командам!
