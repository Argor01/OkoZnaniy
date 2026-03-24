# Инструкция по деплою на продакшен

## Предварительные требования

- Доступ к серверу по SSH
- Docker и Docker Compose установлены на сервере
- Настроен Git на сервере

## Деплой изменений

### 1. Подключитесь к серверу

```bash
ssh user@okoznaniy.ru
```

### 2. Перейдите в директорию проекта

```bash
cd /path/to/OkoZnaniy
```

### 3. Получите последние изменения

```bash
git pull origin dev
# или если используется main ветка:
# git pull origin main
```

### 4. Остановите текущие контейнеры

```bash
docker-compose down
```

### 5. Пересоберите и запустите контейнеры

```bash
docker-compose up --build -d
```

### 6. Проверьте статус контейнеров

```bash
docker-compose ps
```

Все контейнеры должны быть в статусе `Up`.

### 7. Проверьте логи (опционально)

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 8. Примените миграции (если есть новые)

```bash
docker-compose exec backend python manage.py migrate
```

### 9. Соберите статику (если изменились статические файлы)

```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

## Проверка работоспособности

1. Откройте https://okoznaniy.ru
2. Проверьте основные функции:
   - Вход в систему
   - Регистрация
   - Реферальные ссылки (https://okoznaniy.ru/ref/CODE)
   - Карта партнеров
   - Управление персоналом

## Откат изменений (если что-то пошло не так)

```bash
# Вернитесь к предыдущему коммиту
git reset --hard HEAD~1

# Или к конкретному коммиту
git reset --hard <commit-hash>

# Пересоберите контейнеры
docker-compose down
docker-compose up --build -d
```

## Полезные команды

### Просмотр логов в реальном времени

```bash
docker-compose logs -f --tail=100
```

### Перезапуск конкретного сервиса

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Выполнение команд внутри контейнера

```bash
# Django shell
docker-compose exec backend python manage.py shell

# Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Создание тестовых партнеров
docker-compose exec backend python manage.py create_test_partners
```

### Очистка неиспользуемых Docker ресурсов

```bash
docker system prune -a
```

## Мониторинг

### Проверка использования ресурсов

```bash
docker stats
```

### Проверка места на диске

```bash
df -h
```

### Проверка логов nginx

```bash
docker-compose exec nginx tail -f /var/log/nginx/access.log
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Проверьте логи
docker-compose logs <service-name>

# Проверьте конфигурацию
docker-compose config
```

### Проблема: Порты заняты

```bash
# Найдите процесс, использующий порт
sudo lsof -i :8000
sudo lsof -i :5173

# Остановите процесс
sudo kill -9 <PID>
```

### Проблема: Недостаточно места на диске

```bash
# Очистите старые образы и контейнеры
docker system prune -a

# Очистите логи
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

## Автоматический деплой (опционально)

Можно настроить GitHub Actions или другой CI/CD для автоматического деплоя при пуше в определенную ветку.

Пример workflow для GitHub Actions:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/OkoZnaniy
            git pull origin main
            docker-compose down
            docker-compose up --build -d
            docker-compose exec -T backend python manage.py migrate
            docker-compose exec -T backend python manage.py collectstatic --noinput
```
