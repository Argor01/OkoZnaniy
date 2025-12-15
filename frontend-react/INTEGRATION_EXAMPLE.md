# Пример интеграции чата в ExpertDashboard

## Вариант 1: Простая интеграция (рекомендуется)

Оберните ваш дашборд в `DashboardWithChatAndNotifications`:

```tsx
// src/pages/ExpertDashboard.tsx
import React from 'react';
import DashboardWithChatAndNotifications from '../components/DashboardWithChatAndNotifications';
import { useNavigate } from 'react-router-dom';

const ExpertDashboard = () => {
  const navigate = useNavigate();
  
  // Получаем данные пользователя из localStorage или API
  const userProfile = {
    username: localStorage.getItem('username') || 'Эксперт',
    avatar: localStorage.getItem('avatar'),
    role: 'expert',
    balance: parseFloat(localStorage.getItem('balance') || '0'),
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <DashboardWithChatAndNotifications
      userProfile={userProfile}
      onLogout={handleLogout}
      onProfileClick={() => navigate('/profile')}
      onBalanceClick={() => navigate('/balance')}
    >
      {/* Ваш существующий контент дашборда */}
      <div className="dashboard-content">
        <h1>Панель эксперта</h1>
        {/* ... остальной контент ... */}
      </div>
    </DashboardWithChatAndNotifications>
  );
};

export default ExpertDashboard;
```

## Вариант 2: Добавить только в хедер

Если у вас уже есть Layout, добавьте только иконки:

```tsx
// src/components/layout/DashboardLayout.tsx
import React, { useState } from 'react';
import { Badge, Button } from 'antd';
import { MessageOutlined, BellOutlined } from '@ant-design/icons';
import MessagesModal from '../MessagesModal';
import NotificationSystem from '../notifications/NotificationSystem';
import { useChat } from '../../hooks/useChat';
import { useNotifications } from '../../hooks/useNotifications';

const DashboardLayout = ({ children }) => {
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const { unreadCount: unreadMessages } = useChat();
  const { notifications, unreadCount: unreadNotifications } = useNotifications();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        {/* Ваш существующий хедер */}
        
        {/* Добавьте эти кнопки */}
        <Badge count={unreadMessages}>
          <Button 
            icon={<MessageOutlined />} 
            onClick={() => setMessagesOpen(true)}
          />
        </Badge>
        
        <Badge count={unreadNotifications}>
          <Button 
            icon={<BellOutlined />} 
            onClick={() => setNotificationsOpen(true)}
          />
        </Badge>
      </header>

      <main>{children}</main>

      {/* Модалки */}
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
    </div>
  );
};

export default DashboardLayout;
```

## Вариант 3: Использовать существующий DashboardHeader

Если у вас уже есть `DashboardHeader`, просто передайте пропсы:

```tsx
import React, { useState } from 'react';
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
        userProfile={{
          username: 'Иван Петров',
          role: 'expert',
          balance: 5000,
        }}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        onMessagesClick={() => setMessagesOpen(true)}
        onNotificationsClick={() => setNotificationsOpen(true)}
        onLogout={() => console.log('Logout')}
      />
      
      {/* Ваш контент */}
      
      <MessagesModal open={messagesOpen} onClose={() => setMessagesOpen(false)} />
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
        onSettingsChange={(s) => console.log(s)}
      />
    </>
  );
};
```

## Автоматическое создание чата при создании заказа

В компоненте создания заказа:

```tsx
import chatApi from '../api/chat';

const handleCreateOrder = async (orderData) => {
  try {
    // Создаем заказ
    const order = await ordersApi.create(orderData);
    
    // Автоматически создаем чат для заказа
    await chatApi.createChat(order.id);
    
    message.success('Заказ создан! Чат открыт.');
  } catch (error) {
    message.error('Ошибка создания заказа');
  }
};
```

## Открыть чат из карточки заказа

```tsx
import { useState } from 'react';
import { Button } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import MessagesModal from '../components/MessagesModal';

const OrderCard = ({ order }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="order-card">
      <h3>Заказ #{order.id}</h3>
      
      <Button 
        icon={<MessageOutlined />}
        onClick={() => setChatOpen(true)}
      >
        Открыть чат
      </Button>

      <MessagesModal 
        open={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />
    </div>
  );
};
```

## Проверка работы

1. Откройте дашборд
2. Кликните на иконку сообщений - должна открыться модалка чата
3. Кликните на иконку колокольчика - должны открыться уведомления
4. Счетчики должны показывать количество непрочитанных

## Отладка

Если что-то не работает:

```tsx
// Добавьте в компонент для отладки
import { useChat } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';

const Debug = () => {
  const { chats, loading, unreadCount } = useChat();
  const { notifications } = useNotifications();

  console.log('Chats:', chats);
  console.log('Unread messages:', unreadCount);
  console.log('Notifications:', notifications);

  return null;
};
```
