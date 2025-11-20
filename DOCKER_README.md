# Запуск проекта OkoZnaniy через Docker

## Предварительные требования

1. **Docker Desktop** - установите с официального сайта [docker.com](https://www.docker.com/products/docker-desktop)
2. **Git** - для клонирования репозитория

## Быстрый старт

### 1. Подготовка окружения

```bash
# Скопируйте файл переменных окружения
copy .env.example .env
```

Отредактируйте `.env` файл, установив необходимые значения:
- `POSTGRES_PASSWORD` - пароль для базы данных
- `DJANGO_SECRET_KEY` - секретный ключ Django
- `BOT_TOKEN` - токен Telegram бота (если используется)

### 2. Запуск в режиме разработки

**Windows:**
```cmd
start-dev.bat
```

**Linux/Mac:**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 3. Запуск в production режиме

**Windows:**
```cmd
start-prod.bat
```

**Linux/Mac:**
```bash
docker-compose up --build -d
```

## Доступные сервисы

После запуска будут доступны:

- **Frontend (React)**: http://localhost:3000 (dev) / http://localhost:3000 (prod)
- **Backend (Django)**: http://localhost:8000
- **Admin панель**: http://localhost:8000/admin
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Учетные данные по умолчанию

- **Суперпользователь**: admin / admin123
- **База данных**: oko_db / postgres / postgres123

## Управление контейнерами

### Просмотр логов
```bash
# Все сервисы
docker-compose logs

# Конкретный сервис
docker-compose logs backend
docker-compose logs frontend
```

### Остановка сервисов
```bash
# Остановка
docker-compose down

# Остановка с удалением volumes
docker-compose down -v
```

### Перезапуск сервиса
```bash
docker-compose restart backend
```

### Выполнение команд в контейнере
```bash
# Django команды
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py collectstatic

# Подключение к базе данных
docker-compose exec postgres psql -U postgres -d oko_db
```

## Разработка

### Режим разработки

В режиме разработки (`docker-compose.dev.yml`):
- Код монтируется как volume, изменения применяются автоматически
- Django запускается с `runserver`
- Frontend запускается с hot reload
- DEBUG=True

### Структура проекта

```
├── docker-compose.yml          # Production конфигурация
├── docker-compose.dev.yml      # Development конфигурация
├── Dockerfile                  # Backend образ
├── docker-entrypoint.sh        # Скрипт запуска backend
├── frontend-react/
│   ├── Dockerfile              # Frontend образ
│   └── nginx.conf              # Nginx конфигурация
├── .env                        # Переменные окружения
└── start-*.bat                 # Скрипты запуска для Windows
```

## Решение проблем

### Проблемы с портами
Если порты заняты, измените их в docker-compose.yml:
```yaml
ports:
  - "8001:8000"  # вместо 8000:8000
```

### Проблемы с базой данных
```bash
# Пересоздание базы данных
docker-compose down -v
docker-compose up --build
```

### Очистка Docker
```bash
# Удаление неиспользуемых образов
docker system prune

# Полная очистка
docker system prune -a --volumes
```

## Дополнительные команды

### Создание миграций
```bash
docker-compose exec backend python manage.py makemigrations
```

### Загрузка фикстур
```bash
docker-compose exec backend python manage.py loaddata fixtures/initial_data.json
```

### Бэкап базы данных
```bash
docker-compose exec postgres pg_dump -U postgres oko_db > backup.sql
```

### Восстановление базы данных
```bash
docker-compose exec -T postgres psql -U postgres oko_db < backup.sql
```