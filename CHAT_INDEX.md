# 📚 Документация: Чат и уведомления

## 🚀 Быстрый старт

**Автоматический запуск (1 команда!)**  
👉 **[АВТОЗАПУСК.md](./АВТОЗАПУСК.md)** ⚡⚡⚡

**Хотите запустить за 5 минут?**  
👉 **[QUICK_START_CHAT.md](./QUICK_START_CHAT.md)** ⚡

**Пошаговый чеклист**  
👉 **[CHECKLIST.md](./CHECKLIST.md)** ✅

## 📖 Основная документация

### Для начинающих
- 📝 **[SUMMARY.md](./SUMMARY.md)** - Краткое резюме (что сделано)
- ✅ **[CHAT_READY.md](./CHAT_READY.md)** - Что готово и как использовать
- 🚀 **[QUICK_START_CHAT.md](./QUICK_START_CHAT.md)** - Запуск за 3 шага

### Для разработчиков
- 📚 **[CHAT_AND_NOTIFICATIONS_GUIDE.md](./CHAT_AND_NOTIFICATIONS_GUIDE.md)** - Полное руководство
- 💡 **[frontend-react/INTEGRATION_EXAMPLE.md](./frontend-react/INTEGRATION_EXAMPLE.md)** - Примеры интеграции
- 🏗️ **[CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md)** - Архитектура системы

### Для продвинутых
- 📋 **[CHAT_IMPLEMENTATION_PLAN.md](./CHAT_IMPLEMENTATION_PLAN.md)** - План реализации WebSocket

## 🎯 Что выбрать?

### Я хочу быстро запустить
→ **[QUICK_START_CHAT.md](./QUICK_START_CHAT.md)**

### Я хочу понять, что сделано
→ **[SUMMARY.md](./SUMMARY.md)**

### Я хочу интегрировать в свой дашборд
→ **[frontend-react/INTEGRATION_EXAMPLE.md](./frontend-react/INTEGRATION_EXAMPLE.md)**

### Я хочу понять архитектуру
→ **[CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md)**

### У меня проблемы
→ **[CHECKLIST.md](./CHECKLIST.md)** (раздел "Проблемы?")

### Я хочу всё знать
→ **[CHAT_AND_NOTIFICATIONS_GUIDE.md](./CHAT_AND_NOTIFICATIONS_GUIDE.md)**

## 📦 Файлы проекта

### Backend
```
OkoZnaniy/
├── apps/chat/              # Приложение чата
│   ├── models.py          # Chat, Message
│   ├── views.py           # ChatViewSet
│   ├── serializers.py     # Сериализаторы
│   └── urls.py            # API routes
├── config/
│   ├── settings.py        # ✅ apps.chat добавлен
│   └── urls.py            # ✅ /api/chat/ подключен
└── setup-chat.bat         # Скрипт миграций
```

### Frontend
```
frontend-react/src/
├── api/
│   └── chat.ts            # API клиент
├── hooks/
│   ├── useChat.ts         # Хук для чата
│   └── useNotifications.ts # Хук для уведомлений
├── components/
│   ├── MessagesModal.tsx  # ✅ Обновлен
│   ├── notifications/
│   │   └── NotificationSystem.tsx
│   └── DashboardWithChatAndNotifications.tsx # ✅ Новый
└── INTEGRATION_EXAMPLE.md
```

## 🎨 Возможности

### Чат
- ✅ Список чатов
- ✅ История сообщений
- ✅ Отправка сообщений
- ✅ Поиск
- ✅ Счетчики непрочитанных
- ✅ Автообновление (15 сек)
- ✅ Адаптивный дизайн

### Уведомления
- ✅ Список уведомлений
- ✅ Фильтрация по типам
- ✅ Отметка прочитанных
- ✅ Настройки
- ✅ Счетчики
- ✅ Автообновление (30 сек)

## 🔌 API

```
GET    /api/chat/chats/
GET    /api/chat/chats/{id}/messages/
POST   /api/chat/chats/{id}/send_message/
GET    /api/notifications/
POST   /api/notifications/{id}/mark_read/
```

## 💡 Примеры использования

### Простой способ
```tsx
import DashboardWithChatAndNotifications from '../components/DashboardWithChatAndNotifications';

<DashboardWithChatAndNotifications userProfile={userProfile}>
  <YourContent />
</DashboardWithChatAndNotifications>
```

### С хуками
```tsx
import { useChat } from '../hooks/useChat';
const { unreadCount } = useChat();
```

## 🚀 Запуск

```bash
# 1. Миграции
cd OkoZnaniy
setup-chat.bat

# 2. Backend
venv\Scripts\python.exe manage.py runserver

# 3. Frontend
cd frontend-react
npm run dev
```

## 📞 Помощь

**Проблемы с запуском?**  
→ См. раздел "Проблемы?" в **[CHECKLIST.md](./CHECKLIST.md)**

**Вопросы по интеграции?**  
→ См. примеры в **[frontend-react/INTEGRATION_EXAMPLE.md](./frontend-react/INTEGRATION_EXAMPLE.md)**

**Хотите понять архитектуру?**  
→ См. схемы в **[CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md)**

## 🎉 Готово!

Вся документация создана и готова к использованию!

**Начните с:** [QUICK_START_CHAT.md](./QUICK_START_CHAT.md) 🚀

---

**Время на настройку: ~5 минут**  
**Результат: Работающий чат и уведомления!** ✨
