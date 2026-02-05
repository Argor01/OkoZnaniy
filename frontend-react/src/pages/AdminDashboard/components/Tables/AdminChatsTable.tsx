/**
 * Таблица чатов администраторов
 */

import React from 'react';
import { Table, Button, Tag, Avatar, Tooltip, Space, Badge, Input } from 'antd';
import { 
  MessageOutlined, 
  UserOutlined, 
  TeamOutlined,
  SearchOutlined,
  PlusOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { AdminChatGroup } from '../../types/requests.types';
import { formatChatName, getUserActivityStatus } from '../../utils/formatters';
import styles from './AdminChatsTable.module.css';

interface AdminChatsTableProps {
  chats: AdminChatGroup[];
  loading: boolean;
  onChatClick: (chat: AdminChatGroup) => void;
  onCreateChat?: () => void;
  onJoinChat?: (chatId: number) => void;
  onLeaveChat?: (chatId: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  currentUserId?: number;
}

export const AdminChatsTable: React.FC<AdminChatsTableProps> = ({
  chats,
  loading,
  onChatClick,
  onCreateChat,
  onJoinChat,
  onLeaveChat,
  searchQuery = '',
  onSearchChange,
  currentUserId,
}) => {
  const columns = [
    {
      title: 'Чат',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminChatGroup) => (
        <div className={styles.chatCell}>
          <div className={styles.chatIcon}>
            {record.type === 'private' ? (
              <Avatar icon={<UserOutlined />} size="small" />
            ) : (
              <Avatar icon={<TeamOutlined />} size="small" />
            )}
          </div>
          <div className={styles.chatInfo}>
            <div className={styles.chatName}>
              {formatChatName(record)}
              {record.unreadCount > 0 && (
                <Badge 
                  count={record.unreadCount} 
                  size="small" 
                  className={styles.unreadBadge}
                />
              )}
            </div>
            <div className={styles.chatType}>
              <Tag 
                color={
                  record.type === 'general' ? 'blue' :
                  record.type === 'department' ? 'green' : 'orange'
                }
              >
                {record.type === 'general' ? 'Общий' :
                 record.type === 'department' ? 'Отдел' : 'Приватный'}
              </Tag>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Участники',
      dataIndex: 'participants',
      key: 'participants',
      width: 200,
      render: (participants: AdminChatGroup['participants']) => (
        <div className={styles.participantsCell}>
          <Avatar.Group maxCount={3} size="small">
            {participants.map(participant => (
              <Tooltip key={participant.id} title={participant.name}>
                <Avatar 
                  src={participant.avatar} 
                  icon={<UserOutlined />}
                  className={participant.isOnline ? styles.onlineAvatar : styles.offlineAvatar}
                />
              </Tooltip>
            ))}
          </Avatar.Group>
          <span className={styles.participantCount}>
            {participants.length} участник{participants.length > 1 ? 'ов' : ''}
          </span>
        </div>
      ),
    },
    {
      title: 'Последнее сообщение',
      dataIndex: 'lastMessage',
      key: 'lastMessage',
      width: 300,
      render: (lastMessage: AdminChatGroup['lastMessage']) => (
        lastMessage ? (
          <div className={styles.lastMessageCell}>
            <div className={styles.messageContent}>
              <span className={styles.senderName}>{lastMessage.senderName}:</span>
              <span className={styles.messageText}>
                {lastMessage.content.length > 50 
                  ? `${lastMessage.content.substring(0, 50)}...` 
                  : lastMessage.content}
              </span>
            </div>
            <div className={styles.messageTime}>
              {formatDistanceToNow(new Date(lastMessage.createdAt), { 
                addSuffix: true, 
                locale: ru 
              })}
            </div>
          </div>
        ) : (
          <span className={styles.noMessages}>Нет сообщений</span>
        )
      ),
    },
    {
      title: 'Активность',
      dataIndex: 'createdAt',
      key: 'activity',
      width: 120,
      render: (createdAt: string, record: AdminChatGroup) => {
        const lastActivity = record.lastMessage?.createdAt || createdAt;
        return (
          <Tooltip title={`Создан: ${new Date(createdAt).toLocaleString('ru-RU')}`}>
            <div className={styles.activityCell}>
              <div className={styles.activityTime}>
                {formatDistanceToNow(new Date(lastActivity), { 
                  addSuffix: true, 
                  locale: ru 
                })}
              </div>
              <div className={styles.activityStatus}>
                {record.isActive ? (
                  <Tag color="green">Активен</Tag>
                ) : (
                  <Tag color="default">Неактивен</Tag>
                )}
              </div>
            </div>
          </Tooltip>
        );
      },
      sorter: (a: AdminChatGroup, b: AdminChatGroup) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_, record: AdminChatGroup) => {
        const isParticipant = currentUserId && record.participants.some(p => p.id === currentUserId);
        
        return (
          <Space>
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={() => onChatClick(record)}
              size="small"
              className={styles.actionButton}
            >
              Открыть
            </Button>
            
            {!isParticipant && onJoinChat && (
              <Button
                type="link"
                size="small"
                onClick={() => onJoinChat(record.id)}
                className={styles.joinButton}
              >
                Войти
              </Button>
            )}
            
            {isParticipant && onLeaveChat && record.type !== 'general' && (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => onLeaveChat(record.id)}
                className={styles.leaveButton}
              >
                Выйти
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // Заголовок таблицы с поиском и кнопкой создания
  const tableHeader = (
    <div className={styles.tableHeader}>
      <div className={styles.headerLeft}>
        <h3 className={styles.tableTitle}>Чаты администраторов</h3>
        <div className={styles.filters}>
          {onSearchChange && (
            <Input
              placeholder="Поиск чатов..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
              allowClear
            />
          )}
        </div>
      </div>
      
      <div className={styles.headerRight}>
        {onCreateChat && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateChat}
            className={styles.createButton}
          >
            Создать чат
          </Button>
        )}
      </div>
    </div>
  );

  // Группировка чатов по типам для лучшего отображения
  const groupedChats = chats.reduce((acc, chat) => {
    if (!acc[chat.type]) {
      acc[chat.type] = [];
    }
    acc[chat.type].push(chat);
    return acc;
  }, {} as Record<string, AdminChatGroup[]>);

  // Сортировка: сначала общие, потом отделы, потом приватные
  const sortedChats = [
    ...(groupedChats.general || []),
    ...(groupedChats.department || []),
    ...(groupedChats.private || []),
  ];

  return (
    <div className={styles.tableContainer}>
      {tableHeader}
      
      <Table
        columns={columns}
        dataSource={sortedChats}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} из ${total} чатов`,
        }}
        className={styles.table}
        scroll={{ x: 800 }}
        size="middle"
        rowClassName={(record) => {
          // Выделяем чаты с непрочитанными сообщениями
          if (record.unreadCount > 0) {
            return styles.unreadRow;
          }
          // Выделяем неактивные чаты
          if (!record.isActive) {
            return styles.inactiveRow;
          }
          return '';
        }}
        expandable={{
          expandedRowRender: (record) => (
            <div className={styles.expandedContent}>
              <div className={styles.expandedSection}>
                <h4>Участники чата:</h4>
                <div className={styles.participantsList}>
                  {record.participants.map(participant => {
                    const status = getUserActivityStatus(participant.isOnline ? undefined : '2024-01-01');
                    return (
                      <div key={participant.id} className={styles.participantItem}>
                        <Avatar 
                          src={participant.avatar} 
                          icon={<UserOutlined />} 
                          size="small"
                        />
                        <span className={styles.participantName}>{participant.name}</span>
                        <Tag 
                          color={status.color} 
                          className={styles.statusTag}
                        >
                          {status.label}
                        </Tag>
                        <span className={styles.participantRole}>{participant.role}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {record.lastMessage && (
                <div className={styles.expandedSection}>
                  <h4>Последнее сообщение:</h4>
                  <div className={styles.lastMessageExpanded}>
                    <strong>{record.lastMessage.senderName}:</strong>
                    <p>{record.lastMessage.content}</p>
                    <small>
                      {new Date(record.lastMessage.createdAt).toLocaleString('ru-RU')}
                    </small>
                  </div>
                </div>
              )}
            </div>
          ),
          rowExpandable: (record) => record.participants.length > 0,
        }}
      />
    </div>
  );
};