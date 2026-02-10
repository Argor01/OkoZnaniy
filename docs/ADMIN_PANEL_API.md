# API Админ-панели

## Базовый URL
`/api/admin-panel/`

## Аутентификация
Все эндпоинты требуют JWT токен и роль `admin`.

---

## Управление пользователями

### Получить всех пользователей
```
GET /api/admin-panel/users/
```

### Получить заблокированных пользователей
```
GET /api/admin-panel/users/blocked/
```

### Заблокировать пользователя
```
POST /api/admin-panel/users/{user_id}/block/
```

### Разблокировать пользователя
```
POST /api/admin-panel/users/{user_id}/unblock/
```

### Изменить роль пользователя
```
POST /api/admin-panel/users/{user_id}/change-role/
Body: { "role": "client|expert|partner|admin|director" }
```

---

## Управление заказами

### Получить все заказы
```
GET /api/admin-panel/orders/
```

### Получить проблемные заказы
```
GET /api/admin-panel/orders/problems/
```
Возвращает заказы со статусом `disputed`, `cancelled` или с флагом `has_issues=True`

### Изменить статус заказа
```
POST /api/admin-panel/orders/{order_id}/change-status/
Body: { "status": "new|in_progress|completed|cancelled|disputed" }
```

---

## Запросы в поддержку

### Получить запросы
```
GET /api/admin-panel/support-requests/
GET /api/admin-panel/support-requests/?status=open
GET /api/admin-panel/support-requests/?status=in_progress
GET /api/admin-panel/support-requests/?status=completed
```

### Взять запрос в работу
```
POST /api/admin-panel/support-requests/{id}/take_request/
```

### Завершить запрос
```
POST /api/admin-panel/support-requests/{id}/complete_request/
```

### Отправить сообщение в запрос
```
POST /api/admin-panel/support-requests/{id}/send_message/
Body: { "message": "текст сообщения" }
```

---

## Обращения (Claims)

### Получить обращения
```
GET /api/admin-panel/claims/
GET /api/admin-panel/claims/?status=new
GET /api/admin-panel/claims/?status=in_progress
GET /api/admin-panel/claims/?status=completed
GET /api/admin-panel/claims/?status=pending_approval
```

### Взять обращение в работу
```
POST /api/admin-panel/claims/{id}/take_in_work/
```

### Завершить обращение
```
POST /api/admin-panel/claims/{id}/complete_claim/
Body: { "resolution": "текст решения" }
```

### Отклонить обращение
```
POST /api/admin-panel/claims/{id}/reject_claim/
Body: { "reason": "причина отклонения" }
```

---

## Чаты администраторов

### Получить все комнаты
```
GET /api/admin-panel/chat-rooms/
```

### Отправить сообщение в чат
```
POST /api/admin-panel/chat-rooms/{id}/send_message/
Body: { "message": "текст сообщения" }
```

### Присоединиться к чату
```
POST /api/admin-panel/chat-rooms/{id}/join_room/
```

### Покинуть чат
```
POST /api/admin-panel/chat-rooms/{id}/leave_room/
```

---

## Статистика

### Получить общую статистику
```
GET /api/admin-panel/stats/
```

Возвращает:
```json
{
  "total_users": 150,
  "active_users": 145,
  "blocked_users": 5,
  "total_orders": 320,
  "active_orders": 45,
  "problem_orders": 8,
  "open_support_requests": 12,
  "new_claims": 6
}
```

---

## Модели данных

### SupportRequest
- `id` - ID запроса
- `user` - Пользователь
- `admin` - Администратор (назначенный)
- `subject` - Тема
- `description` - Описание
- `status` - Статус (open, in_progress, completed)
- `priority` - Приоритет (low, medium, high, urgent)
- `created_at` - Дата создания
- `messages` - Сообщения

### Claim
- `id` - ID обращения
- `user` - Пользователь
- `admin` - Администратор
- `order` - Связанный заказ (опционально)
- `claim_type` - Тип (complaint, refund, quality, other)
- `subject` - Тема
- `description` - Описание
- `status` - Статус (new, in_progress, completed, pending_approval)
- `resolution` - Решение
- `created_at` - Дата создания

### AdminChatRoom
- `id` - ID комнаты
- `name` - Название
- `description` - Описание
- `members` - Участники
- `created_by` - Создатель
- `messages` - Сообщения
