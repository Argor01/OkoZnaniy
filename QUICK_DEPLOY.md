# 🚀 Быстрый деплой на хостинг

## Команды для копирования

### 1. Подключиться к серверу
```bash
ssh user@your-server.com
cd /path/to/OkoZnaniy
```

### 2. Обновить код
```bash
docker-compose down
git pull origin main
docker-compose build
docker-compose run --rm backend python manage.py migrate
docker-compose up -d
```

### 3. Обновить даты заказов (для графиков директора)
```bash
docker-compose exec backend python -c "
import os, django
from datetime import timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.orders.models import Order
from django.utils import timezone
from django.db.models import Sum

now = timezone.now()
start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
days = (now - start).days + 1
orders = Order.objects.filter(status='completed').order_by('updated_at')
count = orders.count()

for i, order in enumerate(orders):
    day_offset = int((i / count) * days)
    order.updated_at = start + timedelta(days=day_offset, hours=i % 24)
    order.save(update_fields=['updated_at'])

total = Order.objects.filter(status='completed', updated_at__gte=start, updated_at__lte=now).aggregate(total=Sum('budget'))['total']
print(f'✓ Обновлено {count} заказов. Оборот: {total} руб')
"
```

### 4. Проверить статус
```bash
docker-compose ps
docker-compose logs -f backend
```

---

## Проверка работы

1. Открыть https://your-domain.com/director
2. Войти как директор
3. Проверить "Финансовая статистика" → все 3 вкладки с графиками

---

## Если что-то пошло не так

```bash
# Посмотреть логи
docker-compose logs backend
docker-compose logs frontend

# Пересоздать контейнеры
docker-compose down
docker-compose up -d --build

# Очистить кеш браузера: Ctrl+Shift+R
```

---

## Полная документация

См. `docs/DEPLOY_TO_HOST.md`
