import React, { useState } from 'react';
import { Modal, Input, Button, Avatar, Space, Typography } from 'antd';
import {
  MessageOutlined,
  BellOutlined,
  StarOutlined,
  MobileOutlined,
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SendOutlined,
  PaperClipOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import styles from './MessagesModal.module.css';

const { Text } = Typography;

interface MessagesModalProps {
  open: boolean;
  onClose: () => void;
  userProfile?: {
    username?: string;
    email?: string;
    avatar?: string;
  };
}

const MessagesModal: React.FC<MessagesModalProps> = ({ open, onClose, userProfile }) => {
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessageText('');
      // TODO: Отправка сообщения
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      zIndex={1050}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        },
        content: {
          borderRadius: 24,
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        },
        body: {
          padding: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          height: '600px',
          display: 'flex',
        },
      }}
    >
      <div className={styles.container}>
        {/* Левая панель */}
        <div className={styles.sidebar}>
          <div className={styles.tabs}>
            <div
              onClick={() => setMessageTab('all')}
              className={`${styles.tab} ${messageTab === 'all' ? styles.tabActive : ''}`}
            >
              <MessageOutlined className={styles.tabIcon} />
              Все
            </div>
            <div
              onClick={() => setMessageTab('unread')}
              className={`${styles.tab} ${messageTab === 'unread' ? styles.tabActive : ''}`}
            >
              <BellOutlined className={styles.tabIcon} />
              Непрочитанные
            </div>
            <div
              onClick={() => setMessageTab('favorites')}
              className={`${styles.tab} ${messageTab === 'favorites' ? styles.tabActive : ''}`}
            >
              <StarOutlined className={styles.tabIcon} />
              Избранные
            </div>
            <div
              onClick={() => setMessageTab('sms')}
              className={`${styles.tab} ${messageTab === 'sms' ? styles.tabActive : ''}`}
            >
              <MobileOutlined className={styles.tabIcon} />
              SMS
            </div>
          </div>
          <div className={styles.searchContainer}>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Поиск пользователя"
              style={{ borderRadius: 8 }}
            />
          </div>
          <div className={styles.usersList}>
            <Text type="secondary" style={{ fontSize: 14, textAlign: 'center', display: 'block', padding: '20px' }}>
              Нет сообщений
            </Text>
          </div>
        </div>

        {/* Правая панель */}
        <div className={styles.chatArea}>
          <div className={styles.chatHeader}>
            <Space>
              <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>
                Выберите диалог
              </Text>
            </Space>
          </div>
          <div className={styles.messagesArea}>
            <div className={styles.emptyState}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Нет сообщений
              </Text>
            </div>
          </div>
          <div className={styles.inputArea}>
            <Input.TextArea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Введите сообщение..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              className={styles.messageInput}
            />
            <Button
              type="default"
              shape="circle"
              icon={<PaperClipOutlined />}
              className={styles.actionButton}
            />
            <Button
              type="default"
              shape="circle"
              icon={<SmileOutlined />}
              className={styles.actionButton}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              style={{
                width: 40,
                height: 40,
                background: '#3b82f6',
                border: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MessagesModal;
