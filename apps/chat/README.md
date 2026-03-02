# Система чатов

## Обзор

В системе существует два типа чатов:

### 1. Обычные чаты (Chat)
- Используются для общения между клиентами и экспертами
- Отображаются на странице "Сообщения" для пользователей
- Управляются через `ChatViewSet` (API: `/api/chat/chats/`)

### 2. Чаты технической поддержки (SupportChat)
- Используются для общения клиентов/экспертов с технической поддержкой
- Отображаются ТОЛЬКО в разделе "Чаты поддержки" в админ-панели
- НЕ отображаются на странице обычных чатов пользователей
- Управляются через `SupportChatViewSet` (API: `/api/chat/support/`)

## Фильтрация чатов поддержки

Чаты с технической поддержкой автоматически исключаются из списка обычных чатов по следующим критериям:

1. **SUPPORT_USER_ID** - ID пользователя технической поддержки (настраивается в `.env`)
   ```env
   SUPPORT_USER_ID=123
   ```

2. **context_title** - чаты с маркерами в названии:
   - "поддержка"
   - "support"
   - "техподдержка"

## Модели

### Chat
```python
class Chat(models.Model):
    order = models.ForeignKey(Order, ...)
    client = models.ForeignKey(User, ...)
    expert = models.ForeignKey(User, ...)
    participants = models.ManyToManyField(User)
    context_title = models.CharField(...)
```

### SupportChat
```python
class SupportChat(models.Model):
    client = models.ForeignKey(User, ...)
    admin = models.ForeignKey(User, ...)
    status = models.CharField(...)  # open, in_progress, resolved, closed
    priority = models.CharField(...)  # low, medium, high, urgent
    subject = models.CharField(...)
```

## API Endpoints

### Обычные чаты
- `GET /api/chat/chats/` - список чатов (без чатов поддержки)
- `GET /api/chat/chats/{id}/` - детали чата
- `POST /api/chat/chats/{id}/send_message/` - отправить сообщение
- `POST /api/chat/chats/get_or_create_by_user/` - создать/получить чат с пользователем

### Чаты поддержки
- `GET /api/chat/support/` - список чатов поддержки
- `POST /api/chat/support/` - создать новый чат поддержки
- `GET /api/chat/support/{id}/messages/` - получить сообщения
- `POST /api/chat/support/{id}/send_message/` - отправить сообщение
- `POST /api/chat/support/{id}/take_chat/` - взять чат в работу (только админы)
- `POST /api/chat/support/{id}/close_chat/` - закрыть чат

## Права доступа

### Обычные чаты
- Пользователи видят только чаты, в которых они являются участниками
- Чаты поддержки автоматически исключаются

### Чаты поддержки
- **Админы** видят все чаты поддержки
- **Клиенты/Эксперты** видят только свои чаты с поддержкой

## Создание чата поддержки

### Фронтенд
```typescript
import { supportApi } from '@/features/support/api/support';

const chat = await supportApi.createChat({
  subject: 'Помощь в размещении заказа',
  message: 'Текст обращения',
  priority: 'medium'
});
```

### Бэкенд
```python
from apps.chat.models import SupportChat, SupportMessage

# Создание чата
chat = SupportChat.objects.create(
    client=user,
    subject='Вопрос по работе платформы',
    priority='medium',
    status='open'
)

# Создание первого сообщения
SupportMessage.objects.create(
    chat=chat,
    sender=user,
    text='Текст обращения'
)
```

## Уведомления

При создании нового чата поддержки все администраторы получают уведомление:
```python
from apps.notifications.services import NotificationService

NotificationService.create_notification(
    recipient=admin,
    type='support_request',
    title='Новое обращение в поддержку',
    message=f'{user.get_full_name()}: {message[:100]}',
    related_object_id=chat.id,
    related_object_type='support_chat'
)
```

## Настройка

### Переменные окружения (.env)
```env
# ID пользователя технической поддержки
# Чаты с этим пользователем будут исключены из обычных чатов
SUPPORT_USER_ID=123
```

### Django settings (config/settings.py)
```python
SUPPORT_USER_ID = os.getenv('SUPPORT_USER_ID', None)
if SUPPORT_USER_ID:
    try:
        SUPPORT_USER_ID = int(SUPPORT_USER_ID)
    except (ValueError, TypeError):
        SUPPORT_USER_ID = None
```

## Миграция с обычных чатов на чаты поддержки

Если в системе уже есть чаты с админами поддержки через модель `Chat`, их можно мигрировать:

```python
from apps.chat.models import Chat, SupportChat, SupportMessage, Message
from apps.users.models import User

# Получаем ID админа поддержки
support_admin = User.objects.get(id=SUPPORT_USER_ID)

# Находим все чаты с админом поддержки
old_chats = Chat.objects.filter(participants=support_admin)

for old_chat in old_chats:
    # Создаем новый чат поддержки
    support_chat = SupportChat.objects.create(
        client=old_chat.client or old_chat.participants.exclude(id=support_admin.id).first(),
        admin=support_admin,
        subject='Миграция из старого чата',
        status='open',
        priority='medium'
    )
    
    # Копируем сообщения
    for message in old_chat.messages.all():
        SupportMessage.objects.create(
            chat=support_chat,
            sender=message.sender,
            text=message.text,
            message_type='text',
            is_read=message.is_read,
            created_at=message.created_at
        )
    
    # Удаляем старый чат (опционально)
    # old_chat.delete()
```

## Тестирование

```bash
# Запуск тестов
python manage.py test apps.chat

# Проверка фильтрации чатов
python manage.py shell
>>> from apps.chat.models import Chat, SupportChat
>>> from apps.users.models import User
>>> user = User.objects.first()
>>> Chat.objects.filter(participants=user).count()  # Обычные чаты
>>> SupportChat.objects.filter(client=user).count()  # Чаты поддержки
```
