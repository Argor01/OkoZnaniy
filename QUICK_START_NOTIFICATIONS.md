# Быстрый старт: Система уведомлений и чата

## Что нужно сделать

### 1. Установить зависимости

```bash
cd frontend-react
npm install date-fns
```

### 2. Применить миграции на сервере

```bash
# На сервере
docker-compose exec backend python manage.py migrate chat

# Или локально
python manage.py migrate chat
```

### 3. Обновить ExpertDashboard

Откройте `frontend-react/src/pages/ExpertDashboard/index.tsx` и замените импорты:

```typescript
// Найдите эти строки:
import NotificationsModal from './modals/NotificationsModal';
import MessageModal from './modals/MessageModal';

// Замените на:
import NotificationsModal from './modals/NotificationsModalNew';
import MessageModal from './modals/MessageModalNew';
```

### 4. Перезапустить приложение

```bash
# Frontend
cd frontend-react
npm run dev

# Backend (если нужно)
docker-compose restart backend
```

### 5. Проверить работу

1. Откройте сайт и войдите в систему
2. Нажмите на иконку уведомлений - должны загрузиться данные из БД
3. Нажмите на иконку сообщений - должны загрузиться чаты из БД
4. Попробуйте отправить сообщение

## Что изменилось

### ✅ Теперь работает с БД

- **Уведомления** загружаются из таблицы `notifications_notification`
- **Чаты** загружаются из таблиц `chat_chat` и `chat_message`
- **Все данные сохраняются** в базу данных

### ✅ Новые возможности

- Отметка уведомлений как прочитанные
- Отметка сообщений как прочитанные
- Счетчик непрочитанных сообщений
- Поиск по чатам
- Фильтрация уведомлений по категориям

### ❌ Удалено

- Моковые данные (mockData, mockMessages)
- localStorage для хранения данных

## API эндпоинты

### Уведомления

- `GET /api/notifications/notifications/` - список уведомлений
- `POST /api/notifications/notifications/{id}/mark_read/` - отметить как прочитанное
- `POST /api/notifications/notifications/mark_all_read/` - отметить все

### Чат

- `GET /api/chat/chats/` - список чатов
- `GET /api/chat/chats/{id}/` - детали чата
- `POST /api/chat/chats/{id}/send_message/` - отправить сообщение
- `POST /api/chat/chats/{id}/mark_read/` - отметить сообщения как прочитанные
- `GET /api/chat/chats/unread_count/` - количество непрочитанных
- `POST /api/chat/chats/get_or_create_by_order/` - получить/создать чат по заказу

## Создание тестовых данных

### Через Django shell

```python
python manage.py shell

from apps.users.models import User
from apps.notifications.services import NotificationService

user = User.objects.first()
NotificationService.create_notification(
    recipient=user,
    notification_type='new_order',
    title='Тестовое уведомление',
    message='Проверка системы уведомлений'
)
```

### Через API (для чата)

```bash
# Создать чат по заказу
curl -X POST http://localhost:8000/api/chat/chats/get_or_create_by_order/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id": 1}'

# Отправить сообщение
curl -X POST http://localhost:8000/api/chat/chats/1/send_message/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Привет!"}'
```

## Troubleshooting

### Ошибка: "Cannot find module 'date-fns'"

```bash
cd frontend-react
npm install date-fns
```

### Ошибка: "404 Not Found" при запросах к /api/chat/

Проверьте `config/urls.py`:
```python
path('api/chat/', include('apps.chat.urls')),
```

### Уведомления не загружаются

1. Проверьте консоль браузера (F12)
2. Проверьте, что пользователь авторизован
3. Проверьте логи backend: `docker-compose logs backend`

### Сообщения не отправляются

1. Проверьте, что чат существует
2. Проверьте, что пользователь является участником чата
3. Проверьте логи: `docker-compose logs backend`

## Дополнительно

Полная документация: `NOTIFICATIONS_AND_CHAT_INTEGRATION.md`
