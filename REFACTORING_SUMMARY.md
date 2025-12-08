# Сводка по рефакторингу дашбордов

## Что сделано

Создана единая система компонентов для всех дашбордов платформы ОкоЗнаний.

## Новые компоненты

### 1. **DashboardHeader** - Единая шапка
📁 `frontend-react/src/components/common/DashboardHeader.tsx`

**Функции:**
- Отображение баланса пользователя
- Счетчик непрочитанных сообщений
- Счетчик непрочитанных уведомлений
- Аватар и меню профиля
- Кнопка выхода
- Адаптивность для мобильных

### 2. **OrdersSidebar** - Сайдбар для заказов
📁 `frontend-react/src/components/common/OrdersSidebar.tsx`

**Функции:**
- Фильтрация заказов по 10 статусам
- Счетчики заказов для каждого статуса
- Цветовая индикация статусов
- Единый стиль для всех дашбордов

### 3. **ChatSystem** - Система чата
📁 `frontend-react/src/components/chat/ChatSystem.tsx`

**Функции:**
- Список всех чатов с поиском
- Окно переписки с пользователем
- Отправка сообщений
- Индикаторы онлайн-статуса
- Счетчики непрочитанных
- Полная адаптивность

### 4. **NotificationSystem** - Система уведомлений
📁 `frontend-react/src/components/notifications/NotificationSystem.tsx`

**Функции:**
- Все уведомления с фильтрацией
- Настройки уведомлений:
  - ✅ Подтверждение заказов
  - ✅ Претензии
  - ✅ Сообщения
  - ✅ Пополнение баланса
  - ✅ Ставки на заказы
  - ✅ Системные обновления

## Структура файлов

```
frontend-react/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── DashboardHeader.module.css
│   │   │   ├── OrdersSidebar.tsx
│   │   │   └── OrdersSidebar.module.css
│   │   ├── chat/
│   │   │   ├── ChatSystem.tsx
│   │   │   └── ChatSystem.module.css
│   │   └── notifications/
│   │       ├── NotificationSystem.tsx
│   │       └── NotificationSystem.module.css
│   ├── types/
│   │   └── dashboard.ts
│   └── pages/
│       ├── ExpertDashboardRefactored.tsx (пример)
│       └── ExpertDashboardRefactored.module.css
└── REFACTORING_GUIDE.md (подробная документация)
```

## Как использовать

### Пример интеграции в дашборд:

```tsx
import DashboardHeader from '../components/common/DashboardHeader';
import OrdersSidebar from '../components/common/OrdersSidebar';
import ChatSystem from '../components/chat/ChatSystem';
import NotificationSystem from '../components/notifications/NotificationSystem';

function MyDashboard() {
  return (
    <>
      <DashboardHeader
        userProfile={userProfile}
        unreadMessages={3}
        unreadNotifications={5}
        onMessagesClick={() => setChatVisible(true)}
        onNotificationsClick={() => setNotificationsVisible(true)}
      />
      
      <OrdersSidebar
        ordersCount={ordersCount}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />
      
      <ChatSystem
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        chats={chats}
        onSendMessage={handleSendMessage}
      />
      
      <NotificationSystem
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        notifications={notifications}
        settings={notificationSettings}
        onSettingsChange={setNotificationSettings}
      />
    </>
  );
}
```

## Преимущества

✅ **Единый стиль** - все дашборды выглядят одинаково
✅ **Переиспользуемость** - компоненты работают везде
✅ **Легкость поддержки** - изменения в одном месте
✅ **Адаптивность** - работает на всех устройствах
✅ **TypeScript** - полная типизация

## Что дальше

1. **Интегрировать в существующие дашборды:**
   - ExpertDashboard
   - DirectorDashboard
   - PartnerDashboard
   - AdminDashboard

2. **Подключить API:**
   - Реальный чат с бэкендом
   - Реальные уведомления
   - Обновление баланса

3. **Добавить WebSocket:**
   - Real-time сообщения
   - Real-time уведомления
   - Онлайн-статусы

## Тестирование

Создан пример страницы `ExpertDashboardRefactored.tsx` для тестирования всех компонентов.

Чтобы протестировать:
1. Добавьте роут в `App.tsx`
2. Перейдите на `/expert-refactored`
3. Проверьте все функции

## Документация

Подробная документация с примерами кода: `frontend-react/REFACTORING_GUIDE.md`
