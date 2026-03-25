import React, { useState, useRef, useEffect } from 'react';
import {
  Card, Button, Input, Avatar, Space, Typography, Badge, Spin, Empty,
  Modal, Form, Select, Tabs, message as antMessage,
} from 'antd';
import { SendOutlined, PlusOutlined, UserOutlined, TeamOutlined, MessageOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const api = {
  getRooms: () => apiClient.get('/admin-panel/chat-rooms/').then(r => Array.isArray(r.data) ? r.data : r.data?.results ?? []),
  createRoom: (d: any) => apiClient.post('/admin-panel/chat-rooms/', d).then(r => r.data),
  getRoomMsgs: (id: number) => apiClient.get(`/admin-panel/chat-rooms/${id}/messages/`).then(r => r.data),
  sendRoomMsg: (id: number, msg: string) => apiClient.post(`/admin-panel/chat-rooms/${id}/messages/`, { message: msg }).then(r => r.data),
  joinRoom: (id: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/join_room/`).then(r => r.data),
  inviteRoom: (id: number, uid: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/invite/`, { user_id: uid }).then(r => r.data),
  getDirectChats: () => apiClient.get('/admin-panel/direct-chats/').then(r => r.data),
  getOrCreateDirect: (uid: number) => apiClient.post('/admin-panel/direct-chats/get-or-create/', { user_id: uid }).then(r => r.data),
  getDirectMsgs: (cid: number) => apiClient.get(`/admin-panel/direct-chats/${cid}/messages/`).then(r => r.data),
  sendDirectMsg: (cid: number, msg: string) => apiClient.post(`/admin-panel/direct-chats/${cid}/send/`, { message: msg }).then(r => r.data),
  getUsers: () => apiClient.get('/admin-panel/users/').then(r => r.data),
};

const MsgList: React.FC<{ msgs: any[]; uid: number }> = ({ msgs, uid }) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  if (!msgs.length) return <Empty description="Нет сообщений" style={{ padding: 32 }} />;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {msgs.map((m: any) => {
        const mine = m.is_mine || m.sender?.id === uid;
        const name = `${m.sender?.first_name ?? ''} ${m.sender?.last_name ?? ''}`.trim();
        const text = m.message ?? m.text ?? '';
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            <Avatar size={28} icon={<UserOutlined />} style={{ background: mine ? '#1890ff' : '#52c41a', flexShrink: 0 }} />
            <div style={{ maxWidth: '70%' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2, textAlign: mine ? 'right' : 'left' }}>{name}</div>
              <div style={{ background: mine ? '#1890ff' : '#f0f0f0', color: mine ? '#fff' : '#000', padding: '8px 12px', borderRadius: mine ? '14px 14px 2px 14px' : '14px 14px 14px 2px', fontSize: 14, wordBreak: 'break-word' }}>{text}</div>
              <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{fmt(m.created_at ?? '')}</div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

const Composer: React.FC<{ onSend: (t: string) => Promise<void> }> = ({ onSend }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await onSend(text.trim()); setText(''); } finally { setBusy(false); }
  };
  return (
    <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <TextArea value={text} onChange={e => setText(e.target.value)} placeholder="Написать... (Enter)" autoSize={{ minRows: 1, maxRows: 4 }} style={{ flex: 1 }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <Button type="primary" icon={<SendOutlined />} onClick={send} loading={busy} disabled={!text.trim()} />
    </div>
  );
};

const RoomsTab: React.FC<{ uid: number }> = ({ uid }) => {
  const qc = useQueryClient();
  const [selId, setSelId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const [invForm] = Form.useForm();

  const { data: rooms = [], isLoading: rLoad } = useQuery({ queryKey: ['adm-rooms'], queryFn: api.getRooms, refetchInterval: 8000 });
  const { data: msgs = [], isLoading: mLoad } = useQuery({ queryKey: ['adm-room-msgs', selId], queryFn: () => api.getRoomMsgs(selId!), enabled: !!selId, refetchInterval: 3000 });
  const { data: users = [] } = useQuery({ queryKey: ['adm-users'], queryFn: api.getUsers });

  const sendMut = useMutation({ mutationFn: (t: string) => api.sendRoomMsg(selId!, t), onSuccess: () => qc.invalidateQueries({ queryKey: ['adm-room-msgs', selId] }), onError: () => antMessage.error('Ошибка') });
  const createMut = useMutation({ mutationFn: api.createRoom, onSuccess: () => { qc.invalidateQueries({ queryKey: ['adm-rooms'] }); setCreateOpen(false); form.resetFields(); antMessage.success('Чат создан'); }, onError: () => antMessage.error('Ошибка') });
  const invMut = useMutation({ mutationFn: (uid2: number) => api.inviteRoom(selId!, uid2), onSuccess: () => { setInviteOpen(false); invForm.resetFields(); antMessage.success('Добавлен'); }, onError: () => antMessage.error('Ошибка') });

  const sel = (rooms as any[]).find((r: any) => r.id === selId);

  if (selId && sel) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button size="small" onClick={() => setSelId(null)}>←</Button>
          <div>
            <div style={{ fontWeight: 600 }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{sel.members?.length ?? 0} участников</div>
          </div>
        </Space>
        <Button size="small" icon={<UserOutlined />} onClick={() => setInviteOpen(true)}>Добавить</Button>
      </div>
      {mLoad ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div> : <MsgList msgs={msgs as any[]} uid={uid} />}
      <Composer onSend={t => sendMut.mutateAsync(t)} />
      <Modal title="Добавить участника" open={inviteOpen} onCancel={() => setInviteOpen(false)} onOk={() => invForm.validateFields().then(v => invMut.mutate(v.uid))} okText="Добавить" cancelText="Отмена">
        <Form form={invForm} layout="vertical">
          <Form.Item name="uid" label="Пользователь" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Выберите">
              {(users as any[]).map((u: any) => <Option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Групповые чаты</Text>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Создать</Button>
      </div>
      {rLoad ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div> : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!(rooms as any[]).length ? <Empty description="Нет чатов" style={{ padding: 32 }} /> : (rooms as any[]).map((r: any) => (
            <div key={r.id} onClick={() => { setSelId(r.id); api.joinRoom(r.id).catch(() => {}); }}
              style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 12 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <Avatar icon={<TeamOutlined />} style={{ background: '#1890ff', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.members?.length ?? 0} участников</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal title="Создать чат" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }} onOk={() => form.validateFields().then(v => createMut.mutate(v))} okText="Создать" cancelText="Отмена">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}><Input /></Form.Item>
          <Form.Item name="description" label="Описание"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const DirectTab: React.FC<{ uid: number }> = ({ uid }) => {
  const qc = useQueryClient();
  const [selChatId, setSelChatId] = useState<number | null>(null);
  const [selName, setSelName] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: chats = [], isLoading: cLoad } = useQuery({ queryKey: ['adm-direct'], queryFn: api.getDirectChats, refetchInterval: 5000 });
  const { data: msgs = [], isLoading: mLoad } = useQuery({ queryKey: ['adm-direct-msgs', selChatId], queryFn: () => api.getDirectMsgs(selChatId!), enabled: !!selChatId, refetchInterval: 3000 });
  const { data: users = [] } = useQuery({ queryKey: ['adm-users'], queryFn: api.getUsers });

  const sendMut = useMutation({ mutationFn: (t: string) => api.sendDirectMsg(selChatId!, t), onSuccess: () => qc.invalidateQueries({ queryKey: ['adm-direct-msgs', selChatId] }), onError: () => antMessage.error('Ошибка') });
  const createMut = useMutation({
    mutationFn: (userId: number) => api.getOrCreateDirect(userId),
    onSuccess: (data: any, userId: number) => {
      const u = (users as any[]).find((x: any) => x.id === userId);
      setSelChatId(data.chat_id);
      setSelName(u ? `${u.first_name} ${u.last_name}` : 'Пользователь');
      setNewOpen(false); form.resetFields();
      qc.invalidateQueries({ queryKey: ['adm-direct'] });
    },
    onError: () => antMessage.error('Ошибка'),
  });

  if (selChatId) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button size="small" onClick={() => { setSelChatId(null); qc.invalidateQueries({ queryKey: ['adm-direct'] }); }}>←</Button>
        <div style={{ fontWeight: 600 }}>{selName}</div>
      </div>
      {mLoad ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div> : <MsgList msgs={msgs as any[]} uid={uid} />}
      <Composer onSend={t => sendMut.mutateAsync(t)} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Личные сообщения</Text>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>Написать</Button>
      </div>
      {cLoad ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div> : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!(chats as any[]).length ? <Empty description="Нет переписок" style={{ padding: 32 }} /> : (chats as any[]).map((c: any) => {
            const o = c.other_user;
            const name = `${o.first_name} ${o.last_name}`.trim();
            return (
              <div key={c.id} onClick={() => { setSelChatId(c.id); setSelName(name); }}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 12 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <Badge count={c.unread_count} size="small">
                  <Avatar icon={<UserOutlined />} style={{ background: '#52c41a', flexShrink: 0 }} />
                </Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_message?.text ?? 'Нет сообщений'}</div>
                </div>
                {c.last_message && <div style={{ fontSize: 11, color: '#bfbfbf', flexShrink: 0 }}>{fmt(c.last_message.created_at)}</div>}
              </div>
            );
          })}
        </div>
      )}
      <Modal title="Написать сообщение" open={newOpen} onCancel={() => { setNewOpen(false); form.resetFields(); }} onOk={() => form.validateFields().then(v => createMut.mutate(v.userId))} okText="Открыть чат" cancelText="Отмена">
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="Кому" rules={[{ required: true, message: 'Выберите пользователя' }]}>
            <Select showSearch optionFilterProp="children" placeholder="Выберите пользователя">
              {(users as any[]).filter((u: any) => u.id !== uid).map((u: any) => (
                <Option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.email}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const AdminChatsSection: React.FC = () => {
  const { user } = useAdminAuth();
  const uid = (user as any)?.id ?? 0;
  return (
    <Card style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs defaultActiveKey="direct" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
        items={[
          { key: 'direct', label: <span><MessageOutlined style={{ marginRight: 4 }} />Личные</span>, children: <div style={{ height: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}><DirectTab uid={uid} /></div> },
          { key: 'rooms', label: <span><TeamOutlined style={{ marginRight: 4 }} />Групповые</span>, children: <div style={{ height: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}><RoomsTab uid={uid} /></div> },
        ]}
      />
    </Card>
  );
};

const RoomsTab: React.FC<{ uid: number }> = ({ uid }) => {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [selId, setSelId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const [invForm] = Form.useForm();

  const { data: rooms = [], isLoading: rLoad } = useQuery({ queryKey: ["adm-rooms"], queryFn: api.getRooms, refetchInterval: 8000 });
  const { data: msgs = [], isLoading: mLoad } = useQuery({ queryKey: ["adm-room-msgs", selId], queryFn: () => api.getRoomMsgs(selId!), enabled: !!selId, refetchInterval: 3000 });
  const { data: users = [] } = useQuery({ queryKey: ["adm-users"], queryFn: api.getUsers });

  const sendMut = useMutation({ mutationFn: (t: string) => api.sendRoomMsg(selId!, t), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-room-msgs", selId] }), onError: () => antMessage.error("Ошибка") });
  const createMut = useMutation({ mutationFn: api.createRoom, onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-rooms"] }); setCreateOpen(false); form.resetFields(); antMessage.success("Чат создан"); }, onError: () => antMessage.error("Ошибка") });
  const invMut = useMutation({ mutationFn: (u2: number) => api.inviteRoom(selId!, u2), onSuccess: () => { setInviteOpen(false); invForm.resetFields(); antMessage.success("Добавлен"); }, onError: () => antMessage.error("Ошибка") });

  const filtered = (rooms as any[]).filter((r: any) => String(r.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const selRoom = (rooms as any[]).find((r: any) => r.id === selId);

  const showList = !isMobile || !selId;
  const showChat = !isMobile || !!selId;

  const listPanel = (
    <div style={{ width: isMobile ? "100%" : 300, borderRight: isMobile ? "none" : "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0, height: "100%" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0" }}>
        <Input prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />} placeholder="Поиск чатов..." value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 20 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {rLoad ? <div style={{ padding: 32, textAlign: "center" }}><Spin /></div> :
          !filtered.length ? <Empty description="Нет чатов" style={{ padding: 32 }} /> :
          filtered.map((r: any) => {
            const lastMsg = r.messages?.[r.messages.length - 1];
            return <ChatListItem key={r.id} id={r.id} name={String(r.name ?? "Чат")}
              subtitle={lastMsg ? String(lastMsg.message ?? "") : `${r.members?.length ?? 0} участников`}
              time={lastMsg ? fmt(String(lastMsg.created_at ?? "")) : undefined}
              active={selId === r.id}
              onClick={() => { setSelId(r.id); api.joinRoom(r.id).catch(() => {}); api.addAllStaff(r.id).catch(() => {}); }} />;
          })
        }
      </div>
      <div style={{ padding: "10px 12px", borderTop: "1px solid #f0f0f0" }}>
        <Button type="primary" block icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Создать чат</Button>
      </div>
    </div>
  );

  const chatPanel = selId && selRoom ? (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
      <ChatHeader name={String(selRoom.name ?? "")} sub={`${selRoom.members?.length ?? 0} участников`}
        icon={<TeamOutlined />} onBack={isMobile ? () => setSelId(null) : undefined}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>Добавить</Button>} />
      {mLoad ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div> : <MsgList msgs={msgs as any[]} uid={uid} />}
      <Composer onSend={t => sendMut.mutateAsync(t)} />
    </div>
  ) : !isMobile ? (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#bfbfbf" }}>
      <TeamOutlined style={{ fontSize: 48 }} />
      <div style={{ fontSize: 16 }}>Выберите чат</div>
      <div style={{ fontSize: 13 }}>или создайте новый групповой чат</div>
    </div>
  ) : null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {showList && listPanel}
      {showChat && chatPanel}
      <Modal title="Создать групповой чат" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} okText="Создать" cancelText="Отмена">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: "Введите название" }]}><Input placeholder="Например: Отдел поддержки" /></Form.Item>
          <Form.Item name="description" label="Описание"><Input.TextArea placeholder="О чём этот чат?" /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Добавить участника" open={inviteOpen} onCancel={() => setInviteOpen(false)}
        onOk={() => invForm.validateFields().then(v => invMut.mutate(v.uid))} okText="Добавить" cancelText="Отмена">
        <Form form={invForm} layout="vertical">
          <Form.Item name="uid" label="Пользователь" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Выберите пользователя">
              {(users as any[]).map((u: any) => <Option key={u.id} value={u.id}>{String(u.first_name ?? "")} {String(u.last_name ?? "")} ({String(u.email ?? "")})</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const AdminChatsSection: React.FC = () => {
  const { user } = useAdminAuth();
  const uid = (user as any)?.id ?? 0;
  const isMobile = useIsMobile();
  const h = isMobile ? "calc(100vh - 120px)" : "calc(100vh - 200px)";

  return (
    <div style={{ background: "#fff", borderRadius: isMobile ? 0 : 12, boxShadow: isMobile ? "none" : "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden", height: h, display: "flex", flexDirection: "column" }}>
      <Tabs defaultActiveKey="direct" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        tabBarStyle={{ padding: "0 16px", marginBottom: 0, borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}
        items={[
          { key: "direct", label: <span><MessageOutlined style={{ marginRight: 4 }} />{isMobile ? "Личные" : "Личные сообщения"}</span>, children: <div style={{ height: `calc(${h} - 46px)`, overflow: "hidden" }}><DirectTab uid={uid} /></div> },
          { key: "rooms", label: <span><TeamOutlined style={{ marginRight: 4 }} />{isMobile ? "Группы" : "Групповые чаты"}</span>, children: <div style={{ height: `calc(${h} - 46px)`, overflow: "hidden" }}><RoomsTab uid={uid} /></div> },
        ]}
      />
    </div>
  );
};
