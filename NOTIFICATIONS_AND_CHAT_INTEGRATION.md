# Интеграция системы уведомлений и чата

## Что было сделано

### Backend

1. **Модели**
   - Добавлено поле `is_read` в модель `Message` для отслеживания прочитанных сообщений
   - Добавлены индексы для оптимизации запросов

2. **API эндпоинты**
   - `/api/chat/chats/` - список всех чатов пользователя
   - `/api/chat/chats/{id}/` - детали конкретного чата
   - `/api/chat/chats/{id}/send_message/` - отправка сообщения
   - `/api/chat/chats/{id}/mark_read/` - отметить сообщения как прочитанные
   - `/api/chat/chats/unread_count/` - количество непрочитанных сообщений
   - `/api/chat/chats/get_or_create_by_order/` - получить/создать чат по ID заказа
   - `/api/notifications/notifications/` - список уведомлений
   - `/api/notifications/notifications/{id}/mark_read/` - отметить уведомление
   - `/api/notifications/notifications/mark_all_read/` - отметить все уведомления

3. **Сервисы**
   - `NotificationService` - создание уведомлений для различных событий
   - Автоматическое создание уведомлений при отправке сообщений

### Frontend

1. **API клиенты**
   - `src/api/chat.ts` - клиент для работы с чатами
   - `src/api/notifications.ts` - клиент для работы с уведомлениями

2. **Компоненты**
   - `NotificationsModalNew.tsx` - модальное окно уведомлений с реальным API
   - `MessageModalNew.tsx` - модальное окно чата с реальным API

## Инструкция по интеграции

### Шаг 1: Установка зависимостей

```bash
cd frontend-react
npm install date-fns
```

### Шаг 2: Применение миграций

На сервере выполните:

```bash
docker-compose exec backend python manage.py migrate chat
```

Или локально:

```bash
python manage.py migrate chat
```

### Шаг 3: Замена компонентов

В файле `src/pages/ExpertDashboard/index.tsx` замените импорты:

```typescript
// Было:
import NotificationsModal from './modals/NotificationsModal';
import MessageModal from './modals/MessageModal';

// Стало:
import NotificationsModal from './modals/NotificationsModalNew';
import MessageModal from './modals/MessageModalNew';
```

### Шаг 4: Проверка работы

1. Запустите backend и frontend
2. Войдите в систему
3. Откройте модальное окно уведомлений - должны загрузиться реальные данные из БД
4. Откройте модальное окно сообщений - должны загрузиться чаты из БД
5. Попробуйте отправить сообщение - оно должно сохраниться в БД

### Шаг 5: Удаление старых файлов (опционально)

После проверки работы можно удалить старые файлы:

```bash
rm frontend-react/src/pages/ExpertDashboard/modals/NotificationsModal.tsx
rm frontend-react/src/pages/ExpertDashboard/modals/MessageModal.tsx
rm frontend-react/src/pages/ExpertDashboard/mockData.tsx
```

И переименовать новые:

```bash
mv frontend-react/src/pages/ExpertDashboard/modals/NotificationsModalNew.tsx frontend-react/src/pages/ExpertDashboard/modals/NotificationsModal.tsx
mv frontend-react/src/pages/ExpertDashboard/modals/MessageModalNew.tsx frontend-react/src/pages/ExpertDashboard/modals/MessageModal.tsx
```

## Особенности реализации

### Уведомления

- Автоматически создаются при различных событиях (новый заказ, сообщение, изменение статуса и т.д.)
- Фильтрация по категориям (все, заказы, форум, вопросы)
- Отметка как прочитанные при клике
- Форматирование времени на русском языке

### Чат

- Список чатов с последним сообщением и количеством непрочитанных
- Автоматическая отметка сообщений как прочитанных при открытии чата
- Поиск по чатам
- Фильтр непрочитанных
- Отправка сообщений в реальном времени
- Привязка к заказам

## Дальнейшие улучшения

1. **WebSocket для real-time обновлений**
   - Установить `channels` и `daphne`
   - Настроить WebSocket consumers
   - Подключить frontend к WebSocket

2. **Push-уведомления**
   - Интеграция с Firebase Cloud Messaging
   - Уведомления в браузере

3. **Файлы в чате**
   - Добавить возможность отправки файлов
   - Превью изображений

4. **Эмодзи**
   - Интеграция emoji-picker (уже есть в старом компоненте)

5. **Типизация сообщений**
   - Системные сообщения
   - Сообщения с действиями (принять заказ, отклонить и т.д.)

## Тестирование

### Создание тестовых данных

```python
# В Django shell
python manage.py shell

from apps.users.models import User
from apps.orders.models import Order
from apps.chat.models import Chat, Message
from apps.notifications.services import NotificationService

# Создать тестовое уведомление
user = User.objects.first()
NotificationService.create_notification(
    recipient=user,
    notification_type='new_order',
    title='Тестовое уведомление',
    message='Это тестовое уведомление для проверки системы'
)

# Создать тестовый чат
order = Order.objects.first()
chat, created = Chat.objects.get_or_create(order=order)
if created:
    chat.participants.add(order.client, order.expert)

# Создать тестовое сообщение
Message.objects.create(
    chat=chat,
    sender=order.client,
    text='Привет! Это тестовое сообщение.'
)
```

## Troubleshooting

### Ошибка 404 при запросах к API

Проверьте, что в `config/urls.py` добавлен путь:
```python
path('api/chat/', include('apps.chat.urls')),
```

### Уведомления не создаются

Проверьте, что в коде используется `NotificationService` для создания уведомлений:
```python
from apps.notifications.services import NotificationService

NotificationService.create_notification(...)
```

### Сообщения не отправляются

1. Проверьте, что пользователь является участником чата
2. Проверьте логи backend на наличие ошибок
3. Проверьте консоль браузера на наличие ошибок API

### CORS ошибки

Убедитесь, что в `settings.py` настроен CORS:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://okoznaniy.ru",
]
```
