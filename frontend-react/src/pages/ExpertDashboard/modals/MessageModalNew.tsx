import React, { useState, useRef, useEffect } from 'react';
import { Modal, Input, Button, Avatar, Badge, Space, Typography, message as antMessage, Spin, Upload } from 'antd';
import ErrorBoundary from '../../../components/ErrorBoundary';
import {
  MessageOutlined,
  BellOutlined,
  StarOutlined,
  SearchOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SendOutlined,
  PaperClipOutlined,
  FileOutlined
} from '@ant-design/icons';
import { chatApi, ChatListItem, ChatDetail, Message } from '../../../api/chat';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMediaUrl } from '../../../config/api';

const { Text } = Typography;

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  onCreateOrder?: () => void;
  selectedUserId?: number; // ID пользователя для открытия чата
  selectedOrderId?: number; // ID заказа для открытия чата (чат по заказу+пользователю)
}

const MessageModalNew: React.FC<MessageModalProps> = ({ 
  visible, 
  onClose,
  isMobile,
  isTablet,
  isDesktop,
  onCreateOrder,
  selectedUserId,
  selectedOrderId
}) => {
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      console.log('MessageModal opened, selectedUserId:', selectedUserId);
      loadChats();
      // Если передан orderId+userId, открываем чат по заказу (важно для откликов)
      if (selectedOrderId && selectedUserId) {
        loadOrCreateChatByOrderAndUser(selectedOrderId, selectedUserId);
        return;
      }
      // Если передан selectedUserId, автоматически открываем чат с этим пользователем
      if (selectedUserId) {
        console.log('Loading chat with user:', selectedUserId);
        loadOrCreateChatWithUser(selectedUserId);
      }
    }
  }, [visible, selectedUserId, selectedOrderId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getAll();
      setChatList(data);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      antMessage.error('Не удалось загрузить чаты');
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateChatByOrderAndUser = async (orderId: number, userId: number) => {
    setLoading(true);
    try {
      const chatData = await chatApi.getOrCreateByOrderAndUser(orderId, userId);
      setSelectedChat(chatData);
      await loadChats();
    } catch (error) {
      console.error('Ошибка создания/загрузки чата по заказу:', error);
      antMessage.error('Не удалось открыть чат по заказу');
    } finally {
      setLoading(false);
    }
  };

  const loadChatDetail = async (chatId: number) => {
    try {
      const data = await chatApi.getById(chatId);
      setSelectedChat(data);
      // Отмечаем сообщения как прочитанные
      await chatApi.markAsRead(chatId);
      // Обновляем список чатов
      setChatList(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, unread_count: 0 } : chat
      ));
    } catch (error) {
      console.error('Ошибка загрузки чата:', error);
      antMessage.error('Не удалось загрузить чат');
    }
  };

  const loadOrCreateChatWithUser = async (userId: number) => {
    console.log('loadOrCreateChatWithUser called with userId:', userId);
    setLoading(true);
    try {
      console.log('Calling chatApi.getOrCreateByUser...');
      const chatData = await chatApi.getOrCreateByUser(userId);
      console.log('Chat data received:', chatData);
      setSelectedChat(chatData);
      // Обновляем список чатов
      await loadChats();
      antMessage.success('Чат открыт');
    } catch (error) {
      console.error('Ошибка создания/загрузки чата:', error);
      antMessage.error('Не удалось открыть чат с пользователем');
    } finally {
      setLoading(false);
    }
  };

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
      const newMessage = await chatApi.sendMessage(selectedChat.id, messageText);
      
      // Если есть прикрепленные файлы, отправляем их
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            // Здесь должен быть API для отправки файлов в чат
            // await chatApi.sendFile(selectedChat.id, file);
            console.log('Отправка файла:', file.name);
          } catch (error) {
            console.error('Ошибка отправки файла:', error);
            antMessage.error(`Не удалось отправить файл ${file.name}`);
          }
        }
      }
      
      // Обновляем сообщения в текущем чате
      setSelectedChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage]
      } : null);

      // Обновляем список чатов
      setChatList(prev => prev.map(chat => 
        chat.id === selectedChat.id ? {
          ...chat,
          last_message: {
            text: messageText || (attachedFiles.length > 0 ? `📎 ${attachedFiles.length} файл(ов)` : ''),
            sender_id: newMessage.sender_id,
            created_at: newMessage.created_at
          },
          last_message_time: newMessage.created_at
        } : chat
      ));

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
    // Проверяем размер файла (максимум 10 МБ)
    const maxSize = 10 * 1024 * 1024; // 10 МБ
    if (file.size > maxSize) {
      antMessage.error('Размер файла не должен превышать 10 МБ');
      return false;
    }

    // Проверяем, что файл еще не добавлен
    if (attachedFiles.find(f => f.name === file.name && f.size === file.size)) {
      antMessage.warning('Этот файл уже прикреплен');
      return false;
    }

    setAttachedFiles(prev => [...prev, file]);
    antMessage.success(`Файл "${file.name}" прикреплен`);
    return false; // Предотвращаем автоматическую загрузку
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

  const safeChatList = Array.isArray(chatList) ? chatList : [];
  const filteredChats = safeChatList.filter(chat => {
    // Фильтр по вкладкам
    if (messageTab === 'unread' && chat.unread_count === 0) return false;
    
    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = chat.other_user?.username?.toLowerCase() || '';
      const lastMessage = chat.last_message?.text?.toLowerCase() || '';
      return userName.includes(query) || lastMessage.includes(query);
    }
    
    return true;
  });

  return (
    <Modal
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)')}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: 0,
          margin: isMobile ? 0 : 'auto',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.15)',
          width: isMobile ? '100vw' : undefined,
          height: isMobile ? '100vh' : 'calc(100vh - 80px)'
        },
        header: {
          display: 'none'
        },
        body: {
          padding: 0,
          margin: 0,
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          overflow: 'hidden'
        }
      }}
    >
      <ErrorBoundary>
      <div style={{ 
        display: 'flex', 
        height: '100%', 
        width: '100%', 
        flexDirection: isMobile ? 'column' : 'row', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Left Sidebar */}
        <div style={{ 
          width: isMobile ? '100%' : isTablet ? '250px' : '300px', 
          background: '#f3f4f6', 
          borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
          borderBottom: isMobile ? '1px solid #e5e7eb' : 'none',
          display: selectedChat && isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          height: isMobile ? '100%' : 'auto'
        }}>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
            padding: isMobile ? '0 4px' : '0 8px'
          }}>
            <div
              onClick={() => setMessageTab('all')}
              style={{
                flex: 1,
                padding: isMobile ? '10px 2px' : '12px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: messageTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                color: messageTab === 'all' ? '#3b82f6' : '#6b7280',
                fontWeight: messageTab === 'all' ? 600 : 400,
                fontSize: isMobile ? 11 : 13
              }}
            >
              <MessageOutlined style={{ marginRight: isMobile ? 2 : 4, fontSize: isMobile ? 12 : 14 }} />
              Все
            </div>
            <div
              onClick={() => setMessageTab('unread')}
              style={{
                flex: 1,
                padding: isMobile ? '10px 2px' : '12px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: messageTab === 'unread' ? '2px solid #3b82f6' : '2px solid transparent',
                color: messageTab === 'unread' ? '#3b82f6' : '#6b7280',
                fontWeight: messageTab === 'unread' ? 600 : 400,
                fontSize: isMobile ? 11 : 13
              }}
            >
              <BellOutlined style={{ marginRight: isMobile ? 2 : 4, fontSize: isMobile ? 12 : 14 }} />
              {isMobile ? 'Новые' : 'Непрочитанные'}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: isMobile ? '8px' : '12px', background: '#ffffff' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af', fontSize: isMobile ? 12 : 14 }} />}
              placeholder={isMobile ? 'Поиск...' : 'Поиск пользователя'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderRadius: 8, fontSize: isMobile ? 12 : 14 }}
              size={isMobile ? 'small' : 'middle'}
            />
          </div>

          {/* Contact List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            background: '#ffffff'
          }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Spin />
              </div>
            ) : filteredChats.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                padding: '40px 20px',
                fontSize: isMobile ? 12 : 14
              }}>
                <MessageOutlined style={{ fontSize: isMobile ? 36 : 48, color: '#d1d5db', marginBottom: 12, display: 'block' }} />
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => loadChatDetail(chat.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: isMobile ? '8px' : '12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedChat?.id === chat.id ? '#eff6ff' : (chat.unread_count > 0 ? '#f0fdf4' : '#ffffff'),
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat?.id !== chat.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat?.id !== chat.id) {
                      e.currentTarget.style.background = chat.unread_count > 0 ? '#f0fdf4' : '#ffffff';
                    }
                  }}
                >
                  <Avatar
                    size={isMobile ? 36 : 40}
                    icon={<UserOutlined />}
                    src={getMediaUrl(chat.other_user?.avatar)}
                    style={{ backgroundColor: '#6b7280' }}
                  />
                  <div style={{ flex: 1, marginLeft: isMobile ? 8 : 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text strong style={{ 
                        fontSize: isMobile ? 13 : 14, 
                        color: '#1f2937',
                        fontWeight: chat.unread_count > 0 ? 600 : 500
                      }}>
                        {chat.other_user?.username || 'Пользователь'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, color: '#9ca3af' }}>
                        {chat.last_message ? formatTimestamp(chat.last_message.created_at) : ''}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text 
                        ellipsis 
                        style={{ 
                          fontSize: isMobile ? 11 : 12, 
                          color: chat.unread_count > 0 ? '#059669' : '#6b7280',
                          fontWeight: chat.unread_count > 0 ? 500 : 400,
                          maxWidth: isMobile ? '140px' : '180px'
                        }}
                      >
                        {chat.last_message?.text || 'Нет сообщений'}
                      </Text>
                      {chat.unread_count > 0 && (
                        <Badge 
                          count={chat.unread_count} 
                          style={{ 
                            backgroundColor: '#10b981',
                            fontSize: isMobile ? 9 : 10,
                            height: isMobile ? 16 : 18,
                            minWidth: isMobile ? 16 : 18,
                            lineHeight: isMobile ? '16px' : '18px'
                          }} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ 
          flex: 1, 
          display: (!selectedChat && isMobile) ? 'none' : 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: selectedChat ? '#ffffff' : '#e0f2fe',
            padding: isMobile ? '8px 12px' : '12px 16px',
            paddingRight: isMobile ? '12px' : '56px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${selectedChat ? '#e5e7eb' : '#bae6fd'}`
          }}>
            {selectedChat ? (
              <>
                <Space>
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setSelectedChat(null)}
                      size="small"
                    />
                  )}
                  <Avatar
                    size={isMobile ? 32 : 36}
                    icon={<UserOutlined />}
                    src={getMediaUrl(selectedChat.other_user?.avatar)}
                    style={{ backgroundColor: '#6b7280' }}
                  />
                  <div>
                    <Text style={{ fontSize: isMobile ? 13 : 15, color: '#1f2937', fontWeight: 500 }}>
                      {selectedChat.other_user?.username || 'Пользователь'}
                    </Text>
                    {selectedChat.order_id ? (
                      <Text style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', display: 'block' }}>
                        {selectedChat.order_title || `Заказ #${selectedChat.order_id}`}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', display: 'block' }}>
                        Заказ удалён
                      </Text>
                    )}
                  </div>
                </Space>
              </>
            ) : (
              <Space>
                <Text style={{ fontSize: isMobile ? 12 : 14, color: '#0369a1', fontWeight: 500 }}>
                  Выберите чат
                </Text>
              </Space>
            )}
          </div>

          {/* Messages Area */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: isMobile ? '12px' : '20px',
            background: '#f9fafb',
            minHeight: 0
          }}>
            {selectedChat ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12 }}>
                {selectedChat.messages.map((msg: Message) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.is_mine ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: isMobile ? '85%' : '70%',
                        padding: isMobile ? '8px 12px' : '10px 14px',
                        borderRadius: msg.is_mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.is_mine ? '#3b82f6' : '#ffffff',
                        color: msg.is_mine ? '#ffffff' : '#1f2937',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        border: msg.is_mine ? 'none' : '1px solid #e5e7eb'
                      }}
                    >
                      <Text style={{ 
                        fontSize: isMobile ? 13 : 14, 
                        color: msg.is_mine ? '#ffffff' : '#1f2937',
                        display: 'block',
                        marginBottom: 4
                      }}>
                        {msg.text}
                      </Text>
                      <Text style={{ 
                        fontSize: isMobile ? 10 : 11, 
                        color: msg.is_mine ? 'rgba(255, 255, 255, 0.7)' : '#9ca3af'
                      }}>
                        {formatMessageTime(msg.created_at)}
                        {msg.is_mine && msg.is_read && (
                          <CheckCircleOutlined style={{ marginLeft: 4, fontSize: isMobile ? 10 : 11 }} />
                        )}
                      </Text>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                paddingTop: isMobile ? '50px' : '100px',
                fontSize: isMobile ? 12 : 14
              }}>
                <MessageOutlined style={{ fontSize: isMobile ? 36 : 48, color: '#d1d5db', marginBottom: isMobile ? 12 : 16, display: 'block' }} />
                Выберите чат для начала общения
              </div>
            )}
          </div>

          {/* Input Area */}
          {selectedChat && (
            <div style={{ 
              padding: isMobile ? '8px 12px 12px 12px' : '16px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              flexShrink: 0
            }}>
              {/* Attached Files Display */}
              {attachedFiles.length > 0 && (
                <div style={{ 
                  marginBottom: 12,
                  padding: 8,
                  background: '#f9fafb',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'block' }}>
                    Прикрепленные файлы:
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {attachedFiles.map((file, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        background: '#ffffff',
                        borderRadius: 4,
                        border: '1px solid #d1d5db'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                          <Text style={{ fontSize: 12, color: '#374151' }}>
                            {file.name}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                            ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                          </Text>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          onClick={() => removeAttachedFile(file)}
                          style={{ 
                            color: '#ef4444', 
                            fontSize: 12,
                            padding: '0 4px',
                            height: 20,
                            minWidth: 20
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ 
                display: 'flex',
                gap: isMobile ? 6 : 8,
                alignItems: 'flex-end'
              }}>
                <Input.TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  autoSize={{ minRows: 1, maxRows: isMobile ? 2 : 3 }}
                  style={{ 
                    flex: 1,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: isMobile ? 13 : 14
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending}
                />
                
                {/* File Attachment Button */}
                <Upload
                  beforeUpload={handleFileSelect}
                  showUploadList={false}
                  multiple={false}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                >
                  <Button
                    type="text"
                    icon={<PaperClipOutlined />}
                    style={{ 
                      width: isMobile ? 36 : 40, 
                      height: isMobile ? 36 : 40,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      color: '#6b7280',
                      fontSize: isMobile ? 14 : 16
                    }}
                    disabled={sending}
                    title="Прикрепить файл"
                  />
                </Upload>

                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  style={{ 
                    width: isMobile ? 36 : 40, 
                    height: isMobile ? 36 : 40,
                    background: '#3b82f6',
                    border: 'none',
                    fontSize: isMobile ? 14 : 16
                  }}
                  onClick={sendMessage}
                  loading={sending}
                  disabled={!messageText.trim() && attachedFiles.length === 0}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      </ErrorBoundary>
    </Modal>
  );
};

export default MessageModalNew;
