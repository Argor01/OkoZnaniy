import React, { useEffect, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  List,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  Input,
  message,
} from 'antd';
import {
  BellOutlined,
  PushpinOutlined,
  SendOutlined,
  TeamOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './PartnerChatsSection.module.css';
import { logger } from '@/utils/logger';
import {
  getChatRoomMessages,
  getChatRooms,
  sendChatRoomMessage,
  uploadChatRoomFile,
} from '@/features/partner/api/partnerChats';

const { Text, Title } = Typography;
const { Search, TextArea } = Input;

interface ChatRoomParticipant {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  online: boolean;
  last_seen?: string;
}

interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  type: 'general' | 'department' | 'project' | 'private';
  unread_count: number;
  is_muted: boolean;
  participants?: ChatRoomParticipant[];
  last_message?: {
    id: number;
    text: string;
    sender: {
      first_name: string;
      last_name: string;
    };
    sent_at: string;
  };
}

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
  is_system: boolean;
  is_pinned: boolean;
}

export const PartnerChatsSection: React.FC = () => {
  const { modal } = App.useApp();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    setLoading(true);
    try {
      const rooms = await getChatRooms();
      const privateRooms = (Array.isArray(rooms) ? rooms : []).filter((room) => room.type === 'private');
      setChatRooms(privateRooms);
      if (privateRooms.length > 0) {
        setSelectedRoom((current) => current ?? privateRooms[0]);
      }
    } catch (error) {
      logger.error('Error loading partner chat rooms:', error);
      message.error('Ошибка загрузки диалогов');
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedRoom) {
      return;
    }

    loadMessages(selectedRoom.id);
    const interval = setInterval(() => {
      loadMessages(selectedRoom.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedRoom]);

  const isMobile = windowWidth < 768;

  const filteredRooms = (Array.isArray(chatRooms) ? chatRooms : []).filter(
    (room) =>
      (room.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const loadMessages = async (roomId: number) => {
    try {
      const roomMessages = await getChatRoomMessages(roomId);
      setMessages(Array.isArray(roomMessages) ? roomMessages : []);
    } catch (error) {
      logger.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRoom) {
      return;
    }

    try {
      await sendChatRoomMessage(selectedRoom.id, messageText.trim());
      message.success('Сообщение отправлено');
      setMessageText('');
      await loadMessages(selectedRoom.id);
    } catch (error) {
      logger.error('Error sending message:', error);
      message.error('Ошибка отправки сообщения');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (selectedRoom) {
      try {
        await uploadChatRoomFile(selectedRoom.id, file);
        message.success('Файл загружен');
      } catch (_error) {
        message.error('Ошибка загрузки файла');
      }
    }
    return false;
  };

  const handleReportMessage = (messageId: number, messageSender: string) => {
    modal.confirm({
      title: 'Пожаловаться на сообщение',
      icon: <WarningOutlined />,
      content: `Вы уверены, что хотите пожаловаться на сообщение от ${messageSender}?`,
      okText: 'Да, пожаловаться',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk() {
        message.warning(`Жалоба на сообщение #${messageId} отправлена на рассмотрение`);
      },
    });
  };

  const getRoomTypeColor = (type: string) => {
    const colors = {
      general: 'purple',
      department: 'green',
      project: 'orange',
      private: 'purple',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getRoomTypeText = (type: string) => {
    const texts = {
      general: 'Общий',
      department: 'Отдел',
      project: 'Проект',
      private: 'Диалог',
    };
    return texts[type as keyof typeof texts] || 'Другой';
  };

  return (
    <div className={styles.chatContainer}>
      <Card className={`${styles.chatListCard} ${isMobile && selectedRoom ? styles.chatListCardHidden : ''}`}>
        <div className={styles.chatListHeader}>
          <div className={styles.chatListHeaderRow}>
            <Title level={5} className={styles.chatListTitle}>
              {isMobile ? 'Диалоги' : 'Внутренняя коммуникация'}
            </Title>
          </div>

          <Search
            placeholder="Поиск диалогов"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.chatListSearch}
          />
        </div>

        <div className={styles.chatListScroll}>
          <List
            dataSource={filteredRooms}
            loading={loading}
            locale={{ emptyText: 'Нет доступных диалогов с директорами' }}
            renderItem={(room) => (
              <List.Item
                className={`${styles.chatRoomItem} ${selectedRoom?.id === room.id ? styles.chatRoomItemActive : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                <List.Item.Meta
                  avatar={(
                    <Badge count={room.unread_count}>
                      <div className={`${styles.chatRoomAvatar} ${
                        room.type === 'general'
                          ? styles.roomTypeGeneral
                          : room.type === 'department'
                            ? styles.roomTypeDepartment
                            : room.type === 'project'
                              ? styles.roomTypeProject
                              : styles.roomTypePrivate
                      }`}
                      >
                        <TeamOutlined />
                      </div>
                    </Badge>
                  )}
                  title={(
                    <div className={styles.chatRoomTitleRow}>
                      <span className={room.unread_count > 0 ? styles.chatRoomNameUnread : undefined}>
                        {room.name}
                      </span>
                      <div>
                        <Tag color={getRoomTypeColor(room.type)}>{getRoomTypeText(room.type)}</Tag>
                        {room.is_muted && <BellOutlined className={styles.chatRoomMutedIcon} />}
                      </div>
                    </div>
                  )}
                  description={(
                    <div>
                      {room.last_message && (
                        <div className={styles.chatRoomLastMessage}>
                          <span className={room.unread_count > 0 ? styles.chatRoomLastMessageUnread : undefined}>
                            {room.last_message.sender.first_name}: {room.last_message.text.length > 30
                              ? `${room.last_message.text.substring(0, 30)}...`
                              : room.last_message.text}
                          </span>
                        </div>
                      )}
                      <div className={styles.chatRoomMeta}>
                        Личный диалог
                        {room.last_message && ` • ${dayjs(room.last_message.sent_at).format('HH:mm')}`}
                      </div>
                    </div>
                  )}
                />
              </List.Item>
            )}
          />
        </div>
      </Card>

      {selectedRoom ? (
        <Card className={styles.chatMainCard}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderInfo}>
              {isMobile && (
                <Button size="small" onClick={() => setSelectedRoom(null)} className={styles.chatBackButton}>
                  ←
                </Button>
              )}
              <div className={styles.chatHeaderTitleWrap}>
                <Title level={5} className={styles.chatHeaderTitle}>
                  {selectedRoom.name}
                </Title>
                <Text type="secondary" className={styles.chatHeaderSubtitle}>
                  Диалог с директором
                </Text>
              </div>
            </div>

            <Space size={isMobile ? 4 : 8}>
              <Tooltip title="Личный диалог">
                <Tag color="purple">Директор</Tag>
              </Tooltip>
            </Space>
          </div>

          <div className={styles.chatParticipantsBar}>
            <div className={styles.chatParticipantsRow}>
              {selectedRoom.participants?.slice(0, isMobile ? 6 : 8).map((participant) => (
                <Tooltip
                  key={participant.id}
                  title={`${participant.first_name} ${participant.last_name} (${participant.role}) ${participant.online ? '• Онлайн' : `• Был(а) ${dayjs(participant.last_seen).fromNow()}`}`}
                >
                  <Badge dot status={participant.online ? 'success' : 'default'} offset={[-2, 2]}>
                    <div className={`${styles.participantAvatar} ${participant.online ? styles.participantOnline : styles.participantOffline}`}>
                      {participant.first_name[0]}{participant.last_name[0]}
                    </div>
                  </Badge>
                </Tooltip>
              ))}
              {(selectedRoom.participants?.length || 0) > (isMobile ? 6 : 8) && (
                <div className={styles.participantMore}>
                  +{(selectedRoom.participants?.length || 0) - (isMobile ? 6 : 8)}
                </div>
              )}
            </div>
          </div>

          <div className={styles.chatMessagesArea}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                Сообщений пока нет
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={styles.messageRow}>
                <div className={`${styles.messageAvatar} ${msg.is_system ? styles.messageAvatarSystem : styles.messageAvatarUser}`}>
                  {msg.is_system ? 'S' : `${msg.sender.first_name[0]}${msg.sender.last_name[0]}`}
                </div>

                <div className={styles.messageContent}>
                  <div className={styles.messageHeaderRow}>
                    <Text strong className={styles.messageSenderName}>
                      {msg.sender.first_name} {msg.sender.last_name}
                    </Text>
                    {!isMobile && (
                      <Tag color="purple" className={styles.messageRoleTag}>
                        {msg.sender.role}
                      </Tag>
                    )}
                    <Text type="secondary" className={styles.messageTime}>
                      {dayjs(msg.sent_at).format('HH:mm')}
                    </Text>
                    {msg.is_pinned && <PushpinOutlined className={styles.messagePin} />}
                  </div>

                  <div className={styles.messageBubbleWrapper}>
                    <div className={`${styles.messageBubble} ${msg.is_system ? styles.messageBubbleSystem : ''} ${msg.is_pinned ? styles.messageBubblePinned : ''}`}>
                      <Text className={`${styles.messageText} ${msg.is_system ? styles.messageTextSystem : ''}`}>
                        {msg.text}
                      </Text>
                    </div>

                    {!msg.is_system && (
                      <Tooltip title="Пожаловаться на сообщение">
                        <Button
                          type="text"
                          size="small"
                          icon={<WarningOutlined />}
                          className={styles.messageReportButton}
                          onClick={() => handleReportMessage(msg.id, `${msg.sender.first_name} ${msg.sender.last_name}`)}
                          danger
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.chatComposer}>
            <div className={styles.chatComposerRow}>
              <div className={styles.chatComposerInput}>
                <TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  autoSize={{ minRows: isMobile ? 1 : 2, maxRows: isMobile ? 4 : 6 }}
                  className={styles.chatInput}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>

              <div className={styles.chatComposerActions}>
                {!isMobile && (
                  <Upload beforeUpload={handleFileUpload} showUploadList={false} multiple>
                    <Button icon={<UploadOutlined />} className={styles.chatUploadButton} />
                  </Upload>
                )}

                <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={styles.chatMainCard}>
          <div className={styles.chatEmptyState}>
            <Text type="secondary">Выберите диалог с директором</Text>
          </div>
        </Card>
      )}
    </div>
  );
};
