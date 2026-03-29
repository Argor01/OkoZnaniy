# Форма обратной связи с отправкой email

## Описание
Реализован функционал отправки инструкции по регистрации на email пользователя через форму на лендинге.

## Компоненты

### Backend (Django)

1. **apps/notifications/services.py** - `EmailService`
   - Метод `send_registration_instructions(email)` - отправляет письмо с инструкцией
   - Поддерживает HTML и текстовую версию письма
   - Fallback на простую отправку при ошибках

2. **apps/notifications/views.py** - `send_registration_email`
   - API endpoint для отправки email
   - Доступен без авторизации (AllowAny)
   - Валидация email
   - URL: `/api/notifications/send-registration-email/`

3. **templates/emails/registration_instructions.html**
   - HTML шаблон письма с красивым оформлением
   - Адаптивный дизайн
   - Кнопка регистрации

### Frontend (React)

1. **frontend-react/src/features/landing/components/sections/FeedbackForm.tsx**
   - Форма с полем email и кнопкой отправки
   - Обработка отправки через fetch API
   - Отображение сообщений об успехе/ошибке
   - Блокировка формы во время отправки

2. **frontend-react/src/features/landing/components/sections/FeedbackForm.css**
   - Стили для сообщений успеха и ошибок
   - Стили для disabled состояния

## Настройка

### Email настройки в .env

```env
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@yandex.ru
EMAIL_HOST_PASSWORD=your-email-password
DEFAULT_FROM_EMAIL=your-email@yandex.ru
FRONTEND_URL=https://okoznaniy.ru
```

## Использование

1. Пользователь вводит email в форму на лендинге
2. Нажимает кнопку "Отправить"
3. Форма отправляет POST запрос на `/api/notifications/send-registration-email/`
4. Backend отправляет письмо с инструкцией
5. Пользователь видит сообщение об успехе или ошибке

## Содержание письма

- Приветствие
- Инструкция по регистрации (5 шагов)
- Информация для экспертов
- Список доступных предметов
- Средняя стоимость заказов
- Преимущества платформы
- Контакты поддержки

## Тестирование

### Тест через curl (PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/send-registration-email/" -Method POST -ContentType "application/json" -Body '{"email": "test@example.com"}'
```

### Тест через HTML файл
Откройте файл `test_email_api.html` в браузере и введите email для тестирования.

### Тест через React компонент
1. Откройте страницу лендинга в браузере: `http://localhost:5173`
2. Прокрутите до формы "Готов начать зарабатывать?"
3. Введите email и нажмите "Отправить"
4. Проверьте почтовый ящик на наличие письма

### Проверка логов
```powershell
# Логи backend
docker logs okoznaniy-backend-1 --tail 50

# Логи в реальном времени
docker logs -f okoznaniy-backend-1
```

## Возможные улучшения

- Добавить rate limiting для предотвращения спама
- Сохранять email в базу для рассылок
- Добавить Google reCAPTCHA
- Отслеживать открытие писем
- A/B тестирование разных версий письма
