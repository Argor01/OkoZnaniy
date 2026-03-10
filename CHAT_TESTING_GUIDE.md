# Руководство по тестированию чатов директора

## Что было исправлено

1. **Бэкенд (Django)**:
   - Добавлены алиасы полей в сериализаторах для совместимости с фронтендом:
     - `type` → `room_type`
     - `participants` → `members`
     - `text` → `message`
     - `sent_at` → `created_at`
   - Добавлены поля `online`, `last_seen`, `is_muted` в сериализаторы
   - Добавлено системное сообщение при создании чата
   - Исправлена миграция для поля `created_at` в `ContactViolationLog`

2. **Фронтенд (React)**:
   - Исправлены ошибки с использованием массивов для className
   - Добавлено больше логирования для отладки
   - Исправлена обработка ответа API
   - Добавлено автоматическое обновление списка чатов после создания

## Как протестировать

### 1. Проверка бэкенда

```bash
# Проверить, что бэкенд запущен
docker-compose ps

# Проверить логи бэкенда
docker-compose logs backend --tail=50

# Проверить миграции
docker-compose exec backend python manage.py showmigrations director
```

### 2. Проверка API через curl

```bash
# Получить токен (замените на ваши данные)
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"director","password":"director123"}' \
  | jq -r '.access')

# Получить список чатов
curl -X GET http://localhost:8000/api/director/chat-rooms/ \
  -H "Authorization: Bearer $TOKEN" | jq

# Создать новый чат
curl -X POST http://localhost:8000/api/director/chat-rooms/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тестовый чат",
    "description": "Описание",
    "type": "general"
  }' | jq
```

### 3. Проверка через фронтенд

1. Откройте браузер и перейдите на страницу директора
2. Перейдите в раздел "Внутренняя коммуникация"
3. Откройте консоль разработчика (F12)
4. Нажмите кнопку "Создать"
5. Заполните форму:
   - Название: "Мой тестовый чат"
   - Описание: "Описание чата"
   - Тип: "Общий"
6. Нажмите "Создать"
7. Проверьте консоль на наличие логов:
   - "Creating room with values: ..."
   - "Room created: ..."
   - "Loaded chat rooms: ..."
8. Чат должен появиться в списке слева

### 4. Проверка в консоли браузера

Откройте консоль и проверьте:
- Нет ли ошибок React
- Есть ли логи "Loaded chat rooms: ..."
- Правильно ли загружаются данные

### 5. Проверка базы данных

```bash
# Подключиться к базе данных
docker-compose exec postgres psql -U okoznaniy -d okoznaniy

# Проверить чаты
SELECT id, name, room_type, created_at FROM director_directorchatroom;

# Проверить участников
SELECT room_id, user_id FROM director_directorchatroom_members;

# Проверить сообщения
SELECT id, room_id, message, is_system FROM director_directorchatmessage;

# Выйти
\q
```

## Возможные проблемы

### Чат не появляется после создания

**Причина**: Пользователь не добавлен в участники чата

**Решение**: Проверьте, что в `perform_create` ViewSet добавляется создатель:
```python
room.members.add(self.request.user)
```

### Ошибка "Static function can not consume context"

**Причина**: Неправильное использование массивов для className

**Решение**: Используйте шаблонные строки вместо массивов:
```tsx
className={`${styles.class1} ${condition ? styles.class2 : ''}`}
```

### API возвращает пустой массив

**Причина**: Фильтр `members=user` не находит чаты

**Решение**: Проверьте, что пользователь добавлен в участники при создании чата

## Следующие шаги

1. Добавить WebSocket для real-time обновлений
2. Добавить загрузку файлов
3. Добавить поиск по сообщениям
4. Добавить уведомления о новых сообщениях
5. Добавить онлайн-статус пользователей
