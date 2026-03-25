import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Modal,
  message,
  Tooltip,
  Badge,
  Form,
  Upload,
  Select,
  App
} from 'antd';
import { 
  PlusOutlined,
  SendOutlined,
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
  PushpinOutlined,
  UploadOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './DirectorChatsSection.module.css';

const { Text, Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { Option } = Select;

interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  type: 'general' | 'department' | 'project' | 'private';
  unread_count: number;
  is_muted: boolean;
  participants?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    online: boolean;
    last_seen?: string;
  }>;
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

export const DirectorChatsSection: React.FC = () => {
  const { modal } = App.useApp();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(false);
  
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  const [inviteUserModalVisible, setInviteUserModalVisible] = useState(false);
  
  const [createRoomForm] = Form.useForm();
  const [inviteUserForm] = Form.useForm();

  // Загрузка чатов
  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    setLoading(true);
    try {
      const { getChatRooms } = await import('@/features/director/api/directorApi');
      const rooms = await getChatRooms();
      
      // Убедимся, что это массив
      const roomsArray = Array.isArray(rooms) ? rooms : [];
      setChatRooms(roomsArray);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      message.error('Ошибка загрузки чатов');
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

  const isMobile = windowWidth < 768;

  const filteredRooms = (Array.isArray(chatRooms) ? chatRooms : []).filter(room =>
    (room.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRoom) return;
    
    try {
      // TODO: Implement API call
      message.success('Сообщение отправлено');
      setMessageText('');
    } catch (error) {
      message.error('Ошибка отправки сообщения');
    }
  };

  const handleCreateRoom = async () => {
    try {
      const values = await createRoomForm.validateFields();
      const { createChatRoom } = await import('@/features/director/api/directorApi');
      const newRoom = await createChatRoom({
        name: values.name,
        description: values.description,
        type: values.type,
      });
      message.success('Чат создан');
      setCreateRoomModalVisible(false);
      createRoomForm.resetFields();
      // Перезагружаем список чатов
      await loadChatRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      message.error('Ошибка создания чата');
    }
  };

  const handleInviteUser = async () => {
    try {
      const values = await inviteUserForm.validateFields();
      // TODO: Implement API call
      message.success('Пользователь приглашен');
      setInviteUserModalVisible(false);
      inviteUserForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (selectedRoom) {
      try {
        // TODO: Implement API call
        message.success('Файл загружен');
      } catch (error) {
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
      general: 'blue',
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
      private: 'Приватный',
    };
    return texts[type as keyof typeof texts] || 'Другой';
  };

  return (
    <div className={styles.chatContainer}>
      <Card 
        className={`${styles.chatListCard} ${isMobile && selectedRoom ? styles.chatListCardHidden : ''}`}
      >
        <div className={styles.chatListHeader}>
          <div className={styles.chatListHeaderRow}>
            <Title level={5} className={styles.chatListTitle}>
              {isMobile ? 'Чаты' : 'Внутренняя коммуникация'}
            </Title>
            <Button 
              type="primary" 
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateRoomModalVisible(true)}
            >
              {isMobile ? '' : 'Создать'}
            </Button>
          </div>
          
          <Search
            placeholder="Поиск чатов"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.chatListSearch}
          />
        </div>

        <div className={styles.chatListScroll}>
          <List
            dataSource={filteredRooms}
            loading={loading}
            locale={{ emptyText: 'Нет чатов' }}
            renderItem={(room) => (
              <List.Item
                className={`${styles.chatRoomItem} ${selectedRoom?.id === room.id ? styles.chatRoomItemActive : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={room.unread_count}>
                      <div className={`${styles.chatRoomAvatar} ${
                        room.type === 'general' ? styles.roomTypeGeneral :
                        room.type === 'department' ? styles.roomTypeDepartment :
                        room.type === 'project' ? styles.roomTypeProject :
                        room.type === 'private' ? styles.roomTypePrivate : ''
                      }`}>
                        <TeamOutlined />
                      </div>
                    </Badge>
                  }
                  title={
                    <div className={styles.chatRoomTitleRow}>
                      <span className={room.unread_count > 0 ? styles.chatRoomNameUnread : undefined}>
                        {room.name}
                      </span>
                      <div>
                        <Tag color={getRoomTypeColor(room.type)}>
                          {getRoomTypeText(room.type)}
                        </Tag>
                        {room.is_muted && <BellOutlined className={styles.chatRoomMutedIcon} />}
                      </div>
                    </div>
                  }
                  description={
                    <div>
                      {room.last_message && (
                        <div className={styles.chatRoomLastMessage}>
                          <span className={room.unread_count > 0 ? styles.chatRoomLastMessageUnread : undefined}>
                            {room.last_message.sender.first_name}: {room.last_message.text.length > 30 
                              ? `${room.last_message.text.substring(0, 30)}...` 
                              : room.last_message.text
                            }
                          </span>
                        </div>
                      )}
                      <div className={styles.chatRoomMeta}>
                        {room.participants?.length || 0} участников
                        {room.last_message && ` • ${dayjs(room.last_message.sent_at).format('HH:mm')}`}
                      </div>
                    </div>
                  }
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
                <Button 
                  size="small" 
                  onClick={() => setSelectedRoom(null)}
                  className={styles.chatBackButton}
                >
                  ←
                </Button>
              )}
              <div className={styles.chatHeaderTitleWrap}>
                <Title level={5} className={styles.chatHeaderTitle}>
                  {selectedRoom.name}
                </Title>
                <Text type="secondary" className={styles.chatHeaderSubtitle}>
                  {selectedRoom.participants?.filter(p => p.online).length || 0} онлайн из {selectedRoom.participants?.length || 0}
                </Text>
              </div>
            </div>
            
            <Space size={isMobile ? 4 : 8}>
              <Tooltip title="Участники">
                <Button 
                  size="small" 
                  icon={<TeamOutlined />}
                  onClick={() => setInviteUserModalVisible(true)}
                />
              </Tooltip>
              <Tooltip title="Настройки">
                <Button 
                  size="small" 
                  icon={<SettingOutlined />}
                />
              </Tooltip>
            </Space>
          </div>

          <div className={styles.chatParticipantsBar}>
            <div className={styles.chatParticipantsRow}>
              {selectedRoom.participants?.slice(0, isMobile ? 6 : 8).map(participant => (
                <Tooltip 
                  key={participant.id}
                  title={`${participant.first_name} ${participant.last_name} (${participant.role}) ${participant.online ? '• Онлайн' : `• Был(а) ${dayjs(participant.last_seen).fromNow()}`}`}
                >
                  <Badge 
                    dot 
                    status={participant.online ? 'success' : 'default'}
                    offset={[-2, 2]}
                  >
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
            {messages.map((msg: ChatMessage) => (
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
                      <Tag color="blue" className={styles.messageRoleTag}>
                        {msg.sender.role}
                      </Tag>
                    )}
                    <Text type="secondary" className={styles.messageTime}>
                      {dayjs(msg.sent_at).format('HH:mm')}
                    </Text>
                    {msg.is_pinned && (
                      <PushpinOutlined className={styles.messagePin} />
                    )}
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
                  <Upload
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                    multiple
                  >
                    <Button 
                      icon={<UploadOutlined />}
                      className={styles.chatUploadButton}
                    />
                  </Upload>
                )}
                
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={styles.chatMainCard}>
          <div className={styles.chatEmptyState}>
            <Text type="secondary">Выберите чат или создайте новый</Text>
          </div>
        </Card>
      )}

      <Modal
        title="Создать новый чат"
        open={createRoomModalVisible}
        onOk={handleCreateRoom}
        onCancel={() => {
          setCreateRoomModalVisible(false);
          createRoomForm.resetFields();
        }}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={createRoomForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название чата"
            rules={[{ required: true, message: 'Введите название чата' }]}
          >
            <Input placeholder="Например: Отдел маркетинга" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea placeholder="Для чего этот чат?" />
          </Form.Item>
          <Form.Item
            name="type"
            label="Тип чата"
            initialValue="general"
          >
            <Select>
              <Option value="general">Общий</Option>
              <Option value="department">Отдел</Option>
              <Option value="project">Проект</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Пригласить участника"
        open={inviteUserModalVisible}
        onOk={handleInviteUser}
        onCancel={() => {
          setInviteUserModalVisible(false);
          inviteUserForm.resetFields();
        }}
        okText="Пригласить"
        cancelText="Отмена"
      >
        <Form form={inviteUserForm} layout="vertical">
          <Form.Item
            name="userId"
            label="ID Пользователя"
            rules={[{ required: true, message: 'Введите ID пользователя' }]}
          >
            <Input type="number" placeholder="ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
