import React, { useState, useRef, useEffect } from 'react';
import { Modal, Input, Button, Avatar, Badge, Typography, Empty, Alert } from 'antd';
import {
  UserOutlined,
  SendOutlined,
  SearchOutlined,
  CloseOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
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
  message_type?: string;
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
  is_frozen?: boolean;
  frozen_reason?: string;
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
    if (messageText.trim() && selectedChat && !selectedChat.is_frozen) {
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
      className={`${styles.chatModal} ${isMobile ? styles.chatModalMobile : ''}`}
    >
      <div className={styles.chatContainer}>
        <div className={`${styles.chatList} ${selectedChat && isMobile ? styles.hidden : ''}`}>
          <div className={styles.chatListHeader}>
            <Text strong className={styles.chatListHeaderTitle}>Сообщения</Text>
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
                        {chat.is_frozen && (
                          <LockOutlined 
                            style={{ marginLeft: 8, color: '#ff4d4f' }} 
                            title="Чат заморожен"
                          />
                        )}
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
                        <Badge dot className={styles.unreadDot} />
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
                  <Text strong>
                    {selectedChat.userName}
                    {selectedChat.is_frozen && (
                      <LockOutlined 
                        style={{ marginLeft: 8, color: '#ff4d4f' }} 
                        title="Чат заморожен"
                      />
                    )}
                  </Text>
                  <Text type="secondary" className={styles.chatWindowStatus}>
                    {selectedChat.isOnline ? 'Онлайн' : 'Не в сети'}
                  </Text>
                </div>
              </div>
              
              {selectedChat.is_frozen && (
                <Alert
                  message="Чат заморожен"
                  description={selectedChat.frozen_reason || "Чат заморожен администратором для проверки"}
                  type="warning"
                  showIcon
                  style={{ margin: '16px' }}
                />
              )}
              
              <div className={styles.chatWindowMessages}>
                {selectedChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${
                      msg.message_type === 'system' 
                        ? styles.systemMessage 
                        : msg.isMine 
                          ? styles.mine 
                          : styles.theirs
                    }`}
                  >
                    <div className={styles.messageContent}>
                      {msg.message_type === 'system' && (
                        <StopOutlined className={styles.systemMessageIcon} />
                      )}
                      <Text 
                        style={{
                          color: msg.message_type === 'system' ? '#ff4d4f' : undefined,
                          fontWeight: msg.message_type === 'system' ? '600' : undefined,
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {msg.text}
                      </Text>
                    </div>
                    <Text type="secondary" className={styles.messageTime}>
                      {msg.message_type === 'system' ? 'Система безопасности' : msg.timestamp}
                    </Text>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {!selectedChat.is_frozen && (
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
              )}
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
