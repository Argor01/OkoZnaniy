# Быстрый старт: Партнерские реферальные ссылки

## Что реализовано

✅ Автоматическая генерация уникального реферального кода для каждого партнера
✅ Отображение партнерской ссылки в ЛК партнера (раздел "Промоматериалы")
✅ Копирование ссылки и кода в буфер обмена
✅ Поддержка коротких ссылок: `/ref/CODE`, `/referral/CODE`, `/r/CODE`
✅ Автоматическое заполнение реферального кода при регистрации
✅ Привязка нового пользователя к партнеру при регистрации
✅ Подсчет статистики рефералов

## Как проверить

### 1. Создайте партнера

```bash
# В Django shell
python manage.py shell
```

```python
from apps.users.models import User

partner = User.objects.create_user(
    username='partner1',
    email='partner1@test.com',
    password='test123',
    role='partner',
    first_name='Иван',
    last_name='Партнеров'
)

print(f"✅ Партнер создан!")
print(f"Логин: partner1")
print(f"Пароль: test123")
print(f"Реферальный код: {partner.referral_code}")
```

### 2. Войдите в ЛК партнера

1. Откройте http://localhost:3000/login
2. Войдите как `partner1` / `test123`
3. Перейдите в раздел "Промоматериалы"
4. Откройте вкладку "Партнерская ссылка"

Вы увидите:
- Ваш реферальный код
- Партнерскую ссылку
- Статистику по рефералам
- Кнопки для копирования

### 3. Проверьте регистрацию по ссылке

1. Скопируйте партнерскую ссылку (например: `http://localhost:3000/login?ref=ABC12345`)
2. Откройте ссылку в режиме инкогнито или другом браузере
3. Убедитесь, что на странице входа/регистрации (вкладка "Зарегистрироваться") отображается:
   - Уведомление о реферальном коде
   - Автоматически заполненное поле с кодом
4. Зарегистрируйте нового пользователя

### 4. Проверьте привязку

```python
# В Django shell
from apps.users.models import User

# Найдите нового пользователя
new_user = User.objects.get(username='новый_пользователь')

# Проверьте привязку к партнеру
print(f"Партнер: {new_user.partner}")
print(f"Имя партнера: {new_user.partner.first_name} {new_user.partner.last_name}")

# Проверьте статистику партнера
partner = User.objects.get(username='partner1')
print(f"Всего рефералов: {partner.total_referrals}")
print(f"Список рефералов:")
for ref in partner.referrals.all():
    print(f"  - {ref.username} ({ref.email})")
```

### 5. Проверьте короткие ссылки

Все эти ссылки должны работать одинаково и перенаправлять на `/login`:
- `http://localhost:3000/login?ref=ABC12345` - прямая ссылка
- `http://localhost:3000/ref/ABC12345` - короткая ссылка
- `http://localhost:3000/referral/ABC12345` - альтернативная
- `http://localhost:3000/r/ABC12345` - самая короткая

## Структура файлов

### Backend
- `apps/users/models.py` - модель User с полями для партнерской системы
- `apps/users/serializers.py` - CustomRegisterSerializer с обработкой referral_code
- `apps/users/views.py` - эндпоинт generate_referral_link

### Frontend
- `frontend-react/src/features/partner/components/PromoMaterials/PromoMaterials.tsx` - компонент промоматериалов
- `frontend-react/src/features/auth/pages/ReferralRedirect.tsx` - обработка коротких ссылок (редирект на /login)
- `frontend-react/src/features/auth/pages/Login.tsx` - страница входа/регистрации с обработкой реферального кода
- `frontend-react/src/features/user/types/users.ts` - типы User с партнерскими полями

## API

### Получить партнерскую ссылку
```
POST /api/users/generate_referral_link/
Authorization: Bearer <token>
```

### Регистрация с реферальным кодом
```
POST /api/users/
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "client",
  "referral_code": "ABC12345"
}
```

## Что дальше?

После успешной регистрации реферала:
1. Партнер видит увеличение счетчика рефералов в ЛК
2. При создании заказа рефералом партнер получит комиссию (настраивается в `partner_commission_rate`)
3. Статистика обновляется автоматически

## Troubleshooting

**Проблема**: Реферальный код не подставляется автоматически
- Проверьте, что в URL есть параметр `?ref=CODE`
- Проверьте консоль браузера на наличие ошибок
- Убедитесь, что localStorage доступен

**Проблема**: Партнер не видит свою ссылку
- Убедитесь, что пользователь имеет роль `partner`
- Проверьте, что у партнера есть `referral_code` (должен генерироваться автоматически)
- Перезагрузите страницу

**Проблема**: Новый пользователь не привязывается к партнеру
- Проверьте, что реферальный код существует в базе
- Проверьте, что партнер имеет роль `partner`
- Проверьте логи Django на наличие ошибок
