import React, { useState, useRef } from 'react';
import { Modal, Input, Button, Space, Avatar, Badge, Typography, Upload, Popover, message as antMessage, Card } from 'antd';
import { SendOutlined, SmileOutlined, PaperClipOutlined, SearchOutlined, UserOutlined, ArrowLeftOutlined, MessageOutlined, StarOutlined, CheckCircleOutlined, PlusOutlined, FileTextOutlined, CloseCircleOutlined } from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import IndividualOfferModal from './IndividualOfferModal';
import { chatApi } from '../../api/chat';

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
    message_type?: 'text' | 'offer';
    offer_data?: any;
  }[];
}

interface MessagesModalProps {
  visible?: boolean;
  open?: boolean;
  onCancel?: () => void;
  onClose?: () => void;
  selectedChat?: ChatMessage | null;
  onChatSelect?: (chat: ChatMessage) => void;
  userProfile?: any;
}

const MessagesModal: React.FC<MessagesModalProps> = ({
  visible,
  open,
  onCancel,
  onClose,
  selectedChat,
  onChatSelect,
  userProfile
}) => {
  const isOpen = open || visible || false;
  const handleClose = onClose || onCancel || (() => {});

  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 840);
  const [isDesktop] = useState(window.innerWidth > 1024);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isChatInitiator = (() => {
    if (!selectedChat) return false;
    const msgs = selectedChat.messages;
    if (!Array.isArray(msgs) || msgs.length === 0) return true;
    return !!msgs[0]?.isMine;
  })();

  const [chatMessages] = useState<ChatMessage[]>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (messageText.trim() && selectedChat) {
      try {
        await chatApi.sendMessage(selectedChat.chatId, messageText.trim());
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
      } catch (error) {
        console.error('Failed to send message:', error);
        antMessage.error('Не удалось отправить сообщение');
      }
      setMessageText('');
      setFileList([]);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleOfferSubmit = async (data: any) => {
    if (!selectedChat) return;
    try {
      await chatApi.sendMessage(selectedChat.chatId, '', undefined, 'offer', data);
      setOfferModalOpen(false);
      antMessage.success('Предложение отправлено');
    } catch (error) {
      console.error('Failed to send offer:', error);
      antMessage.error('Не удалось отправить предложение');
    }
  };

  const handleAcceptOffer = async (msgId: number) => {
    if (!selectedChat) return;
    try {
      await chatApi.acceptOffer(selectedChat.chatId, msgId);
      antMessage.success('Предложение принято, заказ создан');
    } catch (error: any) {
      antMessage.error(error.response?.data?.detail || 'Ошибка принятия предложения');
    }
  };

  const handleRejectOffer = async (msgId: number) => {
    if (!selectedChat) return;
    try {
      await chatApi.rejectOffer(selectedChat.chatId, msgId);
      antMessage.success('Предложение отклонено');
    } catch (error: any) {
      antMessage.error(error.response?.data?.detail || 'Ошибка отклонения предложения');
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
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
          maxWidth: isMobile ? undefined : (isDesktop ? 1400 : 1200),
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
                          dot
                          style={{ 
                            backgroundColor: '#3b82f6'
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
                  userProfile?.role === 'expert' && !isChatInitiator ? (
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<FileTextOutlined />}
                      style={{ fontSize: 14, background: '#10B981', borderColor: '#10B981' }}
                      onClick={() => setOfferModalOpen(true)}
                    >
                      Индивидуальное предложение
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ fontSize: 14 }}
                    >
                      Создать заказ
                    </Button>
                  )
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
                        padding: msg.message_type === 'offer' ? 0 : (isMobile ? '8px 12px' : '10px 14px'),
                        borderRadius: msg.isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.message_type === 'offer' ? 'transparent' : (msg.isMine ? '#3b82f6' : '#ffffff'),
                        color: msg.isMine ? '#ffffff' : '#1f2937',
                        boxShadow: msg.message_type === 'offer' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                        border: msg.message_type === 'offer' ? 'none' : (msg.isMine ? 'none' : '1px solid #e5e7eb'),
                        overflow: 'hidden'
                      }}
                    >
                      {msg.message_type === 'offer' && msg.offer_data ? (
                        <Card 
                          size="small" 
                          style={{ width: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}
                          bodyStyle={{ padding: 0 }}
                        >
                          <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                            <Text strong style={{ fontSize: 16 }}>Индивидуальное предложение</Text>
                          </div>
                          <div style={{ padding: '16px' }}>
                            <div style={{ marginBottom: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Предмет</Text>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{msg.offer_data.subject}</div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Тип работы</Text>
                              <div style={{ fontSize: 14 }}>{msg.offer_data.work_type}</div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Описание</Text>
                              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{msg.offer_data.description}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>Стоимость</Text>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#10B981' }}>
                                  {msg.offer_data.cost?.toLocaleString('ru-RU')} ₽
                                </div>
                              </div>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>Срок</Text>
                                <div style={{ fontSize: 14 }}>
                                  {msg.offer_data.deadline ? new Date(msg.offer_data.deadline).toLocaleDateString() : 'Не указан'}
                                </div>
                              </div>
                            </div>
                            
                            {msg.offer_data.status === 'accepted' ? (
                              <div style={{ textAlign: 'center', color: '#10B981', fontWeight: 500 }}>
                                <CheckCircleOutlined /> Предложение принято
                              </div>
                            ) : msg.offer_data.status === 'rejected' ? (
                              <div style={{ textAlign: 'center', color: '#EF4444', fontWeight: 500 }}>
                                <CloseCircleOutlined /> Предложение отклонено
                              </div>
                            ) : (
                              !msg.isMine && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <Button 
                                    type="primary" 
                                    block 
                                    style={{ background: '#10B981', borderColor: '#10B981' }}
                                    onClick={() => handleAcceptOffer(msg.id)}
                                  >
                                    Принять
                                  </Button>
                                  <Button 
                                    danger 
                                    block
                                    onClick={() => handleRejectOffer(msg.id)}
                                  >
                                    Отказаться
                                  </Button>
                                </div>
                              )
                            )}
                            {msg.isMine && !msg.offer_data.status && (
                                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>
                                  Ожидает решения получателя
                                </div>
                            )}
                          </div>
                        </Card>
                      ) : (
                        <>
                          <Text style={{ 
                            fontSize: isMobile ? 15 : 16, 
                            color: msg.isMine ? '#ffffff' : '#1f2937',
                            display: 'block',
                            marginBottom: 4
                          }}>
                            {msg.text}
                          </Text>
                          <Text style={{ 
                            fontSize: isMobile ? 11 : 12, 
                            color: msg.isMine ? 'rgba(255, 255, 255, 0.7)' : '#9ca3af'
                          }}>
                            {msg.timestamp}
                            {msg.isMine && msg.isRead && (
                              <CheckCircleOutlined style={{ marginLeft: 4, fontSize: isMobile ? 11 : 12 }} />
                            )}
                          </Text>
                        </>
                      )}
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
            flexShrink: 0
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
      <IndividualOfferModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        onSubmit={handleOfferSubmit}
      />
    </Modal>
  );
};

export default MessagesModal;
