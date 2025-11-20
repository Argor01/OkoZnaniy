# Перезапуск Docker контейнеров

## ✅ Что изменено

### 1. В `.env`:
```env
FRONTEND_URL=http://localhost:5173
```

### 2. В `docker-compose.yml`:
```yaml
# Backend
- FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}
- LOGIN_REDIRECT_URL=${FRONTEND_URL:-http://localhost:5173}/expert

# Frontend
ports:
  - "5173:80"  # Было: "3000:80"
```

## 🔄 Как перезапустить Docker

### Вариант 1: Полный перезапуск (рекомендуется)

```bash
# Остановить все контейнеры
docker-compose down

# Пересобрать и запустить
docker-compose up -d --build
```

### Вариант 2: Перезапуск без пересборки

```bash
# Перезапустить только backend
docker-compose restart backend

# Перезапустить только frontend
docker-compose restart frontend
```

### Вариант 3: Пересборка конкретного сервиса

```bash
# Пересобрать и перезапустить backend
docker-compose up -d --build backend

# Пересобрать и перезапустить frontend
docker-compose up -d --build frontend
```

## 📊 Проверка статуса

### Проверить запущенные контейнеры:
```bash
docker-compose ps
```

Должно быть:
```
NAME                STATUS              PORTS
backend             Up                  0.0.0.0:8000->8000/tcp
frontend            Up                  0.0.0.0:5173->80/tcp
postgres            Up                  0.0.0.0:5432->5432/tcp
redis               Up                  0.0.0.0:6379->6379/tcp
nginx               Up                  0.0.0.0:80->80/tcp
celery              Up
```

### Проверить логи:
```bash
# Все логи
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

## 🎯 Порты после изменений

| Сервис | Порт | URL | Назначение |
|--------|------|-----|------------|
| **Frontend** | **5173** | **http://localhost:5173/** | **React UI** |
| Backend | 8000 | http://localhost:8000/ | Django API |
| Nginx | 80 | http://localhost/ | Reverse proxy |
| Postgres | 5432 | localhost:5432 | База данных |
| Redis | 6379 | localhost:6379 | Кэш/очереди |

## ✅ Проверка работы

### 1. Проверьте, что контейнеры запущены:
```bash
docker-compose ps
```

### 2. Откройте браузер:
```
http://localhost:5173/
```

### 3. Авторизуйтесь через Google:
1. Нажмите "Войти через Google"
2. Выберите аккаунт
3. **Проверьте URL** - должно быть `http://localhost:5173/expert`
4. Должен открыться ExpertDashboard с крутым сайдбаром

## 🐛 Решение проблем

### Порт 5173 уже занят

```bash
# Проверить, что использует порт
netstat -ano | findstr :5173

# Остановить контейнеры
docker-compose down

# Запустить снова
docker-compose up -d
```

### Контейнер не запускается

```bash
# Посмотреть логи
docker-compose logs backend
docker-compose logs frontend

# Пересобрать с нуля
docker-compose down -v
docker-compose up -d --build
```

### Старая версия в браузере

```bash
# Очистить кэш Docker
docker-compose down
docker system prune -a

# Пересобрать
docker-compose up -d --build
```

В браузере:
1. Ctrl+Shift+Delete (очистить кэш)
2. Ctrl+Shift+R (Hard Reload)
3. Ctrl+Shift+N (режим инкогнито)

### Frontend показывает 404

```bash
# Проверить логи frontend
docker-compose logs frontend

# Перезапустить frontend
docker-compose restart frontend

# Или пересобрать
docker-compose up -d --build frontend
```

## 📝 Переменные окружения

Docker будет использовать переменные из `.env`:

```env
# Основные
FRONTEND_URL=http://localhost:5173
SECRET_KEY=...
DEBUG=True
DJANGO_ENV=development

# База данных
POSTGRES_PASSWORD=postgres123
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/oko_db

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email
EMAIL_HOST_USER=YanBrait@yandex.ru
EMAIL_HOST_PASSWORD=...
```

## 🔍 Проверка переменных в контейнере

```bash
# Зайти в контейнер backend
docker-compose exec backend bash

# Проверить переменные
echo $FRONTEND_URL
# Должно быть: http://localhost:5173

# Выйти
exit
```

## 📚 Полезные команды

```bash
# Остановить все
docker-compose down

# Запустить все
docker-compose up -d

# Пересобрать все
docker-compose up -d --build

# Посмотреть логи
docker-compose logs -f

# Перезапустить сервис
docker-compose restart backend

# Зайти в контейнер
docker-compose exec backend bash

# Удалить все (включая volumes)
docker-compose down -v

# Очистить систему Docker
docker system prune -a
```

## ✅ Итоговый чеклист

После перезапуска Docker:

- [ ] `docker-compose ps` показывает все контейнеры Up
- [ ] http://localhost:5173/ открывается
- [ ] http://localhost:8000/api/ работает
- [ ] Google авторизация перенаправляет на http://localhost:5173/expert
- [ ] ExpertDashboard показывает крутой сайдбар
- [ ] Данные загружаются из БД

## 🎉 Готово!

После выполнения команды:
```bash
docker-compose down && docker-compose up -d --build
```

Откройте http://localhost:5173/ и проверьте работу!
