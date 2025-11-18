# 🧪 Тест Telegram кнопки

## Быстрый тест

### Вариант 1: Тестовая страница

1. Откройте файл `test_telegram_button.html` в браузере:
```
file:///путь/к/проекту/test_telegram_button.html
```

2. Или запустите через Python:
```bash
python -m http.server 8080
```
Затем откройте: `http://localhost:8080/test_telegram_button.html`

3. Следуйте инструкциям на странице

### Вариант 2: Основная страница

1. Откройте: `http://localhost:3000/login`
2. Откройте консоль браузера (F12)
3. Нажмите на кнопку "Login with Telegram"
4. Проверьте логи в консоли

## Что проверить

### 1. Домен настроен?

Откройте [@BotFather](https://t.me/BotFather):
```
/mybots
@oko_expert_bot
Bot Settings
Domain
```

Должно быть: `localhost`

### 2. Кнопка появилась?

- ✅ Да → Домен настроен правильно
- ❌ Нет → Настройте домен в BotFather

### 3. При нажатии открывается Telegram?

- ✅ Да → Всё работает
- ❌ Нет → Проверьте консоль браузера

### 4. После подтверждения происходит редирект?

- ✅ Да → Отлично!
- ❌ Нет → Проверьте логи в консоли

## Логи в консоли

Должны быть:
```
[TelegramLoginButton] Initializing with botName: oko_expert_bot
[TelegramLoginButton] Widget script added to DOM
[TelegramLoginButton] Telegram widget script loaded successfully
```

После нажатия и подтверждения:
```
[TelegramLoginButton] Telegram auth callback received: {...}
[TelegramLoginButton] Sending request to: http://localhost:8000/api/users/telegram_auth/
[TelegramLoginButton] Backend response: {...}
[TelegramLoginButton] Tokens saved, calling onAuth callback
```

## Если не работает

### Шаг 1: Настройте домен

```
/setdomain
@oko_expert_bot
localhost
```

### Шаг 2: Очистите кэш браузера

1. Ctrl+Shift+Delete
2. Очистить кэш
3. Обновить страницу (Ctrl+F5)

### Шаг 3: Проверьте backend

```bash
curl http://localhost:8000/api/users/telegram_auth/
```

Должен вернуть: `{"detail":"Method \"GET\" not allowed."}`

### Шаг 4: Проверьте логи backend

```bash
docker-compose logs -f backend
```

## 📚 Документация

- [TELEGRAM_DEBUG.md](./TELEGRAM_DEBUG.md) - Подробная отладка
- [TELEGRAM_SETUP_BOTFATHER.md](./TELEGRAM_SETUP_BOTFATHER.md) - Настройка BotFather
- [TELEGRAM_КНОПКА_ГОТОВА.md](./TELEGRAM_КНОПКА_ГОТОВА.md) - Инструкция

---

**Токен бота:** `8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo`  
**Username бота:** `@oko_expert_bot`
