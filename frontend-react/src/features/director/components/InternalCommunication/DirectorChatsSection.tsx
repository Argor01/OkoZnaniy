import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Button, Input, Empty, Badge,
  Modal, Form, Select, message, Tooltip,
  Form as AntForm, App
} from 'antd';
import {
  PlusOutlined, SendOutlined, TeamOutlined,
  SettingOutlined, PushpinOutlined,
  LogoutOutlined, MessageOutlined, SearchOutlined,
  UsergroupAddOutlined, PaperClipOutlined,
  FileOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './DirectorChatsSection.module.css';
import { logger } from '@/utils/logger';
import { authApi } from '@/features/auth/api/auth';
import { createChatRoom, getChatRoomMessages, getChatRooms, sendChatRoomMessage, inviteToChatRoom, updateChatRoom, getDirectorUsers, leaveChatRoom, markChatRoomAsRead } from '@/features/director/api/directorApi';

const { Option } = Select;

interface ChatRoom {
  id: number;
  name: string;
  type: 'general' | 'department' | 'project';
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
    sender: { first_name: string; last_name: string };
    sent_at: string;
  };
}

interface ChatMessage {
  id: number;
  text: string;
  sender: { id: number; first_name: string; last_name: string; role: string };
  sent_at: string;
  is_system: boolean;
  is_pinned: boolean;
}

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }
  catch { return ''; }
};

const getSenderName = (sender: any) => {
  if (sender?.first_name || sender?.last_name) {
    return `${sender.first_name ?? ''} ${sender.last_name ?? ''}`.trim();
  }
  if (sender?.name) return sender.name;
  if (sender?.username) return sender.username;
  if (sender?.email) return sender.email.split('@')[0];
  return 'Аноним';
};

const getSenderInitials = (sender: any) => {
  if (sender?.first_name || sender?.last_name) {
    const a = (sender.first_name || '').trim()[0] || '';
    const b = (sender.last_name || '').trim()[0] || '';
    return (a + b).toUpperCase() || '?';
  }
  if (sender?.email) {
    const local = sender.email.split('@')[0];
    const parts = local.replace(/[._-]/g, ' ').split(' ');
    const a = (parts[0] || '').trim()[0] || '';
    const b = (parts[1] || '').trim()[0] || '';
    return (a + b).toUpperCase() || local.substring(0, 2).toUpperCase();
  }
  const name = sender?.name || sender?.username || '';
  const parts = name.split(' ');
  const a = (parts[0] || '').trim()[0] || '';
  const b = (parts[1] || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
};

const getAvatarClass = (role: string) => {
  switch (role) {
    case 'admin': return styles.messageAvatarAdmin;
    case 'director': return styles.messageAvatarDirector;
    case 'expert': return styles.messageAvatarExpert;
    default: return styles.messageAvatarDirector;
  }
};

const ROOM_TYPE_LABELS: Record<string, string> = { general: 'Общий', department: 'Отдел', project: 'Проект', private: 'Приватный' };
const getRoomTypeTag = (type?: string) => {
  if (!type || type === 'general') return null;
  const cls = styles[`chatListType${type.charAt(0).toUpperCase() + type.slice(1)}`] || styles.chatListTypeDefault;
  return <span className={`${styles.chatListTypeTag} ${cls}`}>{ROOM_TYPE_LABELS[type] || type}</span>;
};

const DateDivider: React.FC<{ date: string }> = ({ date }) => (
  <div className={styles.dateDivider}>
    <span className={styles.dateDividerText}>{date}</span>
  </div>
);

const MsgList: React.FC<{
  msgs: any[];
  uid: number;
  roomId: number;
  onPin: (msgId: number) => void;
}> = ({ msgs, uid, roomId, onPin }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinIndexRef = useRef(0);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const pinnedMsgs = useMemo(() => msgs.filter(m => m.is_pinned && !m.is_system), [msgs]);

  const scrollToNextPin = useCallback(() => {
    if (!pinnedMsgs.length) return;
    const el = containerRef.current;
    if (!el) return;
    const idx = pinIndexRef.current % pinnedMsgs.length;
    const msgId = pinnedMsgs[idx].id;
    const target = el.querySelector(`[data-msg-id="${msgId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add(styles.messageHighlight);
      setTimeout(() => target.classList.remove(styles.messageHighlight), 2000);
    }
    pinIndexRef.current = (idx + 1) % pinnedMsgs.length;
  }, [pinnedMsgs]);

  const grouped = useMemo(() => {
    const groups: { date: string; items: any[] }[] = [];
    let lastDate = '';
    for (const m of msgs) {
      const dateStr = fmtDate(m.sent_at || m.created_at || '');
      if (dateStr !== lastDate) {
        groups.push({ date: dateStr, items: [] });
        lastDate = dateStr;
      }
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [msgs]);

  if (!msgs.length) {
    return (
      <div className={styles.emptyState}>
        <MessageOutlined className={styles.emptyStateIcon} />
        <div className={styles.emptyStateText}>Нет сообщений</div>
        <div className={styles.emptyStateHint}>Напишите первое сообщение</div>
      </div>
    );
  }

  return (
    <div className={styles.messagesContainer}>
      {pinnedMsgs.length > 0 && (
        <button className={styles.pinnedFab} onClick={scrollToNextPin}>
          <PushpinOutlined />
          <span>{pinnedMsgs.length}</span>
        </button>
      )}
      <div ref={containerRef} className={styles.messagesArea}>
      {grouped.map((group, gi) => (
        <React.Fragment key={gi}>
          <DateDivider date={group.date} />
          {group.items.map((msg: any) => {
            if (msg.is_system) {
              return (
                <div key={msg.id} className={styles.systemMessage}>
                  {msg.message || msg.text}
                </div>
              );
            }
            const mine = msg.sender?.id === uid;
            const name = getSenderName(msg.sender);
            return (
              <div key={msg.id} data-msg-id={msg.id} className={`${styles.messageRow} ${mine ? styles.messageMine : styles.messageTheirs}`}>
                <div className={`${styles.messageAvatar} ${msg.is_system ? styles.messageAvatarSystem : getAvatarClass(msg.sender?.role)}`}>
                  {msg.is_system ? 'S' : getSenderInitials(msg.sender)}
                </div>
                <div className={styles.messageContent}>
                  {msg.is_pinned && (
                    <div className={styles.messagePinnedBadge}>
                      <PushpinOutlined /> Закреплено
                    </div>
                  )}
                  <div className={`${styles.messageBubble} ${msg.is_system ? styles.messageBubbleSystem : ''} ${msg.is_pinned ? styles.messageBubblePinned : ''}`}>
                    {msg.file_url ? (
                      <div className={styles.messageFile}>
                        <FileOutlined className={styles.messageFileIcon} />
                        <div className={styles.messageFileInfo}>
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={styles.messageFileName}>
                            {msg.file_name || 'Файл'}
                          </a>
                        </div>
                        <a href={msg.file_url} download className={styles.messageFileDownload}>
                          <DownloadOutlined />
                        </a>
                      </div>
                    ) : null}
                    {msg.text && <div>{msg.text}</div>}
                  </div>
                  <div className={styles.messageMeta}>
                    {!mine && !msg.is_system && <span className={styles.messageSender}>{name}</span>}
                    <span className={styles.messageTime}>{fmt(msg.sent_at || msg.created_at || '')}</span>
                    {!msg.is_system && (
                      <Tooltip title={msg.is_pinned ? 'Открепить' : 'Закрепить'}>
                        <Button
                          type="text"
                          size="small"
                          icon={<PushpinOutlined />}
                          className={styles.messagePinBtn}
                          onClick={() => onPin(msg.id)}
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <div ref={endRef} />
      </div>
    </div>
  );
};

const Composer: React.FC<{
  onSend: (t: string) => Promise<void>;
  onFileUpload: (file: File, message?: string) => Promise<void>;
}> = ({ onSend, onFileUpload }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await onSend(text.trim()); setText(''); } finally { setBusy(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onFileUpload(file, text.trim() || undefined);
      setText('');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles.composerRow}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Tooltip title="Прикрепить файл">
          <Button
            size="small"
            icon={<PaperClipOutlined />}
            className={styles.composerAttachBtn}
            onClick={() => fileInputRef.current?.click()}
          />
        </Tooltip>
        <div className={styles.composerInput}>
          <Input.TextArea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Написать... (Enter)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
        </div>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          loading={busy}
          disabled={!text.trim()}
          className={styles.composerBtn}
        />
      </div>
    </div>
  );
};

export const DirectorChatsSection: React.FC = () => {
  const { modal } = App.useApp();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  const [inviteUserModalVisible, setInviteUserModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [leavingChat, setLeavingChat] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [createRoomForm] = AntForm.useForm();
  const [inviteUserForm] = AntForm.useForm();
  const [settingsForm] = AntForm.useForm();

  const mountedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const rooms = await getChatRooms();
        setChatRooms(Array.isArray(rooms) ? rooms : []);
      } catch (error) {
        logger.error('Error loading chat rooms:', error);
        message.error('Ошибка загрузки чатов');
      }
      try {
        const u = await authApi.getCurrentUser();
        setCurrentUserId(u.id);
      } catch {}
      mountedRef.current = true;
    })();
  }, []);

  const loadChatRooms = async () => {
    try {
      const rooms = await getChatRooms();
      setChatRooms(Array.isArray(rooms) ? rooms : []);
    } catch (error) {
      logger.error('Error loading chat rooms:', error);
      message.error('Ошибка загрузки чатов');
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const filteredRooms = (Array.isArray(chatRooms) ? chatRooms : []).filter(room =>
    (room.name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedRoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedRoom && selectedRoom.id !== selectedRoomRef.current) {
      selectedRoomRef.current = selectedRoom.id;
      loadMessages(selectedRoom.id);
    }
    if (!selectedRoom) {
      selectedRoomRef.current = null;
      setMessages([]);
    }
  }, [selectedRoom]);

  const loadMessages = async (roomId: number) => {
    try {
      const msgs = await getChatRoomMessages(roomId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (error) {
      logger.error('Error loading messages:', error);
      message.error('Ошибка загрузки сообщений');
      setMessages([]);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const msgText = text || messageText.trim();
    if (!msgText || !selectedRoom) return;
    if (!text) setMessageText('');
    try {
      const sent = await sendChatRoomMessage(selectedRoom.id, msgText);
      if (sent && typeof sent === 'object' && sent.id) {
        setMessages(prev => [...prev, sent]);
      } else {
        await loadMessages(selectedRoom.id);
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      message.error('Ошибка отправки сообщения');
      if (!text) setMessageText(msgText);
    }
  };

  const handleFileUpload = async (file: File, msgText?: string) => {
    if (!selectedRoom) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (msgText) fd.append('message', msgText);
      const { default: apiClient } = await import('@/api/client');
      const sent = await apiClient.post(`/director/chat-rooms/${selectedRoom.id}/upload_file/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
      if (sent && typeof sent === 'object' && sent.id) {
        setMessages(prev => [...prev, sent]);
      } else {
        await loadMessages(selectedRoom.id);
      }
    } catch (error) {
      logger.error('Error uploading file:', error);
      message.error('Ошибка загрузки файла');
    }
  };

  const handlePinMessage = async (msgId: number) => {
    if (!selectedRoom) return;
    try {
      const { default: apiClient } = await import('@/api/client');
      await apiClient.post(`/director/chat-rooms/${selectedRoom.id}/pin_message/`, { message_id: msgId });
      await loadMessages(selectedRoom.id);
    } catch (error) {
      logger.error('Error pinning message:', error);
      message.error('Ошибка закрепления');
    }
  };

  const handleCreateRoom = async () => {
    try {
      const values = await createRoomForm.validateFields();
      await createChatRoom({ name: values.name, type: values.type });
      message.success('Чат создан');
      setCreateRoomModalVisible(false);
      createRoomForm.resetFields();
      await loadChatRooms();
    } catch (error) {
      logger.error('Error creating chat room:', error);
      message.error('Ошибка создания чата');
    }
  };

  const handleInviteUser = async () => {
    try {
      const values = await inviteUserForm.validateFields();
      if (!selectedRoom) return;
      setInviteLoading(true);
      await inviteToChatRoom(selectedRoom.id, values.userId);
      message.success('Пользователь приглашён');
      setInviteUserModalVisible(false);
      inviteUserForm.resetFields();
      await loadChatRooms();
    } catch (error) {
      logger.error('Error inviting user:', error);
      message.error('Ошибка при приглашении');
    } finally {
      setInviteLoading(false);
    }
  };

  const loadUsersForInvite = async () => {
    try {
      const users = await getDirectorUsers();
      setAllUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      logger.error('Error loading users:', error);
    }
  };

  const handleOpenInvite = () => {
    setInviteUserModalVisible(true);
    loadUsersForInvite();
  };

  const handleOpenSettings = () => {
    if (selectedRoom) {
      settingsForm.setFieldsValue({ name: selectedRoom.name });
    }
    setSettingsModalVisible(true);
  };

  const handleSaveSettings = async () => {
    try {
      const values = await settingsForm.validateFields();
      if (!selectedRoom) return;
      await updateChatRoom(selectedRoom.id, values);
      message.success('Настройки сохранены');
      setSettingsModalVisible(false);
      await loadChatRooms();
      setSelectedRoom(prev => prev ? { ...prev, ...values } : null);
    } catch (error) {
      logger.error('Error updating chat room:', error);
      message.error('Ошибка сохранения');
    }
  };

  const handleLeaveChat = () => {
    if (!selectedRoom) return;
    modal.confirm({
      title: 'Покинуть чат',
      content: `Вы уверены, что хотите покинуть чат «${selectedRoom.name}»?`,
      okText: 'Покинуть',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLeavingChat(true);
        try {
          await leaveChatRoom(selectedRoom.id);
          message.success('Вы покинули чат');
          setSelectedRoom(null);
          await loadChatRooms();
        } catch (error) {
          logger.error('Error leaving chat room:', error);
          message.error('Ошибка при выходе из чата');
        } finally {
          setLeavingChat(false);
        }
      },
    });
  };

  const showList = !isMobile || !selectedRoom;
  const showChat = !isMobile || !!selectedRoom;

  const listPanel = (
    <div className={styles.listPanel}>
      <div className={styles.listHeader}>
        <Input
          prefix={<span style={{ color: 'var(--color-text-tertiary, #94a3b8)' }}>🔍</span>}
          placeholder="Поиск чатов"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ borderRadius: 8 }}
        />
      </div>

      <div className={styles.listScroll}>
        {!filteredRooms.length ? (
          <Empty description="Нет чатов" style={{ padding: 32 }} />
        ) : (
          filteredRooms.map((room) => {
            const lastMsg = room.last_message;
            const unread = room.unread_count || 0;
            return (
              <div
                key={room.id}
                className={`${styles.chatListItem} ${selectedRoom?.id === room.id ? styles.chatListItemActive : ''} ${unread > 0 ? styles.chatListItemUnread : ''}`}
                onClick={() => {
                  setSelectedRoom(room);
                  if (unread > 0) {
                    markChatRoomAsRead(room.id);
                    setChatRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread_count: 0 } : r));
                  }
                }}
              >
                <div className={styles.chatListAvatar}>
                  <TeamOutlined />
                </div>
                <div className={styles.chatListInfo}>
                  <div className={styles.chatListNameRow}>
                    <span className={`${styles.chatListName} ${unread > 0 ? styles.chatListNameUnread : ''}`}>
                      {room.name}
                    </span>
                    {getRoomTypeTag(room.type)}
                  </div>
                  <div className={styles.chatListPreview}>
                    {lastMsg ? (lastMsg.sender.first_name ? `${lastMsg.sender.first_name}: ` : '') + (lastMsg.text.length > 30 ? `${lastMsg.text.substring(0, 30)}...` : lastMsg.text) : `${room.participants?.length || 0} участников`}
                  </div>
                </div>
                <div className={styles.chatListRight}>
                  {lastMsg && <div className={styles.chatListTime}>{dayjs(lastMsg.sent_at).format('HH:mm')}</div>}
                  {unread > 0 && <Badge count={unread} className={styles.chatListBadge} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.listFooter}>
        <Button type="primary" block icon={<PlusOutlined />} onClick={() => setCreateRoomModalVisible(true)}>Создать чат</Button>
      </div>
    </div>
  );

  const chatPanel = selectedRoom ? (
    <div className={styles.chatPanel}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          {isMobile && (
            <Button size="small" onClick={() => setSelectedRoom(null)} className={styles.chatHeaderBack}>←</Button>
          )}
          <div className={styles.chatHeaderAvatar}>
            <TeamOutlined />
          </div>
          <div className={styles.chatHeaderInfo}>
            <div className={styles.chatHeaderName}>{selectedRoom.name}</div>
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <Tooltip title="Участники">
            <Button size="small" icon={<TeamOutlined />} onClick={handleOpenInvite} />
          </Tooltip>
          <Tooltip title="Настройки">
            <Button size="small" icon={<SettingOutlined />} onClick={handleOpenSettings} />
          </Tooltip>
          <Tooltip title="Покинуть чат">
            <Button size="small" danger icon={<LogoutOutlined />} onClick={handleLeaveChat} loading={leavingChat} />
          </Tooltip>
        </div>
      </div>

      {selectedRoom.participants && selectedRoom.participants.length > 0 && (
        <div className={styles.participantsBar}>
          <div className={styles.participantsRow}>
            {selectedRoom.participants.slice(0, isMobile ? 6 : 8).map(participant => (
              <Tooltip
                key={participant.id}
                title={`${participant.first_name} ${participant.last_name} (${participant.role}) ${participant.online ? '· Онлайн' : ''}`}
              >
                <div className={`${styles.participantAvatar} ${participant.online ? styles.participantOnline : styles.participantOffline}`}>
                  {getSenderInitials(participant)}
                  <div className={`${styles.participantDot} ${participant.online ? styles.participantDotOnline : styles.participantDotOffline}`} />
                </div>
              </Tooltip>
            ))}
            {(selectedRoom.participants.length) > (isMobile ? 6 : 8) && (
              <div className={styles.participantMore}>
                +{selectedRoom.participants.length - (isMobile ? 6 : 8)}
              </div>
            )}
          </div>
        </div>
      )}

      <MsgList msgs={messages} uid={currentUserId || 0} roomId={selectedRoom.id} onPin={handlePinMessage} />
      <Composer
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
      />
    </div>
  ) : !isMobile ? (
    <div className={styles.emptyState}>
      <MessageOutlined className={styles.emptyStateIcon} />
      <div className={styles.emptyStateText}>Выберите чат</div>
      <div className={styles.emptyStateHint}>или создайте новый групповой чат</div>
    </div>
  ) : null;

  return (
    <div style={{ background: 'var(--color-bg-container, #fff)', borderRadius: isMobile ? 0 : 12, boxShadow: isMobile ? 'none' : '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.chatContainer}>
        {showList && listPanel}
        {showChat && chatPanel}
      </div>

      <Modal
        title="Создать новый чат"
        open={createRoomModalVisible}
        onOk={handleCreateRoom}
        onCancel={() => { setCreateRoomModalVisible(false); createRoomForm.resetFields(); }}
        okText="Создать"
        cancelText="Отмена"
        width={isMobile ? '100vw' : 640}
        centered={!isMobile}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={createRoomForm} layout="vertical">
          <Form.Item name="name" label="Название чата" rules={[{ required: true, message: 'Введите название чата' }]}>
            <Input placeholder="Например: Отдел маркетинга" />
          </Form.Item>
          <Form.Item name="type" label="Тип чата" initialValue="general">
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
        onCancel={() => { setInviteUserModalVisible(false); inviteUserForm.resetFields(); }}
        okText="Пригласить"
        cancelText="Отмена"
        confirmLoading={inviteLoading}
        width={isMobile ? '100vw' : 480}
        centered={!isMobile}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={inviteUserForm} layout="vertical">
          <Form.Item name="userId" label="Пользователь" rules={[{ required: true, message: 'Выберите пользователя' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Найти по имени или почте"
              loading={allUsers.length === 0}
options={allUsers.map((u: any) => {
  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  const email = u.email ? ` (${u.email})` : '';
  return {
    value: u.id,
    label: name + email,
  };
})}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Настройки чата"
        open={settingsModalVisible}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsModalVisible(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={isMobile ? '100vw' : 480}
        centered={!isMobile}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={settingsForm} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Название чата" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
