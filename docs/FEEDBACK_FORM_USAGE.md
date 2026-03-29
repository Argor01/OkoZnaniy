# Использование компонента FeedbackForm

## Описание

Компонент `FeedbackForm` поддерживает два типа отправки email:
1. **registration** - для регистрации экспертов (по умолчанию)
2. **partner** - для партнерской программы

## Примеры использования

### Форма для регистрации экспертов

```tsx
import { FeedbackForm } from '@/features/landing';

// В компоненте страницы
<FeedbackForm buttonText="Отправить" />
// или явно указать тип
<FeedbackForm buttonText="Отправить" type="registration" />
```

Отправляет письмо с инструкцией по регистрации и информацией о доступных заказах.

### Форма для партнерской программы

```tsx
import { FeedbackForm } from '@/features/landing';

// В компоненте страницы
<FeedbackForm buttonText="Стать партнером" type="partner" />
```

Отправляет письмо с информацией о партнерской программе и условиях сотрудничества.

## Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| buttonText | string | обязательный | Текст кнопки отправки |
| type | 'registration' \| 'partner' | 'registration' | Тип формы (определяет какое письмо отправлять) |

## API Endpoints

### Регистрация
- **URL:** `POST /api/notifications/send-registration-email/`
- **Body:** `{ "email": "user@example.com" }`
- **Response:** `{ "message": "Инструкция отправлена на ваш email" }`

### Партнерская программа
- **URL:** `POST /api/notifications/send-partner-email/`
- **Body:** `{ "email": "partner@example.com" }`
- **Response:** `{ "message": "Информация о партнерской программе отправлена на ваш email" }`

## Email шаблоны

### Регистрация
- **Шаблон:** `templates/emails/registration_instructions.html`
- **Содержание:** Инструкция по регистрации, информация о заказах, преимущества платформы

### Партнерская программа
- **Шаблон:** `templates/emails/partner_instructions.html`
- **Содержание:** Условия партнерской программы, комиссии, примеры заработка

## Тестирование

### Тест регистрационной формы
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/send-registration-email/" -Method POST -ContentType "application/json" -Body '{"email": "test@example.com"}'
```

### Тест партнерской формы
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/send-partner-email/" -Method POST -ContentType "application/json" -Body '{"email": "partner@example.com"}'
```

## Стили

Компонент использует общие стили из `FeedbackForm.css`:
- `.feedback-form-section` - секция формы
- `.feedback-form-inner` - внутренний контейнер
- `.feedback-form-input` - поле ввода email
- `.feedback-form-button` - кнопка отправки
- `.feedback-form-success` - сообщение об успехе
- `.feedback-form-error` - сообщение об ошибке

## Состояния

Компонент управляет следующими состояниями:
- `email` - введенный email
- `loading` - процесс отправки
- `message` - сообщение об успехе
- `error` - сообщение об ошибке

Во время отправки:
- Кнопка блокируется
- Текст кнопки меняется на "Отправка..."
- Поле ввода блокируется
