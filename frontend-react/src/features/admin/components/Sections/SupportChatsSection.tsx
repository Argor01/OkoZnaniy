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
import { useSupportChats, useSupportActions } from '@/features/admin/hooks';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { logger } from '@/utils/logger';
import supportStyles from '@/features/support/Support.module.css';
import { getMediaUrl } from '@/config/api';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface SupportChatMessage {
  id: number;
  text: string;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
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
  status: 'open' | 'in_progress' | 'completed' | 'resolved' | 'closed';
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

export const SupportChatsSection: React.FC = () => {
  const { user } = useAdminAuth();
  const currentUserId = user?.id || 1;
  const { chats = [], loading, refetch } = useSupportChats(true);
  const { sendChatMessage, markChatRead } = useSupportActions();

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

  const sendMessage = async () => {
    if (!messageText.trim() && attachedFiles.length === 0) {
      antMessage.warning('Добавьте сообщение или файл');
      return;
    }

    if (!selectedChat) {
      antMessage.error('Чат не выбран');
      return;
    }

    setSending(true);
    try {
      await sendChatMessage(selectedChat.id, messageText, attachedFiles);
      
      setMessageText('');
      setAttachedFiles([]);
      antMessage.success('Сообщение отправлено');
      refetch(); // Refresh chats to show new message
    } catch (error) {
      logger.error('Ошибка отправки сообщения:', error);
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      antMessage.error('Размер файла не должен превышать 50 МБ');
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
      in_progress: 'purple',
      completed: 'green',
      resolved: 'green',
      closed: 'gray',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      open: 'Открыт',
      in_progress: 'В работе',
      completed: 'Завершено',
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
  
  
  const chatsData = chats as unknown as SupportChat[];

  const handleSelectChat = (chat: SupportChat) => {
    setSelectedChat(chat);
    if (chat.unread_count > 0) {
      void markChatRead(chat.id);
    }
  };

  useEffect(() => {
    if (!selectedChat) return;
    const updatedChat = chatsData.find(chat => chat.id === selectedChat.id);
    if (
      updatedChat &&
      (updatedChat.updated_at !== selectedChat.updated_at ||
        updatedChat.messages.length !== selectedChat.messages.length)
    ) {
      setSelectedChat(updatedChat);
    }
  }, [chatsData, selectedChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const filteredChats = chatsData.filter(chat => {
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (chat.subject || '').toLowerCase().includes(query) ||
             (chat.client?.first_name || '').toLowerCase().includes(query) ||
             (chat.client?.last_name || '').toLowerCase().includes(query) ||
             (chat.client?.username || '').toLowerCase().includes(query);
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
              <div className={supportStyles.supportChatsCardTitle}>
                <CustomerServiceOutlined className={supportStyles.supportChatsCardTitleIcon} />
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
                  onClick={() => refetch()}
                  size={isMobile ? "small" : "middle"}
                />
              </Badge>
            }
          >
            <Input
              prefix={<SearchOutlined className={supportStyles.supportChatsSearchIcon} />}
              placeholder="Поиск по чатам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={supportStyles.supportChatsSearchInput}
              allowClear
            />
            
            <div className={supportStyles.supportChatsFiltersRow}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className={supportStyles.supportChatsFilterSelect}
                size="small"
              >
                <Option value="all">Все статусы</Option>
                <Option value="open">Открыт</Option>
                <Option value="in_progress">В работе</Option>
                <Option value="completed">Завершено</Option>
              </Select>
              
              <Select
                value={priorityFilter}
                onChange={setPriorityFilter}
                className={supportStyles.supportChatsFilterSelect}
                size="small"
              >
                <Option value="all">Все приоритеты</Option>
                <Option value="urgent">Срочный</Option>
                <Option value="high">Высокий</Option>
                <Option value="medium">Средний</Option>
                <Option value="low">Низкий</Option>
              </Select>
            </div>
            
            <div className={supportStyles.supportChatsStatsRow}>
              <span>Всего: <strong>{chatsData.length}</strong></span>
              <span>•</span>
              <span>Найдено: <strong>{filteredChats.length}</strong></span>
              <span>•</span>
              <span className={supportStyles.supportChatsStatsUnread}>
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
                    onClick={() => handleSelectChat(chat)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={chat.unread_count} size="small" offset={[-5, 5]}>
                          <Avatar 
                            icon={<UserOutlined />} 
                            size={isMobile ? 40 : 44}
                            className={supportStyles.supportChatsAvatar}
                          />
                        </Badge>
                      }
                      title={
                        <div className={supportStyles.supportChatsListTitleRow}>
                          <span className={supportStyles.supportChatsListTitle}>
                            {chat.client.first_name} {chat.client.last_name}
                          </span>
                          <div className={supportStyles.supportChatsListTags}>
                            <Tag 
                              color={getStatusColor(chat.status)} 
                              className={supportStyles.supportChatsListTag}
                            >
                              {getStatusText(chat.status)}
                            </Tag>
                            <Tag 
                              color={getPriorityColor(chat.priority)}
                              icon={chat.priority === 'urgent' || chat.priority === 'high' ? <FlagOutlined /> : undefined}
                              className={supportStyles.supportChatsListTag}
                            >
                              {getPriorityText(chat.priority)}
                            </Tag>
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          <div className={supportStyles.supportChatsListSubject}>
                            {chat.subject}
                          </div>
                          {chat.last_message && (
                            <div className={supportStyles.supportChatsListLastMessage}>
                              {chat.last_message.text}
                            </div>
                          )}
                          <div className={supportStyles.supportChatsListMeta}>
                            <MessageOutlined className={supportStyles.supportChatsListMetaIcon} />
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
                <div className={supportStyles.supportChatsChatHeader}>
                  <div className={supportStyles.supportChatsChatHeaderRow}>
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
                  
                  
                  <div className={supportStyles.supportChatsChatMetaRow}>
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
                        <div className={supportStyles.supportChatsMessageText}>{message.text}</div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className={supportStyles.supportChatsAttachmentsRow}>
                            {message.attachments.map((file, index) => (
                              <a
                                key={`${file.url}-${index}`}
                                href={getMediaUrl(file.url)}
                                target="_blank"
                                rel="noreferrer"
                                className={supportStyles.supportChatsAttachmentLink}
                              >
                                <FileOutlined /> {file.name}
                              </a>
                            ))}
                          </div>
                        )}
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
                  <div className={supportStyles.supportChatsAttachmentsRow}>
                    {attachedFiles.map((file, index) => (
                      <Tag 
                        key={index}
                        closable
                        onClose={() => removeAttachedFile(file)}
                        icon={<PaperClipOutlined />}
                        className={supportStyles.supportChatsAttachmentTag}
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
                  <div className={supportStyles.supportChatsComposerActions}>
                    {!isMobile && (
                      <Upload
                        beforeUpload={handleFileSelect}
                        showUploadList={false}
                        multiple
                      >
                        <Button 
                          icon={<PaperClipOutlined />} 
                          className={supportStyles.supportChatsUploadButton}
                        />
                      </Upload>
                    )}
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={sendMessage}
                      loading={sending}
                      disabled={!messageText.trim() && attachedFiles.length === 0}
                      className={supportStyles.supportChatsSendButton}
                    />
                  </div>
                </div>
                {!isMobile && (
                  <div className={supportStyles.supportChatsComposerHint}>
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
