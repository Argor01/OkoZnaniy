# План поэтапной реализации системы отзывов и рейтингов

## Этап 0: Подготовка и анализ (1 день)

### 0.1 Проверка существующего кода
- [ ] Проверить наличие модели `ExpertRating` в `apps/orders/models.py`
- [ ] Проверить модель `ExpertStatistics` в `apps/users/models.py`
- [ ] Проверить поля `rating` и `rated_at` в модели `Purchase`
- [ ] Изучить существующие API эндпоинты для рейтингов

### 0.2 Создание веток
```bash
git checkout -b feature/ratings-reviews-system
```

---

## Этап 1: Модели и миграции (2-3 дня)

### 1.1 Модель ExpertRating
**Файл:** `apps/orders/models.py`

```python
class ExpertRating(models.Model):
    """Отзыв клиента об эксперте после выполнения заказа"""
    order = models.OneToOneField(
        'Order',
        on_delete=models.CASCADE,
        related_name='expert_rating',
        verbose_name='Заказ'
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_ratings',
        verbose_name='Эксперт'
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_ratings',
        verbose_name='Клиент'
    )
    rating = models.PositiveSmallIntegerField(
        'Оценка',
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField('Комментарий', blank=True)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)

    class Meta:
        db_table = 'expert_ratings'
        verbose_name = 'Отзыв об эксперте'
        verbose_name_plural = 'Отзывы об экспертах'
        ordering = ['-created_at']
        unique_together = [['order', 'client']]
        indexes = [
            models.Index(fields=['expert', '-created_at']),
            models.Index(fields=['client', '-created_at']),
        ]

    def __str__(self):
        return f"Отзыв от {self.client} для {self.expert} - {self.rating}/5"
```

**Задачи:**
- [ ] Создать модель ExpertRating
- [ ] Добавить валидаторы для rating (1-5)
- [ ] Добавить индексы для оптимизации запросов
- [ ] Создать миграцию: `python manage.py makemigrations`

### 1.2 Обновление модели ExpertStatistics
**Файл:** `apps/users/models.py`

```python
class ExpertStatistics(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='statistics'
    )
    average_rating = models.DecimalField(
        'Средний рейтинг',
        max_digits=3,
        decimal_places=2,
        default=0
    )
    total_ratings = models.PositiveIntegerField('Всего отзывов', default=0)
    # ... остальные поля
```

**Задачи:**
- [ ] Проверить наличие поля average_rating
- [ ] Добавить поле total_ratings
- [ ] Создать миграцию при необходимости

### 1.3 Проверка модели Purchase
**Файл:** `apps/shop/models.py`

**Задачи:**
- [ ] Убедиться, что поля rating и rated_at существуют
- [ ] Проверить индексы для оптимизации
- [ ] Применить миграции: `python manage.py migrate`

---

## Этап 2: Сигналы для автоматического пересчета (1 день)

### 2.1 Сигнал для пересчета рейтинга эксперта
**Файл:** `apps/orders/signals.py`

```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from .models import ExpertRating

@receiver([post_save, post_delete], sender=ExpertRating)
def update_expert_rating(sender, instance, **kwargs):
    """Пересчитать средний рейтинг эксперта"""
    expert = instance.expert
    stats = expert.received_ratings.aggregate(
        avg_rating=Avg('rating'),
        total=Count('id')
    )
    
    # Обновить статистику
    statistics, created = expert.statistics.get_or_create(user=expert)
    statistics.average_rating = stats['avg_rating'] or 0
    statistics.total_ratings = stats['total'] or 0
    statistics.save(update_fields=['average_rating', 'total_ratings'])
```

**Задачи:**
- [ ] Создать файл signals.py в apps/orders
- [ ] Реализовать сигнал update_expert_rating
- [ ] Подключить сигналы в apps.py
- [ ] Протестировать автоматический пересчет

### 2.2 Подключение сигналов
**Файл:** `apps/orders/apps.py`

```python
class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.orders'

    def ready(self):
        import apps.orders.signals
```

---

## Этап 3: Сериализаторы (1 день)

### 3.1 ExpertRatingSerializer
**Файл:** `apps/orders/serializers.py`

```python
class ExpertRatingSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    order = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpertRating
        fields = ['id', 'order', 'expert', 'client', 'rating', 
                  'comment', 'created_at']
        read_only_fields = ['id', 'client', 'created_at']
    
    def get_order(self, obj):
        return {
            'id': obj.order.id,
            'title': obj.order.title
        }
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                'Рейтинг должен быть от 1 до 5'
            )
        return value
```

    def validate(self, data):
        # Проверка прав доступа
        request = self.context.get('request')
        order = data.get('order')
        
        if order.client != request.user:
            raise serializers.ValidationError(
                'Только клиент может оставить отзыв'
            )
        
        if order.status != 'completed':
            raise serializers.ValidationError(
                'Отзыв можно оставить только после завершения заказа'
            )
        
        return data
```

**Задачи:**
- [ ] Создать ExpertRatingSerializer
- [ ] Добавить валидацию рейтинга
- [ ] Добавить проверку прав доступа
- [ ] Добавить вложенные сериализаторы для client и order

---

## Этап 4: ViewSets и API эндпоинты (2 дня)

### 4.1 ExpertRatingViewSet
**Файл:** `apps/orders/views.py`

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ExpertRating
from .serializers import ExpertRatingSerializer

class ExpertRatingViewSet(viewsets.ModelViewSet):
    queryset = ExpertRating.objects.select_related(
        'client', 'expert', 'order'
    ).all()
    serializer_class = ExpertRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        expert_id = self.request.query_params.get('expert')
        
        if expert_id:
            queryset = queryset.filter(expert_id=expert_id)
        
        return queryset
```
    
    def perform_create(self, serializer):
        serializer.save(client=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Проверка на дубликат
        order_id = request.data.get('order')
        if ExpertRating.objects.filter(
            order_id=order_id, 
            client=request.user
        ).exists():
            return Response(
                {'detail': 'Вы уже оставили отзыв на этот заказ'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().create(request, *args, **kwargs)
```

**Задачи:**
- [ ] Создать ExpertRatingViewSet
- [ ] Реализовать фильтрацию по эксперту
- [ ] Добавить проверку на дубликаты
- [ ] Настроить права доступа

### 4.2 Обновление WorkViewSet для рейтингов
**Файл:** `apps/shop/views.py`

**Задачи:**
- [ ] Проверить аннотацию rating_avg и rating_count
- [ ] Убедиться, что эндпоинт rate работает корректно

### 4.3 URL маршруты
**Файл:** `apps/orders/urls.py`

```python
from rest_framework.routers import DefaultRouter
from .views import ExpertRatingViewSet

router = DefaultRouter()
router.register(r'ratings', ExpertRatingViewSet, basename='expert-rating')

urlpatterns = router.urls
```

**Файл:** `config/urls.py` (главный urls.py)

```python
urlpatterns = [
    # ...
    path('api/experts/', include('apps.orders.urls')),
]
```

**Задачи:**
- [ ] Создать urls.py в apps/orders
- [ ] Зарегистрировать ExpertRatingViewSet
- [ ] Подключить к главному urls.py
- [ ] Протестировать эндпоинты через Postman/curl

---

## Этап 5: Интеграция с чатом (1-2 дня)

### 5.1 Обновление метода accept_work_delivery
**Файл:** `apps/chat/views.py`

```python
@action(detail=True, methods=['post'])
def accept_work_delivery(self, request, pk=None):
    chat = self.get_object()
    message_id = request.data.get('message_id')
    rating = request.data.get('rating')  # опционально
    
    # ... существующая логика приемки работы ...
    
    # Создать отзыв, если указан рейтинг
    if rating and chat.order:
        from apps.orders.models import ExpertRating
        ExpertRating.objects.get_or_create(
            order=chat.order,
            client=request.user,
            defaults={
                'expert': chat.order.expert,
                'rating': rating,
                'comment': ''
            }
        )
    
    return Response({'status': 'accepted'})
```

**Задачи:**
- [ ] Найти метод accept_work_delivery
- [ ] Добавить создание ExpertRating при приемке
- [ ] Обработать опциональный параметр rating
- [ ] Протестировать интеграцию

---

## Этап 6: Обновление существующих сериализаторов (1 день)

### 6.1 OrderSerializer - добавить expert_rating
**Файл:** `apps/orders/serializers.py`

```python
class OrderSerializer(serializers.ModelSerializer):
    # ... существующие поля ...
    expert_rating = ExpertRatingSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            # ... существующие поля ...
            'expert_rating',
        ]
```

**Задачи:**
- [ ] Добавить поле expert_rating в OrderSerializer
- [ ] Проверить related_name в модели Order
- [ ] Протестировать вывод рейтинга в деталях заказа

### 6.2 BidSerializer - добавить expert_rating
**Файл:** `apps/orders/serializers.py`

```python
class BidSerializer(serializers.ModelSerializer):
    expert_rating = serializers.SerializerMethodField()
    
    def get_expert_rating(self, obj):
        try:
            return obj.expert.statistics.average_rating
        except:
            return 0
```

**Задачи:**
- [ ] Проверить метод get_expert_rating
- [ ] Убедиться, что рейтинг отображается в откликах

### 6.3 WorkSerializer - проверить рейтинг работ
**Файл:** `apps/shop/serializers.py`

```python
class WorkSerializer(serializers.ModelSerializer):
    rating = serializers.SerializerMethodField()
    reviewsCount = serializers.SerializerMethodField()
    
    def get_rating(self, obj):
        return float(getattr(obj, 'rating_avg', None) or 0)
    
    def get_reviewsCount(self, obj):
        return int(getattr(obj, 'rating_count', None) or 0)
```

**Задачи:**
- [ ] Проверить методы get_rating и get_reviewsCount
- [ ] Убедиться, что аннотации работают в WorkViewSet

---

## Этап 7: Права доступа и валидация (1 день)

### 7.1 Permissions для ExpertRating
**Файл:** `apps/orders/permissions.py`

```python
from rest_framework import permissions

class CanCreateExpertRating(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method == 'POST':
            order_id = request.data.get('order')
            if not order_id:
                return False
            
            try:
                order = Order.objects.get(id=order_id)
                return (
                    order.client == request.user and
                    order.status == 'completed'
                )
            except Order.DoesNotExist:
                return False
        
        return True
```

**Задачи:**
- [ ] Создать файл permissions.py
- [ ] Реализовать CanCreateExpertRating
- [ ] Применить к ExpertRatingViewSet
- [ ] Протестировать различные сценарии доступа

### 7.2 Валидация в сериализаторах
**Задачи:**
- [ ] Проверить валидацию rating (1-5)
- [ ] Проверить валидацию comment (min/max длина)
- [ ] Добавить проверку на завершенный заказ
- [ ] Добавить проверку на дубликаты

---

## Этап 8: Уведомления (1 день)

### 8.1 Уведомление эксперту о новом отзыве
**Файл:** `apps/notifications/services.py`

```python
@staticmethod
def notify_new_expert_rating(rating):
    """Уведомление эксперту о новом отзыве"""
    Notification.objects.create(
        recipient=rating.expert,
        type=NotificationType.REVIEW_RECEIVED,
        title="Получен новый отзыв",
        message=f"Клиент {rating.client.username} оставил отзыв с оценкой {rating.rating}/5",
        related_object_id=rating.id,
        related_object_type='expert_rating'
    )
```

**Задачи:**
- [ ] Добавить метод notify_new_expert_rating
- [ ] Вызвать из сигнала post_save ExpertRating
- [ ] Протестировать отправку уведомлений

### 8.2 Интеграция с сигналами
**Файл:** `apps/orders/signals.py`

```python
@receiver(post_save, sender=ExpertRating)
def notify_expert_about_rating(sender, instance, created, **kwargs):
    if created:
        from apps.notifications.services import NotificationService
        NotificationService.notify_new_expert_rating(instance)
```

---

## Этап 9: Тестирование (2-3 дня)

### 9.1 Unit-тесты для моделей
**Файл:** `apps/orders/tests/test_models.py`

```python
class ExpertRatingModelTest(TestCase):
    def test_create_rating(self):
        # Тест создания отзыва
        pass
    
    def test_rating_validation(self):
        # Тест валидации рейтинга
        pass
    
    def test_unique_constraint(self):
        # Тест уникальности (order + client)
        pass
```

**Задачи:**
- [ ] Тест создания ExpertRating
- [ ] Тест валидации rating (1-5)
- [ ] Тест unique_together
- [ ] Тест каскадного удаления

### 9.2 Unit-тесты для API
**Файл:** `apps/orders/tests/test_api.py`

```python
class ExpertRatingAPITest(APITestCase):
    def test_create_rating_success(self):
        # Тест успешного создания отзыва
        pass
    
    def test_create_rating_unauthorized(self):
        # Тест без авторизации
        pass
    
    def test_create_rating_duplicate(self):
        # Тест дубликата отзыва
        pass
    
    def test_get_expert_ratings(self):
        # Тест получения отзывов эксперта
        pass
    
    def test_rating_updates_statistics(self):
        # Тест автоматического пересчета статистики
        pass
```

**Задачи:**
- [ ] Тест POST /api/experts/ratings/
- [ ] Тест GET /api/experts/ratings/?expert={id}
- [ ] Тест прав доступа
- [ ] Тест валидации данных
- [ ] Тест пересчета average_rating

### 9.3 Integration-тесты
**Файл:** `apps/orders/tests/test_integration.py`

```python
class RatingIntegrationTest(TestCase):
    def test_full_order_cycle_with_rating(self):
        # Создание заказа -> выполнение -> отзыв
        pass
    
    def test_rating_via_chat_acceptance(self):
        # Приемка работы через чат с рейтингом
        pass
```

**Задачи:**
- [ ] Тест полного цикла заказа с отзывом
- [ ] Тест приемки работы через чат с рейтингом
- [ ] Тест пересчета статистики при множественных отзывах

### 9.4 Тестирование рейтинга работ в магазине
**Файл:** `apps/shop/tests/test_ratings.py`

```python
class ShopWorkRatingTest(APITestCase):
    def test_rate_purchased_work(self):
        # Тест оценки купленной работы
        pass
    
    def test_rating_aggregation(self):
        # Тест агрегации рейтингов
        pass
```

**Задачи:**
- [ ] Тест POST /api/shop/purchases/{id}/rate/
- [ ] Тест агрегации rating_avg и rating_count
- [ ] Тест прав доступа (только покупатель)

---

## Этап 10: Документация API (1 день)

### 10.1 Swagger/OpenAPI документация
**Задачи:**
- [ ] Добавить docstrings к ViewSet
- [ ] Описать параметры запросов
- [ ] Описать форматы ответов
- [ ] Добавить примеры использования

### 10.2 README для разработчиков
**Файл:** `docs/ratings-api.md`

```markdown
# API отзывов и рейтингов

## Создание отзыва эксперту
POST /api/experts/ratings/
Authorization: Bearer {token}

Request:
{
  "order": 123,
  "rating": 5,
  "comment": "Отличная работа!"
}

Response:
{
  "id": 1,
  "order": {...},
  "expert": {...},
  "client": {...},
  "rating": 5,
  "comment": "Отличная работа!",
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Задачи:**
- [ ] Создать документацию API
- [ ] Добавить примеры запросов/ответов
- [ ] Описать коды ошибок
- [ ] Добавить примеры использования

---

## Этап 11: Оптимизация и производительность (1 день)

### 11.1 Индексы базы данных
**Задачи:**
- [ ] Проверить индексы на ExpertRating
- [ ] Добавить составные индексы при необходимости
- [ ] Проанализировать slow queries

### 11.2 Кэширование
**Файл:** `apps/users/models.py`

```python
from django.core.cache import cache

class ExpertStatistics(models.Model):
    # ...
    
    def get_average_rating(self):
        cache_key = f'expert_rating_{self.user_id}'
        rating = cache.get(cache_key)
        
        if rating is None:
            rating = self.average_rating
            cache.set(cache_key, rating, 3600)  # 1 час
        
        return rating
```

**Задачи:**
- [ ] Добавить кэширование average_rating
- [ ] Инвалидация кэша при обновлении
- [ ] Кэширование списка отзывов

### 11.3 Select/Prefetch Related
**Задачи:**
- [ ] Оптимизировать запросы в ExpertRatingViewSet
- [ ] Использовать select_related для FK
- [ ] Использовать prefetch_related для M2M

---

## Этап 12: Админ-панель Django (1 день)

### 12.1 Admin для ExpertRating
**Файл:** `apps/orders/admin.py`

```python
@admin.register(ExpertRating)
class ExpertRatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'expert', 'client', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['expert__username', 'client__username', 'comment']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['order', 'expert', 'client']
```

**Задачи:**
- [ ] Создать ExpertRatingAdmin
- [ ] Добавить фильтры и поиск
- [ ] Настроить отображение полей
- [ ] Добавить inline для Order

---

## Этап 13: Миграция существующих данных (опционально, 1 день)

### 13.1 Data migration для пересчета рейтингов
**Файл:** `apps/orders/migrations/0XXX_recalculate_ratings.py`

```python
from django.db import migrations
from django.db.models import Avg, Count

def recalculate_expert_ratings(apps, schema_editor):
    User = apps.get_model('users', 'User')
    ExpertRating = apps.get_model('orders', 'ExpertRating')
    ExpertStatistics = apps.get_model('users', 'ExpertStatistics')
    
    for user in User.objects.filter(role='expert'):
        stats = ExpertRating.objects.filter(expert=user).aggregate(
            avg_rating=Avg('rating'),
            total=Count('id')
        )
        
        ExpertStatistics.objects.update_or_create(
            user=user,
            defaults={
                'average_rating': stats['avg_rating'] or 0,
                'total_ratings': stats['total'] or 0
            }
        )

class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0XXX_previous_migration'),
    ]
    
    operations = [
        migrations.RunPython(recalculate_expert_ratings),
    ]
```

**Задачи:**
- [ ] Создать data migration
- [ ] Пересчитать рейтинги для всех экспертов
- [ ] Проверить корректность данных
- [ ] Создать backup перед миграцией

---

## Этап 14: Фронтенд интеграция (проверка, 1 день)

### 14.1 Проверка API клиентов
**Файл:** `frontend-react/src/api/experts.ts`

**Задачи:**
- [ ] Проверить функцию rateExpert
- [ ] Проверить функцию getReviews
- [ ] Убедиться, что типы соответствуют API
- [ ] Протестировать запросы

### 14.2 Проверка компонентов
**Задачи:**
- [ ] UserProfile.tsx - отображение отзывов
- [ ] OrderDetail.tsx - форма создания отзыва
- [ ] MessageModalNew.tsx - оценка при приемке
- [ ] ShopWorkDetail.tsx - рейтинг работы

---

## Этап 15: Деплой и мониторинг (1 день)

### 15.1 Подготовка к деплою
**Задачи:**
- [ ] Проверить все миграции
- [ ] Запустить тесты: `python manage.py test`
- [ ] Проверить coverage: `coverage run --source='.' manage.py test`
- [ ] Создать backup базы данных

### 15.2 Деплой на staging
```bash
# Применить миграции
python manage.py migrate

# Собрать статику
python manage.py collectstatic --noinput

# Перезапустить сервисы
systemctl restart gunicorn
systemctl restart celery
```

**Задачи:**
- [ ] Деплой на staging
- [ ] Smoke testing
- [ ] Проверка логов
- [ ] Мониторинг производительности

### 15.3 Деплой на production
**Задачи:**
- [ ] Создать release notes
- [ ] Уведомить команду
- [ ] Деплой на production
- [ ] Мониторинг метрик
- [ ] Проверка Sentry на ошибки

---

## Чеклист финальной проверки

### Бэкенд
- [ ] Модели созданы и протестированы
- [ ] Миграции применены
- [ ] Сигналы работают корректно
- [ ] API эндпоинты функционируют
- [ ] Права доступа настроены
- [ ] Валидация работает
- [ ] Уведомления отправляются
- [ ] Тесты проходят (coverage > 80%)
- [ ] Документация API готова
- [ ] Админ-панель настроена

### Фронтенд
- [ ] API клиенты обновлены
- [ ] Компоненты отображают рейтинги
- [ ] Формы создания отзывов работают
- [ ] Валидация на клиенте
- [ ] Обработка ошибок
- [ ] Loading states
- [ ] Оптимистичные обновления

### Производительность
- [ ] Индексы созданы
- [ ] Кэширование настроено
- [ ] N+1 запросы устранены
- [ ] Slow queries оптимизированы

### Безопасность
- [ ] CSRF защита
- [ ] XSS защита
- [ ] SQL injection защита
- [ ] Rate limiting настроен
- [ ] Права доступа проверены

---

## Временная оценка

| Этап | Описание | Время |
|------|----------|-------|
| 0 | Подготовка и анализ | 1 день |
| 1 | Модели и миграции | 2-3 дня |
| 2 | Сигналы | 1 день |
| 3 | Сериализаторы | 1 день |
| 4 | ViewSets и API | 2 дня |
| 5 | Интеграция с чатом | 1-2 дня |
| 6 | Обновление сериализаторов | 1 день |
| 7 | Права доступа | 1 день |
| 8 | Уведомления | 1 день |
| 9 | Тестирование | 2-3 дня |
| 10 | Документация | 1 день |
| 11 | Оптимизация | 1 день |
| 12 | Админ-панель | 1 день |
| 13 | Миграция данных | 1 день |
| 14 | Фронтенд проверка | 1 день |
| 15 | Деплой | 1 день |
| **Итого** | | **18-22 дня** |

---

## Приоритизация (MVP подход)

### Фаза 1: Минимальный функционал (1 неделя)
1. Модель ExpertRating
2. Базовый API (create, list)
3. Сигнал для пересчета рейтинга
4. Базовые тесты
5. Интеграция с фронтендом

### Фаза 2: Расширенный функционал (1 неделя)
6. Интеграция с чатом
7. Уведомления
8. Права доступа
9. Валидация
10. Документация

### Фаза 3: Оптимизация (3-4 дня)
11. Кэширование
12. Оптимизация запросов
13. Админ-панель
14. Расширенные тесты

---

## Риски и митигация

### Риск 1: Проблемы с производительностью
**Митигация:**
- Использовать индексы
- Кэшировать агрегированные данные
- Оптимизировать запросы

### Риск 2: Несоответствие фронтенда и бэкенда
**Митигация:**
- Проверить существующие API клиенты
- Согласовать форматы данных
- Написать integration тесты

### Риск 3: Миграция существующих данных
**Митигация:**
- Создать backup
- Тестировать на копии БД
- Использовать транзакции

---

## Полезные команды

```bash
# Создать миграции
python manage.py makemigrations

# Применить миграции
python manage.py migrate

# Запустить тесты
python manage.py test apps.orders.tests

# Проверить coverage
coverage run --source='apps.orders' manage.py test
coverage report

# Создать суперпользователя
python manage.py createsuperuser

# Запустить shell
python manage.py shell

# Пересчитать рейтинги вручную
python manage.py shell
>>> from apps.orders.signals import update_expert_rating
>>> # выполнить пересчет
```

---

## Контакты и ресурсы

- Документация Django: https://docs.djangoproject.com/
- DRF документация: https://www.django-rest-framework.org/
- Проектная документация: `ratings-reviews-backend-requirements.md`
