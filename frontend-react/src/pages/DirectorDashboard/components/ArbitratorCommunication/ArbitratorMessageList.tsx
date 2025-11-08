import React from 'react';
import { List, Avatar, Typography, Tag, Space, Button } from 'antd';
import {
  UserOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { directorApi } from '../../api/directorApi';
import type { InternalMessage } from '../../api/types';

const { Text, Paragraph } = Typography;

interface ArbitratorMessageListProps {
  messages: InternalMessage[];
  currentUserId?: number;
  onReply?: (message: InternalMessage) => void;
  onDelete?: (messageId: number) => void;
  onClaimClick?: (claimId: number) => void;
}

const ArbitratorMessageList: React.FC<ArbitratorMessageListProps> = ({
  messages,
  currentUserId,
  onReply,
  onDelete,
  onClaimClick,
}) => {
  const queryClient = useQueryClient();

  // Мутация для удаления сообщения
  const deleteMessageMutation = useMutation({
    mutationFn: (id: number) => directorApi.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-messages'] });
    },
  });

  // Мутация для отметки как прочитанное
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => directorApi.markMessageAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-messages'] });
    },
  });

  const handleDelete = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
    if (onDelete) {
      onDelete(messageId);
    }
  };

  const handleMarkAsRead = (message: InternalMessage) => {
    if (!message.read_at && message.sender.role !== 'director') {
      markAsReadMutation.mutate(message.id);
    }
  };

  // Получение цвета тега приоритета
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  // Получение текста приоритета
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return priority;
    }
  };

  // Получение цвета тега статуса
  const getStatusColor = (status: string, readAt?: string) => {
    if (readAt) {
      return 'green';
    }
    switch (status) {
      case 'sent':
        return 'blue';
      case 'read':
        return 'green';
      case 'replied':
        return 'purple';
      default:
        return 'default';
    }
  };

  // Получение текста статуса
  const getStatusText = (status: string, readAt?: string) => {
    if (readAt) {
      return 'Прочитано';
    }
    switch (status) {
      case 'sent':
        return 'Отправлено';
      case 'read':
        return 'Прочитано';
      case 'replied':
        return 'Ответ получен';
      default:
        return status;
    }
  };

  if (messages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text type="secondary">Сообщений нет</Text>
      </div>
    );
  }

  return (
    <List
      itemLayout="vertical"
      dataSource={messages}
      renderItem={(message) => {
        const isCurrentUser = message.sender.id === currentUserId;
        const isUnread = !message.read_at && !isCurrentUser;

        return (
          <List.Item
            key={message.id}
            style={{
              backgroundColor: isUnread ? '#f0f7ff' : message.sender.role === 'arbitrator' ? '#fafafa' : 'transparent',
              padding: '16px',
              marginBottom: '8px',
              borderRadius: '8px',
              border: isUnread ? '2px solid #1890ff' : '1px solid #f0f0f0',
              borderLeft: message.sender.role === 'arbitrator' ? '4px solid #1890ff' : '4px solid #52c41a',
            }}
            onMouseEnter={() => handleMarkAsRead(message)}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: isCurrentUser ? '#52c41a' : '#1890ff',
                  }}
                />
              }
              title={
                <Space>
                  <Text strong>{message.sender.username}</Text>
                  <Tag color={message.sender.role === 'arbitrator' ? 'blue' : 'purple'}>
                    {message.sender.role === 'arbitrator' ? 'Арбитр' : 'Дирекция'}
                  </Tag>
                  {message.priority && (
                    <Tag color={getPriorityColor(message.priority)}>
                      {getPriorityText(message.priority)}
                    </Tag>
                  )}
                  <Tag color={getStatusColor(message.status, message.read_at)}>
                    {getStatusText(message.status, message.read_at)}
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text type="secondary">
                    {dayjs(message.created_at).format('DD.MM.YYYY HH:mm')}
                  </Text>
                  {message.claim_id && (
                    <Text
                      type="secondary"
                      style={{
                        cursor: onClaimClick ? 'pointer' : 'default',
                        textDecoration: onClaimClick ? 'underline' : 'none',
                      }}
                      onClick={() => onClaimClick && onClaimClick(message.claim_id!)}
                    >
                      Связано с обращением #{message.claim_id}
                    </Text>
                  )}
                </Space>
              }
            />
            <Paragraph style={{ marginTop: '8px', marginBottom: '8px' }}>
              {message.text}
            </Paragraph>
            {message.attachments && message.attachments.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ marginRight: '8px' }}>
                  <PaperClipOutlined /> Прикрепленные файлы:
                </Text>
                <Space>
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {attachment.name}
                    </a>
                  ))}
                </Space>
              </div>
            )}
            <div style={{ marginTop: '8px' }}>
              <Space>
                {!isCurrentUser && (
                  <Button
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => onReply && onReply(message)}
                  >
                    Ответить
                  </Button>
                )}
                {isCurrentUser && (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(message.id)}
                    loading={deleteMessageMutation.isPending}
                  >
                    Удалить
                  </Button>
                )}
              </Space>
            </div>
          </List.Item>
        );
      }}
    />
  );
};

export default ArbitratorMessageList;

