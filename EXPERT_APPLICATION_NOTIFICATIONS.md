# Уведомления о статусе заявки эксперта

## Описание

Система автоматически отправляет уведомления экспертам о статусе их заявки после рассмотрения директором.

## Типы уведомлений

### 1. Заявка одобрена (`application_approved`)
- **Когда отправляется**: Директор одобряет заявку эксперта
- **Получатель**: Эксперт, подавший заявку
- **Заголовок**: "Анкета одобрена"
- **Сообщение**: "Ваша анкета эксперта была одобрена! Теперь вы можете брать заказы в работу."
- **Иконка**: Зелёная галочка ✓
- **Категория**: Вопросы (questions)

### 2. Заявка отклонена (`application_rejected`)
- **Когда отправляется**: Директор отклоняет заявку эксперта
- **Получатель**: Эксперт, подавший заявку
- **Заголовок**: "Анкета отклонена"
- **Сообщение**: "К сожалению, ваша анкета эксперта была отклонена. Причина: [причина]"
- **Иконка**: Красные часы ⏰
- **Категория**: Вопросы (questions)

### 3. Требуется доработка (`application_rejected` с флагом rework)
- **Когда отправляется**: Директор отправляет заявку на доработку
- **Получатель**: Эксперт, подавший заявку
- **Заголовок**: "Требуется доработка анкеты"
- **Сообщение**: "Ваша анкета требует доработки. Комментарий: [комментарий]"
- **Иконка**: Красные часы ⏰
- **Категория**: Вопросы (questions)

## Как это работает

### Backend (Django)

1. **Директор рассматривает заявку** через API endpoint:
   - `POST /api/director/expert-applications/{id}/approve/` - одобрить
   - `POST /api/director/expert-applications/{id}/reject/` - отклонить
   - `POST /api/director/expert-applications/{id}/rework/` - на доработку

2. **Автоматическое создание уведомления**:
   ```python
   # В apps/director/views.py
   from apps.notifications.services import NotificationService
   
   # При одобрении
   NotificationService.notify_application_approved(application)
   
   # При отклонении
   NotificationService.notify_application_rejected(application, reason)
   
   # При отправке на доработку
   NotificationService.notify_application_rework(application, comment)
   ```

3. **Сохранение в БД**:
   - Создаётся запись в таблице `notifications_notification`
   - Связывается с пользователем через `recipient_id`
   - Тип уведомления: `application_approved` или `application_rejected`

### Frontend (React)

1. **Загрузка уведомлений**:
   ```typescript
   // В NotificationsModalNew.tsx
   const data = await notificationsApi.getAll();
   ```

2. **Отображение в модальном окне**:
   - Уведомления отображаются в категории "Вопросы"
   - Иконка зависит от типа (одобрено/отклонено)
   - Показывается время создания уведомления

3. **Отметка как прочитанное**:
   ```typescript
   await notificationsApi.markAsRead(notification.id);
   ```

## API Endpoints

### Получить все уведомления
```http
GET /api/notifications/
Authorization: Bearer {token}
```

**Ответ:**
```json
[
  {
    "id": 1,
    "type": "application_approved",
    "title": "Анкета одобрена",
    "message": "Ваша анкета эксперта была одобрена! Теперь вы можете брать заказы в работу.",
    "is_read": false,
    "created_at": "2024-12-19T10:30:00Z",
    "data": {
      "application_id": 5
    }
  }
]
```

### Отметить уведомление как прочитанное
```http
POST /api/notifications/{id}/mark_as_read/
Authorization: Bearer {token}
```

### Отметить все уведомления как прочитанные
```http
POST /api/notifications/mark_all_as_read/
Authorization: Bearer {token}
```

## Тестирование

### Ручное тестирование

1. **Создайте тестового пользователя-эксперта**:
   - Зарегистрируйтесь как клиент
   - Подайте заявку на роль эксперта

2. **Войдите как директор**:
   - Перейдите в раздел управления заявками
   - Одобрите или отклоните заявку

3. **Проверьте уведомление**:
   - Войдите как эксперт
   - Откройте модальное окно уведомлений (иконка колокольчика)
   - Проверьте наличие уведомления о статусе заявки

### Автоматическое тестирование

Запустите тестовый скрипт:
```bash
python test_application_notifications.py
```

## Структура данных

### Модель Notification
```python
class Notification(models.Model):
    recipient = ForeignKey(User)  # Получатель
    type = CharField(choices=NotificationType.choices)  # Тип
    title = CharField(max_length=255)  # Заголовок
    message = TextField()  # Сообщение
    data = JSONField(default=dict)  # Доп. данные
    related_object_id = IntegerField()  # ID заявки
    related_object_type = CharField()  # 'expert_application'
    is_read = BooleanField(default=False)  # Прочитано
    created_at = DateTimeField()  # Дата создания
```

### Дополнительные данные (data)
```json
{
  "application_id": 5,  // ID заявки
  "reason": "Недостаточно опыта",  // Причина отклонения (если есть)
  "comment": "Добавьте больше информации",  // Комментарий (для доработки)
  "status": "rework"  // Флаг доработки (опционально)
}
```

## Настройка

### Добавление новых типов уведомлений

1. **Добавьте тип в модель** (`apps/notifications/models.py`):
   ```python
   class NotificationType(models.TextChoices):
       NEW_TYPE = 'new_type', 'Описание'
   ```

2. **Создайте метод в сервисе** (`apps/notifications/services.py`):
   ```python
   @staticmethod
   def notify_new_type(obj):
       NotificationService.create_notification(
           recipient=obj.user,
           type=NotificationType.NEW_TYPE,
           title="Заголовок",
           message="Сообщение"
       )
   ```

3. **Добавьте иконку во фронтенд** (`NotificationsModalNew.tsx`):
   ```typescript
   const iconMap = {
       'new_type': <IconComponent style={{ color: '#color' }} />
   };
   ```

## Troubleshooting

### Уведомления не приходят
1. Проверьте, что метод `NotificationService.notify_*` вызывается в views
2. Проверьте логи Django на наличие ошибок
3. Убедитесь, что пользователь существует и активен

### Уведомления не отображаются
1. Проверьте API endpoint `/api/notifications/` в браузере
2. Откройте консоль разработчика и проверьте ошибки
3. Убедитесь, что токен авторизации валиден

### Уведомления не отмечаются как прочитанные
1. Проверьте, что endpoint `mark_as_read` работает
2. Проверьте права доступа пользователя
3. Проверьте состояние в Redux/React Query

## Дополнительные возможности

### Фильтрация по категориям
Уведомления о заявках отображаются в категории "Вопросы":
```typescript
const category = getNotificationCategory('application_approved'); // 'questions'
```

### Автоматическое обновление
Уведомления загружаются при открытии модального окна:
```typescript
useEffect(() => {
  if (visible) {
    loadNotifications();
  }
}, [visible]);
```

### Счётчик непрочитанных
```typescript
const unreadCount = notifications.filter(n => !n.is_read).length;
```
