# Исправление CORS ошибки на хостинге

## Проблема
Фронтенд обращается к `localhost:8000` вместо `45.12.239.226`, что вызывает CORS ошибку.

## Что исправлено

1. ✅ **config/settings.py** - добавлен IP хостинга в CORS_ALLOWED_ORIGINS
2. ✅ **frontend-react/src/api/client.ts** - API URL теперь берется из переменной окружения
3. ✅ **frontend-react/.env.production** - установлен правильный API URL

## Команды для обновления на хостинге

### 1. Подключитесь к серверу
```bash
ssh root@45.12.239.226
cd ~/OkoZnaniy
```

### 2. Получите последние изменения
```bash
git pull
```

### 3. Пересоберите и перезапустите контейнеры
```bash
docker-compose down
docker-compose up -d --build
```

### 4. Проверьте логи
```bash
# Проверьте что все контейнеры запустились
docker-compose ps

# Посмотрите логи backend
docker-compose logs backend | tail -50

# Посмотрите логи frontend
docker-compose logs frontend | tail -50
```

### 5. Проверьте в браузере
Откройте http://45.12.239.226 и попробуйте авторизоваться через Telegram

## Если проблема осталась

### Проверьте переменные окружения
```bash
# Убедитесь что в .env файле правильные настройки
cat .env | grep FRONTEND_URL
# Должно быть: FRONTEND_URL=http://45.12.239.226

cat .env | grep ALLOWED_HOSTS
# Должно содержать: 45.12.239.226
```

### Очистите кеш Docker
```bash
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### Проверьте CORS в Django
```bash
docker-compose exec backend python manage.py shell
```

В shell выполните:
```python
from django.conf import settings
print(settings.CORS_ALLOWED_ORIGINS)
# Должно содержать: 'http://45.12.239.226'
```

### Проверьте что фронтенд использует правильный API URL
Откройте в браузере http://45.12.239.226 и в консоли разработчика (F12) выполните:
```javascript
console.log(import.meta.env.VITE_API_URL)
// Должно быть: http://45.12.239.226
```

## Дополнительно: Проверка CORS заголовков

Проверьте что сервер отдает правильные CORS заголовки:
```bash
curl -I -X OPTIONS http://45.12.239.226/api/users/token/ \
  -H "Origin: http://45.12.239.226" \
  -H "Access-Control-Request-Method: POST"
```

Должны быть заголовки:
- `Access-Control-Allow-Origin: http://45.12.239.226`
- `Access-Control-Allow-Credentials: true`

## Если нужно разрешить все origins (временно для отладки)

В `config/settings.py` измените:
```python
CORS_ALLOW_ALL_ORIGINS = True  # Только для отладки!
```

Затем перезапустите backend:
```bash
docker-compose restart backend
```

**ВАЖНО:** Не оставляйте `CORS_ALLOW_ALL_ORIGINS = True` в продакшене!
