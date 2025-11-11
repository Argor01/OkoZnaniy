# Design Document: Expert Dashboard Backend Enhancement

## Overview

Данный документ описывает архитектуру и дизайн доработки бэкенда личного кабинета эксперта для платформы OkoZnaniy. Проект включает расширение существующего API, оптимизацию запросов к базе данных, добавление новых эндпоинтов и улучшение системы уведомлений.

### Текущее состояние

Существующая система уже имеет:
- Django REST Framework API
- Модели: User, Order, ExpertStatistics, ExpertReview, Specialization, ExpertDocument, ExpertApplication
- Базовые ViewSet'ы для управления экспертами
- Систему уведомлений (NotificationService)
- Систему транзакций и платежей

### Цели доработки

1. Расширить API личного кабинета эксперта
2. Добавить эндпоинты для управления финансами
3. Оптимизировать запросы к БД
4. Улучшить систему фильтрации и поиска заказов
5. Добавить детальную статистику и аналитику
6. Реализовать систему уведомлений в реальном времени

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────────────────────────────────┐
│         Django REST Framework               │
│  ┌──────────────────────────────────────┐  │
│  │   ExpertDashboardViewSet             │  │
│  │   - statistics()                     │  │
│  │   - profile()                        │  │
│  │   - active_orders()                  │  │
│  │   - available_orders()               │  │
│  │   - recent_orders()                  │  │
│  │   - take_order()                     │  │
│  │   - financial_summary()  [NEW]       │  │
│  │   - transactions()       [NEW]       │  │
│  │   - reviews()            [NEW]       │  │
│  │   - notifications()      [NEW]       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   Services Layer                     │  │
│  │   - ExpertStatisticsService  [NEW]   │  │
│  │   - ExpertFinanceService     [NEW]   │  │
│  │   - ExpertOrderService       [NEW]   │  │
│  │   - NotificationService              │  │
│  └──────────────────────────────────────┘  │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│         Database (PostgreSQL)               │
│  - users_user                               │
│  - orders_order                             │
│  - orders_transaction                       │
│  - experts_expertstatistics                 │
│  - experts_expertreview                     │
│  - experts_specialization                   │
│  - experts_expertdocument                   │
│  - experts_expertapplication                │
│  - notifications_notification       [NEW]   │
└─────────────────────────────────────────────┘
```

### API Structure

```
/api/experts/dashboard/
├── statistics/              GET  - Получить статистику эксперта
├── profile/                 GET  - Получить профиль эксперта
├── active-orders/           GET  - Получить активные заказы
├── available-orders/        GET  - Получить доступные заказы
├── recent-orders/           GET  - Получить историю заказов
├── take-order/              POST - Взять заказ в работу
├── financial-summary/       GET  - Получить финансовую сводку [NEW]
├── transactions/            GET  - Получить список транзакций [NEW]
├── reviews/                 GET  - Получить отзывы [NEW]
├── notifications/           GET  - Получить уведомления [NEW]
└── notifications/{id}/read/ POST - Отметить уведомление как прочитанное [NEW]
```

## Components and Interfaces

### 1. ExpertDashboardViewSet (Расширение)

**Файл:** `apps/experts/views.py`

#### Новые методы:

##### 1.1 financial_summary()
```python
@action(detail=False, methods=['get'])
def financial_summary(self, request):
    """
    Возвращает финансовую сводку эксперта
    
    Response:
    {
        "current_balance": 15000.00,
        "frozen_balance": 5000.00,
        "available_balance": 10000.00,
        "total_earnings": 150000.00,
        "monthly_earnings": 25000.00,
        "pending_payouts": 3000.00,
        "last_payout": {
            "amount": 10000.00,
            "date": "2025-11-01T10:00:00Z"
        }
    }
    """
```

**Логика:**
- Получить баланс из User.balance и User.frozen_balance
- Вычислить available_balance = balance - frozen_balance
- Агрегировать транзакции типа 'payout' для total_earnings
- Фильтровать транзакции текущего месяца для monthly_earnings
- Найти транзакции со статусом 'pending' для pending_payouts
- Получить последнюю выплату

##### 1.2 transactions()
```python
@action(detail=False, methods=['get'])
def transactions(self, request):
    """
    Возвращает список транзакций эксперта с фильтрацией и пагинацией
    
    Query Parameters:
    - type: payout|payment|refund|commission
    - date_from: YYYY-MM-DD
    - date_to: YYYY-MM-DD
    - page: int
    - page_size: int (default: 20)
    
    Response:
    {
        "count": 150,
        "next": "...",
        "previous": "...",
        "results": [
            {
                "id": 1,
                "type": "payout",
                "amount": 5000.00,
                "order": {
                    "id": 123,
                    "title": "Курсовая работа"
                },
                "timestamp": "2025-11-10T15:30:00Z",
                "status": "completed"
            }
        ]
    }
    """
```

**Логика:**
- Фильтровать Transaction по user=request.user
- Применить фильтры по типу и датам из query params
- Использовать select_related('order') для оптимизации
- Применить пагинацию
- Сериализовать результаты

##### 1.3 reviews()
```python
@action(detail=False, methods=['get'])
def reviews(self, request):
    """
    Возвращает отзывы о работе эксперта
    
    Query Parameters:
    - rating: 1-5 (фильтр по рейтингу)
    - page: int
    - page_size: int (default: 10)
    
    Response:
    {
        "count": 45,
        "average_rating": 4.7,
        "rating_distribution": {
            "5": 30,
            "4": 10,
            "3": 3,
            "2": 1,
            "1": 1
        },
        "results": [
            {
                "id": 1,
                "rating": 5,
                "comment": "Отличная работа!",
                "client": {
                    "id": 10,
                    "username": "client123"
                },
                "order": {
                    "id": 123,
                    "title": "Курсовая работа"
                },
                "created_at": "2025-11-05T12:00:00Z"
            }
        ]
    }
    """
```

**Логика:**
- Получить ExpertReview для expert=request.user, is_published=True
- Вычислить average_rating через aggregate
- Вычислить rating_distribution через annotate и Count
- Применить фильтр по рейтингу если указан
- Использовать select_related('client', 'order')
- Применить пагинацию

##### 1.4 notifications()
```python
@action(detail=False, methods=['get'])
def notifications(self, request):
    """
    Возвращает уведомления эксперта
    
    Query Parameters:
    - unread_only: true|false (default: false)
    - type: new_order|order_assigned|review_received|...
    - page: int
    - page_size: int (default: 20)
    
    Response:
    {
        "unread_count": 5,
        "results": [
            {
                "id": 1,
                "type": "new_order",
                "title": "Новый заказ по вашей специализации",
                "message": "Доступен новый заказ: Курсовая работа по математике",
                "data": {
                    "order_id": 123
                },
                "is_read": false,
                "created_at": "2025-11-12T10:00:00Z"
            }
        ]
    }
    """
```

**Логика:**
- Получить Notification для recipient=request.user
- Применить фильтр unread_only если указан
- Применить фильтр по типу если указан
- Вычислить unread_count
- Сортировать по created_at desc
- Применить пагинацию

##### 1.5 mark_notification_read()
```python
@action(detail=True, methods=['post'], url_path='notifications/(?P<notification_id>[^/.]+)/read')
def mark_notification_read(self, request, notification_id=None):
    """
    Отмечает уведомление как прочитанное
    
    Response:
    {
        "success": true,
        "message": "Уведомление отмечено как прочитанное"
    }
    """
```

**Логика:**
- Получить Notification по id и recipient=request.user
- Установить is_read=True
- Сохранить
- Вернуть успех

### 2. Service Layer (Новые сервисы)

#### 2.1 ExpertStatisticsService

**Файл:** `apps/experts/services.py` (расширение)

```python
class ExpertStatisticsService:
    """Сервис для работы со статистикой эксперта"""
    
    @staticmethod
    def get_dashboard_statistics(expert: User) -> dict:
        """
        Получает агрегированную статистику для дашборда
        
        Returns:
            {
                'total_earnings': Decimal,
                'monthly_earnings': Decimal,
                'active_orders': int,
                'completed_orders': int,
                'average_rating': float,
                'verified_specializations': int,
                'success_rate': float,
                'total_orders': int,
                'response_time_avg': timedelta
            }
        """
        
    @staticmethod
    def update_expert_statistics(expert: User) -> ExpertStatistics:
        """Обновляет статистику эксперта"""
        
    @staticmethod
    def get_earnings_by_period(expert: User, start_date, end_date) -> Decimal:
        """Получает заработок за период"""
```

#### 2.2 ExpertFinanceService

**Файл:** `apps/experts/services.py` (новый)

```python
class ExpertFinanceService:
    """Сервис для работы с финансами эксперта"""
    
    @staticmethod
    def get_financial_summary(expert: User) -> dict:
        """Получает финансовую сводку"""
        
    @staticmethod
    def get_transactions(expert: User, filters: dict) -> QuerySet:
        """Получает транзакции с фильтрацией"""
        
    @staticmethod
    def calculate_pending_payouts(expert: User) -> Decimal:
        """Вычисляет сумму ожидающих выплат"""
        
    @staticmethod
    def get_last_payout(expert: User) -> Optional[Transaction]:
        """Получает последнюю выплату"""
```

#### 2.3 ExpertOrderService

**Файл:** `apps/experts/services.py` (новый)

```python
class ExpertOrderService:
    """Сервис для работы с заказами эксперта"""
    
    @staticmethod
    def get_available_orders(expert: User) -> QuerySet:
        """
        Получает доступные заказы по специализациям эксперта
        Оптимизирует запросы через select_related и prefetch_related
        """
        
    @staticmethod
    def get_active_orders(expert: User) -> QuerySet:
        """Получает активные заказы эксперта"""
        
    @staticmethod
    def take_order(expert: User, order: Order) -> tuple[bool, str]:
        """
        Берет заказ в работу
        Returns: (success: bool, message: str)
        """
        
    @staticmethod
    def can_take_order(expert: User, order: Order) -> tuple[bool, str]:
        """
        Проверяет может ли эксперт взять заказ
        Returns: (can_take: bool, reason: str)
        """
```

### 3. Notification Model (Новая модель)

**Файл:** `apps/notifications/models.py`

```python
class NotificationType(models.TextChoices):
    NEW_ORDER = 'new_order', 'Новый заказ'
    ORDER_ASSIGNED = 'order_assigned', 'Заказ назначен'
    ORDER_COMPLETED = 'order_completed', 'Заказ завершен'
    REVIEW_RECEIVED = 'review_received', 'Получен отзыв'
    DOCUMENT_VERIFIED = 'document_verified', 'Документ верифицирован'
    SPECIALIZATION_VERIFIED = 'specialization_verified', 'Специализация верифицирована'
    APPLICATION_APPROVED = 'application_approved', 'Анкета одобрена'
    APPLICATION_REJECTED = 'application_rejected', 'Анкета отклонена'
    PAYMENT_RECEIVED = 'payment_received', 'Получен платеж'

class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Получатель"
    )
    type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        verbose_name="Тип"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Заголовок"
    )
    message = models.TextField(
        verbose_name="Сообщение"
    )
    data = models.JSONField(
        default=dict,
        verbose_name="Дополнительные данные"
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name="Прочитано"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Создано"
    )
    
    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]
```

### 4. Serializers (Новые и обновленные)

**Файл:** `apps/experts/serializers.py`

```python
class TransactionSerializer(serializers.ModelSerializer):
    order_info = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'type', 'type_display', 'amount', 'order_info', 'timestamp']
        
    def get_order_info(self, obj):
        if obj.order:
            return {
                'id': obj.order.id,
                'title': obj.order.title
            }
        return None

class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'type', 'type_display', 'title', 'message', 'data', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']

class ExpertReviewDetailSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    order = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpertReview
        fields = ['id', 'rating', 'comment', 'client', 'order', 'created_at']
        
    def get_order(self, obj):
        return {
            'id': obj.order.id,
            'title': obj.order.title
        }
```

## Data Models

### Существующие модели (используются)

#### User
```python
- id: int
- role: str (choices: client, expert, arbitrator, admin, partner)
- balance: Decimal
- frozen_balance: Decimal
- avatar: ImageField
- bio: TextField
- experience_years: int
- education: TextField
- skills: TextField
```

#### Order
```python
- id: int
- client: FK(User)
- expert: FK(User)
- subject: FK(Subject)
- work_type: FK(WorkType)
- complexity: FK(Complexity)
- title: str
- description: TextField
- deadline: DateTime
- budget: Decimal
- status: str (choices: new, waiting_payment, in_progress, review, revision, completed, cancelled)
- created_at: DateTime
```

#### Transaction
```python
- id: int
- user: FK(User)
- order: FK(Order)
- amount: Decimal
- type: str (choices: hold, release, payout, commission, refund)
- timestamp: DateTime
```

#### ExpertStatistics
```python
- id: int
- expert: OneToOne(User)
- total_orders: int
- completed_orders: int
- average_rating: Decimal
- success_rate: Decimal
- total_earnings: Decimal
- response_time_avg: Duration
- last_updated: DateTime
```

#### ExpertReview
```python
- id: int
- expert: FK(User)
- order: OneToOne(Order)
- client: FK(User)
- rating: int (1-5)
- comment: TextField
- created_at: DateTime
- is_published: bool
```

### Новая модель

#### Notification (см. раздел Components 3)

### Database Indexes

Для оптимизации производительности необходимо добавить индексы:

```python
# apps/orders/models.py - Order
class Meta:
    indexes = [
        models.Index(fields=['expert', 'status', '-created_at']),
        models.Index(fields=['status', 'subject', '-created_at']),
        models.Index(fields=['-created_at']),
    ]

# apps/orders/models.py - Transaction
class Meta:
    indexes = [
        models.Index(fields=['user', '-timestamp']),
        models.Index(fields=['user', 'type', '-timestamp']),
    ]

# apps/experts/models.py - ExpertReview
class Meta:
    indexes = [
        models.Index(fields=['expert', 'is_published', '-created_at']),
    ]
```

## Error Handling

### Стандартные коды ошибок

```python
# 400 Bad Request
- Некорректные параметры запроса
- Отсутствуют обязательные поля

# 401 Unauthorized
- Пользователь не аутентифицирован

# 403 Forbidden
- Пользователь не является экспертом
- Нет прав на выполнение действия
- Нет верифицированной специализации

# 404 Not Found
- Заказ не найден
- Уведомление не найдено
- Транзакция не найдена

# 409 Conflict
- Заказ уже взят другим экспертом
- Анкета уже существует

# 500 Internal Server Error
- Ошибка сервера
```

### Обработка ошибок в ViewSet

```python
from rest_framework.exceptions import (
    PermissionDenied, 
    NotFound, 
    ValidationError
)

class ExpertDashboardViewSet(viewsets.ViewSet):
    
    def handle_exception(self, exc):
        """Централизованная обработка ошибок"""
        if isinstance(exc, PermissionDenied):
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().handle_exception(exc)
```

## Testing Strategy

### Unit Tests

**Файл:** `apps/experts/tests/test_services.py`

```python
class ExpertStatisticsServiceTest(TestCase):
    def test_get_dashboard_statistics(self):
        """Тест получения статистики дашборда"""
        
    def test_update_expert_statistics(self):
        """Тест обновления статистики"""

class ExpertFinanceServiceTest(TestCase):
    def test_get_financial_summary(self):
        """Тест получения финансовой сводки"""
        
    def test_calculate_pending_payouts(self):
        """Тест расчета ожидающих выплат"""

class ExpertOrderServiceTest(TestCase):
    def test_get_available_orders(self):
        """Тест получения доступных заказов"""
        
    def test_take_order_success(self):
        """Тест успешного взятия заказа"""
        
    def test_take_order_no_specialization(self):
        """Тест взятия заказа без специализации"""
```

### Integration Tests

**Файл:** `apps/experts/tests/test_views.py`

```python
class ExpertDashboardViewSetTest(APITestCase):
    def setUp(self):
        """Создание тестовых данных"""
        self.expert = User.objects.create_user(
            username='expert1',
            role='expert'
        )
        self.client.force_authenticate(user=self.expert)
        
    def test_statistics_endpoint(self):
        """Тест эндпоинта статистики"""
        
    def test_financial_summary_endpoint(self):
        """Тест эндпоинта финансовой сводки"""
        
    def test_transactions_endpoint(self):
        """Тест эндпоинта транзакций"""
        
    def test_reviews_endpoint(self):
        """Тест эндпоинта отзывов"""
        
    def test_notifications_endpoint(self):
        """Тест эндпоинта уведомлений"""
        
    def test_take_order_endpoint(self):
        """Тест эндпоинта взятия заказа"""
```

### Performance Tests

```python
class ExpertDashboardPerformanceTest(TestCase):
    def test_available_orders_query_count(self):
        """Проверка количества запросов при получении доступных заказов"""
        with self.assertNumQueries(3):  # Максимум 3 запроса
            response = self.client.get('/api/experts/dashboard/available-orders/')
            
    def test_statistics_response_time(self):
        """Проверка времени ответа статистики"""
        start = time.time()
        response = self.client.get('/api/experts/dashboard/statistics/')
        duration = time.time() - start
        self.assertLess(duration, 0.5)  # Меньше 500ms
```

## Performance Optimization

### Query Optimization

1. **select_related** для ForeignKey:
```python
Order.objects.select_related('client', 'subject', 'work_type', 'complexity')
```

2. **prefetch_related** для ManyToMany и обратных FK:
```python
User.objects.prefetch_related('specializations__subject', 'documents')
```

3. **only/defer** для выборки полей:
```python
Order.objects.only('id', 'title', 'status', 'budget', 'deadline')
```

4. **aggregate/annotate** для агрегации:
```python
ExpertReview.objects.filter(expert=expert).aggregate(
    avg_rating=Avg('rating'),
    total_reviews=Count('id')
)
```

### Caching Strategy

```python
from django.core.cache import cache

class ExpertStatisticsService:
    @staticmethod
    def get_dashboard_statistics(expert: User) -> dict:
        cache_key = f'expert_stats_{expert.id}'
        stats = cache.get(cache_key)
        
        if stats is None:
            stats = {
                # ... вычисление статистики
            }
            cache.set(cache_key, stats, timeout=300)  # 5 минут
            
        return stats
```

### Database Connection Pooling

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Переиспользование соединений
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

## Security Considerations

### Authentication & Authorization

1. **JWT Authentication** (уже реализовано через djangorestframework-simplejwt)
2. **Permission Classes**:
```python
class IsExpert(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'expert'
```

### Data Validation

```python
class TransactionFilterSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=['payout', 'payment', 'refund', 'commission'],
        required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    
    def validate(self, data):
        if data.get('date_from') and data.get('date_to'):
            if data['date_from'] > data['date_to']:
                raise serializers.ValidationError(
                    "date_from должна быть раньше date_to"
                )
        return data
```

### Rate Limiting

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}
```

## Migration Plan

### Phase 1: Database Changes
1. Создать модель Notification
2. Добавить индексы в существующие модели
3. Запустить миграции

### Phase 2: Services Layer
1. Создать ExpertStatisticsService
2. Создать ExpertFinanceService
3. Создать ExpertOrderService
4. Покрыть unit-тестами

### Phase 3: API Endpoints
1. Добавить новые методы в ExpertDashboardViewSet
2. Создать сериализаторы
3. Обновить URL routing
4. Покрыть integration-тестами

### Phase 4: Optimization
1. Добавить кэширование
2. Оптимизировать запросы
3. Провести performance-тесты

### Phase 5: Documentation & Deployment
1. Обновить API документацию
2. Провести code review
3. Развернуть на staging
4. Провести тестирование
5. Развернуть на production

## API Documentation

Использовать drf-spectacular для автоматической генерации OpenAPI документации:

```python
# settings.py
INSTALLED_APPS = [
    ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
```

## Monitoring & Logging

```python
import logging

logger = logging.getLogger(__name__)

class ExpertDashboardViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        try:
            logger.info(f"Expert {request.user.id} requested statistics")
            stats = ExpertStatisticsService.get_dashboard_statistics(request.user)
            return Response(stats)
        except Exception as e:
            logger.error(f"Error getting statistics for expert {request.user.id}: {str(e)}")
            raise
```

## Conclusion

Данный дизайн обеспечивает:
- Масштабируемую архитектуру с разделением на слои
- Оптимизированные запросы к базе данных
- Безопасность через аутентификацию и авторизацию
- Тестируемость через unit и integration тесты
- Производительность через кэширование и оптимизацию запросов
- Мониторинг через логирование

Реализация будет выполняться поэтапно согласно Migration Plan.
