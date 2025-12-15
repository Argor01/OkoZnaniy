# Руководство по чату и уведомлениям

## 🚀 Быстрый старт

### 1. Настройка Backend (Django)

Чат уже подключен к проекту! Осталось только выполнить миграции:

```bash
cd OkoZnaniy
python manage.py makemigrations chat
python manage.py migrate
```

Или используйте готовый скрипт:
```bash
setup-chat.bat
```

### 2. Проверка работы API

Запустите сервер:
```bash
python manage.py runserver
```

Откройте в браузере:
- Список чатов: http://localhost:8000/api/chat/chats/
- Уведомления: http://localhost:8000/api/notifications/

### 3. Frontend готов!

Все компоненты уже созданы и готовы к использованию.

## 📦 Что было создано

### Backend (Django)
- ✅ Модели `Chat` и `Message` в `apps/chat/models.py`
- ✅ API endpoints в `apps/chat/views.py`
- ✅ URL маршруты подключены в `config/urls.py`
- ✅ Приложение добавлено в `INSTALLED_APPS`

### Frontend (React)
- ✅ API клиент: `src/api/chat.ts`
- ✅ Компонент чата: `src/components/MessagesModal.tsx`
- ✅ Система уведомлений: `src/components/notifications/NotificationSystem.tsx`
- ✅ Хуки: `src/hooks/useChat.ts` и `src/hooks/useNotifications.ts`
- ✅ Интегрированный компонент: `src/components/DashboardWithChatAndNotifications.tsx`

## 🎯 Использование в дашбордах

### Вариант 1: Использовать готовый компонент-обертку

```tsx
import DashboardWithChatAndNotifications from '../components/DashboardWithChatAndNotifications';

const MyDashboard = () => {
  const userProfile = {
    username: 'Иван Петров',
    avatar: '/media/avatars/user.jpg',
    role: 'expert',
    balance: 5000,
  };

  return (
    <DashboardWithChatAndNotifications 
      userProfile={userProfile}
      onLogout={() => console.log('Logout')}
    >
      {/* Ваш контент дашборда */}
      <div>Мой дашборд</div>
    </DashboardWithChatAndNotifications>
  );
};
```

### Вариант 2: Использовать компоненты отдельно

```tsx
import { useState } from 'react';
import DashboardHeader from '../components/common/DashboardHeader';
import MessagesModal from '../components/MessagesModal';
import NotificationSystem from '../components/notifications/NotificationSystem';
import { useChat } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';

const MyDashboard = () => {
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const { unreadCount: unreadMessages } = useChat();
  const { notifications, unreadCount: unreadNotifications } = useNotifications();

  return (
    <>
      <DashboardHeader
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        onMessagesClick={() => setMessagesOpen(true)}
        onNotificationsClick={() => setNotificationsOpen(true)}
      />
      
      <MessagesModal 
        open={messagesOpen} 
        onClose={() => setMessagesOpen(false)} 
      />
      
      <NotificationSystem
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        settings={{
          orderConfirmation: true,
          claims: true,
          messages: true,
          balanceTopUp: true,
          bids: true,
          systemUpdates: true,
        }}
        onSettingsChange={(settings) => console.log(settings)}
      />
    </>
  );
};
```

## 🔧 API Endpoints

### Чат

**GET** `/api/chat/chats/` - Получить все чаты пользователя
```json
[
  {
    "id": 1,
    "order": 123,
    "participants": [...],
    "messages": [...],
    "last_message": {...},
    "unread_count": 2
  }
]
```

**GET** `/api/chat/chats/{id}/messages/` - Получить сообщения чата
```json
[
  {
    "id": 1,
    "sender": {
      "id": 1,
      "username": "user",
      "first_name": "Иван",
      "last_name": "Петров"
    },
    "text": "Привет!",
    "created_at": "2024-12-12T10:30:00Z"
  }
]
```

**POST** `/api/chat/chats/{id}/send_message/` - Отправить сообщение
```json
{
  "text": "Привет! Как дела?"
}
```

### Уведомления

**GET** `/api/notifications/` - Получить все уведомления

**POST** `/api/notifications/{id}/mark_read/` - Отметить как прочитанное

**POST** `/api/notifications/mark_all_read/` - Отметить все как прочитанные

## 🎨 Особенности

### Автообновление
- Чаты обновляются каждые **15 секунд**
- Уведомления обновляются каждые **30 секунд**

### Адаптивность
- Полностью адаптивный дизайн
- Оптимизирован для мобильных устройств

### Безопасность
- Защита от отправки контактных данных в чате
- Проверка прав доступа к чатам
- JWT аутентификация

## 🔄 Интеграция с заказами

Чат автоматически создается для каждого заказа:

```python
# В Django при создании заказа
from apps.chat.models import Chat

order = Order.objects.create(...)
chat = Chat.objects.create(order=order)
chat.participants.add(order.client, order.expert)
```

## 📱 Уведомления о новых сообщениях

При отправке сообщения автоматически создается уведомление:

```python
# В apps/chat/views.py
from apps.notifications.services import NotificationService

message = Message.objects.create(...)
NotificationService.notify_new_message(message)
```

## 🐛 Отладка

### Проблема: Чаты не загружаются

1. Проверьте, что миграции применены:
```bash
python manage.py showmigrations chat
```

2. Проверьте, что URL подключен:
```bash
python manage.py show_urls | grep chat
```

3. Проверьте токен авторизации в localStorage:
```javascript
console.log(localStorage.getItem('access_token'));
```

### Проблема: Сообщения не отправляются

1. Откройте консоль браузера (F12)
2. Проверьте Network tab на ошибки
3. Убедитесь, что пользователь является участником чата

## 🚀 Следующие шаги

### WebSocket для реального времени (опционально)

Для мгновенной доставки сообщений без обновления:

1. Создайте `apps/chat/routing.py`
2. Создайте WebSocket consumer
3. Раскомментируйте WebSocket в `config/asgi.py`
4. Настройте Redis

Подробнее в `CHAT_IMPLEMENTATION_PLAN.md`

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи Django: `python manage.py runserver`
2. Проверьте консоль браузера (F12)
3. Убедитесь, что все миграции применены
4. Проверьте, что токен авторизации валиден

---

**Готово!** Чат и уведомления полностью настроены и готовы к использованию! 🎉
