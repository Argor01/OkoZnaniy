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
  
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  const [inviteUserModalVisible, setInviteUserModalVisible] = useState(false);
  const [roomSettingsModalVisible, setRoomSettingsModalVisible] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  
  const [createRoomForm] = Form.useForm();
  const [inviteUserForm] = Form.useForm();
  const [editRoomForm] = Form.useForm();

  // Мок данные для демонстрации
  const mockChatRooms: ChatRoom[] = [
    {
      id: 1,
      name: 'Общий чат администраторов',
      description: 'Основной канал для координации работы административной команды',
      type: 'general',
      participants: [
        {
          id: 1,
          username: 'admin_chief',
          first_name: 'Анна',
          last_name: 'Главная',
          role: 'Главный администратор',
          online: true,
        },
        {
          id: 2,
          username: 'admin_support',
          first_name: 'Петр',
          last_name: 'Поддержкин',
          role: 'Администратор поддержки',
          online: true,
        },
        {
          id: 3,
          username: 'admin_finance',
          first_name: 'Мария',
          last_name: 'Финансова',
          role: 'Финансовый администратор',
          online: false,
          last_seen: '2024-02-04T08:30:00Z',
        },
      ],
      created_by: {
        id: 1,
        username: 'admin_chief',
        first_name: 'Анна',
        last_name: 'Главная',
      },
      created_at: '2024-01-15T10:00:00Z',
      last_message: {
        id: 101,
        text: 'Всем привет! Сегодня обрабатываем претензии по приоритету',
        sender: {
          id: 1,
          username: 'admin_chief',
          first_name: 'Анна',
          last_name: 'Главная',
          role: 'Главный администратор',
          online: true,
        },
        sent_at: '2024-02-04T09:15:00Z',
        is_pinned: false,
        is_system: false,
      },
      unread_count: 2,
      is_muted: false,
      is_archived: false,
    },
    {
      id: 2,
      name: 'Чат с директором',
      description: 'Прямая связь с руководством компании',
      type: 'private',
      participants: [
        {
          id: 100,
          username: 'director',
          first_name: 'Владимир',
          last_name: 'Директоров',
          role: 'Директор',
          online: true,
        },
        {
          id: 1,
          username: 'admin_chief',
          first_name: 'Анна',
          last_name: 'Главная',
          role: 'Главный администратор',
          online: true,
        },
        {
          id: 2,
          username: 'admin_support',
          first_name: 'Петр',
          last_name: 'Поддержкин',
          role: 'Администратор поддержки',
          online: true,
        },
      ],
      created_by: {
        id: 100,
        username: 'director',
        first_name: 'Владимир',
        last_name: 'Директоров',
      },
      created_at: '2024-01-10T09:00:00Z',
      last_message: {
        id: 201,
        text: 'Подготовьте отчет по итогам недели к завтрашнему совещанию',
        sender: {
          id: 100,
          username: 'director',
          first_name: 'Владимир',
          last_name: 'Директоров',
          role: 'Директор',
          online: true,
        },
        sent_at: '2024-02-04T16:30:00Z',
        is_pinned: true,
        is_system: false,
      },
      unread_count: 1,
      is_muted: false,
      is_archived: false,
    },
    {
      id: 3,
      name: 'Техническая поддержка',
      description: 'Координация работы службы технической поддержки',
      type: 'department',
      participants: [
        {
          id: 2,
          username: 'admin_support',
          first_name: 'Петр',
          last_name: 'Поддержкин',
          role: 'Администратор поддержки',
          online: true,
        },
        {
          id: 4,
          username: 'support_lead',
          first_name: 'Елена',
          last_name: 'Решательная',
          role: 'Ведущий специалист поддержки',
          online: true,
        },
      ],
      created_by: {
        id: 2,
        username: 'admin_support',
        first_name: 'Петр',
        last_name: 'Поддержкин',
      },
      created_at: '2024-01-20T14:30:00Z',
      last_message: {
        id: 301,
        text: 'Обновил базу знаний по новым типам обращений',
        sender: {
          id: 4,
          username: 'support_lead',
          first_name: 'Елена',
          last_name: 'Решательная',
          role: 'Ведущий специалист поддержки',
          online: true,
        },
        sent_at: '2024-02-04T08:45:00Z',
        is_pinned: false,
        is_system: false,
      },
      unread_count: 0,
      is_muted: false,
      is_archived: false,
    },
  ];

  const chatRoomsData = chatRooms.length > 0 ? chatRooms : mockChatRooms;

  // Мок сообщения для выбранной комнаты
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

  // Фильтрация комнат
  const filteredRooms = chatRoomsData.filter(room =>
    room.name.toLowerCase().includes(searchText.toLowerCase()) ||
    room.description.toLowerCase().includes(searchText.toLowerCase())
  );

  // Обработчики
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
    return false; // Предотвращаем автоматическую загрузку
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
      // Здесь будет вызов API для обновления чата
      console.log('Updating room:', selectedRoom?.id, values);
      
      // Обновляем локальное состояние (в реальном приложении это будет через API)
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
 // Функции для отображения
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
    <div style={{ height: '80vh', display: 'flex' }}>
      {/* Левая панель - список чатов */}
      <Card 
        style={{ width: 350, marginRight: 16, height: '100%' }}
        styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Title level={5} style={{ margin: 0 }}>Внутренняя коммуникация</Title>
            <Button 
              type="primary" 
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateRoomModalVisible(true)}
            >
              Создать
            </Button>
          </div>
          
          <Search
            placeholder="Поиск чатов"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <List
            dataSource={filteredRooms}
            renderItem={(room) => (
              <List.Item
                style={{ 
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: selectedRoom?.id === room.id ? '#f0f8ff' : 'transparent',
                  borderLeft: selectedRoom?.id === room.id ? '3px solid #1890ff' : '3px solid transparent'
                }}
                onClick={() => setSelectedRoom(room)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={room.unread_count}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        backgroundColor: getRoomTypeColor(room.type),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <TeamOutlined />
                      </div>
                    </Badge>
                  }   
               title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: room.unread_count > 0 ? 'bold' : 'normal' }}>
                        {room.name}
                      </span>
                      <div>
                        <Tag color={getRoomTypeColor(room.type)}>
                          {getRoomTypeText(room.type)}
                        </Tag>
                        {room.is_muted && <BellOutlined style={{ color: '#ccc', marginLeft: 4 }} />}
                      </div>
                    </div>
                  }
                  description={
                    <div>
                      {room.last_message && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <span style={{ fontWeight: room.unread_count > 0 ? 'bold' : 'normal' }}>
                            {room.last_message.sender.first_name}: {room.last_message.text.length > 30 
                              ? `${room.last_message.text.substring(0, 30)}...` 
                              : room.last_message.text
                            }
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#999', marginTop: 2 }}>
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

      {/* Правая панель - чат */}
      {selectedRoom ? (
        <Card 
          style={{ flex: 1, height: '100%' }}
          styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
        >
          {/* Заголовок чата */}
          <div style={{ 
            padding: 16, 
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {selectedRoom.name}
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {selectedRoom.participants.filter(p => p.online).length} онлайн из {selectedRoom.participants.length}
              </Text>
            </div>
            
            <Space>
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
   {/* Список участников */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedRoom.participants.slice(0, 8).map(participant => (
                <Tooltip 
                  key={participant.id}
                  title={`${participant.first_name} ${participant.last_name} (${participant.role}) ${participant.online ? '• Онлайн' : `• Был(а) ${dayjs(participant.last_seen).fromNow()}`}`}
                >
                  <Badge 
                    dot 
                    status={participant.online ? 'success' : 'default'}
                    offset={[-2, 2]}
                  >
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      backgroundColor: participant.online ? '#52c41a' : '#d9d9d9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}>
                      {participant.first_name[0]}{participant.last_name[0]}
                    </div>
                  </Badge>
                </Tooltip>
              ))}
              {selectedRoom.participants.length > 8 && (
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  +{selectedRoom.participants.length - 8}
                </div>
              )}
            </div>
          </div>

          {/* Область сообщений */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: 16,
            backgroundColor: '#fafafa'
          }}>
            {mockMessages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}
              >
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: msg.is_system ? '#666' : '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {msg.is_system ? 'S' : `${msg.sender.first_name[0]}${msg.sender.last_name[0]}`}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Информация об отправителе */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    marginBottom: 4 
                  }}>
                    <Text strong style={{ fontSize: '13px' }}>
                      {msg.sender.first_name} {msg.sender.last_name}
                    </Text>
                    <Tag color="blue">
                      {msg.sender.role}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {dayjs(msg.sent_at).format('HH:mm')}
                    </Text>
                    {msg.is_pinned && (
                      <PushpinOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                    )}
                  </div>  
                {/* Текст сообщения */}
                  <div style={{ 
                    backgroundColor: msg.is_system ? '#f6f6f6' : 'white',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: msg.is_pinned ? '1px solid #faad14' : '1px solid #f0f0f0',
                    position: 'relative'
                  }}>
                    <Text style={{ 
                      fontSize: '14px',
                      fontStyle: msg.is_system ? 'italic' : 'normal',
                      color: msg.is_system ? '#666' : 'inherit'
                    }}>
                      {msg.text}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Поле ввода сообщения */}
          <div style={{ 
            padding: 16, 
            borderTop: '1px solid #f0f0f0',
            backgroundColor: 'white'
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    fontSize: 15,
                    padding: '10px 14px',
                    resize: 'none'
                  }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <Upload
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  multiple
                >
                  <Button 
                    icon={<UploadOutlined />}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </Upload>
                
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                  }}
                >
                </Button>
              </div>
            </div>
            
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              marginTop: 8,
              textAlign: 'center'
            }}>
              Enter - отправить, Shift+Enter - новая строка
            </div>
          </div>
        </Card>
      ) : (
        <Card style={{ flex: 1, height: '100%' }}>
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#999'
          }}>
            <MessageOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Title level={4} type="secondary">
              Выберите чат для начала общения
            </Title>
            <Text type="secondary">
              Выберите чат из списка слева или создайте новый
            </Text>
          </div>
        </Card>
      )}     
 {/* Модальные окна */}
      
      {/* Создание нового чата */}
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
              <Option value="department">Департаментский чат</Option>
              <Option value="project">Проектный чат</Option>
              <Option value="private">Чат с директором</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Приглашение пользователя */}
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
{/* Настройки чата */}
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
              // Режим редактирования
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
                    <Option value="department">Отдел</Option>
                    <Option value="project">Проект</Option>
                    <Option value="private">Личный</Option>
                  </Select>
                </Form.Item>

                <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6f6f6', borderRadius: 6 }}>
                  <Text strong>Создан:</Text> {dayjs(selectedRoom.created_at).format('DD.MM.YYYY HH:mm')} 
                  пользователем {selectedRoom.created_by.first_name} {selectedRoom.created_by.last_name}
                </div>
              </Form>
            ) : (
              // Режим просмотра
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
                <div style={{ marginTop: 8 }}>
                  <Text strong>Описание:</Text> {selectedRoom.description}
                </div>
                <div style={{ marginTop: 8 }}>
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
                        <Text type="secondary" style={{ fontSize: '11px', marginLeft: 8 }}>
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