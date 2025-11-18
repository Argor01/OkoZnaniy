# 🤖 Telegram Бот в Docker

## ✅ Что сделано

Telegram бот добавлен в Docker Compose и готов к запуску.

## 🚀 Запуск

### Вариант 1: Запуск всех сервисов (включая бота)

```bash
docker-compose up -d
```

Это запустит:
- ✅ Backend (Django)
- ✅ Frontend (React)
- ✅ PostgreSQL
- ✅ Redis
- ✅ Celery
- ✅ Nginx
- ✅ **Telegram Bot** ← Новый сервис!

### Вариант 2: Запуск только бота

```bash
docker-compose up -d telegram-bot
```

### Вариант 3: Локальный запуск (без Docker)

```bash
# Активируйте виртуальное окружение
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Запустите бота
python bot/bot.py
```

## 📊 Проверка работы

### Проверить статус бота

```bash
# Проверить, что контейнер запущен
docker-compose ps telegram-bot

# Посмотреть логи
docker-compose logs -f telegram-bot

# Последние 50 строк логов
docker-compose logs --tail=50 telegram-bot
```

### Проверить в Telegram

1. Откройте Telegram
2. Найдите вашего бота: `@oko_expert_bot`
3. Отправьте команду: `/start`
4. Бот должен ответить приветствием

## 🎯 Команды бота

### Основные команды

- `/start` - Начать работу с ботом (регистрация/обновление данных)
- `/help` - Показать справку
- `/profile` - Посмотреть свой профиль
- `/balance` - Проверить баланс
- `/link` - Получить ссылку для входа на сайт

### Примеры использования

```
Пользователь: /start
Бот: 👋 Привет! Добро пожаловать на платформу OkoZnaniy!
     [Кнопка: 🌐 Открыть сайт]
     [Кнопка: 📱 Войти через Telegram]

Пользователь: /profile
Бот: 👤 Ваш профиль:
     Имя: Иван Иванов
     Username: @ivan
     Роль: Клиент
     ...

Пользователь: /balance
Бот: 💰 Ваш баланс:
     Доступно: 1000 ₽
     Заморожено: 500 ₽
     Всего: 1500 ₽
```

## 🔧 Конфигурация

### Переменные окружения

В `.env` файле:

```env
TELEGRAM_BOT_TOKEN=8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo
FRONTEND_URL=http://localhost:3000
```

В `docker-compose.yml`:

```yaml
telegram-bot:
  environment:
    - BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    - FRONTEND_URL=http://localhost:3000
```

### Для продакшена

Обновите `FRONTEND_URL` на реальный домен:

```env
FRONTEND_URL=https://yourdomain.com
```

## 🔍 Отладка

### Проблема: Бот не отвечает

```bash
# Проверьте логи
docker-compose logs telegram-bot

# Проверьте, что контейнер запущен
docker-compose ps telegram-bot

# Перезапустите бота
docker-compose restart telegram-bot
```

### Проблема: Ошибка "BOT_TOKEN не установлен"

```bash
# Проверьте .env файл
cat .env | grep TELEGRAM_BOT_TOKEN

# Перезапустите с новыми переменными
docker-compose down
docker-compose up -d
```

### Проблема: Бот не создает пользователей

```bash
# Проверьте подключение к БД
docker-compose exec telegram-bot python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.users.models import User
print(f'Пользователей в БД: {User.objects.count()}')
"
```

## 📝 Логи

### Просмотр логов в реальном времени

```bash
# Все логи бота
docker-compose logs -f telegram-bot

# С временными метками
docker-compose logs -f -t telegram-bot

# Последние 100 строк
docker-compose logs --tail=100 telegram-bot
```

### Типичные логи

**Успешный запуск:**
```
telegram-bot_1  | INFO:__main__:Запуск Telegram бота...
telegram-bot_1  | INFO:__main__:Bot token: 8584999235:AAGKcP0n...
telegram-bot_1  | INFO:__main__:Website URL: http://localhost:3000
telegram-bot_1  | INFO:__main__:Вебхук удален
telegram-bot_1  | INFO:__main__:Начинаем polling...
```

**Новый пользователь:**
```
telegram-bot_1  | INFO:__main__:Новый пользователь создан: ivan (telegram_id: 123456789)
```

**Обновление пользователя:**
```
telegram-bot_1  | INFO:__main__:Пользователь обновлен: ivan (telegram_id: 123456789)
```

## 🔄 Обновление бота

### После изменения кода

```bash
# Перезапустите контейнер
docker-compose restart telegram-bot

# Или пересоберите образ
docker-compose build telegram-bot
docker-compose up -d telegram-bot
```

### После изменения зависимостей

```bash
# Пересоберите образ
docker-compose build --no-cache telegram-bot
docker-compose up -d telegram-bot
```

## 🎯 Интеграция с авторизацией

### Как это работает вместе

1. **Пользователь открывает бота** → `/start`
2. **Бот сохраняет telegram_id** в базу данных
3. **Пользователь открывает сайт** → Нажимает "Login with Telegram"
4. **Telegram Widget** → Подтверждение
5. **Backend проверяет данные** → Находит пользователя по telegram_id
6. **Пользователь авторизован** ✅

### Два способа авторизации

**Способ 1: Через бота (команды)**
- Пользователь общается с ботом
- Получает информацию о профиле, балансе
- Переходит на сайт по кнопке

**Способ 2: Через сайт (Widget)**
- Пользователь открывает сайт
- Нажимает "Login with Telegram"
- Авторизуется через Telegram Widget

Оба способа используют один `telegram_id` для идентификации пользователя.

## 📊 Мониторинг

### Статистика бота

```bash
# Количество пользователей с Telegram ID
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
count = User.objects.filter(telegram_id__isnull=False).count()
print(f'Пользователей с Telegram: {count}')
"

# Последние пользователи
docker-compose exec backend python manage.py shell -c "
from apps.users.models import User
users = User.objects.filter(telegram_id__isnull=False).order_by('-date_joined')[:5]
for u in users:
    print(f'{u.username} - {u.telegram_id}')
"
```

### Использование ресурсов

```bash
# Статистика контейнера
docker stats telegram-bot

# Использование памяти
docker stats telegram-bot --no-stream --format "table {{.Container}}\t{{.MemUsage}}"
```

## 🚀 Продакшен

### Рекомендации

1. **Используйте webhook вместо polling** (быстрее и эффективнее)
2. **Настройте логирование** в файл
3. **Добавьте мониторинг** (Prometheus, Grafana)
4. **Настройте автоперезапуск** при ошибках
5. **Используйте rate limiting** для команд

### Webhook (для продакшена)

```python
# В bot/bot.py замените polling на webhook
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web

WEBHOOK_URL = f"https://yourdomain.com/webhook/{BOT_TOKEN}"

async def on_startup(bot: Bot):
    await bot.set_webhook(WEBHOOK_URL)

async def main():
    app = web.Application()
    webhook_requests_handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
    webhook_requests_handler.register(app, path=f"/webhook/{BOT_TOKEN}")
    setup_application(app, dp, bot=bot)
    
    await on_startup(bot)
    web.run_app(app, host="0.0.0.0", port=8443)
```

## ✅ Чеклист

- [x] Бот добавлен в docker-compose.yml
- [x] Код бота обновлен
- [x] Команды реализованы
- [x] Интеграция с User моделью
- [x] Логирование настроено
- [x] Бот запущен в Docker ✅
- [ ] Протестированы команды (откройте @oko_expert_bot в Telegram)
- [ ] Проверена интеграция с авторизацией

## 🎉 Готово!

Telegram бот готов к запуску в Docker!

**Запустите:**
```bash
docker-compose up -d telegram-bot
```

**Проверьте:**
```bash
docker-compose logs -f telegram-bot
```

**Протестируйте:**
Откройте `@oko_expert_bot` в Telegram и отправьте `/start`

---

**Токен бота:** `8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo`  
**Username бота:** `@oko_expert_bot`
