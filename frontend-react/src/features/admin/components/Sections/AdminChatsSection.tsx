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
  Select
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
import styles from './AdminChatsSection.module.css';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useChatRooms, useChatMessages, useChatActions } from '@/features/admin/hooks/useAdminChats';
import { ChatRoom, ChatMessage } from '@/features/admin/types/admin';

const { Text, Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { Option } = Select;

export const AdminChatsSection: React.FC = () => {
  const { user } = useAdminAuth();
  
  const { chatRooms, loading: roomsLoading, refetch: refetchRooms } = useChatRooms(true);
  const { 
    sendMessage, 
    createRoom, 
    inviteUser, 
    uploadFile 
  } = useChatActions();

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const { messages, loading: messagesLoading } = useChatMessages(selectedRoom?.id || null);

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

  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  
  const chatRoomsData = (chatRooms as any[]) || [];

  
  const filteredRooms = chatRoomsData.filter(room =>
    (room.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRoom) return;
    
    try {
      await sendMessage({ roomId: selectedRoom.id, message: messageText });
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const values = await createRoomForm.validateFields();
      await createRoom(values);
      setCreateRoomModalVisible(false);
      createRoomForm.resetFields();
      refetchRooms();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleInviteUser = async () => {
    try {
      const values = await inviteUserForm.validateFields();
      if (selectedRoom) {
        await inviteUser({ roomId: selectedRoom.id, userId: values.userId });
        setInviteUserModalVisible(false);
        inviteUserForm.resetFields();
        refetchRooms();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (selectedRoom) {
      try {
        await uploadFile({ roomId: selectedRoom.id, file });
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
    return false; 
  };

  const handleReportMessage = (messageId: number, messageSender: string) => {
    Modal.confirm({
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
            loading={roomsLoading}
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
                        {room.participants?.length || 0} участников • 
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
                  onClick={() => setRoomSettingsModalVisible(true)}
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
                    <div className={[
                      styles.participantAvatar,
                      participant.online ? styles.participantOnline : styles.participantOffline
                    ].filter(Boolean).join(' ')}>
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
            {messages.length === 0 && !messagesLoading && (
               <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                 Сообщений пока нет
               </div>
            )}
            {messages.map((msg: ChatMessage) => (
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
                
                  <div className={styles.messageBubbleWrapper}>
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
        <div className={styles.chatEmptyState}>
          <Text type="secondary">Выберите чат или создайте новый</Text>
        </div>
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
