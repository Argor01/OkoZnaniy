import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Typography,
  message,
} from 'antd';
import { SendOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './PartnerCommunication.module.css';
import { logger } from '@/utils/logger';
import {
  getChatRoomMessages,
  getChatRooms,
  sendChatRoomMessage,
} from '@/features/partner/api/partnerChats';

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
  is_read?: boolean;
}

interface DirectorChat {
  id: number;
  roomId: number;
  first_name: string;
  last_name: string;
  email?: string;
  online: boolean;
}

export const PartnerCommunication: React.FC = () => {
  const [directors, setDirectors] = useState<DirectorChat[]>([]);
  const [selectedDirector, setSelectedDirector] = useState<DirectorChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadDirectors();
  }, []);

  useEffect(() => {
    if (!selectedDirector) {
      return;
    }

    loadMessages(selectedDirector.roomId);
    const interval = setInterval(() => {
      loadMessages(selectedDirector.roomId);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDirector]);

  const loadDirectors = async () => {
    setLoading(true);
    try {
      const rooms = await getChatRooms();
      const mappedDirectors: DirectorChat[] = (Array.isArray(rooms) ? rooms : [])
        .map((room: any) => {
          const director = (room.participants || []).find(
            (participant: any) => participant.role === 'director',
          );

          return {
            id: director?.id ?? room.id,
            roomId: room.id,
            first_name: director?.first_name ?? room.name ?? 'Директор',
            last_name: director?.last_name ?? '',
            email: director?.username ?? '',
            online: director?.online ?? false,
          };
        })
        .filter((room: DirectorChat) => Boolean(room.roomId));

      setDirectors(mappedDirectors);
      if (mappedDirectors.length > 0) {
        setSelectedDirector((current) => current ?? mappedDirectors[0]);
      }
    } catch (error) {
      logger.error('Ошибка загрузки чатов директоров:', error);
      message.error('Не удалось загрузить список чатов');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: number) => {
    try {
      const roomMessages = await getChatRoomMessages(roomId);
      setMessages(Array.isArray(roomMessages) ? roomMessages : []);
    } catch (error) {
      logger.error('Ошибка загрузки сообщений:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedDirector) {
      return;
    }

    setSending(true);
    try {
      await sendChatRoomMessage(selectedDirector.roomId, messageText.trim());
      setMessageText('');
      await loadMessages(selectedDirector.roomId);
      message.success('Сообщение отправлено');
    } catch (error) {
      logger.error('Ошибка отправки сообщения:', error);
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
                  className={`${styles.directorItem} ${selectedDirector?.roomId === director.roomId ? styles.directorItemActive : ''}`}
                  onClick={() => setSelectedDirector(director)}
                >
                  <List.Item.Meta
                    avatar={(
                      <Badge dot={director.online} color="green">
                        <Avatar icon={<UserOutlined />} />
                      </Badge>
                    )}
                    title={`${director.first_name} ${director.last_name}`.trim()}
                    description={director.email || 'Чат с директором'}
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'Нет доступных чатов с директорами' }}
            />
          </div>

          <div className={styles.chatArea}>
            {selectedDirector ? (
              <>
                <div className={styles.chatHeader}>
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>
                        {[selectedDirector.first_name, selectedDirector.last_name].filter(Boolean).join(' ')}
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
                    <Empty description="Нет сообщений" style={{ marginTop: 50 }} />
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
                              {[msg.sender.first_name, msg.sender.last_name].filter(Boolean).join(' ')}
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
                    onKeyDown={handleKeyPress}
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
              <Empty description="Выберите чат для начала общения" style={{ marginTop: 100 }} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
