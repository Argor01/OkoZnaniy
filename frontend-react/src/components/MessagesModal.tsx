import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, List, Avatar, Badge, Input, Button, Empty, message as antMessage, Spin } from 'antd';
import { MessageOutlined, SendOutlined, ArrowLeftOutlined, UserOutlined, PaperClipOutlined } from '@ant-design/icons';
import './MessagesModal.css';
import chatApi, { ChatListItem as ApiChat, Message as ApiMessage } from '../api/chat';

interface Chat {
  id: number;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  orderId: number;
}

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMine: boolean;
  file_name?: string | null;
  file_url?: string | null;
}

interface MessagesModalProps {
  open: boolean;
  onClose: () => void;
}

const MessagesModal: React.FC<MessagesModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка чатов при открытии модалки
  useEffect(() => {
    if (open) {
      loadChats();
    }
  }, [open]);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
    }
  }, [selectedChat]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const apiChats = await chatApi.getChats();
      const formattedChats: Chat[] = apiChats.map((chat: ApiChat) => {
        const other = chat.other_user;
        const participantName = other
          ? `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.username
          : 'Неизвестный';
        const lastText = chat.last_message?.text || 'Нет сообщений';
        return {
          id: chat.id,
          name: participantName,
          lastMessage: lastText,
          time: formatTime(chat.last_message?.created_at),
          unreadCount: chat.unread_count || 0,
          orderId: chat.order_id ?? chat.order,
        };
      });
      setChats(formattedChats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      antMessage.error('Не удалось загрузить чаты');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: number) => {
    setLoading(true);
    try {
      const apiMessages = await chatApi.getMessages(chatId);
      const formattedMessages: Message[] = apiMessages.map((msg: ApiMessage) => ({
        id: msg.id,
        sender: msg.sender_id === currentUserId
          ? 'Вы'
          : `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || msg.sender?.username || '',
        text: msg.text || '',
        time: formatTime(msg.created_at),
        isMine: msg.sender_id === currentUserId,
        file_name: msg.file_name ?? undefined,
        file_url: msg.file_url ?? undefined,
      }));
      setMessages(formattedMessages.reverse());
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      antMessage.error('Не удалось загрузить сообщения');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return `${days} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !attachedFile) || !selectedChat) return;

    setSending(true);
    try {
      await chatApi.sendMessage(selectedChat, messageText.trim(), attachedFile ?? undefined);
      setMessageText('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMessages(selectedChat);
      await loadChats();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      title="Сообщения"
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      className="messages-modal"
      styles={{
        body: { padding: 0 }
      }}
    >
      <div className="messages-container">
        {/* Список чатов */}
        <div className={`chats-list ${isMobile && selectedChat ? 'hidden' : ''}`}>
          <div className="chats-header">
            <Input.Search
              placeholder="Поиск друзей..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
              allowClear
            />
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'all', label: 'Все' },
              { key: 'unread', label: 'Непрочитанные' },
            ]}
            className="chats-tabs"
          />

          {loading && !selectedChat ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : (
            <List
              dataSource={filteredChats}
              renderItem={(chat) => (
                <List.Item
                  className={`chat-item ${selectedChat === chat.id ? 'active' : ''} ${
                    chat.unreadCount > 0 ? 'unread' : ''
                  }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={chat.unreadCount} offset={[-5, 5]}>
                        <Avatar size={48} icon={<UserOutlined />}>{chat.name[0]}</Avatar>
                      </Badge>
                    }
                    title={<div className="chat-name">{chat.name}</div>}
                    description={
                      <div className="chat-preview">
                        <span className="last-message">{chat.lastMessage}</span>
                        <span className="chat-time">{chat.time}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="Нет сообщений" /> }}
            />
          )}
        </div>

        {/* Окно чата */}
        <div className={`chat-window ${isMobile && selectedChat ? 'visible' : ''}`}>
          {selectedChat ? (
            <>
              {isMobile && (
                <div className="chat-header-mobile">
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setSelectedChat(null)}
                    className="back-button"
                  />
                  <div className="chat-header-info">
                    <Avatar size={36} icon={<UserOutlined />}>
                      {chats.find((c) => c.id === selectedChat)?.name[0]}
                    </Avatar>
                    <span className="chat-header-name">
                      {chats.find((c) => c.id === selectedChat)?.name}
                    </span>
                  </div>
                </div>
              )}
              <div className="messages-list">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin />
                  </div>
                ) : messages.length === 0 ? (
                  <Empty description="Нет сообщений" />
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message ${msg.isMine ? 'own' : 'other'}`}
                    >
                      <div className="message-content">
                        <div className="message-sender">{msg.sender}</div>
                        {msg.text ? <div className="message-text">{msg.text}</div> : null}
                        {msg.file_url && msg.file_name ? (
                          <div className="message-file" style={{ marginTop: msg.text ? 8 : 0 }}>
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#1890ff' }}
                            >
                              📎 {msg.file_name}
                            </a>
                          </div>
                        ) : null}
                        <div className="message-time">{msg.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="message-input-container">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAttachedFile(f);
                  }}
                />
                {attachedFile && (
                  <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                    📎 {attachedFile.name}
                    <Button type="link" size="small" onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                      Убрать
                    </Button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <Input.TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="message-input"
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="default"
                    icon={<PaperClipOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    className="attach-button"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !attachedFile) || sending}
                    loading={sending}
                    className="send-button"
                  >
                    Отправить
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <MessageOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999' }}>Выберите чат</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MessagesModal;
