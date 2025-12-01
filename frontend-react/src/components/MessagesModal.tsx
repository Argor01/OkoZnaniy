import React, { useState } from 'react';
import { Modal, Tabs, List, Avatar, Badge, Input, Button, Empty } from 'antd';
import { MessageOutlined, SearchOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './MessagesModal.css';

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  unread?: boolean;
}

interface Chat {
  id: number;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
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

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Моковые данные
  const mockChats: Chat[] = [
    {
      id: 1,
      name: 'Иван Петров',
      lastMessage: 'Спасибо за помощь!',
      time: '10:30',
      unreadCount: 2,
    },
    {
      id: 2,
      name: 'Мария Сидорова',
      lastMessage: 'Когда будет готово?',
      time: 'Вчера',
      unreadCount: 0,
    },
    {
      id: 3,
      name: 'Алексей Смирнов',
      lastMessage: 'Отлично, жду результат',
      time: '15.11',
      unreadCount: 1,
    },
  ];

  const mockMessages: Message[] = [
    {
      id: 1,
      sender: 'Иван Петров',
      text: 'Здравствуйте! Можете помочь с заданием?',
      time: '10:25',
    },
    {
      id: 2,
      sender: 'Вы',
      text: 'Да, конечно! Отправьте детали.',
      time: '10:27',
    },
    {
      id: 3,
      sender: 'Иван Петров',
      text: 'Спасибо за помощь!',
      time: '10:30',
      unread: true,
    },
  ];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Отправка сообщения
      setMessageText('');
    }
  };

  const filteredChats = mockChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      title="Сообщения"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      className="messages-modal"
      styles={{
        body: { padding: 0, height: '70vh', display: 'flex', flexDirection: 'column' },
      }}
    >
      <div className="messages-container">
        {/* Список чатов */}
        <div className={`chats-list ${isMobile && selectedChat ? 'hidden' : ''}`}>
          <div className="chats-header">
            <Input
              placeholder="Поиск..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
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
                      <Avatar size={48}>{chat.name[0]}</Avatar>
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
                    <Avatar size={36}>
                      {mockChats.find((c) => c.id === selectedChat)?.name[0]}
                    </Avatar>
                    <span className="chat-header-name">
                      {mockChats.find((c) => c.id === selectedChat)?.name}
                    </span>
                  </div>
                </div>
              )}
              <div className="messages-list">
                {mockMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender === 'Вы' ? 'own' : 'other'}`}
                  >
                    <div className="message-content">
                      <div className="message-sender">{msg.sender}</div>
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="message-input-container">
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
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="send-button"
                >
                  Отправить
                </Button>
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
