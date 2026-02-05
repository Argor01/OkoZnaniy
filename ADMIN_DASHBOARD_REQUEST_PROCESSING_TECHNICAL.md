# Техническая документация: Обработка запросов в админ-панели

## 🏗️ Архитектура компонентов

### 1. Типы данных

#### Основные типы для запросов:

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
  isInternal: boolean; // Внутренние сообщения между админами
}

export interface InternalCommunication {
  id: number;
  requestId?: number; // Связь с запросом (опционально)
  fromDepartment: string;
  toDepartment: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'read' | 'replied';
  createdAt: string;
  participants: AdminUser[];
}

export interface AdminChat {
  id: number;
  name: string;
  type: 'general' | 'department' | 'private';
  participants: AdminUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  isActive: boolean;
}
```

### 2. Хуки для управления состоянием

#### Хук для обработки запросов:

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
    queryKey: ['admin-requests', selectedStatus],
    queryFn: () => requestsApi.getRequests(selectedStatus),
    refetchInterval: 30000, // Обновление каждые 30 секунд
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
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
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

### 3. Компонент секции обработки запросов

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

### 4. Таблица запросов

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

### 5. Модальное окно запроса

```typescript
// frontend-react/src/pages/AdminDashboard/components/Modals/RequestModal.tsx

import React, { useState } from 'react';
import { 
  Modal, 
  Tabs, 
  Card, 
  Avatar, 
  Tag, 
  Button, 
  Input, 
  Space,
  Divider,
  Timeline,
  Upload,
  message
} from 'antd';
import { 
  UserOutlined, 
  MessageOutlined, 
  TeamOutlined,
  SendOutlined,
  PaperClipOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { CustomerRequest, RequestMessage } from '../../types/requests.types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './RequestModal.module.css';

const { TextArea } = Input;

interface RequestModalProps {
  request: CustomerRequest | null;
  messages: RequestMessage[];
  isOpen: boolean;
  onClose: () => void;
  onTakeRequest: (requestId: number) => void;
  onCompleteRequest: (requestId: number) => void;
  onSendMessage: (content: string, isInternal?: boolean) => void;
  isSendingMessage: boolean;
  isCompletingRequest: boolean;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  request,
  messages,
  isOpen,
  onClose,
  onTakeRequest,
  onCompleteRequest,
  onSendMessage,
  isSendingMessage,
  isCompletingRequest
}) => {
  const [messageContent, setMessageContent] = useState('');
  const [internalMessageContent, setInternalMessageContent] = useState('');

  if (!request) return null;

  const handleSendMessage = () => {
    if (messageContent.trim()) {
      onSendMessage(messageContent);
      setMessageContent('');
    }
  };

  const handleSendInternalMessage = () => {
    if (internalMessageContent.trim()) {
      onSendMessage(internalMessageContent, true);
      setInternalMessageContent('');
    }
  };

  const customerMessages = messages.filter(m => !m.isInternal);
  const internalMessages = messages.filter(m => m.isInternal);

  const tabItems = [
    {
      key: 'customer-chat',
      label: (
        <span>
          <MessageOutlined />
          Чат с клиентом
        </span>
      ),
      children: (
        <div className={styles.chatContainer}>
          {/* История сообщений */}
          <div className={styles.messagesContainer}>
            <Timeline
              items={customerMessages.map(msg => ({
                dot: (
                  <Avatar 
                    src={msg.senderAvatar} 
                    icon={<UserOutlined />} 
                    size="small"
                  />
                ),
                children: (
                  <div className={styles.messageItem}>
                    <div className={styles.messageHeader}>
                      <span className={styles.senderName}>{msg.senderName}</span>
                      <span className={styles.messageTime}>
                        {formatDistanceToNow(new Date(msg.createdAt), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                    </div>
                    <div className={styles.messageContent}>{msg.content}</div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={styles.attachments}>
                        {msg.attachments.map(att => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer">
                            <PaperClipOutlined /> {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </div>

          {/* Форма отправки сообщения */}
          <div className={styles.messageForm}>
            <TextArea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Введите ответ клиенту..."
              rows={3}
              onPressEnter={(e) => {
                if (e.ctrlKey) {
                  handleSendMessage();
                }
              }}
            />
            <div className={styles.messageActions}>
              <Upload>
                <Button icon={<PaperClipOutlined />}>
                  Прикрепить файл
                </Button>
              </Upload>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                loading={isSendingMessage}
                disabled={!messageContent.trim()}
              >
                Отправить (Ctrl+Enter)
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'internal-communication',
      label: (
        <span>
          <TeamOutlined />
          Внутренняя связь
        </span>
      ),
      children: (
        <div className={styles.chatContainer}>
          {/* Внутренние сообщения */}
          <div className={styles.messagesContainer}>
            <Timeline
              items={internalMessages.map(msg => ({
                color: 'blue',
                children: (
                  <div className={styles.messageItem}>
                    <div className={styles.messageHeader}>
                      <span className={styles.senderName}>{msg.senderName}</span>
                      <Tag size="small" color="blue">Внутреннее</Tag>
                      <span className={styles.messageTime}>
                        {formatDistanceToNow(new Date(msg.createdAt), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                    </div>
                    <div className={styles.messageContent}>{msg.content}</div>
                  </div>
                ),
              }))}
            />
          </div>

          {/* Форма внутреннего сообщения */}
          <div className={styles.messageForm}>
            <TextArea
              value={internalMessageContent}
              onChange={(e) => setInternalMessageContent(e.target.value)}
              placeholder="Сообщение для других отделов..."
              rows={3}
            />
            <div className={styles.messageActions}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendInternalMessage}
                loading={isSendingMessage}
                disabled={!internalMessageContent.trim()}
              >
                Отправить внутреннее сообщение
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className={styles.modalHeader}>
          <div className={styles.requestTitle}>
            Запрос #{request.id}: {request.title}
          </div>
          <div className={styles.requestMeta}>
            <Tag color={request.status === 'open' ? 'blue' : 
                       request.status === 'in_progress' ? 'orange' : 'green'}>
              {request.status.toUpperCase()}
            </Tag>
            <Tag color={request.priority === 'urgent' ? 'red' : 
                       request.priority === 'high' ? 'orange' : 'default'}>
              {request.priority.toUpperCase()}
            </Tag>
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          {request.status === 'open' && !request.assignedAdmin && (
            <Button
              type="primary"
              onClick={() => onTakeRequest(request.id)}
            >
              Взять в работу
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => onCompleteRequest(request.id)}
              loading={isCompletingRequest}
            >
              Завершить запрос
            </Button>
          )}
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </Space>
      }
      className={styles.modal}
    >
      {/* Информация о клиенте */}
      <Card size="small" className={styles.customerCard}>
        <div className={styles.customerInfo}>
          <Avatar 
            src={request.customer.avatar} 
            icon={<UserOutlined />} 
            size="large"
          />
          <div className={styles.customerDetails}>
            <div className={styles.customerName}>{request.customer.name}</div>
            <div className={styles.customerEmail}>{request.customer.email}</div>
            {request.customer.phone && (
              <div className={styles.customerPhone}>{request.customer.phone}</div>
            )}
          </div>
        </div>
      </Card>

      <Divider />

      {/* Описание запроса */}
      <Card size="small" title="Описание запроса" className={styles.descriptionCard}>
        <p>{request.description}</p>
        {request.tags.length > 0 && (
          <div className={styles.tags}>
            {request.tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </Card>

      <Divider />

      {/* Вкладки с чатами */}
      <Tabs items={tabItems} className={styles.tabs} />
    </Modal>
  );
};
```

## 🎨 Стили компонентов

### CSS модуль для секции обработки запросов:

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

/* Адаптивность */
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

### CSS модуль для таблицы запросов:

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

/* Адаптивность */
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

## 🔧 API интеграция

### Утилиты для работы с API:

```typescript
// frontend-react/src/pages/AdminDashboard/utils/requestsApi.ts

import { apiClient } from '../../../api/client';
import type { CustomerRequest, RequestMessage } from '../types/requests.types';

export const requestsApi = {
  // Получение списка запросов
  async getRequests(status?: string): Promise<CustomerRequest[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get('/admin/requests/', { params });
    return response.data.results || response.data;
  },

  // Получение деталей запроса
  async getRequest(id: number): Promise<CustomerRequest> {
    const response = await apiClient.get(`/admin/requests/${id}/`);
    return response.data;
  },

  // Получение сообщений запроса
  async getRequestMessages(requestId: number): Promise<RequestMessage[]> {
    const response = await apiClient.get(`/admin/requests/${requestId}/messages/`);
    return response.data.results || response.data;
  },

  // Взятие запроса в работу
  async takeRequest(requestId: number): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/requests/${requestId}/take/`);
    return response.data;
  },

  // Отправка сообщения
  async sendMessage(
    requestId: number, 
    content: string, 
    isInternal = false
  ): Promise<RequestMessage> {
    const response = await apiClient.post(`/admin/requests/${requestId}/messages/`, {
      content,
      is_internal: isInternal,
    });
    return response.data;
  },

  // Завершение запроса
  async completeRequest(requestId: number): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/requests/${requestId}/`, {
      status: 'completed'
    });
    return response.data;
  },

  // Обновление приоритета
  async updatePriority(
    requestId: number, 
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/requests/${requestId}/`, {
      priority
    });
    return response.data;
  },

  // Добавление тегов
  async addTags(requestId: number, tags: string[]): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/requests/${requestId}/`, {
      tags
    });
    return response.data;
  },

  // Загрузка файла
  async uploadFile(requestId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request_id', requestId.toString());
    
    const response = await apiClient.post('/admin/requests/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
```

## 📊 Статистика и аналитика

### Компонент статистики запросов:

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

Эта техническая документация предоставляет детальное руководство по реализации функционала обработки запросов в админ-панели, включая все необходимые компоненты, хуки, типы и стили, следуя существующей архитектуре проекта.