# Запуск тестов претензий

## Вариант 1: Через Docker (рекомендуется)

### Предварительные требования
1. Docker Desktop должен быть запущен
2. Контейнеры должны быть запущены: `docker-compose up -d`

### Запуск тестов

```bash
# Тест полного флоу претензий
docker-compose exec backend python test_claim_to_admin_flow.py --test

# Показать все претензии
docker-compose exec backend python test_claim_to_admin_flow.py --show

# Тест API эндпоинтов
docker-compose exec backend python test_claim_api_endpoints.py
```

## Вариант 2: Локально (если есть виртуальное окружение)

### Предварительные требования
1. Виртуальное окружение активировано
2. База данных запущена

### Активация виртуального окружения

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### Запуск тестов

```bash
# Тест полного флоу претензий
python test_claim_to_admin_flow.py --test

# Показать все претензии
python test_claim_to_admin_flow.py --show

# Тест API эндпоинтов
python test_claim_api_endpoints.py
```

## Вариант 3: Через Django shell

Если тесты не запускаются, можно проверить вручную через Django shell:

```bash
# Через Docker
docker-compose exec backend python manage.py shell

# Локально
python manage.py shell
```

Затем в shell:

```python
from django.contrib.auth import get_user_model
from apps.admin_panel.models import Claim
from apps.orders.models import Order
from django.utils import timezone

User = get_user_model()

# Создаем пользователей
expert = User.objects.create_user(
    username='test_expert',
    email='expert@test.com',
    password='test123',
    role='expert'
)

admin = User.objects.create_user(
    username='test_admin',
    email='admin@test.com',
    password='test123',
    role='admin'
)

client = User.objects.create_user(
    username='test_client',
    email='client@test.com',
    password='test123',
    role='client'
)

# Создаем заказ
order = Order.objects.create(
    client=client,
    expert=expert,
    title='Тестовый заказ',
    description='Описание',
    budget=5000,
    deadline=timezone.now() + timezone.timedelta(days=7),
    status='in_progress'
)

# Создаем претензию
claim = Claim.objects.create(
    user=expert,
    order=order,
    claim_type='quality',
    subject='Проблема с оплатой',
    description='Клиент не оплатил работу',
    status='new'
)

print(f"Претензия создана: #{claim.id}")

# Проверяем, что претензия видна
new_claims = Claim.objects.filter(status='new')
print(f"Новых претензий: {new_claims.count()}")

# Администратор берет в работу
claim.admin = admin
claim.status = 'in_progress'
claim.save()
print(f"Претензия взята в работу администратором {admin.username}")

# Завершаем претензию
claim.status = 'completed'
claim.resolution = 'Проблема решена'
claim.completed_at = timezone.now()
claim.save()
print(f"Претензия завершена")
```

## Проверка через Django Admin

1. Откройте http://localhost:8000/admin/
2. Войдите как суперпользователь
3. Перейдите в "Claims" (Обращения)
4. Проверьте список претензий

## Проверка через API

### Получить токен авторизации

```bash
# Через Docker
docker-compose exec backend python manage.py shell

# В shell:
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.get(username='admin_username')
token, created = Token.objects.get_or_create(user=admin)
print(f"Token: {token.key}")
```

### Тестирование API

```bash
# Замените YOUR_TOKEN на полученный токен

# Получить все претензии
curl -X GET http://localhost:8000/api/admin-panel/claims/ \
  -H "Authorization: Token YOUR_TOKEN"

# Получить новые претензии
curl -X GET "http://localhost:8000/api/admin-panel/claims/?status=new" \
  -H "Authorization: Token YOUR_TOKEN"

# Взять претензию в работу (замените 1 на ID претензии)
curl -X POST http://localhost:8000/api/admin-panel/claims/1/take_in_work/ \
  -H "Authorization: Token YOUR_TOKEN"

# Завершить претензию
curl -X POST http://localhost:8000/api/admin-panel/claims/1/complete_claim/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"resolution\": \"Проблема решена\"}"
```

## Быстрая проверка

Самый быстрый способ проверить, что претензии работают:

```bash
# 1. Запустите Docker
docker-compose up -d

# 2. Создайте тестовую претензию
docker-compose exec backend python test_claims_creation.py --create

# 3. Проверьте, что она создалась
docker-compose exec backend python test_claims_creation.py

# 4. Запустите полный тест
docker-compose exec backend python test_claim_to_admin_flow.py
```

## Ожидаемый результат

После успешного выполнения тестов вы должны увидеть:

```
======================================================================
  РЕЗУЛЬТАТ ТЕСТА
======================================================================
✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!
ℹ️  Претензия #X прошла полный цикл:
ℹ️    1. Создана экспертом test_expert_claim
ℹ️    2. Появилась в админ-панели
ℹ️    3. Взята в работу администратором test_admin_claim
ℹ️    4. Успешно завершена
```

## Устранение проблем

### Docker не запущен
```
Error: Cannot connect to Docker daemon
```
**Решение:** Запустите Docker Desktop

### База данных не доступна
```
Error: could not connect to server
```
**Решение:** 
```bash
docker-compose up -d postgres
docker-compose restart backend
```

### Модуль не найден
```
ModuleNotFoundError: No module named 'django'
```
**Решение:** Используйте Docker или активируйте виртуальное окружение

### Нет прав доступа
```
403 Forbidden
```
**Решение:** Убедитесь, что пользователь имеет роль 'admin'
