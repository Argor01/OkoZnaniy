# 🐳 Ngrok через Docker

Ngrok интегрирован в docker-compose для удобной локальной разработки с Telegram Login Widget.

## 🚀 Быстрый старт

### 1. Получите Ngrok Authtoken

1. Зарегистрируйтесь на https://dashboard.ngrok.com/signup
2. Получите authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Скопируйте токен

### 2. Добавьте токен в .env

Откройте `.env` и замените:

```env
NGROK_AUTHTOKEN=your_ngrok_authtoken_here
```

На ваш реальный токен:

```env
NGROK_AUTHTOKEN=2abc123def456ghi789jkl0mno1pqr2stu3vwx4yz5
```

### 3. Запустите ngrok

```bash
docker-compose --profile dev up -d ngrok
```

### 4. Получите публичные URL

Откройте Web UI ngrok: http://localhost:4040

Или посмотрите логи:

```bash
docker-compose logs ngrok
```

Вы увидите что-то вроде:

```
frontend: https://abc123.ngrok.io -> http://frontend:80
backend:  https://def456.ngrok.io -> http://backend:8000
```

### 5. Настройте Telegram Bot

В BotFather отправьте:

```
/setdomain
@oko_expert_bot
abc123.ngrok.io
```

⚠️ Используйте домен БЕЗ `https://` и БЕЗ пути

### 6. Обновите CORS

Добавьте ngrok URL в `config/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://abc123.ngrok.io",  # Ваш ngrok URL для frontend
]
```

Перезапустите backend:

```bash
docker-compose restart backend
```

### 7. Откройте приложение

Откройте в браузере: `https://abc123.ngrok.io`

Теперь Telegram Login Widget будет работать!

## 📊 Web UI

Ngrok предоставляет веб-интерфейс на http://localhost:4040

Здесь можно:
- ✅ Просматривать все HTTP запросы в реальном времени
- ✅ Повторять запросы для отладки
- ✅ Видеть заголовки и тела запросов/ответов
- ✅ Фильтровать запросы

## 🛠️ Команды

### Запустить ngrok

```bash
docker-compose --profile dev up -d ngrok
```

### Остановить ngrok

```bash
docker-compose stop ngrok
```

### Посмотреть логи

```bash
docker-compose logs -f ngrok
```

### Перезапустить ngrok

```bash
docker-compose restart ngrok
```

### Удалить ngrok

```bash
docker-compose --profile dev down ngrok
```

## ⚙️ Конфигурация

Файл конфигурации: `docker/ngrok/ngrok.yml`

### Два туннеля

По умолчанию создаются два туннеля:

1. **Frontend** (`frontend:80`) - для React приложения
2. **Backend** (`backend:8000`) - для Django API

### Фиксированный поддомен (Платный план)

Если у вас платный план ngrok, можете использовать фиксированный поддомен.

Отредактируйте `docker/ngrok/ngrok.yml`:

```yaml
tunnels:
  frontend:
    proto: http
    addr: frontend:80
    subdomain: myapp  # Ваш поддомен
  
  backend:
    proto: http
    addr: backend:8000
    subdomain: myapp-api  # Ваш поддомен для API
```

Тогда URL всегда будут:
- Frontend: `https://myapp.ngrok.io`
- Backend: `https://myapp-api.ngrok.io`

### Только frontend туннель

Если нужен только frontend, отредактируйте `docker/ngrok/ngrok.yml`:

```yaml
tunnels:
  frontend:
    proto: http
    addr: frontend:80
    inspect: true
    schemes:
      - https
```

Удалите секцию `backend`.

## 🔧 Интеграция с проектом

### Автоматический запуск при разработке

Создайте отдельный compose файл `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  ngrok:
    profiles: []  # Убираем профиль, чтобы запускался всегда
```

Запускайте:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Переменные окружения с ngrok URL

После запуска ngrok можно автоматически обновлять переменные окружения.

Создайте скрипт `get-ngrok-url.sh`:

```bash
#!/bin/bash
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "VITE_API_URL=$NGROK_URL"
```

## 🐛 Отладка

### Ngrok не запускается

**Проблема:** Container exits immediately

**Решение:**
1. Проверьте authtoken в `.env`
2. Проверьте логи: `docker-compose logs ngrok`
3. Убедитесь, что токен валидный

### "ERR_NGROK_108"

**Проблема:** Превышен лимит бесплатного плана (1 агент онлайн)

**Решение:**
1. Закройте другие ngrok процессы
2. Или используйте платный план

### CORS ошибки

**Проблема:** Backend не принимает запросы с ngrok домена

**Решение:**
1. Добавьте ngrok URL в `CORS_ALLOWED_ORIGINS`
2. Перезапустите backend: `docker-compose restart backend`

### Туннель не отображается в Web UI

**Проблема:** Web UI пустой

**Решение:**
1. Подождите 5-10 секунд после запуска
2. Обновите страницу
3. Проверьте логи: `docker-compose logs ngrok`

## 📝 Примеры использования

### Тестирование Telegram авторизации

```bash
# 1. Запустите ngrok
docker-compose --profile dev up -d ngrok

# 2. Получите URL
docker-compose logs ngrok | grep "url="

# 3. Настройте BotFather
# /setdomain -> @oko_expert_bot -> abc123.ngrok.io

# 4. Обновите CORS и перезапустите backend
docker-compose restart backend

# 5. Откройте https://abc123.ngrok.io/login
```

### Тестирование вебхуков

```bash
# Получите backend URL
docker-compose logs ngrok | grep "backend"

# Используйте URL для настройки вебхуков
# Например: https://def456.ngrok.io/api/webhooks/telegram
```

### Демонстрация клиенту

```bash
# Запустите ngrok
docker-compose --profile dev up -d ngrok

# Отправьте клиенту ngrok URL
# Клиент может открыть приложение из любой точки мира
```

## 🔒 Безопасность

### Базовая аутентификация

Добавьте в `docker/ngrok/ngrok.yml`:

```yaml
tunnels:
  frontend:
    proto: http
    addr: frontend:80
    auth: "username:password"
```

### IP Whitelist (Платный план)

```yaml
tunnels:
  frontend:
    proto: http
    addr: frontend:80
    ip_restriction:
      allow_cidrs:
        - "1.2.3.4/32"
```

## 💰 Бесплатный vs Платный план

### Бесплатный план

✅ 1 агент онлайн  
✅ 40 подключений/минуту  
✅ Случайные URL  
✅ HTTP/HTTPS туннели  

### Платный план ($8/месяц)

✅ 3+ агента онлайн  
✅ Фиксированные поддомены  
✅ Больше подключений  
✅ IP Whitelist  
✅ Базовая аутентификация  

## 🔗 Полезные ссылки

- [Ngrok Dashboard](https://dashboard.ngrok.com/)
- [Ngrok Documentation](https://ngrok.com/docs)
- [Ngrok Docker Image](https://hub.docker.com/r/ngrok/ngrok)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)

---

**Теперь вы можете тестировать Telegram авторизацию локально без установки ngrok на хост-машину!** 🎉
