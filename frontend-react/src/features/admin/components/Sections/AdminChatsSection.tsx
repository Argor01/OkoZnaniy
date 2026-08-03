import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Button, Input, Space, Typography, Spin, Empty, Badge, Tooltip,
  Modal, Form, Select, List, message as antMessage,
} from 'antd';
import {
  SendOutlined, PlusOutlined, TeamOutlined, SearchOutlined,
  UsergroupAddOutlined, MessageOutlined, PaperClipOutlined,
  PushpinOutlined, FileOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { useIsMobile } from '@/hooks/useIsMobile';
import styles from './AdminChatsSection.module.css';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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

const getInitials = (first?: string, last?: string) => {
  const a = (first || '').trim()[0] || '';
  const b = (last || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
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
    return getInitials(sender.first_name, sender.last_name);
  }
  if (sender?.email) {
    const local = sender.email.split('@')[0];
    const parts = local.replace(/[._-]/g, ' ').split(' ');
    return getInitials(parts[0], parts[1]) || local.substring(0, 2).toUpperCase();
  }
  const name = sender?.name || sender?.username || '';
  return getInitials(name.split(' ')[0], name.split(' ')[1]);
};

const ROOM_TYPE_LABELS: Record<string, string> = { general: 'Общий', department: 'Отдел', project: 'Проект', private: 'Приватный' };
const getRoomTypeTag = (type?: string) => {
  if (!type || type === 'general') return null;
  const cls = styles[`chatListType${type.charAt(0).toUpperCase() + type.slice(1)}`] || styles.chatListTypeDefault;
  return <span className={`${styles.chatListTypeTag} ${cls}`}>{ROOM_TYPE_LABELS[type] || type}</span>;
};

const getFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const api = {
  getRooms: () => apiClient.get('/admin-panel/chat-rooms/').then(r => Array.isArray(r.data) ? r.data : r.data?.results ?? []),
  createRoom: (d: any) => apiClient.post('/admin-panel/chat-rooms/', d).then(r => r.data),
  getRoomMsgs: (id: number) => apiClient.get(`/admin-panel/chat-rooms/${id}/messages/`).then(r => r.data),
  sendRoomMsg: (id: number, msg: string) => apiClient.post(`/admin-panel/chat-rooms/${id}/messages/`, { message: msg }).then(r => r.data),
  inviteRoom: (id: number, uid: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/invite/`, { user_id: uid }).then(r => r.data),
  getUsers: () => apiClient.get('/admin-panel/users/').then(r => r.data),
  markRead: (id: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/mark_read/`).then(r => r.data),
  uploadFile: (id: number, file: File, message?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (message) fd.append('message', message);
    return apiClient.post(`/admin-panel/chat-rooms/${id}/upload_file/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  pinMessage: (roomId: number, msgId: number) =>
    apiClient.post(`/admin-panel/chat-rooms/${roomId}/pin_message/`, { message_id: msgId }).then(r => r.data),
};

const ORDER_RE = /#\d{1,8}|заказ\s*#?\d{1,8}|order\s*#?\d{1,8}|\/orders\/\d{1,8}/gi;
const ARB_RE = /арб[а-яё]*\s*#?\d{1,8}|arb\s*#?\d{1,8}|\/arbitration\/(?:case\/)?\d{1,8}/gi;
const LINK_RE = /(#\d{1,8}|заказ\s*#?\d{1,8}|order\s*#?\d{1,8}|\/orders\/\d{1,8}|арб[а-яё]*\s*#?\d{1,8}|arb\s*#?\d{1,8}|\/arbitration\/(?:case\/)?\d{1,8})/gi;
const DIGITS_RE = /\d+/;

const renderWithOrderLinks = (text: string) => {
  if (!text) return null;
  const parts = text.split(LINK_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    ARB_RE.lastIndex = 0;
    if (ARB_RE.test(part)) {
      const id = part.match(DIGITS_RE);
      if (id) {
        return (
          <a key={i} href={`/admin/dashboard?menu=arbitration&case=${id[0]}`} className={styles.arbLink} onClick={e => e.stopPropagation()}>
            {part}
          </a>
        );
      }
    }
    ORDER_RE.lastIndex = 0;
    if (ORDER_RE.test(part)) {
      const id = part.match(DIGITS_RE);
      if (id) {
        return (
          <a key={i} href={`/admin/dashboard?menu=orders_management&order=${id[0]}`} target="_blank" rel="noopener noreferrer" className={styles.orderLink} onClick={e => e.stopPropagation()}>
            {part}
          </a>
        );
      }
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
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
      const dateStr = fmtDate(m.created_at || '');
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
          {group.items.map((m: any) => {
            if (m.is_system) {
              return (
                <div key={m.id} className={styles.systemMessage}>
                  {m.message}
                </div>
              );
            }
            const mine = m.is_mine || m.sender?.id === uid;
            const name = getSenderName(m.sender);
            const text = m.message ?? m.text ?? '';
            return (
              <div key={m.id} data-msg-id={m.id} className={`${styles.messageRow} ${mine ? styles.messageMine : styles.messageTheirs}`}>
                <div className={`${styles.messageAvatar} ${mine ? '' : styles.messageAvatarDirector}`}>
                  {getSenderInitials(m.sender)}
                </div>
                <div className={styles.messageContent}>
                  {m.is_pinned && (
                    <div className={styles.messagePinnedBadge}>
                      <PushpinOutlined /> Закреплено
                    </div>
                  )}
                  <div className={`${styles.messageBubble} ${m.is_pinned ? styles.messageBubblePinned : ''}`}>
                    {m.file_url ? (
                      <div className={styles.messageFile}>
                        <FileOutlined className={styles.messageFileIcon} />
                        <div className={styles.messageFileInfo}>
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={styles.messageFileName}>
                            {m.file_name || 'Файл'}
                          </a>
                        </div>
                        <a href={m.file_url} download className={styles.messageFileDownload}>
                          <DownloadOutlined />
                        </a>
                      </div>
                    ) : null}
                    {text && <div>{renderWithOrderLinks(text)}</div>}
                  </div>
                  <div className={styles.messageMeta}>
                    {!mine && <span className={styles.messageSender}>{name}</span>}
                    <span className={styles.messageTime}>{fmt(m.created_at ?? '')}</span>
                    <Tooltip title={m.is_pinned ? 'Открепить' : 'Закрепить'}>
                      <Button
                        type="text"
                        size="small"
                        icon={<PushpinOutlined />}
                        className={styles.messagePinBtn}
                        onClick={() => onPin(m.id)}
                      />
                    </Tooltip>
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
          <TextArea
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

const RoomsTab: React.FC<{ uid: number }> = ({ uid }) => {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [selId, setSelId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [form] = Form.useForm();
  const [invForm] = Form.useForm();

  const { data: rooms = [], isLoading: rLoad } = useQuery({ queryKey: ["adm-rooms"], queryFn: api.getRooms, refetchInterval: 8000 });
  const { data: msgs = [], isLoading: mLoad } = useQuery({ queryKey: ["adm-room-msgs", selId], queryFn: () => api.getRoomMsgs(selId!), enabled: !!selId, refetchInterval: 3000 });
  const { data: users = [] } = useQuery({ queryKey: ["adm-users"], queryFn: api.getUsers });

  useEffect(() => {
    if (!selId && rooms.length > 0 && !rLoad && !isMobile) {
      const firstRoom = (rooms as any[])[0];
      if (firstRoom) {
        setSelId(firstRoom.id);
      }
    }
  }, [rooms, rLoad, selId, isMobile]);

  const handleSelectRoom = useCallback(async (id: number) => {
    setSelId(id);
    try {
      await api.markRead(id);
      qc.invalidateQueries({ queryKey: ["adm-rooms"] });
    } catch {}
  }, [qc]);

  const sendMut = useMutation({ mutationFn: (t: string) => api.sendRoomMsg(selId!, t), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-room-msgs", selId] }), onError: () => antMessage.error("Ошибка") });
  const createMut = useMutation({ mutationFn: api.createRoom, onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-rooms"] }); setCreateOpen(false); form.resetFields(); antMessage.success("Чат создан"); }, onError: () => antMessage.error("Ошибка") });
  const invMut = useMutation({ mutationFn: (u2: number) => api.inviteRoom(selId!, u2), onSuccess: () => { setInviteOpen(false); invForm.resetFields(); antMessage.success("Добавлен"); }, onError: () => antMessage.error("Ошибка") });

  const fileUploadMut = useMutation({
    mutationFn: ({ file, message }: { file: File; message?: string }) => api.uploadFile(selId!, file, message),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-room-msgs", selId] }); antMessage.success("Файл отправлен"); },
    onError: () => antMessage.error("Ошибка загрузки файла"),
  });

  const pinMut = useMutation({
    mutationFn: (msgId: number) => api.pinMessage(selId!, msgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-room-msgs", selId] }),
    onError: () => antMessage.error("Ошибка"),
  });

  const filtered = (rooms as any[]).filter((r: any) => String(r.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const selRoom = (rooms as any[]).find((r: any) => r.id === selId);

  const showList = !isMobile || !selId;
  const showChat = !isMobile || !!selId;

  const listPanel = (
    <div className={styles.listPanel}>
      <div className={styles.listHeader}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--color-text-tertiary, #94a3b8)" }} />}
          placeholder="Поиск чатов..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 8 }}
        />
      </div>
      <div className={styles.listScroll}>
        {rLoad ? (
          <div style={{ padding: 32, textAlign: "center" }}><Spin /></div>
        ) : !filtered.length ? (
          <Empty description="Нет чатов" style={{ padding: 32 }} />
        ) : (
          filtered.map((r: any) => {
            const lastMsg = r.messages?.[r.messages.length - 1];
            const unread = r.unread_count || 0;
            return (
              <div
                key={r.id}
                className={`${styles.chatListItem} ${selId === r.id ? styles.chatListItemActive : ''} ${unread > 0 ? styles.chatListItemUnread : ''}`}
                onClick={() => handleSelectRoom(r.id)}
              >
                <div className={styles.chatListAvatar}>
                  <TeamOutlined />
                </div>
                <div className={styles.chatListInfo}>
                  <div className={styles.chatListNameRow}>
                    <span className={`${styles.chatListName} ${unread > 0 ? styles.chatListNameUnread : ''}`}>{String(r.name ?? "Чат")}</span>
                    {getRoomTypeTag(r.room_type || r.type)}
                  </div>
                  <div className={styles.chatListPreview}>
                    {lastMsg ? String(lastMsg.message ?? lastMsg.text ?? "") : `${r.members?.length ?? 0} участников`}
                  </div>
                </div>
                <div className={styles.chatListRight}>
                  {lastMsg && <div className={styles.chatListTime}>{fmt(String(lastMsg.created_at ?? lastMsg.sent_at ?? ""))}</div>}
                  {unread > 0 && <Badge count={unread} className={styles.chatListBadge} />}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className={styles.listFooter}>
        <Button type="primary" block icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Создать чат</Button>
      </div>
    </div>
  );

  const chatPanel = selId && selRoom ? (
    <div className={styles.chatPanel}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          {isMobile && (
            <Button size="small" onClick={() => setSelId(null)} className={styles.chatHeaderBack}>←</Button>
          )}
          <div className={styles.chatHeaderAvatar}>
            <TeamOutlined />
          </div>
          <div className={styles.chatHeaderInfo}>
            <div className={styles.chatHeaderNameRow}>
              <span className={styles.chatHeaderName}>{String(selRoom.name ?? "")}</span>
              {getRoomTypeTag(selRoom.room_type || selRoom.type)}
            </div>
            <div className={styles.chatHeaderSub}>{selRoom.members?.length ?? 0} участников</div>
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <Button size="small" icon={<UsergroupAddOutlined />} onClick={() => setMembersOpen(true)}>Участники</Button>
        </div>
      </div>
      {mLoad ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>
      ) : (
        <MsgList msgs={msgs as any[]} uid={uid} roomId={selId} onPin={(msgId) => pinMut.mutate(msgId)} />
      )}
      <Composer
        onSend={t => sendMut.mutateAsync(t)}
        onFileUpload={(file, message) => fileUploadMut.mutateAsync({ file, message })}
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
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {showList && listPanel}
      {showChat && chatPanel}
      <Modal
        title="Создать групповой чат"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))}
        okText="Создать"
        cancelText="Отмена"
        width={isMobile ? '100vw' : 640}
        centered={!isMobile}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}>
            <Input placeholder="Например: Отдел поддержки" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="О чём этот чат?" />
          </Form.Item>
          <Form.Item name="type" label="Тип чата" initialValue="general">
            <Select>
              <Option value="general">Общий</Option>
              <Option value="department">Отдел</Option>
              <Option value="project">Проект</Option>
            </Select>
          </Form.Item>
          <Form.Item name="user_ids" label="Участники" rules={[{ required: true, message: "Выберите участников" }]}>
            <Select mode="multiple" placeholder="Выберите участников" style={{ width: '100%' }}>
              {(users as any[]).filter((u: any) => u.role === 'admin' || u.role === 'director').map((u: any) => (
                <Option key={u.id} value={u.id}>{String(u.first_name ?? "")} {String(u.last_name ?? "")} ({String(u.email ?? "")}) - {u.role === 'admin' ? 'Администратор' : 'Директор'}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Добавить участника"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        onOk={() => invForm.validateFields().then(v => invMut.mutate(v.uid))}
        okText="Добавить"
        cancelText="Отмена"
        width={isMobile ? '100vw' : 480}
        centered={!isMobile}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={invForm} layout="vertical">
          <Form.Item name="uid" label="Пользователь" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Выберите пользователя">
              {(users as any[]).map((u: any) => <Option key={u.id} value={u.id}>{String(u.first_name ?? "")} {String(u.last_name ?? "")} ({String(u.email ?? "")})</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Участники чата"
        open={membersOpen}
        onCancel={() => setMembersOpen(false)}
        footer={[<Button key="close" onClick={() => setMembersOpen(false)}>Закрыть</Button>]}
        width={isMobile ? '100vw' : 600}
        centered={!isMobile}
        destroyOnClose
      >
        <List
          dataSource={selRoom?.members ?? []}
          renderItem={(member: any) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <div className={styles.chatListAvatar} style={{ background: member.role === 'admin' ? '#6435a5' : member.role === 'director' ? '#722ed1' : '#52c41a' }}>
                    {getSenderInitials(member)}
                  </div>
                }
                title={`${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || member.username}
                description={
                  <Space direction="vertical" size={0}>
                    <span>{member.email}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary, #94a3b8)' }}>
                      {member.role === 'admin' ? 'Администратор' : member.role === 'director' ? 'Директор' : member.role === 'expert' ? 'Эксперт' : member.role === 'partner' ? 'Партнер' : 'Клиент'}
                    </span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export const AdminChatsSection: React.FC = () => {
  const { user } = useAdminAuth();
  const uid = (user as any)?.id ?? 0;
  const isMobile = useIsMobile();

  return (
    <div style={{ background: "var(--color-bg-container, #fff)", borderRadius: isMobile ? 0 : 12, boxShadow: isMobile ? "none" : "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden", height: isMobile ? "calc(100vh - 120px)" : "calc(100vh - 160px)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <RoomsTab uid={uid} />
      </div>
    </div>
  );
};
