# Руководство по рефакторингу дашбордов

## Обзор

Проведен рефакторинг компонентов дашборда для создания единой, переиспользуемой системы компонентов.

## Созданные компоненты

### 1. DashboardHeader
**Путь:** `src/components/common/DashboardHeader.tsx`

Единая шапка для всех дашбордов с:
- Балансом пользователя
- Счетчиком непрочитанных сообщений
- Счетчиком непрочитанных уведомлений
- Аватаром и меню профиля
- Кнопкой меню для мобильных устройств

**Использование:**
```tsx
<DashboardHeader
  userProfile={{
    username: 'Иван',
    avatar: '/path/to/avatar.jpg',
    role: 'expert',
    balance: 5000,
  }}
  unreadMessages={3}
  unreadNotifications={5}
  onMessagesClick={() => setMessagesVisible(true)}
  onNotificationsClick={() => setNotificationsVisible(true)}
  onBalanceClick={() => setBalanceVisible(true)}
  onLogout={handleLogout}
  isMobile={false}
/>
```

### 2. OrdersSidebar
**Путь:** `src/components/common/OrdersSidebar.tsx`

Единый сайдбар для фильтрации заказов по статусам:
- Все заказы
- Открыт
- На подтверждении
- На выполнении
- Ожидает оплаты
- На проверке
- Выполнен
- На доработке
- Ожидает скачивания
- Закрыт

**Использование:**
```tsx
<OrdersSidebar
  ordersCount={{
    all: 10,
    new: 2,
    confirming: 1,
    in_progress: 3,
    payment: 0,
    review: 1,
    completed: 2,
    revision: 0,
    download: 1,
    closed: 0,
  }}
  selectedStatus="all"
  onStatusChange={(status) => setSelectedStatus(status)}
  isMobile={false}
/>
```

### 3. ChatSystem
**Путь:** `src/components/chat/ChatSystem.tsx`

Полнофункциональная система чата между пользователями:
- Список чатов с поиском
- Окно переписки
- Отправка сообщений
- Индикаторы онлайн-статуса
- Счетчики непрочитанных сообщений
- Адаптивный дизайн для мобильных

**Использование:**
```tsx
<ChatSystem
  visible={chatVisible}
  onClose={() => setChatVisible(false)}
  chats={[
    {
      id: 1,
      chatId: 1,
      userName: 'Иван Петров',
      lastMessage: 'Здравствуйте!',
      timestamp: '2 мин назад',
      isRead: false,
      isOnline: true,
      unreadCount: 3,
      messages: [
        {
          id: 1,
          text: 'Здравствуйте!',
          timestamp: '10:30',
          isMine: false,
          isRead: true,
        },
      ],
    },
  ]}
  onSendMessage={(chatId, message) => console.log(chatId, message)}
  isMobile={false}
/>
```

### 4. NotificationSystem
**Путь:** `src/components/notifications/NotificationSystem.tsx`

Система уведомлений с настройками:
- Фильтрация по типам (все, заказы, претензии и т.д.)
- Настройки уведомлений:
  - Подтверждение заказов
  - Претензии
  - Сообщения
  - Пополнение баланса
  - Ставки на заказы
  - Системные обновления

**Использование:**
```tsx
<NotificationSystem
  visible={notificationsVisible}
  onClose={() => setNotificationsVisible(false)}
  notifications={[
    {
      id: 1,
      type: 'order',
      title: 'Новый заказ',
      message: 'Появился новый заказ по математике',
      timestamp: '2 минуты назад',
      isRead: false,
    },
  ]}
  settings={{
    orderConfirmation: true,
    claims: true,
    messages: true,
    balanceTopUp: true,
    bids: true,
    systemUpdates: false,
  }}
  onSettingsChange={(settings) => setSettings(settings)}
  onNotificationClick={(notification) => console.log(notification)}
  isMobile={false}
/>
```

## Пример использования

См. файл `src/pages/ExpertDashboardRefactored.tsx` для полного примера интеграции всех компонентов.

## Преимущества рефакторинга

1. **Переиспользуемость** - компоненты можно использовать в любом дашборде
2. **Единый стиль** - все дашборды выглядят одинаково
3. **Легкость поддержки** - изменения в одном месте применяются везде
4. **Адаптивность** - все компоненты адаптированы для мобильных устройств
5. **Типизация** - полная поддержка TypeScript

## Следующие шаги

1. Интегрировать компоненты в существующие дашборды:
   - ExpertDashboard
   - DirectorDashboard
   - PartnerDashboard
   - AdminDashboard

2. Подключить реальные API для:
   - Чата
   - Уведомлений
   - Баланса

3. Добавить WebSocket для real-time обновлений

4. Добавить тесты для компонентов
