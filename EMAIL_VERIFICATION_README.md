# 📧 Подтверждение Email через код

## ✅ Что реализовано

Система подтверждения email через 6-значный код, который отправляется на почту при регистрации.

## 🎯 Возможности

- ✅ Отправка 6-значного кода на email при регистрации
- ✅ Проверка кода с ограничением попыток (3 попытки)
- ✅ Срок действия кода 15 минут
- ✅ Повторная отправка кода (с защитой от спама - 1 минута)
- ✅ Автоматическая авторизация после подтверждения
- ✅ Красивый UI с автозаполнением и вставкой кода

## 📦 Компоненты

### Backend (Django)

**Файлы:**
- `apps/users/models.py` - Модели User и EmailVerificationCode
- `apps/users/email_verification.py` - Логика работы с кодами
- `apps/users/views.py` - API endpoints
- `apps/users/admin.py` - Админ-панель

**Модель EmailVerificationCode:**
```python
class EmailVerificationCode(models.Model):
    user = ForeignKey(User)
    email = EmailField()
    code = CharField(max_length=6)  # 6-значный код
    created_at = DateTimeField()
    expires_at = DateTimeField()     # +15 минут
    is_used = BooleanField()
    attempts = PositiveIntegerField() # Максимум 3
```

**API Endpoints:**
```
POST /api/users/                      # Регистрация (отправляет код)
POST /api/users/verify_email_code/   # Подтверждение кода
POST /api/users/resend_verification_code/  # Повторная отправка
```

### Frontend (React)

**Файлы:**
- `frontend-react/src/components/auth/EmailVerificationForm.tsx` - Форма ввода кода
- `frontend-react/src/pages/RegisterWithEmailVerification.tsx` - Страница регистрации

## 🚀 Использование

### 1. Регистрация пользователя

```typescript
// POST /api/users/
const response = await axios.post('/api/users/', {
  email: 'user@example.com',
  password: 'password123',
  password2: 'password123',
  role: 'client'
});

// Ответ:
{
  "id": 1,
  "username": "user",
  "email": "user@example.com",
  "email_verified": false,
  "message": "Регистрация успешна. Код подтверждения отправлен на ваш email.",
  "email_verification_required": true
}
```

### 2. Подтверждение кода

```typescript
// POST /api/users/verify_email_code/
const response = await axios.post('/api/users/verify_email_code/', {
  email: 'user@example.com',
  code: '123456'
});

// Ответ при успехе:
{
  "message": "Email успешно подтвержден",
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "email_verified": true,
    ...
  }
}

// Ответ при ошибке:
{
  "error": "Неверный код"
}
```

### 3. Повторная отправка кода

```typescript
// POST /api/users/resend_verification_code/
const response = await axios.post('/api/users/resend_verification_code/', {
  email: 'user@example.com'
});

// Ответ:
{
  "message": "Код отправлен на ваш email"
}
```

## 🎨 React компонент

### Использование EmailVerificationForm

```tsx
import EmailVerificationForm from '../components/auth/EmailVerificationForm';

<EmailVerificationForm
  email="user@example.com"
  onSuccess={(user, tokens) => {
    console.log('Подтверждено:', user);
    navigate('/dashboard');
  }}
  onError={(error) => {
    console.error('Ошибка:', error);
  }}
/>
```

### Возможности компонента

- ✅ 6 отдельных полей для цифр
- ✅ Автоматический переход между полями
- ✅ Вставка кода из буфера обмена (Ctrl+V)
- ✅ Автоматическая отправка при заполнении
- ✅ Кнопка повторной отправки с таймером
- ✅ Отображение ошибок и успеха
- ✅ Индикатор загрузки

## 📧 Email шаблон

Код отправляется в красивом HTML письме:

```
┌─────────────────────────────┐
│      🎓 OkoZnaniy          │
│                             │
│  Код подтверждения          │
│                             │
│  ┌─────────────────────┐   │
│  │      123456         │   │
│  └─────────────────────┘   │
│                             │
│  Код действителен 15 минут  │
└─────────────────────────────┘
```

## 🔒 Безопасность

### Защита от брутфорса
- ✅ Максимум 3 попытки ввода кода
- ✅ После 3 попыток код деактивируется
- ✅ Нужно запросить новый код

### Защита от спама
- ✅ Повторная отправка только через 1 минуту
- ✅ Старые коды деактивируются при создании нового

### Срок действия
- ✅ Код действителен 15 минут
- ✅ После истечения нужно запросить новый

### Очистка
- ✅ Старые коды (>24 часов) удаляются автоматически

## 🧪 Тестирование

### Через API

```bash
# 1. Регистрация
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "password2": "Test123!@#",
    "role": "client"
  }'

# 2. Проверьте email и получите код

# 3. Подтверждение
curl -X POST http://localhost:8000/api/users/verify_email_code/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Через браузер

1. Откройте: `http://localhost:3000/register`
2. Заполните форму регистрации
3. Проверьте email
4. Введите код из письма
5. Готово! ✅

## ⚙️ Настройка Email

### В .env файле

```env
# Email settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=noreply@okoznaniy.com
```

### Для Gmail

1. Включите двухфакторную аутентификацию
2. Создайте пароль приложения: https://myaccount.google.com/apppasswords
3. Используйте этот пароль в `EMAIL_HOST_PASSWORD`

### Для других провайдеров

**Yandex:**
```env
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=587
```

**Mail.ru:**
```env
EMAIL_HOST=smtp.mail.ru
EMAIL_PORT=587
```

## 📊 Админ-панель

В Django Admin можно:
- ✅ Просматривать все коды
- ✅ Фильтровать по статусу (использован/активен)
- ✅ Искать по email
- ✅ Видеть количество попыток
- ✅ Проверять срок действия

Доступ: `http://localhost:8000/admin/users/emailverificationcode/`

## 🔄 Процесс работы

```
1. Пользователь → Регистрация с email
2. Backend → Создает User (email_verified=False)
3. Backend → Генерирует 6-значный код
4. Backend → Сохраняет в EmailVerificationCode
5. Backend → Отправляет код на email
6. Пользователь → Получает письмо с кодом
7. Пользователь → Вводит код на сайте
8. Backend → Проверяет код
9. Backend → Устанавливает email_verified=True
10. Backend → Генерирует JWT токены
11. Пользователь → Авторизован ✅
```

## 🐛 Troubleshooting

### Email не отправляется

```bash
# Проверьте настройки
docker-compose exec backend python manage.py shell -c "
from django.core.mail import send_mail
from django.conf import settings
print(f'EMAIL_HOST: {settings.EMAIL_HOST}')
print(f'EMAIL_PORT: {settings.EMAIL_PORT}')
print(f'EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}')
"

# Тестовая отправка
docker-compose exec backend python manage.py shell -c "
from django.core.mail import send_mail
send_mail(
    'Test',
    'Test message',
    'noreply@okoznaniy.com',
    ['your@email.com'],
    fail_silently=False,
)
print('Email sent!')
"
```

### Код не работает

```bash
# Проверьте код в БД
docker-compose exec backend python manage.py shell -c "
from apps.users.models import EmailVerificationCode
codes = EmailVerificationCode.objects.filter(email='test@example.com', is_used=False)
for code in codes:
    print(f'Code: {code.code}, Expires: {code.expires_at}, Attempts: {code.attempts}')
"
```

### Очистка старых кодов

```bash
# Вручную
docker-compose exec backend python manage.py shell -c "
from apps.users.email_verification import cleanup_expired_codes
deleted = cleanup_expired_codes()
print(f'Deleted {deleted} expired codes')
"
```

## 📝 Миграции

Миграции уже применены:

```bash
# Если нужно применить заново
docker-compose exec backend python manage.py migrate users
```

## ✅ Готово!

Система подтверждения email через код полностью работает!

**Попробуйте:**
1. Откройте `http://localhost:3000/register`
2. Зарегистрируйтесь с реальным email
3. Проверьте почту
4. Введите код
5. Готово! ✅

---

**Версия:** 1.0.0  
**Дата:** 2024  
**Статус:** ✅ Работает
