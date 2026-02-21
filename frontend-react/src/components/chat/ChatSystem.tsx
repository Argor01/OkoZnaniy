import React, { useState, useRef, useEffect } from 'react';
import { Modal, Input, Button, Avatar, Badge, Typography, Empty } from 'antd';
import {
  UserOutlined,
  SendOutlined,
  SearchOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import styles from './ChatSystem.module.css';

const { Text } = Typography;
const { TextArea } = Input;

export interface ChatMessage {
  id: number;
  text: string;
  timestamp: string;
  isMine: boolean;
  isRead: boolean;
}

export interface Chat {
  id: number;
  chatId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  isOnline: boolean;
  unreadCount: number;
  messages: ChatMessage[];
}

interface ChatSystemProps {
  visible: boolean;
  onClose: () => void;
  chats: Chat[];
  onSendMessage: (chatId: number, message: string) => void;
  isMobile?: boolean;
}

const ChatSystem: React.FC<ChatSystemProps> = ({
  visible,
  onClose,
  chats,
  onSendMessage,
  isMobile = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedChat) {
      scrollToBottom();
    }
  }, [selectedChat]);

  const filteredChats = chats.filter(chat =>
    chat.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      onSendMessage(selectedChat.chatId, messageText.trim());
      setMessageText('');
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 900}
      className={styles.chatModal}
      styles={{
        body: { padding: 0, height: isMobile ? '100vh' : '600px' },
      }}
    >
      <div className={styles.chatContainer}>
        <div className={`${styles.chatList} ${selectedChat && isMobile ? styles.hidden : ''}`}>
          <div className={styles.chatListHeader}>
            <Text strong style={{ fontSize: 18 }}>Сообщения</Text>
          </div>
          <div className={styles.searchBox}>
            <Input
              placeholder="Поиск..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </div>
          <div className={styles.chatListContent}>
            {filteredChats.length === 0 ? (
              <Empty description="Нет сообщений" />
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`${styles.chatItem} ${selectedChat?.id === chat.id ? styles.active : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <Badge dot={chat.isOnline} offset={[-5, 35]}>
                    <Avatar
                      size={48}
                      src={chat.userAvatar}
                      icon={<UserOutlined />}
                    />
                  </Badge>
                  <div className={styles.chatItemContent}>
                    <div className={styles.chatItemHeader}>
                      <Text strong className={styles.chatItemName}>
                        {chat.userName}
                      </Text>
                      <Text type="secondary" className={styles.chatItemTime}>
                        {chat.timestamp}
                      </Text>
                    </div>
                    <div className={styles.chatItemMessage}>
                      <Text
                        type="secondary"
                        ellipsis
                        className={!chat.isRead ? styles.unread : ''}
                      >
                        {chat.lastMessage}
                      </Text>
                      {chat.unreadCount > 0 && (
                        <Badge dot style={{ backgroundColor: '#3b82f6' }} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        
        <div className={`${styles.chatWindow} ${!selectedChat && isMobile ? styles.hidden : ''}`}>
          {selectedChat ? (
            <>
              <div className={styles.chatWindowHeader}>
                {isMobile && (
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => setSelectedChat(null)}
                  />
                )}
                <Avatar
                  size={80}
                  src={selectedChat.userAvatar}
                  icon={<UserOutlined />}
                />
                <div className={styles.chatWindowHeaderInfo}>
                  <Text strong>{selectedChat.userName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedChat.isOnline ? 'Онлайн' : 'Не в сети'}
                  </Text>
                </div>
              </div>
              <div className={styles.chatWindowMessages}>
                {selectedChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.isMine ? styles.mine : styles.theirs}`}
                  >
                    <div className={styles.messageContent}>
                      <Text>{msg.text}</Text>
                    </div>
                    <Text type="secondary" className={styles.messageTime}>
                      {msg.timestamp}
                    </Text>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className={styles.chatWindowInput}>
                <TextArea
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
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                />
              </div>
            </>
          ) : (
            <div className={styles.emptyChatWindow}>
              <Empty description="Выберите чат для начала общения" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ChatSystem;
