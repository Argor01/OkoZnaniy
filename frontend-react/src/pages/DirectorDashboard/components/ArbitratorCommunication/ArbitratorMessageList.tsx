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
import styles from './ArbitratorMessageList.module.css';

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
  const isMobile = window.innerWidth <= 840;

  
  const deleteMessageMutation = useMutation({
    mutationFn: (id: number) => directorApi.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-messages'] });
    },
  });

  
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
      <div className={styles.emptyState}>
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
            className={[
              styles.messageItem,
              isMobile ? styles.messageItemMobile : '',
              isUnread
                ? styles.messageItemUnread
                : message.sender.role === 'arbitrator'
                ? styles.messageItemArbitrator
                : styles.messageItemDefault,
            ].filter(Boolean).join(' ')}
            onMouseEnter={() => handleMarkAsRead(message)}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  size={isMobile ? 80 : 96}
                  icon={<UserOutlined />}
                  className={styles.avatar}
                />
              }
              title={
                <div className={styles.titleRow}>
                  <Text strong className={styles.senderName}>
                    {message.sender.username}
                  </Text>
                  <Tag
                    color={message.sender.role === 'arbitrator' ? 'blue' : 'purple'}
                    className={styles.metaTag}
                  >
                    {message.sender.role === 'arbitrator' ? 'Арбитр' : 'Дирекция'}
                  </Tag>
                  {message.priority && (
                    <Tag
                      color={getPriorityColor(message.priority)}
                      className={styles.metaTag}
                    >
                      {getPriorityText(message.priority)}
                    </Tag>
                  )}
                  <Tag
                    color={getStatusColor(message.status, message.read_at)}
                    className={styles.metaTag}
                  >
                    {getStatusText(message.status, message.read_at)}
                  </Tag>
                </div>
              }
              description={
                <Space direction="vertical" size="small" className={styles.fullWidth}>
                  <Text
                    type="secondary"
                    className={[
                      styles.metaText,
                      isMobile ? styles.metaTextMobile : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {dayjs(message.created_at).format(isMobile ? 'DD.MM.YY HH:mm' : 'DD.MM.YYYY HH:mm')}
                  </Text>
                  {message.claim_id && (
                    <Text
                      type="secondary"
                      className={[
                        styles.claimLink,
                        isMobile ? styles.claimLinkMobile : '',
                        onClaimClick ? styles.claimLinkActive : styles.claimLinkInactive,
                      ].filter(Boolean).join(' ')}
                      onClick={() => onClaimClick && onClaimClick(message.claim_id!)}
                    >
                      Связано с обращением #{message.claim_id}
                    </Text>
                  )}
                </Space>
              }
            />
            <Paragraph
              className={[
                styles.messageText,
                isMobile ? styles.messageTextMobile : '',
              ].filter(Boolean).join(' ')}
            >
              {message.text}
            </Paragraph>
            {message.attachments && message.attachments.length > 0 && (
              <div
                className={[
                  styles.attachmentsBlock,
                  isMobile ? styles.attachmentsBlockMobile : '',
                ].filter(Boolean).join(' ')}
              >
                <Text
                  type="secondary"
                  className={[
                    styles.attachmentsLabel,
                    isMobile ? styles.attachmentsLabelMobile : '',
                  ].filter(Boolean).join(' ')}
                >
                  <PaperClipOutlined /> {isMobile ? 'Файлы:' : 'Прикрепленные файлы:'}
                </Text>
                <Space
                  direction={isMobile ? 'vertical' : 'horizontal'}
                  size="small"
                  className={[
                    styles.attachmentsList,
                    isMobile ? styles.attachmentsListMobile : '',
                  ].filter(Boolean).join(' ')}
                >
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={[
                        styles.attachmentLink,
                        isMobile ? styles.attachmentLinkMobile : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {attachment.name}
                    </a>
                  ))}
                </Space>
              </div>
            )}
            <div
              className={[
                styles.actionsRow,
                isMobile ? styles.actionsRowMobile : '',
              ].filter(Boolean).join(' ')}
            >
              <Space size={isMobile ? 'small' : 'middle'}>
                {!isCurrentUser && (
                  <Button
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => onReply && onReply(message)}
                    className={[
                      styles.actionButton,
                      isMobile ? styles.actionButtonMobile : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {isMobile ? 'Ответ' : 'Ответить'}
                  </Button>
                )}
                {isCurrentUser && (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(message.id)}
                    loading={deleteMessageMutation.isPending}
                    className={[
                      styles.actionButton,
                      isMobile ? styles.actionButtonMobile : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {isMobile ? '' : 'Удалить'}
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

