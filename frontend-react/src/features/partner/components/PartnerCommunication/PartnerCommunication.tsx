import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Space, 
  Typography, 
  Input,
  message,
  Badge,
  Avatar,
  Empty
} from 'antd';
import { 
  SendOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@/api/client';
import styles from './PartnerCommunication.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  id: number;
  text: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  sent_at: string;
  is_read: boolean;
}

interface Director {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  online: boolean;
}

export const PartnerCommunication: React.FC = () => {
  const [directors, setDirectors] = useState<Director[]>([]);
  const [selectedDirector, setSelectedDirector] = useState<Director | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Загрузка списка директоров
  useEffect(() => {
    loadDirectors();
  }, []);

  // Загрузка сообщений при выборе директора
  useEffect(() => {
    if (selectedDirector) {
      loadMessages(selectedDirector.id);
      // Обновляем сообщения каждые 5 секунд
      const interval = setInterval(() => {
        loadMessages(selectedDirector.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDirector]);

  const loadDirectors = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users/directors/');
      setDirectors(response.data);
      if (response.data.length > 0 && !selectedDirector) {
        setSelectedDirector(response.data[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки директоров:', error);
      message.error('Не удалось загрузить список директоров');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (directorId: number) => {
    try {
      const response = await apiClient.get(`/chat/partner-director/${directorId}/`);
      setMessages(response.data);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedDirector) return;

    setSending(true);
    try {
      await apiClient.post(`/chat/partner-director/${selectedDirector.id}/`, {
        text: messageText.trim()
      });
      setMessageText('');
      await loadMessages(selectedDirector.id);
      message.success('Сообщение отправлено');
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.mainCard}>
        <div className={styles.chatLayout}>
          {/* Список директоров */}
          <div className={styles.directorsList}>
            <div className={styles.directorsHeader}>
              <Title level={5}>
                <TeamOutlined /> Директора
              </Title>
            </div>
            <List
              loading={loading}
              dataSource={directors}
              renderItem={(director) => (
                <List.Item
                  className={`${styles.directorItem} ${selectedDirector?.id === director.id ? styles.directorItemActive : ''}`}
                  onClick={() => setSelectedDirector(director)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={director.online} color="green">
                        <Avatar icon={<UserOutlined />} />
                      </Badge>
                    }
                    title={`${director.first_name} ${director.last_name}`}
                    description={director.email}
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'Нет доступных директоров' }}
            />
          </div>

          {/* Чат */}
          <div className={styles.chatArea}>
            {selectedDirector ? (
              <>
                <div className={styles.chatHeader}>
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>
                        {selectedDirector.first_name} {selectedDirector.last_name}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {selectedDirector.online ? 'В сети' : 'Не в сети'}
                      </Text>
                    </div>
                  </Space>
                </div>

                <div className={styles.messagesContainer}>
                  {messages.length === 0 ? (
                    <Empty 
                      description="Нет сообщений"
                      style={{ marginTop: 50 }}
                    />
                  ) : (
                    <List
                      dataSource={messages}
                      renderItem={(msg) => (
                        <div
                          key={msg.id}
                          className={`${styles.message} ${msg.sender.role === 'partner' ? styles.messageOwn : styles.messageOther}`}
                        >
                          <div className={styles.messageContent}>
                            <Text strong style={{ fontSize: 12 }}>
                              {msg.sender.first_name} {msg.sender.last_name}
                            </Text>
                            <div className={styles.messageText}>{msg.text}</div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {dayjs(msg.sent_at).format('DD.MM.YYYY HH:mm')}
                            </Text>
                          </div>
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className={styles.messageInput}>
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите сообщение..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    disabled={sending}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    loading={sending}
                    disabled={!messageText.trim()}
                  >
                    Отправить
                  </Button>
                </div>
              </>
            ) : (
              <Empty 
                description="Выберите директора для начала общения"
                style={{ marginTop: 100 }}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
