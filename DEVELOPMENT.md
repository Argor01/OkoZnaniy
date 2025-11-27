# Инструкция по разработке

## Запуск в режиме разработки с hot reload

### Для запуска всех сервисов с автоматической перезагрузкой:

```bash
docker-compose -f docker-compose.dev.yml up
```

### Для запуска в фоновом режиме:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Для остановки:

```bash
docker-compose -f docker-compose.dev.yml down
```

### Для пересборки контейнеров:

```bash
docker-compose -f docker-compose.dev.yml build
```

### Для пересборки и запуска:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

## Что включает режим разработки:

### Frontend (React + Vite)
- ✅ Hot Module Replacement (HMR) - мгновенное обновление при изменении кода
- ✅ Автоматическая перезагрузка при изменении файлов
- ✅ Source maps для отладки
- ✅ Порт: 5173

### Backend (Django)
- ✅ Автоматическая перезагрузка при изменении Python файлов
- ✅ DEBUG=True
- ✅ Подробные логи ошибок
- ✅ Порт: 8000

### Celery
- ✅ Автоматическая перезагрузка воркеров при изменении кода (--autoreload)
- ✅ Подробные логи

### Telegram Bot
- ✅ Автоматическая перезагрузка при изменении кода
- ✅ DEBUG режим

## Просмотр логов

### Все сервисы:
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Конкретный сервис:
```bash
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f celery
```

## Выполнение команд внутри контейнеров

### Django команды:
```bash
docker-compose -f docker-compose.dev.yml exec backend python manage.py makemigrations
docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate
docker-compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

### NPM команды:
```bash
docker-compose -f docker-compose.dev.yml exec frontend npm install <package>
docker-compose -f docker-compose.dev.yml exec frontend npm run build
```

## Очистка и пересборка

### Полная очистка и пересборка:
```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -af
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

## Production режим

Для production используйте стандартный docker-compose.yml:

```bash
docker-compose up -d
```

## Порты

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5433
- Redis: localhost:6379

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
POSTGRES_PASSWORD=your_password
SECRET_KEY=your_secret_key
DEBUG=True
TELEGRAM_BOT_TOKEN=your_bot_token
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```
