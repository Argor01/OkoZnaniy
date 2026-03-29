# Быстрый старт: Форма отправки email

## Что было сделано

Реализован функционал отправки инструкции по регистрации на email через форму обратной связи на лендинге.

## Файлы

### Backend
- `apps/notifications/services.py` - EmailService для отправки писем (2 метода)
  - `send_registration_instructions()` - для экспертов
  - `send_partner_instructions()` - для партнеров
- `apps/notifications/views.py` - API endpoints
  - `send_registration_email` - отправка инструкции по регистрации
  - `send_partner_email` - отправка информации о партнерской программе
- `apps/notifications/urls.py` - маршруты
  - `/send-registration-email/`
  - `/send-partner-email/`
- `templates/emails/registration_instructions.html` - HTML шаблон для экспертов
- `templates/emails/partner_instructions.html` - HTML шаблон для партнеров

### Frontend
- `frontend-react/src/features/landing/components/sections/FeedbackForm.tsx` - компонент формы (поддерживает 2 типа)
- `frontend-react/src/features/landing/components/sections/FeedbackForm.css` - стили
- `frontend-react/src/config/endpoints.ts` - добавлены endpoints

## Как использовать

### Для экспертов (регистрация)
1. Пользователь открывает лендинг
2. Вводит email в форму "Готов начать зарабатывать?"
3. Нажимает "Отправить"
4. Получает письмо с инструкцией по регистрации

Использование в коде:
```tsx
<FeedbackForm buttonText="Отправить" type="registration" />
```

### Для партнеров
1. Пользователь открывает страницу партнерской программы
2. Вводит email в форму
3. Нажимает "Стать партнером"
4. Получает письмо с информацией о партнерской программе

Использование в коде:
```tsx
<FeedbackForm buttonText="Стать партнером" type="partner" />
```

## API

**Endpoint:** `POST /api/notifications/send-registration-email/`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (успех):**
```json
{
  "message": "Инструкция отправлена на ваш email"
}
```

**Response (ошибка):**
```json
{
  "error": "Email обязателен"
}
```

## Быстрый тест

```powershell
# Перезапустить backend
docker restart okoznaniy-backend-1

# Тест API для регистрации
Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/send-registration-email/" -Method POST -ContentType "application/json" -Body '{"email": "test@example.com"}'

# Тест API для партнеров
Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/send-partner-email/" -Method POST -ContentType "application/json" -Body '{"email": "partner@example.com"}'

# Проверить логи
docker logs okoznaniy-backend-1 --tail 20
```

## Настройки email

В `.env` должны быть настроены:
```env
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@yandex.ru
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=your-email@yandex.ru
```

## Что дальше?

Возможные улучшения:
- Добавить rate limiting (ограничение частоты запросов)
- Сохранять email в базу для маркетинговых рассылок
- Добавить Google reCAPTCHA для защиты от ботов
- Отслеживать открытие писем
- A/B тестирование разных версий писем
