import React, { useState, useRef, useEffect } from 'react';
import { 
  Input, 
  Button, 
  Avatar, 
  Badge, 
  Space, 
  Typography, 
  message as antMessage, 
  Spin, 
  Upload,
  Tag,
  Tooltip,
  Card,
  List,
  Row,
  Col,
  Empty,
  Select,
  Dropdown,
  Menu
} from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  SendOutlined,
  PaperClipOutlined,
  FileOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MoreOutlined,
  FlagOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './SupportChatsSection.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface SupportChatMessage {
  id: number;
  text: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    is_admin: boolean;
  };
  created_at: string;
  is_mine: boolean;
}

interface SupportChat {
  id: number;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  admin?: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  messages: SupportChatMessage[];
  last_message?: {
    text: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface SupportChatsSectionProps {
  chats?: SupportChat[];
  currentUserId?: number;
  loading?: boolean;
  onSendMessage?: (chatId: number, message: string) => void;
  onTakeChat?: (chatId: number) => void;
  onCloseChat?: (chatId: number) => void;
  onUploadFile?: (chatId: number, file: File) => void;
}

export const SupportChatsSection: React.FC<SupportChatsSectionProps> = ({
  chats = [],
  currentUserId = 1,
  loading = false,
  onSendMessage,
  onUploadFile,
}) => {
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  
  const mockChats: SupportChat[] = [
    {
      id: 1,
      client: {
        id: 101,
        username: 'student_ivan',
        first_name: 'Иван',
        last_name: 'Студентов',
        email: 'ivan.student@email.com',
      },
      admin: {
        id: 1,
        first_name: 'Анна',
        last_name: 'Поддержкина',
        role: 'Администратор поддержки',
      },
      status: 'in_progress',
      priority: 'high',
      subject: 'Проблема с оплатой заказа',
      messages: [
        {
          id: 1,
          text: 'Здравствуйте! У меня проблема с оплатой заказа. Деньги списались, но заказ не создался.',
          sender: {
            id: 101,
            first_name: 'Иван',
            last_name: 'Студентов',
            role: 'Клиент',
            is_admin: false,
          },
          created_at: '2024-02-04T09:00:00Z',
          is_mine: false,
        },
        {
          id: 2,
          text: 'Здравствуйте! Я проверю вашу ситуацию. Можете предоставить номер транзакции?',
          sender: {
            id: 1,
            first_name: 'Анна',
            last_name: 'Поддержкина',
            role: 'Администратор поддержки',
            is_admin: true,
          },
          created_at: '2024-02-04T09:05:00Z',
          is_mine: currentUserId === 1,
        },
      ],
      last_message: {
        text: 'Здравствуйте! Я проверю вашу ситуацию. Можете предоставить номер транзакции?',
        created_at: '2024-02-04T09:05:00Z',
      },
      unread_count: 1,
      created_at: '2024-02-04T09:00:00Z',
      updated_at: '2024-02-04T09:05:00Z',
    },
    {
      id: 2,
      client: {
        id: 102,
        username: 'maria_client',
        first_name: 'Мария',
        last_name: 'Клиентова',
        email: 'maria.client@email.com',
      },
      status: 'open',
      priority: 'medium',
      subject: 'Вопрос по качеству работы',
      messages: [
        {
          id: 3,
          text: 'Добрый день! Получила работу, но есть вопросы по оформлению. Можете помочь?',
          sender: {
            id: 102,
            first_name: 'Мария',
            last_name: 'Клиентова',
            role: 'Клиент',
            is_admin: false,
          },
          created_at: '2024-02-04T10:30:00Z',
          is_mine: false,
        },
      ],
      last_message: {
        text: 'Добрый день! Получила работу, но есть вопросы по оформлению. Можете помочь?',
        created_at: '2024-02-04T10:30:00Z',
      },
      unread_count: 1,
      created_at: '2024-02-04T10:30:00Z',
      updated_at: '2024-02-04T10:30:00Z',
    },
  ];

  const sendMessage = async () => {
    if (!messageText.trim() && attachedFiles.length === 0) {
      antMessage.warning('Введите сообщение или прикрепите файл');
      return;
    }

    if (!selectedChat) {
      antMessage.error('Чат не выбран');
      return;
    }

    setSending(true);
    try {
      onSendMessage?.(selectedChat.id, messageText);
      
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          onUploadFile?.(selectedChat.id, file);
        }
      }
      
      setMessageText('');
      setAttachedFiles([]);
      antMessage.success('Сообщение отправлено');
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      antMessage.error('Размер файла не должен превышать 10 МБ');
      return false;
    }

    setAttachedFiles(prev => [...prev, file]);
    antMessage.success(`Файл "${file.name}" прикреплен`);
    return false;
  };

  const removeAttachedFile = (fileToRemove: File) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    antMessage.info('Файл удален');
  };

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'orange',
      in_progress: 'blue',
      resolved: 'green',
      closed: 'gray',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      open: 'Открыт',
      in_progress: 'В работе',
      resolved: 'Решен',
      closed: 'Закрыт',
    };
    return texts[status as keyof typeof texts] || 'Неизвестно';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      urgent: 'purple',
    };
    return colors[priority as keyof typeof colors] || 'gray';
  };

  const getPriorityText = (priority: string) => {
    const texts = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочный',
    };
    return texts[priority as keyof typeof texts] || 'Неизвестно';
  }; 
  
  
  const chatsData = chats;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const filteredChats = chatsData.filter(chat => {
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = chat.subject.toLowerCase().includes(query) ||
             chat.client.first_name.toLowerCase().includes(query) ||
             chat.client.last_name.toLowerCase().includes(query) ||
             chat.client.username.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    
    if (statusFilter !== 'all' && chat.status !== statusFilter) {
      return false;
    }
    
    
    if (priorityFilter !== 'all' && chat.priority !== priorityFilter) {
      return false;
    }
    
    return true;
  });

  return (
    <div className={styles.supportChatsSection}>
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        <Col 
          xs={24} 
          lg={8}
          className={isMobile && selectedChat ? 'supportChatsChatsColHidden' : undefined}
        >
          <Card 
            title={
              <div className="supportChatsCardTitle">
                <CustomerServiceOutlined className="supportChatsCardTitleIcon" />
                <span>{isMobile ? "Чаты" : "Чаты поддержки"}</span>
              </div>
            }
            size="small"
            extra={
              <Badge count={filteredChats.filter(chat => chat.unread_count > 0).length} showZero={false}>
                <Button 
                  type="text" 
                  icon={<ReloadOutlined />} 
                  loading={loading}
                  size={isMobile ? "small" : "middle"}
                />
              </Badge>
            }
          >
            <Input
              prefix={<SearchOutlined className="supportChatsSearchIcon" />}
              placeholder="Поиск по чатам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="supportChatsSearchInput"
              allowClear
            />
            
            <div className="supportChatsFiltersRow">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className="supportChatsFilterSelect"
                size="small"
              >
                <Option value="all">Все статусы</Option>
                <Option value="open">Открыт</Option>
                <Option value="in_progress">В работе</Option>
                <Option value="resolved">Решен</Option>
                <Option value="closed">Закрыт</Option>
              </Select>
              
              <Select
                value={priorityFilter}
                onChange={setPriorityFilter}
                className="supportChatsFilterSelect"
                size="small"
              >
                <Option value="all">Все приоритеты</Option>
                <Option value="urgent">Срочный</Option>
                <Option value="high">Высокий</Option>
                <Option value="medium">Средний</Option>
                <Option value="low">Низкий</Option>
              </Select>
            </div>
            
            <div className="supportChatsStatsRow">
              <span>Всего: <strong>{chatsData.length}</strong></span>
              <span>•</span>
              <span>Найдено: <strong>{filteredChats.length}</strong></span>
              <span>•</span>
              <span className="supportChatsStatsUnread">
                Непрочитанных: <strong>{filteredChats.filter(c => c.unread_count > 0).length}</strong>
              </span>
            </div>
            
            <div className={isMobile ? 'supportChatsListScrollMobile' : 'supportChatsListScroll'}>
              <List
                loading={loading}
                dataSource={filteredChats}
                locale={{ emptyText: 'Нет чатов' }}
                renderItem={(chat) => (
                  <List.Item
                    className={selectedChat?.id === chat.id ? 'supportChatsListItem supportChatsListItemSelected' : 'supportChatsListItem'}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={chat.unread_count} size="small" offset={[-5, 5]}>
                          <Avatar 
                            icon={<UserOutlined />} 
                            size={isMobile ? 40 : 44}
                            className="supportChatsAvatar"
                          />
                        </Badge>
                      }
                      title={
                        <div className="supportChatsListTitleRow">
                          <span className="supportChatsListTitle">
                            {chat.client.first_name} {chat.client.last_name}
                          </span>
                          <div className="supportChatsListTags">
                            <Tag 
                              color={getStatusColor(chat.status)} 
                              className="supportChatsListTag"
                            >
                              {getStatusText(chat.status)}
                            </Tag>
                            <Tag 
                              color={getPriorityColor(chat.priority)}
                              icon={chat.priority === 'urgent' || chat.priority === 'high' ? <FlagOutlined /> : undefined}
                              className="supportChatsListTag"
                            >
                              {getPriorityText(chat.priority)}
                            </Tag>
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          <div className="supportChatsListSubject">
                            {chat.subject}
                          </div>
                          {chat.last_message && (
                            <div className="supportChatsListLastMessage">
                              {chat.last_message.text}
                            </div>
                          )}
                          <div className="supportChatsListMeta">
                            <MessageOutlined className="supportChatsListMetaIcon" />
                            {formatTimestamp(chat.updated_at)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Col>

        
        <Col xs={24} lg={16}>
          {selectedChat ? (
            <Card 
              title={
                <div className="supportChatsChatHeader">
                  <div className="supportChatsChatHeaderRow">
                    {isMobile && (
                      <Button 
                        size="small" 
                        onClick={() => setSelectedChat(null)}
                      >
                        ←
                      </Button>
                    )}
                    <span className={isMobile ? 'supportChatsChatNameMobile' : 'supportChatsChatName'}>
                      {selectedChat.client.first_name} {selectedChat.client.last_name}
                    </span>
                  </div>
                  
                  
                  <div className="supportChatsChatMetaRow">
                    <Tag color={getStatusColor(selectedChat.status)} className={isMobile ? 'supportChatsChatTagMobile' : 'supportChatsChatTag'}>
                      {getStatusText(selectedChat.status)}
                    </Tag>
                    <Tag color={getPriorityColor(selectedChat.priority)} className={isMobile ? 'supportChatsChatTagMobile' : 'supportChatsChatTag'}>
                      {getPriorityText(selectedChat.priority)}
                    </Tag>
                    <Text className={isMobile ? 'supportChatsChatSubjectMobile' : 'supportChatsChatSubject'}>
                      {selectedChat.subject}
                    </Text>
                    <Text type="secondary" className={isMobile ? 'supportChatsChatTimeMobile' : 'supportChatsChatTime'}>
                      {formatTimestamp(selectedChat.created_at)}
                    </Text>
                  </div>
                </div>
              }
              size="small"
            >
              
              <div 
                className={`${styles.chatScrollArea} ${isMobile ? 'supportChatsMessagesMobile' : 'supportChatsMessages'}`}
              >
                {selectedChat.messages.length === 0 ? (
                  <Empty description="Нет сообщений" />
                ) : (
                  selectedChat.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`supportChatsMessageRow ${message.sender.is_admin ? 'supportChatsMessageRowAdmin' : 'supportChatsMessageRowUser'} ${isMobile ? 'supportChatsMessageRowMobile' : 'supportChatsMessageRowDesktop'}`}
                    >
                      <div 
                        className={`supportChatsMessageBubble ${message.sender.is_admin ? 'supportChatsMessageBubbleAdmin' : 'supportChatsMessageBubbleUser'} ${isMobile ? 'supportChatsMessageBubbleMobile' : 'supportChatsMessageBubbleDesktop'}`}
                      >
                        <div className="supportChatsMessageText">{message.text}</div>
                        <div 
                          className={`supportChatsMessageTime ${message.sender.is_admin ? 'supportChatsMessageTimeAdmin' : 'supportChatsMessageTimeUser'} ${isMobile ? 'supportChatsMessageTimeMobile' : 'supportChatsMessageTimeDesktop'}`}
                        >
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              
              <div className={isMobile ? 'supportChatsComposerMobile' : 'supportChatsComposer'}>
                
                {attachedFiles.length > 0 && (
                  <div className="supportChatsAttachmentsRow">
                    {attachedFiles.map((file, index) => (
                      <Tag 
                        key={index}
                        closable
                        onClose={() => removeAttachedFile(file)}
                        icon={<PaperClipOutlined />}
                        className="supportChatsAttachmentTag"
                      >
                        {file.name}
                      </Tag>
                    ))}
                  </div>
                )}

                <div className={isMobile ? 'supportChatsComposerRowMobile' : 'supportChatsComposerRow'}>
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    rows={isMobile ? 2 : 3}
                    className={isMobile ? 'supportChatsMessageInputMobile' : 'supportChatsMessageInput'}
                    onPressEnter={(e) => {
                      if (e.ctrlKey) {
                        sendMessage();
                      }
                    }}
                  />
                  <div className="supportChatsComposerActions">
                    {!isMobile && (
                      <Upload
                        beforeUpload={handleFileSelect}
                        showUploadList={false}
                        multiple
                      >
                        <Button 
                          icon={<PaperClipOutlined />} 
                          className="supportChatsUploadButton"
                        />
                      </Upload>
                    )}
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={sendMessage}
                      loading={sending}
                      disabled={!messageText.trim() && attachedFiles.length === 0}
                      className="supportChatsSendButton"
                    />
                  </div>
                </div>
                {!isMobile && (
                  <div className="supportChatsComposerHint">
                    💡 Ctrl+Enter для отправки
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <Empty 
                description="Выберите чат для просмотра сообщений"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default SupportChatsSection;
