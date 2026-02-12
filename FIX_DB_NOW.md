# 🚨 БЫСТРОЕ ИСПРАВЛЕНИЕ ОШИБКИ БД

## Проблема
```
psycopg2.OperationalError: password authentication failed for user "postgres"
```

## Решение за 30 секунд

### На сервере выполните:

```bash
cd ~/OkoZnaniy
chmod +x quick_fix_db.sh
./quick_fix_db.sh
```

Скрипт автоматически:
1. Изменит пароль PostgreSQL на `postgres123`
2. Обновит `.env` файл
3. Перезапустит сервисы
4. Применит миграции

---

## Альтернативное решение (вручную)

### Шаг 1: Изменить пароль в PostgreSQL
```bash
docker-compose exec postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres123';"
```

### Шаг 2: Обновить .env файл
```bash
nano .env
```

Найдите и измените:
```
POSTGRES_PASSWORD=postgres123
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/oko_db
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

### Шаг 3: Перезапустить сервисы
```bash
docker-compose restart backend celery telegram-bot
```

### Шаг 4: Применить миграции
```bash
docker-compose exec backend python manage.py migrate
```

---

## Проверка

```bash
# Статус контейнеров
docker-compose ps

# Логи backend
docker-compose logs -f backend

# Проверка подключения к БД
docker-compose exec backend python manage.py dbshell
```

Если всё работает, вы увидите приглашение PostgreSQL: `oko_db=#`

Выйти: `\q`

---

## После исправления

Запустите скрипт обновления дат для графиков директора:

```bash
docker-compose exec backend python fix_orders_dates.py
```

Затем проверьте вход как директор на сайте.
