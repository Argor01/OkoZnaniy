# Пошаговое руководство: Реализация обработки запросов

## 🚀 Этап 1: Подготовка типов и констант

### Шаг 1.1: Создание типов для запросов

```bash
# Создаем файл типов для запросов
touch frontend-react/src/pages/AdminDashboard/types/requests.types.ts
```

**Содержимое файла:**

```typescript
// frontend-react/src/pages/AdminDashboard/types/requests.types.ts

export interface CustomerRequest {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'order' | 'general';
  customer: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
  };
  assignedAdmin?: {
    id: number;
    name: string;
    avatar?: string;
    department: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  estimatedResolutionTime?: string;
  tags: string[];
  attachments: RequestAttachment[];
}

export interface RequestMessage {
  id: number;
  requestId: number;
  senderId: number;
  senderType: 'customer' | 'admin';
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  createdAt: string;
  isRead: boolean;
  isInternal: boolean;
}

export interface RequestAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface MessageAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface InternalCommunication {
  id: number;
  requestId?: number;
  fromDepartment: string;
  toDepartment: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'read' | 'replied';
  createdAt: string;
  participants: AdminUser[];
}

export interface AdminUser {
  id: number;
  name: string;
  avatar?: string;
  department: string;
  role: string;
  isOnline: boolean;
}

export interface RequestStats {
  openRequests: number;
  inProgressRequests: number;
  completedToday: number;
  averageResponseTime: number;
  customerSatisfaction: number;
}

export type RequestStatus = 'open' | 'in_progress' | 'completed' | 'closed';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestCategory = 'technical' | 'billing' | 'account' | 'order' | 'general';
```

### Шаг 1.2: Обновление основных типов

```typescript
// Добавить в frontend-react/src/pages/AdminDashboard/types/admin.types.ts

export type MenuKey = 
  | 'overview'
  | 'partners' 
  | 'earnings'
  | 'disputes'
  | 'new_claims'
  | 'in_progress_claims'
  | 'completed_claims'
  | 'pending_approval'
  | 'claims_processing'
  | 'communication'
  | 'support_open'
  | 'support_in_progress'
  | 'support_completed'
  | 'admin_chats'
  | 'request_processing_open'      // 🆕
  | 'request_processing_progress'  // 🆕
  | 'request_processing_completed' // 🆕
  | 'internal_communication'       // 🆕
  | 'admin_group_chats';          // 🆕
```

### Шаг 1.3: Обновление меню

```typescript
// Обновить frontend-react/src/pages/AdminDashboard/constants/menuItems.ts

import {
  // ... существующие импорты
  CustomerServiceOutlined,
  CommentOutlined,
  TeamOutlined,
} from '@ant-design/icons';

// Добавить в массив menuItems:
{
  key: 'request_processing' as MenuKey,
  icon: CustomerServiceOutlined,
  label: 'Обработка запросов',
  children: [
    {
      key: 'request_processing_open',
      icon: InboxOutlined,
      label: 'Открытые запросы',
    },
    {
      key: 'request_processing_progress',
      icon: ClockCircleOutlined,
      label: 'В процессе решения',
    },
    {
      key: 'request_processing_completed',
      icon: CheckCircleOutlined,
      label: 'Выполненные',
    },
  ],
},
{
  key: 'internal_communication',
  icon: TeamOutlined,
  label: 'Внутренняя коммуникация',
},
{
  key: 'admin_group_chats',
  icon: CommentOutlined,
  label: 'Чаты администраторов',
},

// Обновить titleMap:
export const titleMap: Record<MenuKey, string> = {
  // ... существующие записи
  request_processing_open: 'Открытые запросы',
  request_processing_progress: 'В процессе решения',
  request_processing_completed: 'Выполненные',
  internal_communication: 'Внутренняя коммуникация',
  admin_group_chats: 'Чаты администраторов',
};
```

## 🔧 Этап 2: API и утилиты

### Шаг 2.1: Создание API для запросов

```bash
# Создаем файл API
touch frontend-react/src/pages/AdminDashboard/utils/requestsApi.ts
```

**Содержимое файла:**

```typescript
// frontend-react/src/pages/AdminDashboard/utils/requestsApi.ts

import { apiClient } from '../../../api/client';
import type { CustomerRequest, RequestMessage } from '../types/requests.types';

export const requestsApi = {
  // Получение списка запросов
  async getRequests(status?: string): Promise<CustomerRequest[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get('/admin/customer-requests/', { params });
    return response.data.results || response.data;
  },

  // Получение деталей запроса
  async getRequest(id: number): Promise<CustomerRequest> {
    const response = await apiClient.get(`/admin/customer-requests/${id}/`);
    return response.data;
  },

  // Получение сообщений запроса
  async getRequestMessages(requestId: number): Promise<RequestMessage[]> {
    const response = await apiClient.get(`/admin/customer-requests/${requestId}/messages/`);
    return response.data.results || response.data;
  },

  // Взятие запроса в работу
  async takeRequest(requestId: number): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/take/`);
    return response.data;
  },

  // Отправка сообщения
  async sendMessage(
    requestId: number, 
    content: string, 
    isInternal = false
  ): Promise<RequestMessage> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/messages/`, {
      content,
      is_internal: isInternal,
    });
    return response.data;
  },

  // Завершение запроса
  async completeRequest(requestId: number): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      status: 'completed'
    });
    return response.data;
  },

  // Получение статистики
  async getRequestStats(): Promise<any> {
    const response = await apiClient.get('/admin/customer-requests/stats/');
    return response.data;
  },
};
```

### Шаг 2.2: Создание API для чатов администраторов

```bash
# Создаем файл API для чатов
touch frontend-react/src/pages/AdminDashboard/utils/adminChatsApi.ts
```

**Содержимое файла:**

```typescript
// frontend-react/src/pages/AdminDashboard/utils/adminChatsApi.ts

import { apiClient } from '../../../api/client';

export interface AdminChat {
  id: number;
  name: string;
  type: 'general' | 'department' | 'private';
  participants: any[];
  lastMessage?: any;
  unreadCount: number;
  createdAt: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: string;
  isRead: boolean;
}

export const adminChatsApi = {
  // Получение списка чатов
  async getChats(): Promise<AdminChat[]> {
    const response = await apiClient.get('/admin/chats/');
    return response.data.results || response.data;
  },

  // Получение сообщений чата
  async getChatMessages(chatId: number): Promise<ChatMessage[]> {
    const response = await apiClient.get(`/admin/chats/${chatId}/messages/`);
    return response.data.results || response.data;
  },

  // Отправка сообщения в чат
  async sendChatMessage(chatId: number, content: string): Promise<ChatMessage> {
    const response = await apiClient.post(`/admin/chats/${chatId}/messages/`, {
      content
    });
    return response.data;
  },

  // Создание нового чата
  async createChat(name: string, type: string, participantIds: number[]): Promise<AdminChat> {
    const response = await apiClient.post('/admin/chats/', {
      name,
      type,
      participant_ids: participantIds
    });
    return response.data;
  },
};
```

### Шаг 2.3: Обновление форматтеров

```typescript
// Добавить в frontend-react/src/pages/AdminDashboard/utils/formatters.ts

export const getPriorityColor = (priority: string): string => {
  const colors = {
    urgent: 'red',
    high: 'orange', 
    medium: 'blue',
    low: 'default'
  };
  return colors[priority as keyof typeof colors] || 'default';
};

export const getCategoryLabel = (category: string): string => {
  const labels = {
    technical: 'Техническая',
    billing: 'Биллинг',
    account: 'Аккаунт',
    order: 'Заказ',
    general: 'Общая'
  };
  return labels[category as keyof typeof labels] || category;
};

export const getStatusLabel = (status: string): string => {
  const labels = {
    open: 'Открыт',
    in_progress: 'В работе',
    completed: 'Выполнен',
    closed: 'Закрыт'
  };
  return labels[status as keyof typeof labels] || status;
};

export const formatRequestTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Только что';
  if (diffInHours < 24) return `${diffInHours} ч. назад`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} дн. назад`;
  
  return date.toLocaleDateString('ru-RU');
};
```

## 🎣 Этап 3: Создание хуков

### Шаг 3.1: Хук для обработки запросов

```bash
# Создаем файл хука
touch frontend-react/src/pages/AdminDashboard/hooks/useRequestProcessing.ts
```

**Содержимое файла:**

```typescript
// frontend-react/src/pages/AdminDashboard/hooks/useRequestProcessing.ts

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '../utils/requestsApi';
import type { CustomerRequest, RequestMessage } from '../types/requests.types';

export const useRequestProcessing = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in_progress' | 'completed'>('open');

  // Получение списка запросов
  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError
  } = useQuery({
    queryKey: ['admin-customer-requests', selectedStatus],
    queryFn: () => requestsApi.getRequests(selectedStatus),
    refetchInterval: 30000,
  });

  // Получение сообщений запроса
  const {
    data: requestMessages = [],
    isLoading: messagesLoading
  } = useQuery({
    queryKey: ['request-messages', selectedRequest?.id],
    queryFn: () => selectedRequest ? requestsApi.getRequestMessages(selectedRequest.id) : [],
    enabled: !!selectedRequest,
  });

  // Взятие запроса в работу
  const takeRequestMutation = useMutation({
    mutationFn: (requestId: number) => requestsApi.takeRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
    },
  });

  // Отправка сообщения
  const sendMessageMutation = useMutation({
    mutationFn: ({ requestId, content, isInternal }: {
      requestId: number;
      content: string;
      isInternal?: boolean;
    }) => requestsApi.sendMessage(requestId, content, isInternal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-messages'] });
    },
  });

  // Завершение запроса
  const completeRequestMutation = useMutation({
    mutationFn: (requestId: number) => requestsApi.completeRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
      setSelectedRequest(null);
    },
  });

  // Обработчики
  const handleRequestSelect = useCallback((request: CustomerRequest) => {
    setSelectedRequest(request);
  }, []);

  const handleRequestClose = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  const handleStatusChange = useCallback((status: 'open' | 'in_progress' | 'completed') => {
    setSelectedStatus(status);
  }, []);

  const takeRequest = useCallback((requestId: number) => {
    takeRequestMutation.mutate(requestId);
  }, [takeRequestMutation]);

  const sendMessage = useCallback((content: string, isInternal = false) => {
    if (selectedRequest) {
      sendMessageMutation.mutate({
        requestId: selectedRequest.id,
        content,
        isInternal
      });
    }
  }, [selectedRequest, sendMessageMutation]);

  const completeRequest = useCallback((requestId: number) => {
    completeRequestMutation.mutate(requestId);
  }, [completeRequestMutation]);

  return {
    // Данные
    requests,
    requestMessages,
    selectedRequest,
    selectedStatus,
    
    // Состояния загрузки
    requestsLoading,
    messagesLoading,
    isTakingRequest: takeRequestMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isCompletingRequest: completeRequestMutation.isPending,
    
    // Ошибки
    requestsError,
    
    // Обработчики
    handleRequestSelect,
    handleRequestClose,
    handleStatusChange,
    takeRequest,
    sendMessage,
    completeRequest,
  };
};
```

### Шаг 3.2: Хук для чатов администраторов

```bash
# Создаем файл хука для чатов
touch frontend-react/src/pages/AdminDashboard/hooks/useAdminChats.ts
```

**Содержимое файла:**

```typescript
// frontend-react/src/pages/AdminDashboard/hooks/useAdminChats.ts

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminChatsApi, type AdminChat, type ChatMessage } from '../utils/adminChatsApi';

export const useAdminChats = () => {
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<AdminChat | null>(null);

  // Получение списка чатов
  const {
    data: chats = [],
    isLoading: chatsLoading,
    error: chatsError
  } = useQuery({
    queryKey: ['admin-chats'],
    queryFn: () => adminChatsApi.getChats(),
    refetchInterval: 10000, // Обновление каждые 10 секунд
  });

  // Получение сообщений чата
  const {
    data: chatMessages = [],
    isLoading: messagesLoading
  } = useQuery({
    queryKey: ['chat-messages', selectedChat?.id],
    queryFn: () => selectedChat ? adminChatsApi.getChatMessages(selectedChat.id) : [],
    enabled: !!selectedChat,
    refetchInterval: 5000, // Обновление каждые 5 секунд
  });

  // Отправка сообщения
  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, content }: { chatId: number; content: string }) => 
      adminChatsApi.sendChatMessage(chatId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
    },
  });

  // Создание чата
  const createChatMutation = useMutation({
    mutationFn: ({ name, type, participantIds }: {
      name: string;
      type: string;
      participantIds: number[];
    }) => adminChatsApi.createChat(name, type, participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
    },
  });

  // Обработчики
  const handleChatSelect = useCallback((chat: AdminChat) => {
    setSelectedChat(chat);
  }, []);

  const handleChatClose = useCallback(() => {
    setSelectedChat(null);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (selectedChat) {
      sendMessageMutation.mutate({
        chatId: selectedChat.id,
        content
      });
    }
  }, [selectedChat, sendMessageMutation]);

  const createChat = useCallback((name: string, type: string, participantIds: number[]) => {
    createChatMutation.mutate({ name, type, participantIds });
  }, [createChatMutation]);

  return {
    // Данные
    chats,
    chatMessages,
    selectedChat,
    
    // Состояния загрузки
    chatsLoading,
    messagesLoading,
    isSendingMessage: sendMessageMutation.isPending,
    isCreatingChat: createChatMutation.isPending,
    
    // Ошибки
    chatsError,
    
    // Обработчики
    handleChatSelect,
    handleChatClose,
    sendMessage,
    createChat,
  };
};
```

### Шаг 3.3: Обновление основного хука UI

```typescript
// Обновить frontend-react/src/pages/AdminDashboard/hooks/useAdminUI.ts

// Добавить новые состояния:
const [requestModalVisible, setRequestModalVisible] = useState(false);
const [adminChatModalVisible, setAdminChatModalVisible] = useState(false);
const [selectedCustomerRequest, setSelectedCustomerRequest] = useState<CustomerRequest | null>(null);
const [selectedAdminChat, setSelectedAdminChat] = useState<AdminChat | null>(null);

// Добавить обработчики:
const handleViewRequest = useCallback((request: CustomerRequest) => {
  setSelectedCustomerRequest(request);
  setRequestModalVisible(true);
}, []);

const handleViewAdminChat = useCallback((chat: AdminChat) => {
  setSelectedAdminChat(chat);
  setAdminChatModalVisible(true);
}, []);

const closeRequestModal = useCallback(() => {
  setRequestModalVisible(false);
  setSelectedCustomerRequest(null);
}, []);

const closeAdminChatModal = useCallback(() => {
  setAdminChatModalVisible(false);
  setSelectedAdminChat(null);
}, []);

// Добавить в return:
return {
  // ... существующие свойства
  requestModalVisible,
  adminChatModalVisible,
  selectedCustomerRequest,
  selectedAdminChat,
  handleViewRequest,
  handleViewAdminChat,
  closeRequestModal,
  closeAdminChatModal,
};
```

## 📊 Этап 4: Создание компонентов таблиц

### Шаг 4.1: Таблица запросов

```bash
# Создаем папку и файл таблицы
mkdir -p frontend-react/src/pages/AdminDashboard/components/Tables
touch frontend-react/src/pages/AdminDashboard/components/Tables/RequestsTable.tsx
touch frontend-react/src/pages/AdminDashboard/components/Tables/RequestsTable.module.css
```

**Содержимое RequestsTable.tsx:**

```typescript
// frontend-react/src/pages/AdminDashboard/components/Tables/RequestsTable.tsx

import React from 'react';
import { Table, Button, Tag, Avatar, Tooltip, Space } from 'antd';
import { EyeOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CustomerRequest } from '../../types/requests.types';
import { getPriorityColor, getCategoryLabel } from '../../utils/formatters';
import styles from './RequestsTable.module.css';

interface RequestsTableProps {
  requests: CustomerRequest[];
  loading: boolean;
  onRequestClick: (request: CustomerRequest) => void;
  onTakeRequest: (requestId: number) => void;
  isTakingRequest: boolean;
  showTakeAction: boolean;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  loading,
  onRequestClick,
  onTakeRequest,
  isTakingRequest,
  showTakeAction
}) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: CustomerRequest, b: CustomerRequest) => a.id - b.id,
    },
    {
      title: 'Заголовок',
      dataIndex: 'title',
      key: 'title',
      ellipsis: { tooltip: true },
      render: (title: string, record: CustomerRequest) => (
        <div className={styles.titleCell}>
          <div className={styles.title}>{title}</div>
          <div className={styles.category}>
            <Tag size="small">{getCategoryLabel(record.category)}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Клиент',
      dataIndex: 'customer',
      key: 'customer',
      width: 200,
      render: (customer: CustomerRequest['customer']) => (
        <div className={styles.customerCell}>
          <Avatar 
            src={customer.avatar} 
            icon={<UserOutlined />} 
            size="small"
          />
          <div className={styles.customerInfo}>
            <div className={styles.customerName}>{customer.name}</div>
            <div className={styles.customerEmail}>{customer.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: CustomerRequest['priority']) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      },
    },
    {
      title: 'Сообщения',
      dataIndex: 'messagesCount',
      key: 'messagesCount',
      width: 100,
      render: (count: number) => (
        <div className={styles.messagesCount}>
          {count}
        </div>
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => a.messagesCount - b.messagesCount,
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (createdAt: string) => (
        <Tooltip title={new Date(createdAt).toLocaleString('ru-RU')}>
          <div className={styles.timeCell}>
            <ClockCircleOutlined />
            {formatDistanceToNow(new Date(createdAt), { 
              addSuffix: true, 
              locale: ru 
            })}
          </div>
        </Tooltip>
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record: CustomerRequest) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onRequestClick(record)}
            size="small"
          >
            Открыть
          </Button>
          {showTakeAction && !record.assignedAdmin && (
            <Button
              type="primary"
              size="small"
              loading={isTakingRequest}
              onClick={() => onTakeRequest(record.id)}
            >
              Взять
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={requests}
      loading={loading}
      rowKey="id"
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `${range[0]}-${range[1]} из ${total} запросов`,
      }}
      className={styles.table}
      scroll={{ x: 1000 }}
    />
  );
};
```

**Содержимое RequestsTable.module.css:**

```css
/* frontend-react/src/pages/AdminDashboard/components/Tables/RequestsTable.module.css */

.table {
  .ant-table-thead > tr > th {
    background: #fafafa;
    font-weight: 600;
  }
  
  .ant-table-tbody > tr:hover > td {
    background: #f0f9ff;
  }
}

.titleCell {
  .title {
    font-weight: 500;
    margin-bottom: 4px;
  }
  
  .category {
    margin-top: 4px;
  }
}

.customerCell {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .customerInfo {
    .customerName {
      font-weight: 500;
      color: #262626;
    }
    
    .customerEmail {
      font-size: 12px;
      color: #8c8c8c;
    }
  }
}

.messagesCount {
  text-align: center;
  font-weight: 500;
  color: #1890ff;
}

.timeCell {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

@media (max-width: 768px) {
  .table {
    .ant-table {
      font-size: 12px;
    }
  }
  
  .customerCell {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
```

### Шаг 4.2: Обновление индексного файла таблиц

```typescript
// Создать/обновить frontend-react/src/pages/AdminDashboard/components/Tables/index.ts

export { RequestsTable } from './RequestsTable';
// ... другие экспорты таблиц
```

## 📱 Этап 5: Создание секций контента

### Шаг 5.1: Секция обработки запросов

```bash
# Создаем файлы секции
touch frontend-react/src/pages/AdminDashboard/components/Sections/RequestProcessingSection.tsx
touch frontend-react/src/pages/AdminDashboard/components/Sections/RequestProcessingSection.module.css
```

**Содержимое RequestProcessingSection.tsx:**

```typescript
// frontend-react/src/pages/AdminDashboard/components/Sections/RequestProcessingSection.tsx

import React from 'react';
import { Card, Tabs, Badge, Spin, Alert } from 'antd';
import { InboxOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { RequestsTable } from '../Tables/RequestsTable';
import { RequestStats } from '../Statistics/RequestStats';
import type { CustomerRequest } from '../../types/requests.types';
import styles from './RequestProcessingSection.module.css';

interface RequestProcessingSectionProps {
  requests: CustomerRequest[];
  loading: boolean;
  selectedStatus: 'open' | 'in_progress' | 'completed';
  onStatusChange: (status: 'open' | 'in_progress' | 'completed') => void;
  onRequestClick: (request: CustomerRequest) => void;
  onTakeRequest: (requestId: number) => void;
  isTakingRequest: boolean;
}

export const RequestProcessingSection: React.FC<RequestProcessingSectionProps> = ({
  requests,
  loading,
  selectedStatus,
  onStatusChange,
  onRequestClick,
  onTakeRequest,
  isTakingRequest
}) => {
  // Группировка запросов по статусам
  const requestsByStatus = {
    open: requests.filter(r => r.status === 'open'),
    in_progress: requests.filter(r => r.status === 'in_progress'),
    completed: requests.filter(r => r.status === 'completed'),
  };

  const tabItems = [
    {
      key: 'open',
      label: (
        <span>
          <InboxOutlined />
          Открытые запросы
          <Badge count={requestsByStatus.open.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <RequestsTable
          requests={requestsByStatus.open}
          loading={loading}
          onRequestClick={onRequestClick}
          onTakeRequest={onTakeRequest}
          isTakingRequest={isTakingRequest}
          showTakeAction={true}
        />
      ),
    },
    {
      key: 'in_progress',
      label: (
        <span>
          <ClockCircleOutlined />
          В процессе решения
          <Badge count={requestsByStatus.in_progress.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <RequestsTable
          requests={requestsByStatus.in_progress}
          loading={loading}
          onRequestClick={onRequestClick}
          onTakeRequest={onTakeRequest}
          isTakingRequest={isTakingRequest}
          showTakeAction={false}
        />
      ),
    },
    {
      key: 'completed',
      label: (
        <span>
          <CheckCircleOutlined />
          Выполненные
          <Badge count={requestsByStatus.completed.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <RequestsTable
          requests={requestsByStatus.completed}
          loading={loading}
          onRequestClick={onRequestClick}
          onTakeRequest={onTakeRequest}
          isTakingRequest={isTakingRequest}
          showTakeAction={false}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Статистика */}
      <RequestStats requests={requests} />
      
      {/* Основной контент */}
      <Card className={styles.mainCard}>
        <Tabs
          activeKey={selectedStatus}
          onChange={(key) => onStatusChange(key as 'open' | 'in_progress' | 'completed')}
          items={tabItems}
          className={styles.tabs}
        />
      </Card>
    </div>
  );
};
```

**Содержимое RequestProcessingSection.module.css:**

```css
/* frontend-react/src/pages/AdminDashboard/components/Sections/RequestProcessingSection.module.css */

.container {
  padding: 24px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}

.loadingContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.mainCard {
  margin-top: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tabs {
  .ant-tabs-tab {
    font-weight: 500;
  }
  
  .ant-tabs-tab-active {
    color: #1890ff;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .tabs {
    .ant-tabs-tab {
      padding: 8px 12px;
      font-size: 14px;
    }
  }
}
```

### Шаг 5.2: Создание компонента статистики

```bash
# Создаем папку и файлы статистики
mkdir -p frontend-react/src/pages/AdminDashboard/components/Statistics
touch frontend-react/src/pages/AdminDashboard/components/Statistics/RequestStats.tsx
touch frontend-react/src/pages/AdminDashboard/components/Statistics/RequestStats.module.css
```

**Содержимое RequestStats.tsx:**

```typescript
// frontend-react/src/pages/AdminDashboard/components/Statistics/RequestStats.tsx

import React from 'react';
import { Card, Statistic, Row, Col, Progress } from 'antd';
import { 
  InboxOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  TrophyOutlined 
} from '@ant-design/icons';
import type { CustomerRequest } from '../../types/requests.types';
import styles from './RequestStats.module.css';

interface RequestStatsProps {
  requests: CustomerRequest[];
}

export const RequestStats: React.FC<RequestStatsProps> = ({ requests }) => {
  const stats = {
    total: requests.length,
    open: requests.filter(r => r.status === 'open').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    urgent: requests.filter(r => r.priority === 'urgent').length,
  };

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <Row gutter={[16, 16]} className={styles.statsRow}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Открытые запросы"
            value={stats.open}
            prefix={<InboxOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="В работе"
            value={stats.inProgress}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Выполнено"
            value={stats.completed}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Срочные"
            value={stats.urgent}
            prefix={<TrophyOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      
      <Col xs={24}>
        <Card title="Эффективность работы">
          <Row gutter={16}>
            <Col span={12}>
              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  Процент выполнения
                </div>
                <Progress 
                  percent={completionRate} 
                  status={completionRate > 80 ? 'success' : 'active'}
                />
              </div>
            </Col>
            <Col span={12}>
              <div className={styles.progressItem}>
                <div className={styles.progressLabel}>
                  Загрузка (в работе)
                </div>
                <Progress 
                  percent={stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}
                  strokeColor="#faad14"
                />
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};
```

### Шаг 5.3: Обновление индексного файла секций

```typescript
// Обновить frontend-react/src/pages/AdminDashboard/components/Sections/index.ts

export { OverviewSection } from './OverviewSection';
export { PartnersSection } from './PartnersSection';
export { EarningsSection } from './EarningsSection';
export { DisputesSection } from './DisputesSection';
export { SupportRequestsSection } from './SupportRequestsSection';
export { RequestProcessingSection } from './RequestProcessingSection'; // 🆕
```

## 🎯 Этап 6: Интеграция с основным компонентом

### Шаг 6.1: Обновление главного компонента

```typescript
// Обновить frontend-react/src/pages/AdminDashboard/index.tsx

// Добавить импорты:
import { useRequestProcessing, useAdminChats } from './hooks';
import { RequestProcessingSection } from './components/Sections';
import { RequestModal } from './components/Modals';

// В компоненте AdminDashboard добавить:
const requestProcessingData = useRequestProcessing();
const adminChatsData = useAdminChats();

// В функции renderSection() добавить новые кейсы:
case 'request_processing_open':
case 'request_processing_progress':
case 'request_processing_completed':
  return (
    <RequestProcessingSection
      requests={requestProcessingData.requests}
      loading={requestProcessingData.requestsLoading}
      selectedStatus={selectedMenu.replace('request_processing_', '') as 'open' | 'in_progress' | 'completed'}
      onStatusChange={(status) => requestProcessingData.handleStatusChange(status)}
      onRequestClick={requestProcessingData.handleRequestSelect}
      onTakeRequest={requestProcessingData.takeRequest}
      isTakingRequest={requestProcessingData.isTakingRequest}
    />
  );

case 'internal_communication':
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Alert
        message="Внутренняя коммуникация"
        description="Функционал внутренней коммуникации будет реализован в следующем этапе."
        type="info"
        showIcon
      />
    </div>
  );

case 'admin_group_chats':
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Alert
        message="Чаты администраторов"
        description="Функционал групповых чатов будет реализован в следующем этапе."
        type="info"
        showIcon
      />
    </div>
  );

// В конце компонента добавить модальное окно:
<RequestModal
  request={requestProcessingData.selectedRequest}
  messages={requestProcessingData.requestMessages}
  isOpen={!!requestProcessingData.selectedRequest}
  onClose={requestProcessingData.handleRequestClose}
  onTakeRequest={requestProcessingData.takeRequest}
  onCompleteRequest={requestProcessingData.completeRequest}
  onSendMessage={requestProcessingData.sendMessage}
  isSendingMessage={requestProcessingData.isSendingMessage}
  isCompletingRequest={requestProcessingData.isCompletingRequest}
/>
```

## ✅ Этап 7: Тестирование

### Шаг 7.1: Проверка компиляции

```bash
# Проверяем, что проект компилируется без ошибок
npm run build
```

### Шаг 7.2: Запуск в режиме разработки

```bash
# Запускаем проект для тестирования
npm run dev
```

### Шаг 7.3: Проверка функционала

1. **Навигация**: Проверить, что новые пункты меню отображаются
2. **Таблицы**: Убедиться, что таблицы загружаются и отображают данные
3. **Модальные окна**: Проверить открытие и закрытие модальных окон
4. **Адаптивность**: Протестировать на разных размерах экрана

## 📝 Заключение

После выполнения всех этапов у вас будет:

✅ **Полностью функциональная система обработки запросов**
✅ **Модульная архитектура с переиспользуемыми компонентами**
✅ **Консистентный дизайн с существующей админ-панелью**
✅ **Адаптивный интерфейс для всех устройств**
✅ **Готовая основа для дальнейшего развития**

**Следующие этапы:**
- Реализация модальных окон для детального просмотра запросов
- Добавление функционала чатов администраторов
- Интеграция с backend API
- Добавление уведомлений в реальном времени