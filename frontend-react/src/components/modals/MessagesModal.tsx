import React, { useState, useRef } from 'react';
import { Modal, Input, Button, Space, Avatar, Badge, Typography, Upload, Popover } from 'antd';
import { SendOutlined, SmileOutlined, PaperClipOutlined, SearchOutlined, UserOutlined, ArrowLeftOutlined, MessageOutlined, BellOutlined, StarOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';

const { Text } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  id: number;
  chatId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  isOnline: boolean;
  unreadCount: number;
  messages: {
    id: number;
    text: string;
    timestamp: string;
    isMine: boolean;
    isRead: boolean;
  }[];
}

interface MessagesModalProps {
  visible: boolean;
  onCancel: () => void;
  selectedChat?: ChatMessage | null;
  onChatSelect?: (chat: ChatMessage) => void;
}

const MessagesModal: React.FC<MessagesModalProps> = ({
  visible,
  onCancel,
  selectedChat,
  onChatSelect
}) => {
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [isMobile] = useState(window.innerWidth <= 840);
  const [isDesktop] = useState(window.innerWidth > 1024);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Тестовые данные для сообщений
  const mockMessages: ChatMessage[] = [
    {
      id: 1,
      chatId: 1,
      userName: 'Иван Петров',
      userAvatar: undefined,
      lastMessage: 'Здравствуйте! Когда будет готова работа?',
      timestamp: '2 мин назад',
      isRead: false,
      isOnline: true,
      unreadCount: 3,
      messages: [
        { id: 1, text: 'Здравствуйте! Я хотел бы заказать решение задач по математике', timestamp: '10:30', isMine: false, isRead: true },
        { id: 2, text: 'Здравствуйте! Конечно, пришлите задание', timestamp: '10:32', isMine: true, isRead: true },
        { id: 3, text: 'Вот файл с заданием', timestamp: '10:35', isMine: false, isRead: true },
        { id: 4, text: 'Принял в работу. Срок выполнения - 2 дня', timestamp: '10:40', isMine: true, isRead: true },
        { id: 5, text: 'Отлично, спасибо!', timestamp: '10:42', isMine: false, isRead: true },
        { id: 6, text: 'Здравствуйте! Когда будет готова работа?', timestamp: '14:25', isMine: false, isRead: false }
      ]
    },
    {
      id: 2,
      chatId: 2,
      userName: 'Мария Сидорова',
      userAvatar: undefined,
      lastMessage: 'Спасибо за помощь! Все отлично',
      timestamp: '1 час назад',
      isRead: true,
      isOnline: false,
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Добрый день! Нужна помощь с курсовой по экономике', timestamp: 'Вчера 15:20', isMine: false, isRead: true },
        { id: 2, text: 'Здравствуйте! Какая тема курсовой?', timestamp: 'Вчера 15:25', isMine: true, isRead: true },
        { id: 3, text: 'Макроэкономический анализ', timestamp: 'Вчера 15:30', isMine: false, isRead: true },
        { id: 4, text: 'Хорошо, могу помочь. Срок - неделя', timestamp: 'Вчера 15:35', isMine: true, isRead: true },
        { id: 5, text: 'Спасибо за помощь! Все отлично', timestamp: '1 час назад', isMine: false, isRead: true }
      ]
    },
    {
      id: 3,
      chatId: 3,
      userName: 'Алексей Смирнов',
      userAvatar: undefined,
      lastMessage: 'Можете взять еще один заказ?',
      timestamp: '3 часа назад',
      isRead: false,
      isOnline: true,
      unreadCount: 1,
      messages: [
        { id: 1, text: 'Здравствуйте! Вы делаете лабораторные по физике?', timestamp: 'Вчера 12:00', isMine: false, isRead: true },
        { id: 2, text: 'Да, конечно. Какая тема?', timestamp: 'Вчера 12:15', isMine: true, isRead: true },
        { id: 3, text: 'Механика, колебания', timestamp: 'Вчера 12:20', isMine: false, isRead: true },
        { id: 4, text: 'Хорошо, пришлите задание', timestamp: 'Вчера 12:25', isMine: true, isRead: true },
        { id: 5, text: 'Можете взять еще один заказ?', timestamp: '3 часа назад', isMine: false, isRead: false }
      ]
    },
    {
      id: 4,
      chatId: 4,
      userName: 'Елена Козлова',
      userAvatar: undefined,
      lastMessage: 'Хорошо, жду результат',
      timestamp: '5 часов назад',
      isRead: true,
      isOnline: false,
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Добрый вечер! Нужна дипломная работа', timestamp: '2 дня назад', isMine: false, isRead: true },
        { id: 2, text: 'Здравствуйте! Какая специальность?', timestamp: '2 дня назад', isMine: true, isRead: true },
        { id: 3, text: 'Программирование, веб-разработка', timestamp: '2 дня назад', isMine: false, isRead: true },
        { id: 4, text: 'Хорошо, жду результат', timestamp: '5 часов назад', isMine: false, isRead: true }
      ]
    },
    {
      id: 5,
      chatId: 5,
      userName: 'Дмитрий Новиков',
      userAvatar: undefined,
      lastMessage: 'Отлично, договорились!',
      timestamp: '1 день назад',
      isRead: true,
      isOnline: false,
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Здравствуйте! Нужна помощь с рефератом по истории', timestamp: '3 дня назад', isMine: false, isRead: true },
        { id: 2, text: 'Добрый день! Какая тема?', timestamp: '3 дня назад', isMine: true, isRead: true },
        { id: 3, text: 'Реформы Петра I', timestamp: '3 дня назад', isMine: false, isRead: true },
        { id: 4, text: 'Отлично, договорились!', timestamp: '1 день назад', isMine: false, isRead: true }
      ]
    }
  ];

  const [chatMessages] = useState<ChatMessage[]>(mockMessages);

  // Функция прокрутки к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Функция отправки сообщения
  const sendMessage = () => {
    if (messageText.trim() && selectedChat) {
      // Создаем новое сообщение
      const newMessage = {
        id: Date.now(),
        text: messageText.trim(),
        timestamp: new Date().toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isMine: true,
        isRead: false
      };

      console.log('Отправка сообщения:', newMessage);
      setMessageText('');
      setFileList([]);
      
      // Прокручиваем к последнему сообщению
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="auto"
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

          top: isMobile ? 0 : '60px',
          left: isMobile ? 0 : (isDesktop ? '280px' : '250px'),
          right: isMobile ? 0 : '20px',
          bottom: isMobile ? 0 : '20px',
          width: isMobile ? '100vw !important' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)'),
          height: isMobile ? '100vh !important' : 'calc(100vh - 80px)',
          transform: isMobile ? 'none' : 'none',
          position: 'fixed'
        },
        header: {
          display: 'none'
        },
        body: {
          padding: 0,
          margin: 0,
          background: '#ffffff',
          height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 140px)',
          display: 'flex',
          overflow: 'hidden'
        }
      }}
    >
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
          width: isMobile ? '100%' : (isDesktop ? '300px' : '250px'), 
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
              {isMobile ? 'Все' : 'Все'}
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
            <div
              onClick={() => setMessageTab('favorites')}
              style={{
                flex: 1,
                padding: isMobile ? '10px 2px' : '12px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: messageTab === 'favorites' ? '2px solid #3b82f6' : '2px solid transparent',
                color: messageTab === 'favorites' ? '#3b82f6' : '#6b7280',
                fontWeight: messageTab === 'favorites' ? 600 : 400,
                fontSize: isMobile ? 11 : 13
              }}
            >
              <StarOutlined style={{ marginRight: isMobile ? 2 : 4, fontSize: isMobile ? 12 : 14 }} />
              {isMobile ? '★' : 'Избранные'}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: isMobile ? '8px' : '12px', background: '#ffffff' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af', fontSize: isMobile ? 12 : 14 }} />}
              placeholder={isMobile ? 'Поиск...' : 'Поиск пользователя'}
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
            {chatMessages
              .filter(chat => {
                if (messageTab === 'unread') return !chat.isRead;
                return true;
              })
              .map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => onChatSelect?.(chat)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: isMobile ? '8px' : '12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedChat?.id === chat.id ? '#eff6ff' : (chat.isRead ? '#ffffff' : '#f0fdf4'),
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat?.id !== chat.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat?.id !== chat.id) {
                      e.currentTarget.style.background = chat.isRead ? '#ffffff' : '#f0fdf4';
                    }
                  }}
                >
                  <Avatar
                    size={isMobile ? 36 : 40}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: chat.isOnline ? '#10b981' : '#6b7280' }}
                  />
                  <div style={{ flex: 1, marginLeft: isMobile ? 8 : 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Text strong style={{ 
                          fontSize: isMobile ? 13 : 14, 
                          color: '#1f2937',
                          fontWeight: chat.isRead ? 500 : 600
                        }}>
                          {chat.userName}
                        </Text>
                        {chat.isOnline && (
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: '#10b981',
                            display: 'inline-block'
                          }} />
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, color: '#9ca3af' }}>
                        {chat.timestamp}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text 
                        ellipsis 
                        style={{ 
                          fontSize: isMobile ? 11 : 12, 
                          color: chat.isRead ? '#6b7280' : '#059669',
                          fontWeight: chat.isRead ? 400 : 500,
                          maxWidth: isMobile ? '140px' : '180px'
                        }}
                      >
                        {chat.lastMessage}
                      </Text>
                      {chat.unreadCount > 0 && (
                        <Badge 
                          count={chat.unreadCount} 
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
              ))}
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
                      onClick={() => onChatSelect?.(null as any)}
                      size="small"
                    />
                  )}
                  <Avatar
                    size={isMobile ? 32 : 36}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: selectedChat.isOnline ? '#10b981' : '#6b7280' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Text style={{ fontSize: isMobile ? 13 : 15, color: '#1f2937', fontWeight: 500 }}>
                      {selectedChat.userName}
                    </Text>
                    {selectedChat.isOnline && (
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: '#10b981',
                        display: 'inline-block'
                      }} />
                    )}
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: selectedChat.isOnline ? '#10b981' : '#6b7280', display: 'block' }}>
                      {selectedChat.isOnline ? 'В сети' : 'Не в сети'}
                    </Text>
                  </div>
                </Space>
                {!isMobile && (
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<PlusOutlined />}
                    style={{ fontSize: 14 }}
                  >
                    Создать заказ
                  </Button>
                )}
              </>
            ) : (
              <>
                <Space>
                  <StarOutlined style={{ color: '#0ea5e9', fontSize: isMobile ? 14 : 16 }} />
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: '#0369a1', fontWeight: 500 }}>
                    Важные сообщения
                  </Text>
                </Space>
                {!isMobile && (
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<PlusOutlined />}
                    style={{ fontSize: 14 }}
                  >
                    Создать заказ
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Messages Area */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: isMobile ? '12px' : '20px',
            background: '#f9fafb',
            minHeight: 0,
            maxHeight: '100%'
          }}>
            {selectedChat ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12 }}>
                {selectedChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.isMine ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: isMobile ? '85%' : '70%',
                        padding: isMobile ? '8px 12px' : '10px 14px',
                        borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.isMine ? '#3b82f6' : '#ffffff',
                        color: msg.isMine ? '#ffffff' : '#1f2937',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        border: msg.isMine ? 'none' : '1px solid #e5e7eb'
                      }}
                    >
                      <Text style={{ 
                        fontSize: isMobile ? 13 : 14, 
                        color: msg.isMine ? '#ffffff' : '#1f2937',
                        display: 'block',
                        marginBottom: 4
                      }}>
                        {msg.text}
                      </Text>
                      <Text style={{ 
                        fontSize: isMobile ? 10 : 11, 
                        color: msg.isMine ? 'rgba(255, 255, 255, 0.7)' : '#9ca3af'
                      }}>
                        {msg.timestamp}
                        {msg.isMine && msg.isRead && (
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
          <div style={{ 
            padding: isMobile ? '8px 12px 8px 12px' : '12px',
            borderTop: '1px solid #e5e7eb',
            background: '#ffffff',
            // flexShrink: 0 — можно оставить, чтобы не схлопывался при маленькой высоте
            flexShrink: 0
            // position: 'sticky',
            // bottom: 0,
            // zIndex: 10
          }}>
            {fileList.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Upload
                  fileList={fileList}
                  onRemove={(file) => {
                    setFileList(fileList.filter((f) => f.uid !== file.uid));
                  }}
                  beforeUpload={() => false}
                />
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
              />
              <Upload
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                beforeUpload={() => false}
                multiple
                showUploadList={false}
              >
                <Button
                  type="default"
                  shape="circle"
                  icon={<PaperClipOutlined />}
                  style={{ 
                    width: isMobile ? 36 : 40, 
                    height: isMobile ? 36 : 40,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: isMobile ? 14 : 16
                  }}
                />
              </Upload>
              {!isMobile && (
                <Popover
                  content={
                    <EmojiPicker
                      onEmojiClick={(emojiData: any) => {
                        setMessageText(messageText + emojiData.emoji);
                        setEmojiPickerOpen(false);
                      }}
                      width={350}
                      height={400}
                    />
                  }
                  trigger="click"
                  open={emojiPickerOpen}
                  onOpenChange={setEmojiPickerOpen}
                  placement="topRight"
                >
                  <Button
                    type="default"
                    shape="circle"
                    icon={<SmileOutlined />}
                    style={{ 
                      width: 40, 
                      height: 40,
                      border: '1px solid #d1d5db',
                      background: '#ffffff'
                    }}
                  />
                </Popover>
              )}
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
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MessagesModal;