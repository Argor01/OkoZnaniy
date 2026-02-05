# 📋 Функционал обработки запросов в AdminDashboard

## 🎯 Описание функционала

### Основные возможности:
1. **Просмотр запросов** - Единая лента всех новых обращений от клиентов
2. **Принятие в работу** - Возможность взять запрос в обработку
3. **Чат с клиентом** - Внутренний чат для решения проблемы
4. **Чат с администраторами** - Общий чат и приватные чаты между админами
5. **Управление статусами** - Отслеживание прогресса решения

### Панель навигации:
- **Открытые запросы** - Новые необработанные обращения
- **В процессе решения** - Запросы, взятые в работу
- **Выполненные** - Завершенные запросы

## 🏗️ Архитектура решения

### 1. Типы данных

```typescript
// types/support.types.ts
export interface SupportRequest {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'general';
  customer: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedAdmin?: {
    id: number;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  tags: string[];
}

export interface SupportMessage {
  id: number;
  requestId: number;
  senderId: number;
  senderType: 'customer' | 'admin';
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  attachments?: {
    id: number;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  createdAt: string;
  isRead: boolean;
}

export interface AdminChat {
  id: number;
  type: 'general' | 'private';
  name: string;
  participants: {
    id: number;
    name: string;
    avatar?: string;
    role: string;
    isOnline: boolean;
  }[];
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: {
    id: number;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  createdAt: string;
  isRead: boolean;
  replyTo?: {
    id: number;
    content: string;
    senderName: string;
  };
}
```

### 2. Компоненты

#### SupportRequestsSection
```typescript
// components/Sections/SupportRequestsSection.tsx
interface SupportRequestsSectionProps {
  requests: SupportRequest[];
  loading: boolean;
  selectedStatus: 'open' | 'in_progress' | 'completed';
  onStatusChange: (status: 'open' | 'in_progress' | 'completed') => void;
  onRequestClick: (request: SupportRequest) => void;
  onTakeRequest: (requestId: number) => void;
  onCompleteRequest: (requestId: number) => void;
}
```

#### SupportRequestModal
```typescript
// components/Modals/SupportRequestModal.tsx
interface SupportRequestModalProps {
  request: SupportRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onTakeRequest: (requestId: number) => void;
  onCompleteRequest: (requestId: number) => void;
  onSendMessage: (requestId: number, content: string, attachments?: File[]) => void;
}
```

#### AdminChatModal
```typescript
// components/Modals/AdminChatModal.tsx
interface AdminChatModalProps {
  chat: AdminChat | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (chatId: number, content: string, attachments?: File[]) => void;
  onCreatePrivateChat: (adminId: number) => void;
}
```

### 3. Хуки

#### useSupportRequests
```typescript
// hooks/useSupportRequests.ts
export const useSupportRequests = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in_progress' | 'completed'>('open');
  
  // Методы для работы с запросами
  const takeRequest = async (requestId: number) => { /* ... */ };
  const completeRequest = async (requestId: number) => { /* ... */ };
  const sendMessage = async (requestId: number, content: string) => { /* ... */ };
  
  return {
    requests,
    loading,
    selectedStatus,
    setSelectedStatus,
    takeRequest,
    completeRequest,
    sendMessage,
    refetch: fetchRequests
  };
};
```

#### useAdminChats
```typescript
// hooks/useAdminChats.ts
export const useAdminChats = () => {
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [activeChat, setActiveChat] = useState<AdminChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Методы для работы с чатами
  const sendMessage = async (chatId: number, content: string) => { /* ... */ };
  const createPrivateChat = async (adminId: number) => { /* ... */ };
  const markAsRead = async (chatId: number) => { /* ... */ };
  
  return {
    chats,
    activeChat,
    messages,
    setActiveChat,
    sendMessage,
    createPrivateChat,
    markAsRead
  };
};
```

## 📝 Пошаговая реализация

### Шаг 1: Добавление типов

```bash
# Создаем файл типов для поддержки
touch frontend-react/src/pages/AdminDashboard/types/support.types.ts
```

### Шаг 2: Обновление меню

```typescript
// constants/menuItems.ts - добавить новые пункты меню
export const SUPPORT_MENU_ITEMS = [
  {
    key: 'support_open',
    icon: 'InboxOutlined',
    label: 'Открытые запросы',
    badge: true // показывать счетчик
  },
  {
    key: 'support_in_progress',
    icon: 'ClockCircleOutlined',
    label: 'В процессе решения'
  },
  {
    key: 'support_completed',
    icon: 'CheckCircleOutlined',
    label: 'Выполненные'
  },
  {
    key: 'admin_chats',
    icon: 'MessageOutlined',
    label: 'Чаты администраторов',
    badge: true
  }
];
```

### Шаг 3: Создание компонентов

#### SupportRequestsSection
```typescript
// components/Sections/SupportRequestsSection.tsx
import React from 'react';
import { Card, List, Badge, Button, Tag, Avatar, Typography, Empty } from 'antd';
import { ClockCircleOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import { SupportRequest } from '../../types/support.types';
import { formatRelativeTime } from '../../utils/formatters';
import styles from './SupportRequestsSection.module.css';

const { Text, Title } = Typography;

interface SupportRequestsSectionProps {
  requests: SupportRequest[];
  loading: boolean;
  selectedStatus: 'open' | 'in_progress' | 'completed';
  onStatusChange: (status: 'open' | 'in_progress' | 'completed') => void;
  onRequestClick: (request: SupportRequest) => void;
  onTakeRequest: (requestId: number) => void;
}

export const SupportRequestsSection: React.FC<SupportRequestsSectionProps> = ({
  requests,
  loading,
  selectedStatus,
  onStatusChange,
  onRequestClick,
  onTakeRequest
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'purple';
      case 'billing': return 'gold';
      case 'account': return 'cyan';
      case 'general': return 'default';
      default: return 'default';
    }
  };

  const statusTabs = [
    { key: 'open', label: 'Открытые запросы', count: requests.filter(r => r.status === 'open').length },
    { key: 'in_progress', label: 'В процессе', count: requests.filter(r => r.status === 'in_progress').length },
    { key: 'completed', label: 'Выполненные', count: requests.filter(r => r.status === 'completed').length }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Обработка запросов</Title>
        <div className={styles.tabs}>
          {statusTabs.map(tab => (
            <Button
              key={tab.key}
              type={selectedStatus === tab.key ? 'primary' : 'default'}
              onClick={() => onStatusChange(tab.key as any)}
              className={styles.tabButton}
            >
              {tab.label}
              {tab.count > 0 && <Badge count={tab.count} className={styles.badge} />}
            </Button>
          ))}
        </div>
      </div>

      <Card className={styles.requestsList}>
        {requests.length === 0 ? (
          <Empty
            description={
              selectedStatus === 'open' ? 'Нет новых запросов' :
              selectedStatus === 'in_progress' ? 'Нет запросов в работе' :
              'Нет выполненных запросов'
            }
          />
        ) : (
          <List
            loading={loading}
            dataSource={requests}
            renderItem={(request) => (
              <List.Item
                className={styles.requestItem}
                onClick={() => onRequestClick(request)}
                actions={[
                  selectedStatus === 'open' && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeRequest(request.id);
                      }}
                    >
                      Взять в работу
                    </Button>
                  ),
                  <Button type="link" size="small">
                    <MessageOutlined /> {request.messagesCount}
                  </Button>
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={request.customer.avatar}
                      icon={<UserOutlined />}
                      size="large"
                    />
                  }
                  title={
                    <div className={styles.requestTitle}>
                      <span>{request.title}</span>
                      <div className={styles.tags}>
                        <Tag color={getPriorityColor(request.priority)}>
                          {request.priority.toUpperCase()}
                        </Tag>
                        <Tag color={getCategoryColor(request.category)}>
                          {request.category}
                        </Tag>
                      </div>
                    </div>
                  }
                  description={
                    <div className={styles.requestDescription}>
                      <Text ellipsis={{ rows: 2 }}>{request.description}</Text>
                      <div className={styles.requestMeta}>
                        <Text type="secondary">
                          <ClockCircleOutlined /> {formatRelativeTime(request.createdAt)}
                        </Text>
                        <Text type="secondary">
                          От: {request.customer.name}
                        </Text>
                        {request.assignedAdmin && (
                          <Text type="secondary">
                            Исполнитель: {request.assignedAdmin.name}
                          </Text>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
```

### Шаг 4: Тестовые данные

```typescript
// utils/mockData.ts - добавить тестовые данные
export const mockSupportRequests: SupportRequest[] = [
  {
    id: 1,
    title: 'Проблема с оплатой заказа',
    description: 'Не могу оплатить заказ через банковскую карту. Выдает ошибку "Транзакция отклонена". Пробовал разные карты.',
    status: 'open',
    priority: 'high',
    category: 'billing',
    customer: {
      id: 101,
      name: 'Анна Петрова',
      email: 'anna.petrova@email.com',
      avatar: 'https://randomuser.me/api/portraits/women/1.jpg'
    },
    createdAt: '2026-01-31T10:30:00Z',
    updatedAt: '2026-01-31T10:30:00Z',
    messagesCount: 1,
    tags: ['payment', 'urgent']
  },
  {
    id: 2,
    title: 'Не приходят уведомления на email',
    description: 'Уже неделю не получаю уведомления о новых заказах на почту. Проверил спам - там тоже нет.',
    status: 'in_progress',
    priority: 'medium',
    category: 'technical',
    customer: {
      id: 102,
      name: 'Михаил Сидоров',
      email: 'mikhail.sidorov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg'
    },
    assignedAdmin: {
      id: 1,
      name: 'Елена Админова',
      avatar: 'https://randomuser.me/api/portraits/women/10.jpg'
    },
    createdAt: '2026-01-30T14:15:00Z',
    updatedAt: '2026-01-31T09:20:00Z',
    lastMessageAt: '2026-01-31T09:20:00Z',
    messagesCount: 5,
    tags: ['email', 'notifications']
  },
  {
    id: 3,
    title: 'Заблокирован аккаунт без причины',
    description: 'Вчера зашел в личный кабинет, а сегодня пишет что аккаунт заблокирован. Никаких нарушений не было.',
    status: 'open',
    priority: 'urgent',
    category: 'account',
    customer: {
      id: 103,
      name: 'Дмитрий Козлов',
      email: 'dmitry.kozlov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg'
    },
    createdAt: '2026-01-31T08:45:00Z',
    updatedAt: '2026-01-31T08:45:00Z',
    messagesCount: 1,
    tags: ['account', 'blocked', 'urgent']
  },
  {
    id: 4,
    title: 'Как изменить специализацию эксперта?',
    description: 'Хочу добавить еще одну специализацию к своему профилю эксперта. Не могу найти эту опцию в настройках.',
    status: 'completed',
    priority: 'low',
    category: 'general',
    customer: {
      id: 104,
      name: 'Ольга Иванова',
      email: 'olga.ivanova@email.com',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg'
    },
    assignedAdmin: {
      id: 2,
      name: 'Алексей Модератор',
      avatar: 'https://randomuser.me/api/portraits/men/11.jpg'
    },
    createdAt: '2026-01-29T16:20:00Z',
    updatedAt: '2026-01-30T11:30:00Z',
    lastMessageAt: '2026-01-30T11:30:00Z',
    messagesCount: 3,
    tags: ['expert', 'profile', 'help']
  },
  {
    id: 5,
    title: 'Ошибка при загрузке файлов',
    description: 'При попытке загрузить файлы к заказу появляется ошибка 500. Файлы небольшие, формат PDF и DOCX.',
    status: 'in_progress',
    priority: 'medium',
    category: 'technical',
    customer: {
      id: 105,
      name: 'Сергей Волков',
      email: 'sergey.volkov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/5.jpg'
    },
    assignedAdmin: {
      id: 1,
      name: 'Елена Админова',
      avatar: 'https://randomuser.me/api/portraits/women/10.jpg'
    },
    createdAt: '2026-01-31T12:10:00Z',
    updatedAt: '2026-01-31T13:45:00Z',
    lastMessageAt: '2026-01-31T13:45:00Z',
    messagesCount: 4,
    tags: ['upload', 'files', 'error']
  }
];

export const mockAdminChats: AdminChat[] = [
  {
    id: 1,
    type: 'general',
    name: 'Общий чат администраторов',
    participants: [
      {
        id: 1,
        name: 'Елена Админова',
        avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
        role: 'Старший администратор',
        isOnline: true
      },
      {
        id: 2,
        name: 'Алексей Модератор',
        avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
        role: 'Модератор',
        isOnline: true
      },
      {
        id: 3,
        name: 'Мария Поддержка',
        avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
        role: 'Специалист поддержки',
        isOnline: false
      }
    ],
    lastMessage: {
      content: 'Добавил новые правила модерации в документацию',
      senderName: 'Алексей Модератор',
      createdAt: '2026-01-31T14:20:00Z'
    },
    unreadCount: 2,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    type: 'private',
    name: 'Елена Админова',
    participants: [
      {
        id: 1,
        name: 'Елена Админова',
        avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
        role: 'Старший администратор',
        isOnline: true
      }
    ],
    lastMessage: {
      content: 'Можешь помочь с проблемным заказом #1234?',
      senderName: 'Елена Админова',
      createdAt: '2026-01-31T13:15:00Z'
    },
    unreadCount: 1,
    createdAt: '2026-01-25T10:30:00Z'
  }
];
```

## 🎨 CSS стили (адаптивные)

```css
/* components/Sections/SupportRequestsSection.module.css */
.container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tabButton {
  position: relative;
  border-radius: 6px;
}

.badge {
  margin-left: 8px;
}

.requestsList {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.requestItem {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.requestItem:hover {
  background-color: #fafafa;
}

.requestTitle {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.requestDescription {
  max-width: 100%;
}

.requestMeta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* Адаптивность */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tabs {
    justify-content: center;
  }
  
  .tabButton {
    flex: 1;
    min-width: 0;
  }
  
  .requestTitle {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .requestMeta {
    flex-direction: column;
    gap: 4px;
  }
  
  .requestItem .ant-list-item-action {
    margin-top: 12px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 12px;
  }
  
  .requestItem {
    padding: 12px;
  }
  
  .tags {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

## 🔧 Интеграция в существующую систему

### 1. Обновление типов меню

```typescript
// types/index.ts - добавить новые типы меню
export type MenuKey = 
  | 'overview' 
  | 'partners' 
  | 'earnings' 
  | 'disputes'
  | 'support_open'
  | 'support_in_progress' 
  | 'support_completed'
  | 'admin_chats';
```

### 2. Обновление главного компонента

```typescript
// index.tsx - добавить новые секции
const renderSection = () => {
  switch (selectedMenu) {
    // ... существующие секции
    
    case 'support_open':
    case 'support_in_progress':
    case 'support_completed':
      return (
        <SupportRequestsSection
          requests={supportData.requests}
          loading={supportData.loading}
          selectedStatus={selectedMenu.replace('support_', '') as any}
          onStatusChange={(status) => handleMenuClick(`support_${status}` as MenuKey)}
          onRequestClick={handleRequestClick}
          onTakeRequest={handleTakeRequest}
        />
      );
    
    case 'admin_chats':
      return (
        <AdminChatsSection
          chats={chatsData.chats}
          loading={chatsData.loading}
          onChatClick={handleChatClick}
          onCreatePrivateChat={handleCreatePrivateChat}
        />
      );
    
    default:
      return <OverviewSection />;
  }
};
```

## 📱 Мобильная адаптация

### Особенности для мобильных устройств:
1. **Компактные карточки** - уменьшенные отступы и размеры
2. **Стекинг элементов** - вертикальное расположение на малых экранах
3. **Свайп-жесты** - для переключения между статусами
4. **Модальные окна** - полноэкранные на мобильных
5. **Оптимизированный чат** - адаптивная клавиатура и отправка

### CSS для мобильных:
```css
@media (max-width: 768px) {
  .supportModal {
    .ant-modal {
      max-width: 100vw;
      margin: 0;
      padding: 0;
      height: 100vh;
    }
    
    .ant-modal-content {
      height: 100vh;
      border-radius: 0;
    }
  }
  
  .chatInput {
    position: sticky;
    bottom: 0;
    background: white;
    padding: 12px;
    border-top: 1px solid #f0f0f0;
  }
}
```

## 🚀 План внедрения

### Этап 1: Базовая структура (2 часа)
- [ ] Создать типы данных
- [ ] Добавить пункты меню
- [ ] Создать базовые компоненты

### Этап 2: Функционал запросов (3 часа)
- [ ] SupportRequestsSection
- [ ] SupportRequestModal
- [ ] Интеграция с API

### Этап 3: Чаты администраторов (2 часа)
- [ ] AdminChatsSection
- [ ] AdminChatModal
- [ ] Real-time обновления

### Этап 4: Тестирование и доработка (1 час)
- [ ] Тестовые данные
- [ ] Мобильная адаптация
- [ ] Финальная интеграция

**Общее время: ~8 часов**

## 📋 Чек-лист готовности

- [ ] Типы данных созданы
- [ ] Компоненты реализованы
- [ ] Хуки настроены
- [ ] API интеграция готова
- [ ] Тестовые данные добавлены
- [ ] Мобильная версия работает
- [ ] Документация обновлена

Этот функционал значительно расширит возможности админ-панели и улучшит качество поддержки пользователей! 🎯