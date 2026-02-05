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
  Select
} from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  SendOutlined,
  PaperClipOutlined,
  FileOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  ReloadOutlined
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const chatsData = chats.length > 0 ? chats : mockChats;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const filteredChats = chatsData.filter(chat => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return chat.subject.toLowerCase().includes(query) ||
             chat.client.first_name.toLowerCase().includes(query) ||
             chat.client.last_name.toLowerCase().includes(query) ||
             chat.client.username.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className={styles.supportChatsSection}>
      <Row gutter={[16, 16]}>
        {/* Список чатов */}
        <Col xs={24} lg={8}>
          <Card 
            title="Чаты поддержки" 
            size="small"
            extra={
              <Badge count={filteredChats.filter(chat => chat.unread_count > 0).length} showZero={false}>
                <Button 
                  type="text" 
                  icon={<ReloadOutlined />} 
                  loading={loading}
                />
              </Badge>
            }
          >
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <List
                loading={loading}
                dataSource={filteredChats}
                renderItem={(chat) => (
                  <List.Item
                    className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                    onClick={() => setSelectedChat(chat)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedChat?.id === chat.id ? '#f0f0f0' : 'transparent'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={chat.unread_count} size="small">
                          <Avatar icon={<UserOutlined />} />
                        </Badge>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{chat.client.first_name} {chat.client.last_name}</span>
                          <div>
                            <Tag color={getStatusColor(chat.status)} size="small">
                              {getStatusText(chat.status)}
                            </Tag>
                            <Tag color={getPriorityColor(chat.priority)} size="small">
                              {getPriorityText(chat.priority)}
                            </Tag>
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {chat.subject}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span>{selectedChat.client.first_name} {selectedChat.client.last_name}</span>
                    <Tag color={getStatusColor(selectedChat.status)} style={{ marginLeft: '8px' }}>
                      {getStatusText(selectedChat.status)}
                    </Tag>
                    <Tag color={getPriorityColor(selectedChat.priority)}>
                      {getPriorityText(selectedChat.priority)}
                    </Tag>
                  </div>
                </div>
              }
              size="small"
            >
              {/* Информация о чате */}
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>Тема:</Text> {selectedChat.subject}
                  </Col>
                  <Col span={12}>
                    <Text strong>Создан:</Text> {formatTimestamp(selectedChat.created_at)}
                  </Col>
                </Row>
              </div>

              {/* Сообщения */}
              <div 
                style={{ 
                  height: '400px', 
                  overflowY: 'auto', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px'
                }}
              >
                {selectedChat.messages.length === 0 ? (
                  <Empty description="Нет сообщений" />
                ) : (
                  selectedChat.messages.map((message) => (
                    <div 
                      key={message.id} 
                      style={{ 
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: message.sender.is_admin ? 'row-reverse' : 'row'
                      }}
                    >
                      <div 
                        style={{
                          maxWidth: '70%',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: message.sender.is_admin ? '#1890ff' : '#f0f0f0',
                          color: message.sender.is_admin ? 'white' : 'black'
                        }}
                      >
                        <div>{message.text}</div>
                        <div 
                          style={{ 
                            fontSize: '11px', 
                            opacity: 0.8, 
                            marginTop: '4px',
                            textAlign: message.sender.is_admin ? 'left' : 'right'
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
              <div>
                {/* Прикрепленные файлы */}
                {attachedFiles.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {attachedFiles.map((file, index) => (
                      <Tag 
                        key={index}
                        closable
                        onClose={() => removeAttachedFile(file)}
                        icon={<PaperClipOutlined />}
                      >
                        {file.name}
                      </Tag>
                    ))}
                  </div>
                )}

                <Input.Group compact>
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    rows={3}
                    style={{ width: 'calc(100% - 80px)' }}
                    onPressEnter={(e) => {
                      if (e.ctrlKey) {
                        sendMessage();
                      }
                    }}
                  />
                  <div style={{ width: '80px', display: 'flex', flexDirection: 'column' }}>
                    <Upload
                      beforeUpload={handleFileSelect}
                      showUploadList={false}
                      multiple
                    >
                      <Button 
                        icon={<PaperClipOutlined />} 
                        style={{ width: '100%', marginBottom: '4px' }}
                        size="small"
                      />
                    </Upload>
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={sendMessage}
                      loading={sending}
                      style={{ width: '100%' }}
                      size="small"
                    />
                  </div>
                </Input.Group>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  Ctrl+Enter для отправки
                </div>
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