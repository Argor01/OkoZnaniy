# SupportChatsSection

Компонент для управления чатами поддержки в админ-панели.

## Функциональность

### Основные возможности:
- **Список чатов**: Отображение всех чатов поддержки с информацией о пользователе, статусе и приоритете
- **Просмотр сообщений**: Интерфейс для чтения истории переписки с клиентом
- **Отправка сообщений**: Возможность отвечать клиентам с поддержкой файлов
- **Управление статусом**: Изменение статуса чата (открыт, в работе, решен, закрыт)
- **Управление приоритетом**: Установка приоритета (низкий, средний, высокий, срочный)
- **Прикрепление файлов**: Загрузка файлов до 10 МБ

### Интерфейс:
- **Двухколоночный макет**: Список чатов слева, переписка справа
- **Индикаторы**: Бейджи для непрочитанных сообщений
- **Цветовая кодировка**: Статусы и приоритеты выделены цветами
- **Адаптивность**: Поддержка мобильных устройств

## Типы данных

### SupportChat
```typescript
interface SupportChat {
  id: number;
  user_id: number;
  user_name: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  unread_count: number;
  created_at: string;
  updated_at: string;
}
```

### SupportMessage
```typescript
interface SupportMessage {
  id: number;
  chat_id: number;
  content: string;
  is_from_admin: boolean;
  attachments?: SupportAttachment[];
  created_at: string;
}
```

## Пропсы

- `chats`: Массив чатов поддержки
- `messages`: Массив сообщений для выбранного чата
- `loading`: Состояние загрузки
- `onRefresh`: Обновление списка чатов
- `onSendMessage`: Отправка сообщения
- `onUploadFile`: Загрузка файла
- `onUpdateChatStatus`: Изменение статуса чата
- `onUpdateChatPriority`: Изменение приоритета чата

## Использование

```tsx
<SupportChatsSection
  chats={supportChats}
  messages={chatMessages}
  loading={isLoading}
  onRefresh={handleRefresh}
  onSendMessage={handleSendMessage}
  onUploadFile={handleFileUpload}
  onUpdateChatStatus={handleStatusUpdate}
  onUpdateChatPriority={handlePriorityUpdate}
/>
```

## Стили

Компонент использует CSS модули (`SupportChatsSection.module.css`) для стилизации:
- Адаптивный макет
- Анимации переходов
- Цветовая схема для статусов
- Стилизация сообщений

## Интеграция

Компонент интегрирован в админ-панель через:
- Меню: `Поддержка клиентов > Чаты поддержки`
- Роутинг: `support_chats`
- Экспорт: `components/Sections/index.ts`