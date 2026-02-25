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
  Tooltip,
  Spin,
  Empty
} from 'antd';
import { 
  MessageOutlined,
  SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import { apiClient } from '../../../../api/client';
import styles from './UserConversationsSection.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Title } = Typography;
const { Search } = Input;

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
  } | null;
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  messages: Message[];
  last_message?: {
    text: string;
    sender: {
      first_name: string;
      last_name: string;
    };
    created_at: string;
  } | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export const UserConversationsSection: React.FC = () => {
  const [chats, setChats] = useState<UserChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<UserChat | null>(null);
  const [searchText, setSearchText] = useState('');
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

  // Мок-данные для тестирования
  const mockChats: UserChat[] = [
    {
      id: 1,
      order_id: 101,
      order_title: 'Решение задач по математике',
      context_title: 'Консультация по математике',
      participants: [
        {
          id: 1,
          username: 'client1',
          first_name: 'Иван',
          last_name: 'Петров',
          email: 'client1@test.com',
          role: 'client',
          avatar: null,
          online: true,
        },
        {
          id: 2,
          username: 'expert1',
          first_name: 'Мария',
          last_name: 'Смирнова',
          email: 'expert1@test.com',
          role: 'expert',
          avatar: null,
          online: false,
        },
      ],
      client: {
        id: 1,
        username: 'client1',
        first_name: 'Иван',
        last_name: 'Петров',
        email: 'client1@test.com',
      },
      expert: {
        id: 2,
        username: 'expert1',
        first_name: 'Мария',
        last_name: 'Смирнова',
        email: 'expert1@test.com',
      },
      messages: [
        {
          id: 1,
          text: 'Здравствуйте! Мне нужна помощь с решением задач по математике.',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 1,
            username: 'client1',
            first_name: 'Иван',
            last_name: 'Петров',
            role: 'client',
          },
          is_read: true,
          created_at: '2024-02-20T10:00:00Z',
        },
        {
          id: 2,
          text: 'Добрый день! Конечно, помогу. Какие именно задачи вас интересуют?',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 2,
            username: 'expert1',
            first_name: 'Мария',
            last_name: 'Смирнова',
            role: 'expert',
          },
          is_read: true,
          created_at: '2024-02-20T10:15:00Z',
        },
        {
          id: 3,
          text: 'Нужно решить систему уравнений и построить график функции.',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 1,
            username: 'client1',
            first_name: 'Иван',
            last_name: 'Петров',
            role: 'client',
          },
          is_read: true,
          created_at: '2024-02-20T10:30:00Z',
        },
      ],
      last_message: {
        text: 'Нужно решить систему уравнений и построить график функции.',
        sender: {
          first_name: 'Иван',
          last_name: 'Петров',
        },
        created_at: '2024-02-20T10:30:00Z',
      },
      message_count: 3,
      created_at: '2024-02-20T10:00:00Z',
      updated_at: '2024-02-20T10:30:00Z',
    },
    {
      id: 2,
      order_id: 102,
      order_title: 'Курсовая работа по экономике',
      context_title: 'Помощь с курсовой работой',
      participants: [
        {
          id: 3,
          username: 'client2',
          first_name: 'Анна',
          last_name: 'Иванова',
          email: 'client2@test.com',
          role: 'client',
          avatar: null,
          online: true,
        },
        {
          id: 4,
          username: 'expert2',
          first_name: 'Дмитрий',
          last_name: 'Козлов',
          email: 'expert2@test.com',
          role: 'expert',
          avatar: null,
          online: true,
        },
      ],
      client: {
        id: 3,
        username: 'client2',
        first_name: 'Анна',
        last_name: 'Иванова',
        email: 'client2@test.com',
      },
      expert: {
        id: 4,
        username: 'expert2',
        first_name: 'Дмитрий',
        last_name: 'Козлов',
        email: 'expert2@test.com',
      },
      messages: [
        {
          id: 4,
          text: 'Добрый день! Нужна помощь с курсовой по экономике.',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 3,
            username: 'client2',
            first_name: 'Анна',
            last_name: 'Иванова',
            role: 'client',
          },
          is_read: true,
          created_at: '2024-02-21T09:00:00Z',
        },
        {
          id: 5,
          text: 'Здравствуйте! Расскажите подробнее о теме курсовой.',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 4,
            username: 'expert2',
            first_name: 'Дмитрий',
            last_name: 'Козлов',
            role: 'expert',
          },
          is_read: true,
          created_at: '2024-02-21T09:10:00Z',
        },
        {
          id: 6,
          text: 'Тема: "Анализ финансовых показателей предприятия"',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 3,
            username: 'client2',
            first_name: 'Анна',
            last_name: 'Иванова',
            role: 'client',
          },
          is_read: true,
          created_at: '2024-02-21T09:20:00Z',
        },
        {
          id: 7,
          text: 'Отлично! Я могу помочь с этой темой. Когда нужна работа?',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 4,
            username: 'expert2',
            first_name: 'Дмитрий',
            last_name: 'Козлов',
            role: 'expert',
          },
          is_read: false,
          created_at: '2024-02-21T09:25:00Z',
        },
      ],
      last_message: {
        text: 'Отлично! Я могу помочь с этой темой. Когда нужна работа?',
        sender: {
          first_name: 'Дмитрий',
          last_name: 'Козлов',
        },
        created_at: '2024-02-21T09:25:00Z',
      },
      message_count: 4,
      created_at: '2024-02-21T09:00:00Z',
      updated_at: '2024-02-21T09:25:00Z',
    },
    {
      id: 3,
      order_id: null,
      order_title: null,
      context_title: 'Консультация по программированию',
      participants: [
        {
          id: 5,
          username: 'client3',
          first_name: 'Сергей',
          last_name: 'Волков',
          email: 'client3@test.com',
          role: 'client',
          avatar: null,
          online: false,
        },
        {
          id: 6,
          username: 'expert3',
          first_name: 'Елена',
          last_name: 'Новикова',
          email: 'expert3@test.com',
          role: 'expert',
          avatar: null,
          online: true,
        },
      ],
      client: {
        id: 5,
        username: 'client3',
        first_name: 'Сергей',
        last_name: 'Волков',
        email: 'client3@test.com',
      },
      expert: {
        id: 6,
        username: 'expert3',
        first_name: 'Елена',
        last_name: 'Новикова',
        email: 'expert3@test.com',
      },
      messages: [
        {
          id: 8,
          text: 'Здравствуйте! Помогите разобраться с алгоритмами сортировки.',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 5,
            username: 'client3',
            first_name: 'Сергей',
            last_name: 'Волков',
            role: 'client',
          },
          is_read: true,
          created_at: '2024-02-22T14:00:00Z',
        },
        {
          id: 9,
          text: 'Добрый день! Какие именно алгоритмы вас интересуют?',
          file: null,
          file_name: '',
          message_type: 'text',
          offer_data: null,
          sender: {
            id: 6,
            username: 'expert3',
            first_name: 'Елена',
            last_name: 'Новикова',
            role: 'expert',
          },
          is_read: true,
          created_at: '2024-02-22T14:05:00Z',
        },
      ],
      last_message: {
        text: 'Добрый день! Какие именно алгоритмы вас интересуют?',
        sender: {
          first_name: 'Елена',
          last_name: 'Новикова',
        },
        created_at: '2024-02-22T14:05:00Z',
      },
      message_count: 2,
      created_at: '2024-02-22T14:00:00Z',
      updated_at: '2024-02-22T14:05:00Z',
    },
  ];

  const USE_MOCK_DATA = true; // Переключатель для использования мок-данных

  const fetchChats = async () => {
    setLoading(true);
    try {
      if (USE_MOCK_DATA) {
        // Используем мок-данные
        setTimeout(() => {
          setChats(mockChats);
          setLoading(false);
        }, 500);
      } else {
        // Загружаем реальные данные
        const response = await apiClient.get('admin-panel/user-chats/');
        setChats(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      antMessage.error('Не удалось загрузить переписки');
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const searchLower = searchText.toLowerCase();
    const clientName = chat.client ? `${chat.client.first_name} ${chat.client.last_name}`.toLowerCase() : '';
    const expertName = chat.expert ? `${chat.expert.first_name} ${chat.expert.last_name}`.toLowerCase() : '';
    const orderTitle = chat.order_title?.toLowerCase() || '';
    const contextTitle = chat.context_title?.toLowerCase() || '';
    
    return clientName.includes(searchLower) || 
           expertName.includes(searchLower) || 
           orderTitle.includes(searchLower) ||
           contextTitle.includes(searchLower);
  });

  const getChatTitle = (chat: UserChat) => {
    if (chat.order_title) return chat.order_title;
    if (chat.context_title) return chat.context_title;
    if (chat.client && chat.expert) {
      return `${chat.client.first_name} ${chat.client.last_name} ↔ ${chat.expert.first_name} ${chat.expert.last_name}`;
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
            <Tag color="blue">{chats.length}</Tag>
          </div>
          
          <Search
            placeholder="Поиск по участникам или заказу"
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
                        {chat.last_message && (
                          <div className={styles.chatRoomLastMessage}>
                            <span>
                              {chat.last_message.sender.first_name}: {chat.last_message.text.length > 30 
                                ? `${chat.last_message.text.substring(0, 30)}...` 
                                : chat.last_message.text
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
                  {selectedChat.participants.length} участников • {selectedChat.message_count} сообщений
                </Text>
              </div>
            </div>
            
            <Space size={isMobile ? 4 : 8}>
              {selectedChat.order_id && (
                <Tag color="blue">Заказ #{selectedChat.order_id}</Tag>
              )}
            </Space>
          </div>

          <div className={styles.chatParticipantsBar}>
            <div className={styles.chatParticipantsRow}>
              {selectedChat.participants.map(participant => (
                <Tooltip 
                  key={participant.id}
                  title={`${participant.first_name} ${participant.last_name} (${participant.role})`}
                >
                  <div className={[
                    styles.participantAvatar,
                    participant.online ? styles.participantOnline : styles.participantOffline
                  ].filter(Boolean).join(' ')}>
                    {participant.first_name[0]}{participant.last_name[0]}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className={styles.chatMessagesArea}>
            {selectedChat.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={styles.messageRow}
              >
                <div className={styles.messageAvatar}>
                  {msg.sender.first_name[0]}{msg.sender.last_name[0]}
                </div>
                
                <div className={styles.messageContent}>
                  <div className={styles.messageHeaderRow}>
                    <Text strong className={styles.messageSenderName}>
                      {msg.sender.first_name} {msg.sender.last_name}
                    </Text>
                    {!isMobile && (
                      <Tag color="blue" className={styles.messageRoleTag}>
                        {msg.sender.role}
                      </Tag>
                    )}
                    <Text type="secondary" className={styles.messageTime}>
                      {dayjs(msg.created_at).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  </div>  
                
                  <div className={styles.messageBubble}>
                    <Text className={styles.messageText}>
                      {msg.text}
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
