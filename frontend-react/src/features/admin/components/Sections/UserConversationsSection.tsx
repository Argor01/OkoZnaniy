import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  message as antMessage,
  Spin,
  Empty
} from 'antd';
import { 
  MessageOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import { apiClient } from '@/api/client';
import styles from './UserConversationsSection.module.css';
import { logger } from '@/utils/logger';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Title } = Typography;
const { Search } = Input;

interface ConversationFilters {
  orderId: string;
  username: string;
  orderTitle: string;
}

interface Message {
  id: number;
  text: string;
  file?: string | null;
  file_name?: string;
  message_type: string;
  offer_data?: any;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email?: string;
    role: string;
  };
  is_read: boolean;
  created_at: string;
}

interface UserChat {
  id: number;
  order_id?: number | null;
  order_title?: string | null;
  context_title?: string | null;
  participants: Array<{
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    avatar?: string | null;
    online: boolean;
  }>;
  client?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
  } | null;
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
  } | null;
  messages: Message[];
  last_message?: {
    text: string;
    sender: {
      id?: number;
      username?: string;
      first_name: string;
      last_name: string;
      email?: string;
      role?: string;
    };
    created_at: string;
  } | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

type AccountLike = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
};

const ROLE_LABELS: Record<string, string> = {
  client: 'Клиент',
  expert: 'Эксперт',
  admin: 'Админ',
  director: 'Директор',
  system: 'Система',
};

const getInitialFilters = (): ConversationFilters => {
  const fallback = { orderId: '', username: '', orderTitle: '' };
  try {
    const raw = sessionStorage.getItem('adminPlatformConversationsFilters');
    if (!raw) return fallback;
    sessionStorage.removeItem('adminPlatformConversationsFilters');
    const parsed = JSON.parse(raw) as Partial<ConversationFilters>;
    return {
      orderId: parsed.orderId || '',
      username: parsed.username || '',
      orderTitle: parsed.orderTitle || '',
    };
  } catch {
    return fallback;
  }
};

export const UserConversationsSection: React.FC = () => {
  const [chats, setChats] = useState<UserChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<UserChat | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ConversationFilters>(getInitialFilters);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchChats();
  }, []);

  const isMobile = windowWidth < 768;

  const fetchChats = async (nextFilters: ConversationFilters = filters) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin-panel/platform-conversations/', {
        params: {
          order_id: nextFilters.orderId || undefined,
          username: nextFilters.username || undefined,
          order_title: nextFilters.orderTitle || undefined,
        },
      });
      const data = response.data;
      const nextChats: UserChat[] = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && Array.isArray(data.results)
          ? data.results
          : data && typeof data === 'object' && Array.isArray(data.data)
            ? data.data
            : [];

      if (Array.isArray(data)) {
        setChats(nextChats);
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        setChats(nextChats);
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        setChats(nextChats);
      } else {
        setChats([]);
        logger.error('Unexpected data format for chats:', data);
      }
      setSelectedChat((current) => {
        if (!current) return null;
        return nextChats.find((chat) => chat.id === current.id) ?? null;
      });
    } catch (error) {
      logger.error('Ошибка загрузки чатов:', error);
      antMessage.error('Не удалось загрузить переписки');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ConversationFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    const emptyFilters = { orderId: '', username: '', orderTitle: '' };
    setFilters(emptyFilters);
    setSearchText('');
    fetchChats(emptyFilters);
  };

  const getDisplayName = (account?: AccountLike | null) => {
    if (!account) return 'Не указан';
    const fullName = `${account.first_name || ''} ${account.last_name || ''}`.trim();
    return fullName || account.username || account.email || `Пользователь #${account.id || '—'}`;
  };

  const getAccountMeta = (account?: AccountLike | null) => {
    if (!account) return '';
    if (account.username && account.email) return `@${account.username} • ${account.email}`;
    if (account.username) return `@${account.username}`;
    return account.email || '';
  };

  const getRoleLabel = (role?: string, fallback?: string) => {
    if (!role) return fallback || 'Пользователь';
    return ROLE_LABELS[role] || role;
  };

  const getInitials = (account?: AccountLike | null) => {
    const name = getDisplayName(account);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getParticipantsLine = (chat: UserChat) => {
    const client = chat.client ? `Клиент: ${getDisplayName(chat.client)}` : '';
    const expert = chat.expert ? `Эксперт: ${getDisplayName(chat.expert)}` : '';
    return [client, expert].filter(Boolean).join(' • ');
  };

  const getMessagePreview = (message: Message) => {
    if (message.text) return message.text;
    if (message.file_name) return `Файл: ${message.file_name}`;
    if (message.message_type === 'offer') return 'Индивидуальное предложение';
    if (message.message_type === 'work_offer') return 'Предложение готовой работы';
    if (message.message_type === 'work_delivery') return 'Готовая работа';
    return 'Системное событие';
  };

  const filteredChats = chats.filter(chat => {
    const searchLower = searchText.toLowerCase();
    const clientName = chat.client
      ? `${chat.client.username || ''} ${chat.client.email || ''} ${chat.client.first_name || ''} ${chat.client.last_name || ''}`.toLowerCase()
      : '';
    const expertName = chat.expert
      ? `${chat.expert.username || ''} ${chat.expert.email || ''} ${chat.expert.first_name || ''} ${chat.expert.last_name || ''}`.toLowerCase()
      : '';
    const orderId = String(chat.order_id || '');
    const orderTitle = chat.order_title?.toLowerCase() || '';
    const contextTitle = chat.context_title?.toLowerCase() || '';
    
    return clientName.includes(searchLower) || 
           expertName.includes(searchLower) || 
           orderId.includes(searchLower) ||
           orderTitle.includes(searchLower) ||
           contextTitle.includes(searchLower);
  });

  const getChatTitle = (chat: UserChat) => {
    if (chat.order_title) return chat.order_title;
    if (chat.context_title) return chat.context_title;
    if (chat.client && chat.expert) {
      return `${getDisplayName(chat.client)} ↔ ${getDisplayName(chat.expert)}`;
    }
    return `Чат #${chat.id}`;
  };

  const getChatDescription = (chat: UserChat) => {
    if (chat.order_id) return `Заказ #${chat.order_id}`;
    return `${chat.participants.length} участников`;
  };

  return (
    <div className={styles.chatContainer}>
      <Card 
        className={[
          styles.chatListCard,
          isMobile && selectedChat ? styles.chatListCardHidden : ''
        ].filter(Boolean).join(' ')}
      >
        <div className={styles.chatListHeader}>
          <div className={styles.chatListHeaderRow}>
            <Title level={5} className={styles.chatListTitle}>
              {isMobile ? 'Переписки' : 'Переписки пользователей'}
            </Title>
            <Tag color="purple">{chats.length}</Tag>
          </div>
          
          <div className={styles.filtersGrid}>
            <Input
              placeholder="ID заказа"
              value={filters.orderId}
              onChange={(e) => handleFilterChange('orderId', e.target.value.replace(/[^\d]/g, ''))}
              onPressEnter={() => fetchChats()}
              className={styles.filterInput}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Input
              placeholder="Никнейм или email"
              value={filters.username}
              onChange={(e) => handleFilterChange('username', e.target.value)}
              onPressEnter={() => fetchChats()}
              className={styles.filterInput}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Input
              placeholder="Название заказа"
              value={filters.orderTitle}
              onChange={(e) => handleFilterChange('orderTitle', e.target.value)}
              onPressEnter={() => fetchChats()}
              className={styles.filterInput}
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>

          <div className={styles.filterActions}>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={() => fetchChats()}
              loading={loading}
            >
              Найти
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={resetFilters}
              disabled={loading}
            >
              Сбросить
            </Button>
          </div>

          <div className={styles.chatListHint}>
            Показываются переписки между клиентами и экспертами.
          </div>

          <Search
            placeholder="Быстрый поиск в загруженных результатах"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.chatListSearch}
            prefix={<SearchOutlined />}
          />
        </div>

        <div className={styles.chatListScroll}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : filteredChats.length === 0 ? (
            <Empty description="Переписки не найдены" style={{ marginTop: 40 }} />
          ) : (
            <List
              dataSource={filteredChats}
              renderItem={(chat) => (
                <List.Item
                  className={[
                    styles.chatRoomItem,
                    selectedChat?.id === chat.id ? styles.chatRoomItemActive : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedChat(chat)}
                >
                  <List.Item.Meta
                    avatar={
                      <div className={styles.chatRoomAvatar}>
                        <MessageOutlined />
                      </div>
                    }
                    title={
                      <div className={styles.chatRoomTitleRow}>
                        <span>{getChatTitle(chat)}</span>
                        <Tag color="green">{chat.message_count}</Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div className={styles.chatRoomDescription}>
                          {getChatDescription(chat)}
                        </div>
                        <div className={styles.chatRoomAccounts}>
                          {getParticipantsLine(chat)}
                        </div>
                        {chat.last_message && (
                          <div className={styles.chatRoomLastMessage}>
                            <span>
                              {getDisplayName(chat.last_message.sender)}: {chat.last_message.text.length > 30
                                ? `${chat.last_message.text.substring(0, 30)}...`
                                : chat.last_message.text || 'Событие'
                              }
                            </span>
                          </div>
                        )}
                        <div className={styles.chatRoomMeta}>
                          {chat.last_message && dayjs(chat.last_message.created_at).format('DD.MM.YYYY HH:mm')}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>

      {selectedChat ? (
        <Card className={styles.chatMainCard}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderInfo}>
              {isMobile && (
                <Button 
                  size="small" 
                  onClick={() => setSelectedChat(null)}
                  className={styles.chatBackButton}
                >
                  ←
                </Button>
              )}
              <div className={styles.chatHeaderTitleWrap}>
                <Title level={5} className={styles.chatHeaderTitle}>
                  {getChatTitle(selectedChat)}
                </Title>
                <Text type="secondary" className={styles.chatHeaderSubtitle}>
                  {getParticipantsLine(selectedChat) || `${selectedChat.participants.length} участников`} • {selectedChat.message_count} сообщений
                </Text>
              </div>
            </div>
            
            <Space size={isMobile ? 4 : 8}>
              {selectedChat.order_id && (
                <Tag color="purple">Заказ #{selectedChat.order_id}</Tag>
              )}
            </Space>
          </div>

          <div className={styles.chatParticipantsBar}>
            {selectedChat.client && (
              <div className={styles.accountCard}>
                <div className={`${styles.participantAvatar} ${styles.participantClient}`}>
                  {getInitials(selectedChat.client)}
                </div>
                <div className={styles.accountInfo}>
                  <div className={styles.accountRole}>Клиент</div>
                  <div className={styles.accountName}>{getDisplayName(selectedChat.client)}</div>
                  <div className={styles.accountMeta}>{getAccountMeta(selectedChat.client)}</div>
                </div>
              </div>
            )}
            {selectedChat.expert && (
              <div className={styles.accountCard}>
                <div className={`${styles.participantAvatar} ${styles.participantExpert}`}>
                  {getInitials(selectedChat.expert)}
                </div>
                <div className={styles.accountInfo}>
                  <div className={styles.accountRole}>Эксперт</div>
                  <div className={styles.accountName}>{getDisplayName(selectedChat.expert)}</div>
                  <div className={styles.accountMeta}>{getAccountMeta(selectedChat.expert)}</div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.chatMessagesArea}>
            {selectedChat.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={styles.messageRow}
              >
                <div className={styles.messageAvatar}>
                  {getInitials(msg.sender)}
                </div>
                
                <div className={styles.messageContent}>
                  <div className={styles.messageHeaderRow}>
                    <Text strong className={styles.messageSenderName}>
                      {getDisplayName(msg.sender)}
                    </Text>
                    {!isMobile && (
                      <Tag color="purple" className={styles.messageRoleTag}>
                        {getRoleLabel(msg.sender.role)}
                      </Tag>
                    )}
                    <Text type="secondary" className={styles.messageTime}>
                      {dayjs(msg.created_at).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  </div>  
                
                  <div className={styles.messageBubble}>
                    <Text className={styles.messageText}>
                      {getMessagePreview(msg)}
                    </Text>
                    {msg.file && (
                      <div className={styles.messageFile}>
                        <a href={msg.file} target="_blank" rel="noopener noreferrer">
                          📎 {msg.file_name || 'Файл'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className={styles.chatEmptyCard}>
          <div className={styles.chatEmptyState}>
            <MessageOutlined className={styles.chatEmptyIcon} />
            <Title level={4} type="secondary">
              Выберите переписку для просмотра
            </Title>
            <Text type="secondary">
              Выберите переписку из списка слева
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
};
