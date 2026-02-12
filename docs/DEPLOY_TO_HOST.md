# Инструкция по деплою на хостинг

## Обновление кода на сервере

### 1. Подключиться к серверу по SSH

```bash
ssh user@your-server.com
# или
ssh root@your-server-ip
```

### 2. Перейти в директорию проекта

```bash
cd /path/to/OkoZnaniy
# Например:
cd /var/www/OkoZnaniy
# или
cd ~/OkoZnaniy
```

### 3. Остановить контейнеры

```bash
docker-compose down
```

### 4. Получить последние изменения с GitHub

```bash
git pull origin main
```

### 5. Пересобрать контейнеры (если были изменения в коде)

```bash
# Пересобрать все контейнеры
docker-compose build

# Или только нужные:
docker-compose build backend
docker-compose build frontend
```

### 6. Применить миграции БД

```bash
docker-compose run --rm backend python manage.py migrate
```

### 7. Обновить даты заказов для корректной работы графиков

```bash
# Создать скрипт на сервере
cat > fix_orders_dates.py << 'EOF'
#!/usr/bin/env python
import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Order
from django.utils import timezone
from django.db.models import Sum

now = timezone.now()
start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
days_in_month = (now - start_of_month).days + 1

completed = Order.objects.filter(status='completed').order_by('updated_at')
count = completed.count()

print(f"Обновление {count} завершенных заказов...")

for i, order in enumerate(completed):
    day_offset = int((i / count) * days_in_month)
    new_date = start_of_month + timedelta(days=day_offset, hours=i % 24)
    order.updated_at = new_date
    order.save(update_fields=['updated_at'])

total = Order.objects.filter(
    status='completed',
    updated_at__gte=start_of_month,
    updated_at__lte=now
).aggregate(total=Sum('budget'))['total']

print(f"✓ Готово! Оборот за текущий месяц: {total} руб")
EOF

# Запустить скрипт
docker-compose run --rm backend python fix_orders_dates.py
```

### 8. Запустить контейнеры

```bash
docker-compose up -d
```

### 9. Проверить статус

```bash
docker-compose ps
```

Все контейнеры должны быть в статусе `Up`.

### 10. Проверить логи (если есть проблемы)

```bash
# Логи всех контейнеров
docker-compose logs

# Логи конкретного контейнера
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Следить за логами в реальном времени
docker-compose logs -f backend
```

---

## Быстрое обновление (без пересборки)

Если изменения только в Python коде (без новых зависимостей):

```bash
cd /path/to/OkoZnaniy
docker-compose down
git pull origin main
docker-compose run --rm backend python manage.py migrate
docker-compose up -d
```

---

## Проверка работы ЛК директора

### 1. Проверить API

```bash
# Получить токен
curl -X POST https://your-domain.com/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"your-password"}'

# Проверить оборот
curl https://your-domain.com/api/director/finance/turnover/?period=2026-02 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Проверить в браузере

1. Открыть https://your-domain.com/director
2. Войти как директор
3. Перейти в "Финансовая статистика"
4. Проверить 3 вкладки с графиками

---

## Решение проблем

### Проблема: Контейнеры не запускаются

```bash
# Проверить логи
docker-compose logs

# Пересоздать контейнеры
docker-compose down -v
docker-compose up -d --build
```

### Проблема: Графики пустые

```bash
# Проверить наличие завершенных заказов
docker-compose exec backend python manage.py shell -c "
from apps.orders.models import Order
print(f'Завершенных заказов: {Order.objects.filter(status=\"completed\").count()}')
"

# Обновить даты заказов
docker-compose run --rm backend python fix_orders_dates.py
```

### Проблема: Ошибки миграций

```bash
# Откатить последнюю миграцию
docker-compose run --rm backend python manage.py migrate app_name previous_migration

# Применить заново
docker-compose run --rm backend python manage.py migrate
```

### Проблема: Фронтенд не обновился

```bash
# Пересобрать фронтенд
docker-compose build frontend --no-cache
docker-compose up -d frontend

# Очистить кеш браузера (Ctrl+Shift+R)
```

---

## Мониторинг

### Проверка использования ресурсов

```bash
# Использование CPU и памяти
docker stats

# Размер контейнеров
docker-compose ps -a
```

### Проверка места на диске

```bash
# Общее использование
df -h

# Использование Docker
docker system df

# Очистка неиспользуемых образов
docker system prune -a
```

---

## Бэкап перед обновлением

### 1. Бэкап базы данных

```bash
# Создать дамп БД
docker-compose exec postgres pg_dump -U postgres oko_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Или через docker-compose
docker-compose exec -T postgres pg_dump -U postgres oko_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. Бэкап медиа файлов

```bash
# Архивировать media
tar -czf media_backup_$(date +%Y%m%d_%H%M%S).tar.gz media/
```

### 3. Восстановление из бэкапа

```bash
# Восстановить БД
docker-compose exec -T postgres psql -U postgres oko_db < backup_20260212_120000.sql

# Или из gzip
gunzip -c backup_20260212_120000.sql.gz | docker-compose exec -T postgres psql -U postgres oko_db
```

---

## Автоматизация деплоя

Создать скрипт `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Начало деплоя..."

# Переход в директорию проекта
cd /path/to/OkoZnaniy

# Бэкап БД
echo "📦 Создание бэкапа БД..."
docker-compose exec -T postgres pg_dump -U postgres oko_db | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Остановка контейнеров
echo "⏸️  Остановка контейнеров..."
docker-compose down

# Получение изменений
echo "📥 Получение изменений с GitHub..."
git pull origin main

# Пересборка
echo "🔨 Пересборка контейнеров..."
docker-compose build

# Миграции
echo "🗄️  Применение миграций..."
docker-compose run --rm backend python manage.py migrate

# Запуск
echo "▶️  Запуск контейнеров..."
docker-compose up -d

# Проверка
echo "✅ Проверка статуса..."
docker-compose ps

echo "🎉 Деплой завершен!"
```

Сделать исполняемым:

```bash
chmod +x deploy.sh
```

Запуск:

```bash
./deploy.sh
```

---

## Контакты

При возникновении проблем:
1. Проверить логи: `docker-compose logs`
2. Проверить статус: `docker-compose ps`
3. Проверить документацию: `docs/DIRECTOR_DASHBOARD_CHECK.md`
