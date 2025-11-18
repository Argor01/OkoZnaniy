# 🔄 Схема работы Telegram авторизации

## Визуальная схема

```
┌─────────────┐
│  Пользователь │
└──────┬──────┘
       │
       │ 1. Нажимает кнопку "Login with Telegram"
       ▼
┌─────────────────────┐
│  Telegram Widget    │
│  (telegram.org)     │
└──────┬──────────────┘
       │
       │ 2. Запрашивает подтверждение
       ▼
┌─────────────────────┐
│  Telegram App       │
│  (Мобильное/Desktop)│
└──────┬──────────────┘
       │
       │ 3. Пользователь подтверждает
       ▼
┌─────────────────────┐
│  Telegram Widget    │
│  Возвращает данные: │
│  - id               │
│  - first_name       │
│  - username         │
│  - auth_date        │
│  - hash (HMAC)      │
└──────┬──────────────┘
       │
       │ 4. Callback в браузере
       ▼
┌─────────────────────┐
│  Frontend (React)   │
│  TelegramLoginButton│
└──────┬──────────────┘
       │
       │ 5. POST /api/users/telegram_auth/
       │    {id, first_name, username, hash, ...}
       ▼
┌─────────────────────┐
│  Backend (Django)   │
│  telegram_auth.py   │
└──────┬──────────────┘
       │
       │ 6. Проверка подлинности
       │    verify_telegram_auth()
       │    - Проверка hash (HMAC-SHA256)
       │    - Проверка времени (< 24 часов)
       ▼
┌─────────────────────┐
│  База данных        │
│  PostgreSQL         │
└──────┬──────────────┘
       │
       │ 7. Поиск/создание пользователя
       │    get_or_create_telegram_user()
       │    - Поиск по telegram_id
       │    - Создание нового User если не найден
       │    - Обновление данных
       ▼
┌─────────────────────┐
│  JWT Tokens         │
│  generate_tokens()  │
└──────┬──────────────┘
       │
       │ 8. Возврат токенов
       │    {access, refresh, user}
       ▼
┌─────────────────────┐
│  Frontend (React)   │
│  - Сохранение токенов│
│  - Сохранение user  │
└──────┬──────────────┘
       │
       │ 9. Редирект в личный кабинет
       ▼
┌─────────────────────┐
│  Dashboard          │
│  Пользователь       │
│  авторизован ✅     │
└─────────────────────┘
```

## Детальное описание шагов

### Шаг 1: Инициация авторизации
```tsx
// Пользователь видит кнопку
<TelegramLoginButton botName="oko_expert_bot" />
```

### Шаг 2-3: Telegram Widget
```javascript
// Telegram Widget загружается из telegram.org
<script src="https://telegram.org/js/telegram-widget.js?22">
// Открывается окно подтверждения в Telegram
```

### Шаг 4: Получение данных
```javascript
// Callback функция получает данные
window.onTelegramAuth = (user) => {
  // user = {id, first_name, username, hash, ...}
}
```

### Шаг 5: Отправка на backend
```javascript
// POST запрос на API
axios.post('/api/users/telegram_auth/', {
  id: 123456789,
  first_name: "John",
  username: "johndoe",
  auth_date: 1234567890,
  hash: "abc123..."
})
```

### Шаг 6: Проверка подлинности
```python
# Backend проверяет hash
def verify_telegram_auth(auth_data):
    # 1. Создаем строку для проверки
    check_data = {k: v for k, v in auth_data.items() if k != 'hash'}
    data_check_string = '\n'.join([f'{k}={v}' for k, v in sorted(check_data.items())])
    
    # 2. Создаем секретный ключ из токена бота
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # 3. Вычисляем hash
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    # 4. Сравниваем с полученным hash
    return calculated_hash == received_hash
```

### Шаг 7: Создание/поиск пользователя
```python
# Поиск по telegram_id
try:
    user = User.objects.get(telegram_id=telegram_id)
    # Обновляем данные
    user.first_name = telegram_data['first_name']
    user.save()
except User.DoesNotExist:
    # Создаем нового пользователя
    user = User.objects.create(
        username=telegram_data['username'],
        telegram_id=telegram_id,
        role='client'
    )
```

### Шаг 8: Генерация JWT токенов
```python
# Создаем токены
refresh = RefreshToken.for_user(user)
return {
    'access': str(refresh.access_token),
    'refresh': str(refresh),
}
```

### Шаг 9: Сохранение и редирект
```javascript
// Сохраняем токены
localStorage.setItem('access_token', access);
localStorage.setItem('refresh_token', refresh);
localStorage.setItem('user', JSON.stringify(user));

// Перенаправляем
navigate('/dashboard');
```

## Безопасность на каждом шаге

### 🔒 Шаг 1-3: Telegram Widget
- ✅ Официальный виджет от Telegram
- ✅ HTTPS соединение
- ✅ Подтверждение в официальном приложении

### 🔒 Шаг 4-5: Передача данных
- ✅ Hash для проверки подлинности
- ✅ Timestamp для проверки актуальности
- ✅ HTTPS для защиты при передаче

### 🔒 Шаг 6: Проверка на backend
- ✅ HMAC-SHA256 с секретным ключом
- ✅ Проверка времени (не старше 24 часов)
- ✅ Токен бота хранится только на сервере

### 🔒 Шаг 7-8: База данных и токены
- ✅ Безопасное хранение в PostgreSQL
- ✅ JWT токены с коротким сроком жизни
- ✅ Refresh токены для обновления

### 🔒 Шаг 9: Клиент
- ✅ Токены в localStorage (HttpOnly cookies лучше для продакшена)
- ✅ Автоматическое обновление токенов
- ✅ Защита от CSRF

## Обработка ошибок

```
┌─────────────────┐
│  Любой шаг      │
└────────┬────────┘
         │
         │ Ошибка?
         ▼
    ┌────────┐
    │  Да    │
    └───┬────┘
        │
        ▼
┌───────────────────┐
│  Логирование      │
│  console.error()  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Уведомление      │
│  пользователя     │
│  onError callback │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Возврат на       │
│  страницу логина  │
└───────────────────┘
```

## Типичные сценарии

### Сценарий 1: Новый пользователь
```
Telegram ID не найден → Создание User → Генерация токенов → Вход
```

### Сценарий 2: Существующий пользователь
```
Telegram ID найден → Обновление данных → Генерация токенов → Вход
```

### Сценарий 3: Неверный hash
```
Hash не совпадает → Ошибка 400 → Уведомление пользователя
```

### Сценарий 4: Устаревшие данные
```
auth_date > 24 часов → Ошибка 400 → Повторная авторизация
```

## Производительность

### Время выполнения
- Шаг 1-3: ~2-5 секунд (зависит от пользователя)
- Шаг 4-5: ~100-300 мс (сетевой запрос)
- Шаг 6: ~1-5 мс (проверка hash)
- Шаг 7: ~10-50 мс (запрос к БД)
- Шаг 8: ~1-5 мс (генерация JWT)
- Шаг 9: ~50-100 мс (сохранение и редирект)

**Общее время:** ~3-6 секунд (большая часть - ожидание пользователя)

## Масштабируемость

- ✅ Stateless авторизация (JWT)
- ✅ Кэширование не требуется
- ✅ Горизонтальное масштабирование backend
- ✅ CDN для Telegram Widget
- ✅ Connection pooling для БД

## Мониторинг

### Метрики для отслеживания
- Количество успешных авторизаций
- Количество ошибок (по типам)
- Время выполнения каждого шага
- Количество новых vs существующих пользователей

### Логирование
```python
# Backend
logger.info(f"Telegram auth: user_id={user.id}, telegram_id={telegram_id}")
logger.error(f"Telegram auth failed: {error}")

# Frontend
console.log('Telegram auth success:', user);
console.error('Telegram auth error:', error);
```
