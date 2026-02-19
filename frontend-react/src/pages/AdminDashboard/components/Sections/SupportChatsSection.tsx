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

  // Отслеживание размера окна для адаптивности
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Мок данные для демонстрации
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
  
  // Используем только реальные данные из БД
  const chatsData = chats;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const filteredChats = chatsData.filter(chat => {
    // Фильтр по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = chat.subject.toLowerCase().includes(query) ||
             chat.client.first_name.toLowerCase().includes(query) ||
             chat.client.last_name.toLowerCase().includes(query) ||
             chat.client.username.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Фильтр по статусу
    if (statusFilter !== 'all' && chat.status !== statusFilter) {
      return false;
    }
    
    // Фильтр по приоритету
    if (priorityFilter !== 'all' && chat.priority !== priorityFilter) {
      return false;
    }
    
    return true;
  });

  return (
    <div className={styles.supportChatsSection}>
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        {/* Список чатов */}
        <Col 
          xs={24} 
          lg={8}
          style={{
            display: isMobile && selectedChat ? 'none' : 'block'
          }}
        >
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CustomerServiceOutlined style={{ fontSize: 18, color: '#1890ff' }} />
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
            {/* Поиск */}
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Поиск по чатам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                marginBottom: 12,
                borderRadius: 8
              }}
              allowClear
            />
            
            {/* Фильтры */}
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              marginBottom: 12,
              flexWrap: 'wrap'
            }}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ flex: 1, minWidth: 120 }}
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
                style={{ flex: 1, minWidth: 120 }}
                size="small"
              >
                <Option value="all">Все приоритеты</Option>
                <Option value="urgent">Срочный</Option>
                <Option value="high">Высокий</Option>
                <Option value="medium">Средний</Option>
                <Option value="low">Низкий</Option>
              </Select>
            </div>
            
            {/* Статистика */}
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              marginBottom: 12,
              padding: '8px 12px',
              background: '#f5f5f5',
              borderRadius: 8,
              fontSize: 12
            }}>
              <span>Всего: <strong>{chatsData.length}</strong></span>
              <span>•</span>
              <span>Найдено: <strong>{filteredChats.length}</strong></span>
              <span>•</span>
              <span style={{ color: '#ff4d4f' }}>
                Непрочитанных: <strong>{filteredChats.filter(c => c.unread_count > 0).length}</strong>
              </span>
            </div>
            
            <div style={{ maxHeight: isMobile ? '400px' : '600px', overflowY: 'auto' }}>
              <List
                loading={loading}
                dataSource={filteredChats}
                locale={{ emptyText: 'Нет чатов' }}
                renderItem={(chat) => (
                  <List.Item
                    className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                    onClick={() => setSelectedChat(chat)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedChat?.id === chat.id ? '#e6f7ff' : 'transparent',
                      alignItems: 'flex-start',
                      padding: '12px',
                      borderRadius: 8,
                      marginBottom: 4,
                      border: selectedChat?.id === chat.id ? '1px solid #1890ff' : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChat?.id !== chat.id) {
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedChat?.id !== chat.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={chat.unread_count} size="small" offset={[-5, 5]}>
                          <Avatar 
                            icon={<UserOutlined />} 
                            size={isMobile ? 40 : 44}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              backgroundColor: '#1890ff'
                            }}
                          />
                        </Badge>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {chat.client.first_name} {chat.client.last_name}
                          </span>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <Tag 
                              color={getStatusColor(chat.status)} 
                              style={{ 
                                margin: 0, 
                                fontSize: 10,
                                padding: '0 6px',
                                lineHeight: '18px'
                              }}
                            >
                              {getStatusText(chat.status)}
                            </Tag>
                            <Tag 
                              color={getPriorityColor(chat.priority)}
                              icon={chat.priority === 'urgent' || chat.priority === 'high' ? <FlagOutlined /> : undefined}
                              style={{ 
                                margin: 0, 
                                fontSize: 10,
                                padding: '0 6px',
                                lineHeight: '18px'
                              }}
                            >
                              {getPriorityText(chat.priority)}
                            </Tag>
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ 
                            fontSize: 13, 
                            color: '#595959',
                            marginBottom: 4,
                            fontWeight: 500
                          }}>
                            {chat.subject}
                          </div>
                          {chat.last_message && (
                            <div style={{ 
                              fontSize: 12, 
                              color: '#8c8c8c',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: 4
                            }}>
                              {chat.last_message.text}
                            </div>
                          )}
                          <div style={{ 
                            fontSize: 11, 
                            color: '#bfbfbf',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <MessageOutlined style={{ fontSize: 10 }} />
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

        {/* Область сообщений */}
        <Col xs={24} lg={16}>
          {selectedChat ? (
            <Card 
              title={
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 8
                }}>
                  {/* Первая строка: имя и кнопка назад */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isMobile && (
                      <Button 
                        size="small" 
                        onClick={() => setSelectedChat(null)}
                      >
                        ←
                      </Button>
                    )}
                    <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#262626' }}>
                      {selectedChat.client.first_name} {selectedChat.client.last_name}
                    </span>
                  </div>
                  
                  {/* Вторая строка: теги и тема */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Tag color={getStatusColor(selectedChat.status)} style={{ fontSize: isMobile ? 11 : 12, margin: 0 }}>
                      {getStatusText(selectedChat.status)}
                    </Tag>
                    <Tag color={getPriorityColor(selectedChat.priority)} style={{ fontSize: isMobile ? 11 : 12, margin: 0 }}>
                      {getPriorityText(selectedChat.priority)}
                    </Tag>
                    <Text style={{ fontSize: isMobile ? 13 : 14, color: '#595959' }}>
                      {selectedChat.subject}
                    </Text>
                    <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, marginLeft: 'auto' }}>
                      {formatTimestamp(selectedChat.created_at)}
                    </Text>
                  </div>
                </div>
              }
              size="small"
            >
              {/* Сообщения */}
              <div 
                style={{ 
                  height: isMobile ? '300px' : '400px', 
                  overflowY: 'auto', 
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  padding: isMobile ? 12 : 16,
                  marginBottom: isMobile ? 12 : 16,
                  background: '#fafafa'
                }}
                className={styles.chatScrollArea}
              >
                {selectedChat.messages.length === 0 ? (
                  <Empty description="Нет сообщений" />
                ) : (
                  selectedChat.messages.map((message) => (
                    <div 
                      key={message.id} 
                      style={{ 
                        marginBottom: isMobile ? 12 : 16,
                        display: 'flex',
                        flexDirection: message.sender.is_admin ? 'row-reverse' : 'row',
                        animation: 'fadeInUp 0.3s ease'
                      }}
                    >
                      <div 
                        style={{
                          maxWidth: isMobile ? '85%' : '70%',
                          padding: isMobile ? '10px 14px' : '12px 16px',
                          borderRadius: message.sender.is_admin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: message.sender.is_admin 
                            ? '#1890ff'
                            : 'white',
                          color: message.sender.is_admin ? 'white' : '#333',
                          fontSize: isMobile ? 13 : 14,
                          wordBreak: 'break-word',
                          boxShadow: message.sender.is_admin
                            ? '0 2px 8px rgba(24, 144, 255, 0.2)'
                            : '0 2px 8px rgba(0, 0, 0, 0.08)',
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                          border: message.sender.is_admin ? 'none' : '1px solid #f0f0f0'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = message.sender.is_admin
                            ? '0 4px 12px rgba(24, 144, 255, 0.3)'
                            : '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = message.sender.is_admin
                            ? '0 2px 8px rgba(24, 144, 255, 0.2)'
                            : '0 2px 8px rgba(0, 0, 0, 0.08)';
                        }}
                      >
                        <div style={{ lineHeight: 1.5 }}>{message.text}</div>
                        <div 
                          style={{ 
                            fontSize: isMobile ? 10 : 11, 
                            opacity: 0.8, 
                            marginTop: 6,
                            textAlign: message.sender.is_admin ? 'left' : 'right',
                            fontWeight: 500
                          }}
                        >
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Форма отправки сообщения */}
              <div style={{
                padding: isMobile ? 12 : 16,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.05)'
              }}>
                {/* Прикрепленные файлы */}
                {attachedFiles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {attachedFiles.map((file, index) => (
                      <Tag 
                        key={index}
                        closable
                        onClose={() => removeAttachedFile(file)}
                        icon={<PaperClipOutlined />}
                        style={{
                          borderRadius: 8,
                          padding: '4px 12px',
                          marginBottom: 4
                        }}
                      >
                        {file.name}
                      </Tag>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: isMobile ? 6 : 8, alignItems: 'flex-end' }}>
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    rows={isMobile ? 2 : 3}
                    style={{ 
                      flex: 1,
                      fontSize: isMobile ? 14 : 15,
                      borderRadius: 12,
                      border: '2px solid #e8e8e8',
                      transition: 'all 0.3s ease',
                      padding: '10px 14px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1890ff';
                      e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e8e8e8';
                      e.target.style.boxShadow = 'none';
                    }}
                    onPressEnter={(e) => {
                      if (e.ctrlKey) {
                        sendMessage();
                      }
                    }}
                  />
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    {!isMobile && (
                      <Upload
                        beforeUpload={handleFileSelect}
                        showUploadList={false}
                        multiple
                      >
                        <Button 
                          icon={<PaperClipOutlined />} 
                          style={{ 
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            border: '2px solid #e8e8e8',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#1890ff';
                            e.currentTarget.style.transform = 'scale(1.03)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e8e8e8';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        />
                      </Upload>
                    )}
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={sendMessage}
                      loading={sending}
                      disabled={!messageText.trim() && attachedFiles.length === 0}
                      style={{ 
                        width: isMobile ? 44 : 44,
                        height: isMobile ? 44 : 44,
                        borderRadius: 12,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!sending && (messageText.trim() || attachedFiles.length > 0)) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </div>
                </div>
                {!isMobile && (
                  <div style={{ 
                    fontSize: 11, 
                    color: '#999', 
                    marginTop: 8,
                    textAlign: 'center',
                    fontWeight: 500
                  }}>
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
