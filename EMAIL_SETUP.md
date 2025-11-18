# 📧 Настройка Email

## Текущие настройки

Письма с кодами подтверждения отправляются с адреса, указанного в `DEFAULT_FROM_EMAIL`.

## 🔧 Настройка Gmail

### 1. Создайте пароль приложения

1. Откройте: https://myaccount.google.com/security
2. Включите двухфакторную аутентификацию (если ещё не включена)
3. Перейдите в "Пароли приложений": https://myaccount.google.com/apppasswords
4. Создайте новый пароль приложения для "Почта"
5. Скопируйте сгенерированный пароль (16 символов)

### 2. Обновите .env файл

```env
# Email settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ваш_email@gmail.com
EMAIL_HOST_PASSWORD=сгенерированный_пароль_приложения
DEFAULT_FROM_EMAIL=noreply@okoznaniy.com
```

**Важно:**
- `EMAIL_HOST_USER` - ваш реальный Gmail
- `EMAIL_HOST_PASSWORD` - пароль приложения (НЕ обычный пароль!)
- `DEFAULT_FROM_EMAIL` - адрес отправителя (может быть любым)

### 3. Перезапустите backend

```bash
docker-compose restart backend
```

### 4. Протестируйте

```bash
docker-compose exec backend python manage.py shell -c "
from django.core.mail import send_mail
send_mail(
    'Test',
    'Test message',
    'noreply@okoznaniy.com',
    ['ваш_email@gmail.com'],
    fail_silently=False,
)
print('Email sent!')
"
```

## 🔧 Настройка других провайдеров

### Yandex

```env
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ваш_email@yandex.ru
EMAIL_HOST_PASSWORD=ваш_пароль
DEFAULT_FROM_EMAIL=noreply@okoznaniy.com
```

### Mail.ru

```env
EMAIL_HOST=smtp.mail.ru
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ваш_email@mail.ru
EMAIL_HOST_PASSWORD=ваш_пароль
DEFAULT_FROM_EMAIL=noreply@okoznaniy.com
```

### Mailgun (рекомендуется для продакшена)

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=postmaster@ваш_домен.mailgun.org
EMAIL_HOST_PASSWORD=ваш_api_key
DEFAULT_FROM_EMAIL=noreply@okoznaniy.com
```

### SendGrid (рекомендуется для продакшена)

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=ваш_api_key
DEFAULT_FROM_EMAIL=noreply@okoznaniy.com
```

## 📝 Формат письма с кодом

Письмо выглядит так:

```
От: noreply@okoznaniy.com
Кому: user@example.com
Тема: Код подтверждения OkoZnaniy

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

## 🐛 Troubleshooting

### Ошибка: "Authentication failed"

**Причина:** Неверный пароль или не включена двухфакторная аутентификация

**Решение:**
1. Проверьте, что используете пароль приложения, а не обычный пароль
2. Убедитесь, что двухфакторная аутентификация включена

### Ошибка: "SMTPServerDisconnected"

**Причина:** Неверные настройки SMTP

**Решение:**
1. Проверьте `EMAIL_HOST` и `EMAIL_PORT`
2. Убедитесь, что `EMAIL_USE_TLS=True`

### Письма не приходят

**Причина:** Письма попадают в спам или блокируются

**Решение:**
1. Проверьте папку "Спам"
2. Добавьте `noreply@okoznaniy.com` в контакты
3. Для продакшена используйте профессиональный SMTP сервис (Mailgun, SendGrid)

### Ошибка: "Connection refused"

**Причина:** Порт заблокирован или неверный хост

**Решение:**
1. Проверьте, что порт 587 не заблокирован файрволом
2. Попробуйте порт 465 с `EMAIL_USE_SSL=True` вместо `EMAIL_USE_TLS`

## 🚀 Для продакшена

### Рекомендации:

1. **Используйте профессиональный SMTP сервис:**
   - Mailgun (бесплатно до 5000 писем/месяц)
   - SendGrid (бесплатно до 100 писем/день)
   - Amazon SES (очень дешево)

2. **Настройте SPF и DKIM записи** для вашего домена

3. **Используйте реальный домен** в `DEFAULT_FROM_EMAIL`:
   ```env
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

4. **Мониторьте доставляемость** писем

## ✅ Проверка настроек

```bash
# Проверьте переменные окружения
docker-compose exec backend python manage.py shell -c "
from django.conf import settings
print(f'EMAIL_HOST: {settings.EMAIL_HOST}')
print(f'EMAIL_PORT: {settings.EMAIL_PORT}')
print(f'EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}')
print(f'DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')
"

# Отправьте тестовое письмо
docker-compose exec backend python manage.py shell -c "
from django.core.mail import send_mail
send_mail(
    'Test from OkoZnaniy',
    'If you receive this, email is configured correctly!',
    'noreply@okoznaniy.com',
    ['your_email@example.com'],
)
print('Test email sent!')
"
```

---

**После настройки email, коды подтверждения будут приходить с адреса `noreply@okoznaniy.com`**
