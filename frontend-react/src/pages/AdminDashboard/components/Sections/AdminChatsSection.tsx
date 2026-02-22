import React, { useState } from 'react';
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
  Avatar,
  Badge,
  Form,
  Select,
  Divider,
  Row,
  Col,
  Upload
} from 'antd';
import { 
  MessageOutlined,
  PlusOutlined,
  SendOutlined,
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
  PushpinOutlined,
  UploadOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './AdminChatsSection.module.css';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface ChatMessage {
  id: number;
  text: string;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    role: string;
    online: boolean;
  };
  sent_at: string;
  is_pinned: boolean;
  is_system: boolean;
}

interface ChatRoom {
  id: number;
  name: string;
  description: string;
  type: 'general' | 'department' | 'project' | 'private';
  participants: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    role: string;
    online: boolean;
    last_seen?: string;
  }[];
  created_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  last_message?: ChatMessage;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
}interface AdminChatsSectionProps {
  chatRooms?: ChatRoom[];
  currentUserId?: number;
  loading?: boolean;
  onSendMessage?: (roomId: number, message: string) => void;
  onCreateRoom?: (roomData: Partial<ChatRoom>) => void;
  onJoinRoom?: (roomId: number) => void;
  onLeaveRoom?: (roomId: number) => void;
  onInviteUser?: (roomId: number, userId: number) => void;
  onUploadFile?: (roomId: number, file: File) => void;
}

export const AdminChatsSection: React.FC<AdminChatsSectionProps> = ({
  chatRooms = [],
  currentUserId = 1,
  loading = false,
  onSendMessage,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onInviteUser,
  onUploadFile,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  const [inviteUserModalVisible, setInviteUserModalVisible] = useState(false);
  const [roomSettingsModalVisible, setRoomSettingsModalVisible] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  
  const [createRoomForm] = Form.useForm();
  const [inviteUserForm] = Form.useForm();
  const [editRoomForm] = Form.useForm();

  
  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  
  const chatRoomsData = chatRooms;

  
  const mockMessages: ChatMessage[] = selectedRoom ? [
    {
      id: 1,
      text: selectedRoom.id === 2 
        ? 'Добро пожаловать в чат с руководством. Здесь мы обсуждаем стратегические вопросы.'
        : 'Доброе утро, команда! Сегодня у нас много новых обращений',
      sender: {
        id: selectedRoom.id === 2 ? 100 : 1,
        username: selectedRoom.id === 2 ? 'director' : 'admin_chief',
        first_name: selectedRoom.id === 2 ? 'Владимир' : 'Анна',
        last_name: selectedRoom.id === 2 ? 'Директоров' : 'Главная',
        role: selectedRoom.id === 2 ? 'Директор' : 'Главный администратор',
        online: true,
      },
      sent_at: '2024-02-04T08:00:00Z',
      is_pinned: selectedRoom.id === 2,
      is_system: false,
    },
    {
      id: 2,
      text: selectedRoom.id === 2 
        ? 'Понял, Владимир Петрович. Подготовим отчет к завтрашнему совещанию.'
        : 'Принял в работу 5 обращений по техническим вопросам',
      sender: {
        id: selectedRoom.id === 2 ? 1 : 2,
        username: selectedRoom.id === 2 ? 'admin_chief' : 'admin_support',
        first_name: selectedRoom.id === 2 ? 'Анна' : 'Петр',
        last_name: selectedRoom.id === 2 ? 'Главная' : 'Поддержкин',
        role: selectedRoom.id === 2 ? 'Главный администратор' : 'Администратор поддержки',
        online: true,
      },
      sent_at: '2024-02-04T08:15:00Z',
      is_pinned: false,
      is_system: false,
    },  
    {
      id: 3,
      text: selectedRoom.id === 2 
        ? 'Подготовьте отчет по итогам недели к завтрашнему совещанию'
        : 'Всем привет! Сегодня обрабатываем претензии по приоритету',
      sender: {
        id: selectedRoom.id === 2 ? 100 : 1,
        username: selectedRoom.id === 2 ? 'director' : 'admin_chief',
        first_name: selectedRoom.id === 2 ? 'Владимир' : 'Анна',
        last_name: selectedRoom.id === 2 ? 'Директоров' : 'Главная',
        role: selectedRoom.id === 2 ? 'Директор' : 'Главный администратор',
        online: true,
      },
      sent_at: '2024-02-04T09:15:00Z',
      is_pinned: selectedRoom.id === 2,
      is_system: false,
    },
  ] : [];

  
  const filteredRooms = chatRoomsData.filter(room =>
    room.name.toLowerCase().includes(searchText.toLowerCase()) ||
    room.description.toLowerCase().includes(searchText.toLowerCase())
  );

  
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedRoom) return;
    
    onSendMessage?.(selectedRoom.id, messageText);
    setMessageText('');
    message.success('Сообщение отправлено');
  };

  const handleCreateRoom = async () => {
    try {
      const values = await createRoomForm.validateFields();
      onCreateRoom?.(values);
      setCreateRoomModalVisible(false);
      createRoomForm.resetFields();
      message.success(`Чат "${values.name}" создан`);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleInviteUser = async () => {
    try {
      const values = await inviteUserForm.validateFields();
      if (selectedRoom) {
        onInviteUser?.(selectedRoom.id, values.userId);
        setInviteUserModalVisible(false);
        inviteUserForm.resetFields();
        message.success('Пользователь приглашен в чат');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleFileUpload = (file: File) => {
    if (selectedRoom) {
      onUploadFile?.(selectedRoom.id, file);
      message.success('Файл загружен');
    }
    return false; 
  };

  const handleEditRoom = () => {
    if (selectedRoom) {
      editRoomForm.setFieldsValue({
        name: selectedRoom.name,
        description: selectedRoom.description,
        type: selectedRoom.type,
      });
      setIsEditingRoom(true);
    }
  };

  const handleSaveRoomChanges = async () => {
    try {
      const values = await editRoomForm.validateFields();
      
      
      
      
      if (selectedRoom) {
        const updatedRoom = { ...selectedRoom, ...values };
        setSelectedRoom(updatedRoom);
      }
      
      setIsEditingRoom(false);
      message.success('Настройки чата обновлены');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRoom(false);
    editRoomForm.resetFields();
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
      private: 'С директором',
    };
    return texts[type as keyof typeof texts] || 'Другой';
  };

  return (
    <div 
      className={styles.chatContainer}
    >
      <Card 
        className={[
          styles.chatListCard,
          isMobile && selectedRoom ? styles.chatListCardHidden : ''
        ].filter(Boolean).join(' ')}
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
            renderItem={(room) => (
              <List.Item
                className={[
                  styles.chatRoomItem,
                  selectedRoom?.id === room.id ? styles.chatRoomItemActive : ''
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedRoom(room)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={room.unread_count}>
                      <div className={[
                        styles.chatRoomAvatar,
                        room.type === 'general' ? styles.roomTypeGeneral : '',
                        room.type === 'department' ? styles.roomTypeDepartment : '',
                        room.type === 'project' ? styles.roomTypeProject : '',
                        room.type === 'private' ? styles.roomTypePrivate : ''
                      ].filter(Boolean).join(' ')}>
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
                        {room.participants.length} участников • 
                        {room.last_message && ` ${dayjs(room.last_message.sent_at).format('HH:mm')}`}
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
        <Card 
          className={styles.chatMainCard}
        >
          
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
                  {selectedRoom.participants.filter(p => p.online).length} онлайн из {selectedRoom.participants.length}
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
                  onClick={() => setRoomSettingsModalVisible(true)}
                />
              </Tooltip>
            </Space>
          </div>       
   
          <div className={styles.chatParticipantsBar}>
            <div className={styles.chatParticipantsRow}>
              {selectedRoom.participants.slice(0, isMobile ? 6 : 8).map(participant => (
                <Tooltip 
                  key={participant.id}
                  title={`${participant.first_name} ${participant.last_name} (${participant.role}) ${participant.online ? '• Онлайн' : `• Был(а) ${dayjs(participant.last_seen).fromNow()}`}`}
                >
                  <Badge 
                    dot 
                    status={participant.online ? 'success' : 'default'}
                    offset={[-2, 2]}
                  >
                    <div className={[
                      styles.participantAvatar,
                      participant.online ? styles.participantOnline : styles.participantOffline
                    ].filter(Boolean).join(' ')}>
                      {participant.first_name[0]}{participant.last_name[0]}
                    </div>
                  </Badge>
                </Tooltip>
              ))}
              {selectedRoom.participants.length > (isMobile ? 6 : 8) && (
                <div className={styles.participantMore}>
                  +{selectedRoom.participants.length - (isMobile ? 6 : 8)}
                </div>
              )}
            </div>
          </div>

          <div className={styles.chatMessagesArea}>
            {mockMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={styles.messageRow}
              >
                <div className={[
                  styles.messageAvatar,
                  msg.is_system ? styles.messageAvatarSystem : styles.messageAvatarUser
                ].filter(Boolean).join(' ')}>
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
                
                  <div className={[
                    styles.messageBubble,
                    msg.is_system ? styles.messageBubbleSystem : '',
                    msg.is_pinned ? styles.messageBubblePinned : ''
                  ].filter(Boolean).join(' ')}>
                    <Text className={[
                      styles.messageText,
                      msg.is_system ? styles.messageTextSystem : ''
                    ].filter(Boolean).join(' ')}>
                      {msg.text}
                    </Text>
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
                  disabled={!messageText.trim()}
                  className={styles.chatSendButton}
                >
                </Button>
              </div>
            </div>
            
            {!isMobile && (
              <div className={styles.chatComposerHint}>
                Enter - отправить, Shift+Enter - новая строка
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className={styles.chatEmptyCard}>
          <div className={styles.chatEmptyState}>
            <MessageOutlined className={styles.chatEmptyIcon} />
            <Title level={4} type="secondary">
              Выберите чат для начала общения
            </Title>
            <Text type="secondary">
              Выберите чат из списка слева или создайте новый
            </Text>
          </div>
        </Card>
      )}     
      
      <Modal
        title="Создать новый чат"
        open={createRoomModalVisible}
        onOk={handleCreateRoom}
        onCancel={() => setCreateRoomModalVisible(false)}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={createRoomForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название чата"
            rules={[{ required: true, message: 'Введите название чата' }]}
          >
            <Input placeholder="Например: Техническая поддержка" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea 
              rows={3} 
              placeholder="Краткое описание назначения чата"
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип чата"
            rules={[{ required: true, message: 'Выберите тип чата' }]}
          >
            <Select placeholder="Выберите тип чата">
              <Option value="general">Общий чат администраторов</Option>
              <Option value="private">Чат с директором</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Пригласить пользователя"
        open={inviteUserModalVisible}
        onOk={handleInviteUser}
        onCancel={() => setInviteUserModalVisible(false)}
        okText="Пригласить"
        cancelText="Отмена"
      >
        <Form form={inviteUserForm} layout="vertical">
          <Form.Item
            name="userId"
            label="Пользователь"
            rules={[{ required: true, message: 'Выберите пользователя' }]}
          >
            <Select 
              placeholder="Выберите пользователя для приглашения"
              showSearch
            >
              <Option value={7}>Иван Модератор (Модератор)</Option>
              <Option value={8}>Елена Аналитик (Аналитик)</Option>
              <Option value={9}>Дмитрий Разработчик (Разработчик)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>      
      <Modal
        title={isEditingRoom ? "Редактировать чат" : "Настройки чата"}
        open={roomSettingsModalVisible}
        onCancel={() => {
          setRoomSettingsModalVisible(false);
          setIsEditingRoom(false);
          editRoomForm.resetFields();
        }}
        footer={[
          isEditingRoom ? (
            <>
              <Button key="cancel" onClick={handleCancelEdit}>
                Отмена
              </Button>
              <Button key="save" type="primary" onClick={handleSaveRoomChanges}>
                Сохранить
              </Button>
            </>
          ) : (
            <>
              <Button key="edit" type="primary" icon={<EditOutlined />} onClick={handleEditRoom}>
                Редактировать
              </Button>
              <Button key="close" onClick={() => setRoomSettingsModalVisible(false)}>
                Закрыть
              </Button>
            </>
          )
        ]}
        width={600}
      >
        {selectedRoom && (
          <div>
            {isEditingRoom ? (

              <Form form={editRoomForm} layout="vertical">
                <Title level={5}>Редактирование чата</Title>
                
                <Form.Item
                  name="name"
                  label="Название чата"
                  rules={[{ required: true, message: 'Введите название чата' }]}
                >
                  <Input placeholder="Название чата" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Описание"
                >
                  <TextArea 
                    rows={3} 
                    placeholder="Описание чата"
                  />
                </Form.Item>

                <Form.Item
                  name="type"
                  label="Тип чата"
                  rules={[{ required: true, message: 'Выберите тип чата' }]}
                >
                  <Select placeholder="Выберите тип чата">
                    <Option value="general">Общий</Option>
                    <Option value="private">Личный</Option>
                  </Select>
                </Form.Item>

                <div className={styles.roomCreatedInfo}>
                  <Text strong>Создан:</Text> {dayjs(selectedRoom.created_at).format('DD.MM.YYYY HH:mm')} 
                  пользователем {selectedRoom.created_by.first_name} {selectedRoom.created_by.last_name}
                </div>
              </Form>
            ) : (
              
              <div>
                <Title level={5}>Информация о чате</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>Название:</Text> {selectedRoom.name}
                  </Col>
                  <Col span={12}>
                    <Text strong>Тип:</Text> {getRoomTypeText(selectedRoom.type)}
                  </Col>
                </Row>
                <div className={styles.roomInfoBlock}>
                  <Text strong>Описание:</Text> {selectedRoom.description}
                </div>
                <div className={styles.roomInfoBlock}>
                  <Text strong>Создан:</Text> {dayjs(selectedRoom.created_at).format('DD.MM.YYYY HH:mm')} 
                  пользователем {selectedRoom.created_by.first_name} {selectedRoom.created_by.last_name}
                </div>
              </div>
            )}

            <Divider />

            <Title level={5}>Участники ({selectedRoom.participants.length})</Title>
            <List
              dataSource={selectedRoom.participants}
              renderItem={(participant) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        dot 
                        status={participant.online ? 'success' : 'default'}
                      >
                        <Avatar>
                          {participant.first_name[0]}{participant.last_name[0]}
                        </Avatar>
                      </Badge>
                    }
                    title={`${participant.first_name} ${participant.last_name}`}
                    description={
                      <div>
                        <Tag>{participant.role}</Tag>
                        <Text type="secondary" className={styles.participantStatusText}>
                          {participant.online ? 'Онлайн' : `Был(а) ${dayjs(participant.last_seen).fromNow()}`}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
