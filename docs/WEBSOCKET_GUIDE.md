# WebSocket Guide для OkoZnaniy

## Обзор

Проект использует Django Channels + WebSocket для real-time обновлений на фронтенде (React).

## Архитектура

```
Frontend (React) <--WebSocket--> Nginx <--proxy--> Daphne (ASGI) <--Channels--> Redis
```

## Эндпоинты WebSocket

Все WebSocket подключения требуют JWT токен в query string.

| Эндпоинт | Описание | Группа |
|----------|----------|--------|
| `/ws/chat/<chat_id>/?token=<jwt>` | Сообщения чата | `chat_{id}` |
| `/ws/notifications/?token=<jwt>` | Персональные уведомления | `user_{id}` |
| `/ws/orders/<order_id>/?token=<jwt>` | Обновления заказа | `order_{id}`, `user_{id}` |
| `/ws/arbitration/<case_id>/?token=<jwt>` | Обновления арбитража | `arbitration_{id}`, `user_{id}` |

## Использование на фронтенде

### Базовый хук

```tsx
import { useWebSocket } from '@/hooks';

function MyComponent() {
  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onMessage: (event) => {
      console.log('Новое сообщение:', event.data);
    },
    onNotification: (event) => {
      console.log('Новое уведомление:', event.data);
    },
    onOrderUpdate: (event) => {
      console.log('Обновление заказа:', event.data);
    },
    onArbitrationUpdate: (event) => {
      console.log('Обновление арбитража:', event.data);
    },
  });

  // Подписка на чат
  useEffect(() => {
    subscribe('chat', chatId);
    return () => unsubscribe('chat', chatId);
  }, [chatId]);

  return <div>{isConnected ? 'Connected' : 'Disconnected'}</div>;
}
```

### Хук для чата

```tsx
import { useChatWebSocket } from '@/hooks';

function ChatComponent({ chatId }) {
  const { isConnected, sendTyping } = useChatWebSocket(chatId, (message) => {
    // Обработка нового сообщения
    setMessages(prev => [...prev, message]);
  });

  const handleTyping = () => {
    sendTyping();
  };

  return <div>...</div>;
}
```

## Типы событий

### Чат

| Тип | Описание | Данные |
|-----|----------|--------|
| `new_message` | Новое сообщение | Объект Message |
| `typing` | Индикатор набора текста | `{user_id, username}` |

### Уведомления

| Тип | Описание | Данные |
|-----|----------|--------|
| `new_notification` | Новое уведомление | Объект Notification |
| `notification_batch` | Пакет уведомлений | Массив Notification |

### Заказы

| Тип | Описание | Данные |
|-----|----------|--------|
| `order_status_changed` | Изменение статуса | `{order_id, old_status, new_status}` |
| `new_bid` | Новый отклик | Объект Bid |
| `order_file_uploaded` | Загружен файл | `{order_id, file_data}` |

### Арбитраж

| Тип | Описание | Данные |
|-----|----------|--------|
| `new_arbitration_message` | Новое сообщение | Объект ArbitrationMessage |
| `arbitration_status_changed` | Изменение статуса | `{case_id, old_status, new_status}` |
| `arbitration_activity` | Новая активность | Объект Activity |

## Отправка уведомлений с бэкенда

```python
from apps.chat.websocket_utils import (
    notify_chat_message,
    notify_new_notification,
    notify_order_status,
    notify_new_bid,
    notify_arbitration_message,
    notify_arbitration_status,
)

# Пример: отправка уведомления о новом сообщении
notify_chat_message(chat_id, message_data)

# Пример: отправка персонального уведомления
notify_new_notification(user_id, notification_data)

# Пример: обновление статуса заказа
notify_order_status(order_id, order_data)
```

## Деплой

WebSocket работает через Daphne (ASGI сервер) вместо Gunicorn.

### Docker

```bash
docker-compose up -d backend
```

Daphne запускается автоматически через `docker-entrypoint.sh`.

### Nginx

Nginx проксирует WebSocket подключения через `/ws/` location с поддержкой upgrade заголовков.

## Troubleshooting

### Подключение не устанавливается

1. Проверьте, что Daphne запущен: `docker-compose ps`
2. Проверьте логи: `docker-compose logs backend`
3. Убедитесь, что Redis доступен: `docker-compose exec redis redis-cli ping`

### Уведомления не приходят

1. Проверьте, что каналы настроены: `python manage.py check`
2. Убедитесь, что CHANNEL_LAYERS настроен в settings.py
3. Проверьте Redis: `docker-compose exec redis redis-cli monitor`

### Ошибка аутентификации (code 4001)

Токен истёк или недействителен. Обновите токен в localStorage.
