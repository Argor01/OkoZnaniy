# Настройка авторизации через Telegram бота

## 1. Настройка Telegram бота

### Шаг 1: Получение токена бота
Токен уже получен: `8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo`

### Шаг 2: Настройка домена для Telegram Login Widget

Откройте чат с [@BotFather](https://t.me/BotFather) и выполните следующие команды:

```
/setdomain
@oko_expert_bot
localhost
```

Для продакшена замените `localhost` на ваш реальный домен (например, `example.com`).

### Шаг 3: Настройка имени бота (если еще не настроено)

```
/mybots
@oko_expert_bot
Bot Settings
Edit Bot
Username
```

Убедитесь, что username бота - `oko_expert_bot`.

## 2. Настройка Backend (Django)

### Переменные окружения

Токен бота уже добавлен в `.env`:

```env
TELEGRAM_BOT_TOKEN=8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo
```

### API Endpoint

Создан endpoint для авторизации:

```
POST /api/users/telegram_auth/
```

**Тело запроса:**
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "photo_url": "https://...",
  "auth_date": 1234567890,
  "hash": "abc123..."
}
```

**Ответ при успехе:**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "",
    "role": "client",
    "telegram_id": 123456789,
    ...
  }
}
```

## 3. Настройка Frontend (React)

### Компонент TelegramLoginButton

Создан компонент `TelegramLoginButton.tsx` в `frontend-react/src/components/auth/`.

### Использование компонента

```tsx
import TelegramLoginButton from '../components/auth/TelegramLoginButton';

<TelegramLoginButton
  botName="oko_expert_bot"
  buttonSize="large"
  cornerRadius={10}
  requestAccess={true}
  usePic={true}
  lang="ru"
  onAuth={(user) => {
    console.log('Авторизован:', user);
    // Перенаправление пользователя
  }}
  onError={(error) => {
    console.error('Ошибка:', error);
  }}
/>
```

### Пример страницы

Создан пример страницы `TelegramAuthExample.tsx` в `frontend-react/src/pages/`.

## 4. Как это работает

1. **Пользователь нажимает кнопку "Login with Telegram"**
   - Открывается Telegram Widget
   - Пользователь подтверждает авторизацию в Telegram

2. **Telegram возвращает данные пользователя**
   - Данные включают: id, first_name, last_name, username, photo_url, auth_date, hash

3. **Frontend отправляет данные на backend**
   - POST запрос на `/api/users/telegram_auth/`

4. **Backend проверяет подлинность данных**
   - Проверяет hash с использованием токена бота
   - Проверяет время авторизации (не старше 24 часов)

5. **Backend создает или находит пользователя**
   - Ищет пользователя по `telegram_id`
   - Если не найден, создает нового пользователя
   - Обновляет данные пользователя

6. **Backend возвращает JWT токены**
   - Access token для API запросов
   - Refresh token для обновления access token

7. **Frontend сохраняет токены**
   - Сохраняет в localStorage
   - Перенаправляет пользователя в личный кабинет

## 5. Безопасность

- ✅ Проверка подлинности данных через HMAC-SHA256
- ✅ Проверка времени авторизации (не старше 24 часов)
- ✅ Использование JWT токенов для API
- ✅ Токен бота хранится только на сервере

## 6. Тестирование

### Локальное тестирование

1. Запустите backend:
```bash
python manage.py runserver
```

2. Запустите frontend:
```bash
cd frontend-react
npm run dev
```

3. Откройте страницу с Telegram Login Button

4. Нажмите кнопку и авторизуйтесь через Telegram

### Важно для локального тестирования

Telegram Login Widget работает только на доменах, зарегистрированных в BotFather. Для локального тестирования:

1. Добавьте `localhost` в `/setdomain` у BotFather
2. Или используйте ngrok для создания публичного URL:
```bash
ngrok http 3000
```

## 7. Миграция базы данных

Поле `telegram_id` уже добавлено в модель User. Если нужно применить миграции:

```bash
python manage.py makemigrations
python manage.py migrate
```

## 8. Интеграция в существующую страницу логина

Добавьте компонент на страницу логина:

```tsx
import TelegramLoginButton from '../components/auth/TelegramLoginButton';

// В вашем компоненте логина
<div className="telegram-login">
  <TelegramLoginButton
    botName="oko_expert_bot"
    onAuth={handleTelegramAuth}
    onError={handleTelegramError}
  />
</div>
```

## 9. Дополнительные возможности

### Привязка Telegram к существующему аккаунту

Можно добавить функционал привязки Telegram к существующему аккаунту:

```python
@action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
def link_telegram(self, request):
    """Привязать Telegram к текущему аккаунту"""
    telegram_data = request.data
    
    if not verify_telegram_auth(telegram_data):
        return Response({'error': 'Неверные данные'}, status=400)
    
    telegram_id = telegram_data.get('id')
    
    # Проверяем, не привязан ли этот Telegram к другому аккаунту
    if User.objects.filter(telegram_id=telegram_id).exclude(id=request.user.id).exists():
        return Response({'error': 'Этот Telegram уже привязан к другому аккаунту'}, status=400)
    
    # Привязываем
    request.user.telegram_id = telegram_id
    request.user.save()
    
    return Response({'message': 'Telegram успешно привязан'})
```

## 10. Troubleshooting

### Ошибка "Bot domain invalid"
- Убедитесь, что домен добавлен в BotFather через `/setdomain`

### Ошибка "Invalid hash"
- Проверьте, что токен бота правильно указан в `.env`
- Проверьте, что данные не были изменены

### Кнопка не отображается
- Проверьте, что скрипт Telegram Widget загружается
- Проверьте консоль браузера на ошибки
- Убедитесь, что `botName` указан правильно

### Пользователь не создается
- Проверьте логи Django
- Убедитесь, что миграции применены
- Проверьте, что endpoint доступен
