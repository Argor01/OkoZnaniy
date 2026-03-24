# Тестирование реферальных ссылок

## Как работают реферальные ссылки

### Схема работы:

1. **Пользователь переходит по реферальной ссылке**: `https://okoznaniy.ru/ref/1FB37A5D`
2. **Компонент ReferralRedirect**:
   - Извлекает код из URL (`1FB37A5D`)
   - Сохраняет код в `localStorage` под ключом `referral_code`
   - Перенаправляет на главную страницу с параметром: `/?ref=1FB37A5D`
3. **Главная страница (Home)**:
   - Читает параметр `ref` из URL
   - Сохраняет код в `localStorage` (дублирование для надежности)
   - Показывает уведомление о сохранении кода
   - Автоматически перенаправляет на `/login?ref=1FB37A5D` через 2 секунды
4. **Страница Login**:
   - Читает параметр `ref` из URL
   - Автоматически переключается на вкладку "Регистрация"
   - Заполняет поле "Реферальный код"
   - Показывает зеленое уведомление с кодом
5. **При регистрации**:
   - Код отправляется на бэкенд
   - Пользователь привязывается к партнеру

## Поддерживаемые форматы ссылок

Все эти ссылки работают одинаково:

- `https://okoznaniy.ru/ref/CODE`
- `https://okoznaniy.ru/referral/CODE`
- `https://okoznaniy.ru/r/CODE`
- `https://okoznaniy.ru/?ref=CODE`
- `https://okoznaniy.ru/login?ref=CODE`

## Тестирование локально

### 1. Запустите проект

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 2. Откройте браузер в режиме инкогнито

Это важно, чтобы не было сохраненных данных в localStorage.

### 3. Протестируйте ссылки

Попробуйте открыть:

- http://localhost:5173/ref/TEST123
- http://localhost:5173/referral/TEST123
- http://localhost:5173/r/TEST123
- http://localhost:5173/?ref=TEST123

### 4. Проверьте результат

Должно произойти:

1. ✅ Показывается спиннер с текстом "Переход по реферальной ссылке..."
2. ✅ Перенаправление на главную страницу
3. ✅ Показывается зеленое уведомление: "Реферальный код TEST123 сохранен!"
4. ✅ Через 2 секунды автоматический переход на страницу логина
5. ✅ На странице логина открыта вкладка "Регистрация"
6. ✅ Поле "Реферальный код" заполнено значением TEST123
7. ✅ Показывается зеленое уведомление с кодом

### 5. Проверьте localStorage

Откройте DevTools (F12) → Application → Local Storage → http://localhost:5173

Должен быть ключ `referral_code` со значением `TEST123`.

## Тестирование на продакшене

### После деплоя проверьте:

1. **Прямой переход по реферальной ссылке**:
   ```
   https://okoznaniy.ru/ref/1FB37A5D
   ```

2. **Проверьте в DevTools**:
   - Network → убедитесь, что нет 404 ошибок
   - Console → убедитесь, что нет ошибок JavaScript
   - Application → Local Storage → проверьте наличие `referral_code`

3. **Зарегистрируйте тестового пользователя**:
   - Используйте временный email (например, temp-mail.org)
   - Заполните форму регистрации
   - Убедитесь, что реферальный код отправляется на бэкенд

4. **Проверьте в админ панели**:
   - Войдите как директор
   - Откройте "Управление партнерами"
   - Найдите партнера с кодом 1FB37A5D
   - Проверьте, что у него увеличилось количество рефералов

## Troubleshooting

### Проблема: 404 ошибка при переходе по ссылке

**Причина**: Фронтенд не собран или nginx неправильно настроен.

**Решение**:
```bash
# На сервере
cd /path/to/OkoZnaniy
git pull origin dev
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Проблема: Реферальный код не сохраняется

**Причина**: localStorage заблокирован или очищается.

**Решение**:
1. Проверьте настройки браузера (разрешите cookies и localStorage)
2. Откройте в режиме инкогнито
3. Проверьте, что нет расширений, блокирующих localStorage

### Проблема: Код не передается при регистрации

**Причина**: Форма не читает код из localStorage или URL.

**Решение**:
1. Проверьте DevTools → Console на наличие ошибок
2. Проверьте, что код есть в localStorage
3. Проверьте, что параметр `ref` есть в URL

### Проблема: Партнер не получает реферала

**Причина**: Код неправильный или партнер не существует.

**Решение**:
1. Проверьте, что реферальный код правильный
2. Проверьте в базе данных:
   ```bash
   docker-compose exec backend python manage.py shell -c "from apps.users.models import User; partner = User.objects.filter(referral_code='1FB37A5D').first(); print(f'Partner: {partner.username if partner else \"Not found\"}')"
   ```

## Логи для отладки

### Проверка логов фронтенда

```bash
docker-compose logs frontend | grep "ref"
```

### Проверка логов nginx

```bash
docker-compose logs nginx | grep "ref"
```

### Проверка логов бэкенда

```bash
docker-compose logs backend | grep "referral"
```

## Автоматическое тестирование

Можно создать простой скрипт для автоматического тестирования:

```bash
#!/bin/bash

# Тестирование реферальных ссылок
echo "Testing referral links..."

# Тест 1: /ref/:code
curl -I https://okoznaniy.ru/ref/TEST123 | grep "HTTP"

# Тест 2: /referral/:code
curl -I https://okoznaniy.ru/referral/TEST123 | grep "HTTP"

# Тест 3: /r/:code
curl -I https://okoznaniy.ru/r/TEST123 | grep "HTTP"

# Тест 4: /?ref=code
curl -I "https://okoznaniy.ru/?ref=TEST123" | grep "HTTP"

echo "All tests completed!"
```

Все запросы должны возвращать `HTTP/2 200` (не 404).
