import React, { useState, useRef, useEffect } from "react";
import { Button, Input, Avatar, Badge, Spin, Empty, Modal, Form, Select, Tabs, message as antMessage, Typography } from "antd";
import { SendOutlined, PlusOutlined, UserOutlined, TeamOutlined, MessageOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const fmt = (iso: string) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  } catch { return ""; }
};

const initials = (first: string, last: string) => {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f && !l) return "?";
  return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();
};

const COLORS = ["#1890ff","#52c41a","#722ed1","#fa8c16","#eb2f96","#13c2c2","#f5222d","#2f54eb"];
const avatarColor = (id: number) => COLORS[id % COLORS.length];

const api = {
  getRooms: () => apiClient.get("/admin-panel/chat-rooms/").then(r => Array.isArray(r.data) ? r.data : r.data?.results ?? []),
  createRoom: (d: any) => apiClient.post("/admin-panel/chat-rooms/", d).then(r => r.data),
  getRoomMsgs: (id: number) => apiClient.get(`/admin-panel/chat-rooms/${id}/messages/`).then(r => r.data),
  sendRoomMsg: (id: number, msg: string) => apiClient.post(`/admin-panel/chat-rooms/${id}/messages/`, { message: msg }).then(r => r.data),
  joinRoom: (id: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/join_room/`).then(r => r.data),
  addAllStaff: (id: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/add_all_staff/`).then(r => r.data),
  inviteRoom: (id: number, uid: number) => apiClient.post(`/admin-panel/chat-rooms/${id}/invite/`, { user_id: uid }).then(r => r.data),
  getDirectChats: () => apiClient.get("/admin-panel/direct-chats/").then(r => r.data),
  getOrCreateDirect: (uid: number) => apiClient.post("/admin-panel/direct-chats/get-or-create/", { user_id: uid }).then(r => r.data),
  getDirectMsgs: (cid: number) => apiClient.get(`/admin-panel/direct-chats/${cid}/messages/`).then(r => r.data),
  sendDirectMsg: (cid: number, msg: string) => apiClient.post(`/admin-panel/direct-chats/${cid}/send/`, { message: msg }).then(r => r.data),
  getUsers: () => apiClient.get("/admin-panel/users/").then(r => r.data),
};

// ─── Список чатов (левая колонка) ───────────────────────────────────────────
const ChatListItem: React.FC<{
  id: number; name: string; subtitle: string; time?: string;
  unread?: number; active?: boolean; onClick: () => void;
}> = ({ id, name, subtitle, time, unread, active, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    cursor: "pointer", borderBottom: "1px solid #f0f0f0",
    background: active ? "#e6f4ff" : "transparent",
    transition: "background 0.15s",
  }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#fafafa"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
    <Badge count={unread} size="small" offset={[-2, 2]}>
      <Avatar size={44} style={{ background: avatarColor(id), flexShrink: 0, fontSize: 16, fontWeight: 600 }}>
        {initials(name.split(" ")[0], name.split(" ")[1] ?? "")}
      </Avatar>
    </Badge>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <span style={{ fontWeight: unread ? 700 : 500, fontSize: 14, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{name || "Без имени"}</span>
        {time && <span style={{ fontSize: 11, color: "#8c8c8c", flexShrink: 0, marginLeft: 8 }}>{time}</span>}
      </div>
      <div style={{ fontSize: 12, color: unread ? "#1890ff" : "#8c8c8c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle || "Нет сообщений"}</div>
    </div>
  </div>
);

// ─── Сообщения ───────────────────────────────────────────────────────────────
const MsgList: React.FC<{ msgs: any[]; uid: number }> = ({ msgs, uid }) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  if (!msgs.length) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#bfbfbf" }}>
      <div style={{ textAlign: "center" }}>
        <MessageOutlined style={{ fontSize: 40, marginBottom: 8 }} />
        <div>Начните переписку</div>
      </div>
    </div>
  );
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
      {msgs.map((m: any, i: number) => {
        const mine = m.is_mine || m.sender?.id === uid;
        const text = String(m.message ?? m.text ?? "");
        const time = fmt(String(m.created_at ?? ""));
        const senderName = `${String(m.sender?.first_name ?? "")} ${String(m.sender?.last_name ?? "")}`.trim();
        const prevSender = i > 0 ? msgs[i-1].sender?.id : null;
        const showName = !mine && m.sender?.id !== prevSender;
        return (
          <div key={m.id} style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 8, alignItems: "flex-end", marginTop: showName ? 8 : 2 }}>
            {!mine && (
              <Avatar size={28} style={{ background: avatarColor(m.sender?.id ?? 0), flexShrink: 0, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                {initials(m.sender?.first_name ?? "", m.sender?.last_name ?? "")}
              </Avatar>
            )}
            <div style={{ maxWidth: "65%" }}>
              {showName && <div style={{ fontSize: 11, color: "#1890ff", marginBottom: 3, marginLeft: 2 }}>{senderName}</div>}
              <div style={{
                background: mine ? "#1890ff" : "#fff",
                color: mine ? "#fff" : "#1a1a1a",
                padding: "8px 12px",
                borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.08)",
              }}>{text}</div>
              <div style={{ fontSize: 11, color: "#bfbfbf", marginTop: 3, textAlign: mine ? "right" : "left", paddingRight: mine ? 2 : 0, paddingLeft: mine ? 0 : 2 }}>{time}</div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

// ─── Форма отправки ──────────────────────────────────────────────────────────
const Composer: React.FC<{ onSend: (t: string) => Promise<void>; disabled?: boolean }> = ({ onSend, disabled }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim() || disabled) return;
    setBusy(true);
    try { await onSend(text.trim()); setText(""); } finally { setBusy(false); }
  };
  return (
    <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa", display: "flex", gap: 8, alignItems: "flex-end" }}>
      <TextArea value={text} onChange={e => setText(e.target.value)} placeholder="Написать сообщение..." autoSize={{ minRows: 1, maxRows: 5 }}
        style={{ flex: 1, borderRadius: 20, resize: "none", background: "#fff" }} disabled={disabled}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={send} loading={busy} disabled={!text.trim() || disabled} style={{ flexShrink: 0 }} />
    </div>
  );
};

// ─── Вкладка личных сообщений ────────────────────────────────────────────────
const DirectTab: React.FC<{ uid: number }> = ({ uid }) => {
  const qc = useQueryClient();
  const [selId, setSelId] = useState<number | null>(null);
  const [selName, setSelName] = useState("");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: chats = [], isLoading: cLoad } = useQuery({ queryKey: ["adm-direct"], queryFn: api.getDirectChats, refetchInterval: 5000 });
  const { data: msgs = [], isLoading: mLoad } = useQuery({ queryKey: ["adm-direct-msgs", selId], queryFn: () => api.getDirectMsgs(selId!), enabled: !!selId, refetchInterval: 3000 });
  const { data: users = [] } = useQuery({ queryKey: ["adm-users"], queryFn: api.getUsers });

  const sendMut = useMutation({ mutationFn: (t: string) => api.sendDirectMsg(selId!, t), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-direct-msgs", selId] }), onError: () => antMessage.error("Ошибка") });
  const createMut = useMutation({
    mutationFn: (userId: number) => api.getOrCreateDirect(userId),
    onSuccess: (data: any, userId: number) => {
      const u = (users as any[]).find((x: any) => x.id === userId);
      setSelId(data.chat_id);
      setSelName(u ? `${u.first_name} ${u.last_name}`.trim() : "Пользователь");
      setNewOpen(false); form.resetFields();
      qc.invalidateQueries({ queryKey: ["adm-direct"] });
    },
    onError: () => antMessage.error("Ошибка"),
  });

  const filtered = (chats as any[]).filter((c: any) => {
    const name = `${c.other_user?.first_name ?? ""} ${c.other_user?.last_name ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const selChat = (chats as any[]).find((c: any) => c.id === selId);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Левая колонка — список */}
      <div style={{ width: 300, borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f0f0f0" }}>
          <Input prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />} placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 20 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cLoad ? <div style={{ padding: 32, textAlign: "center" }}><Spin /></div> :
            !filtered.length ? <Empty description="Нет переписок" style={{ padding: 32 }} /> :
            filtered.map((c: any) => {
              const o = c.other_user ?? {};
              const name = `${String(o.first_name ?? "")} ${String(o.last_name ?? "")}`.trim();
              return <ChatListItem key={c.id} id={o.id ?? c.id} name={name} subtitle={String(c.last_message?.text ?? "")}
                time={c.last_message ? fmt(String(c.last_message.created_at ?? "")) : undefined}
                unread={c.unread_count} active={selId === c.id}
                onClick={() => { setSelId(c.id); setSelName(name); }} />;
            })
          }
        </div>
        <div style={{ padding: "10px 12px", borderTop: "1px solid #f0f0f0" }}>
          <Button type="primary" block icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>Новое сообщение</Button>
        </div>
      </div>

      {/* Правая колонка — чат */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selId && selChat ? (
          <>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12, background: "#fff" }}>
              <Avatar size={36} style={{ background: avatarColor(selChat.other_user?.id ?? 0), fontWeight: 600 }}>
                {initials(selChat.other_user?.first_name ?? "", selChat.other_user?.last_name ?? "")}
              </Avatar>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selName}</div>
                <div style={{ fontSize: 12, color: "#52c41a" }}>онлайн</div>
              </div>
            </div>
            {mLoad ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div> : <MsgList msgs={msgs as any[]} uid={uid} />}
            <Composer onSend={t => sendMut.mutateAsync(t)} />
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#bfbfbf", flexDirection: "column", gap: 12 }}>
            <MessageOutlined style={{ fontSize: 48 }} />
            <div style={{ fontSize: 16 }}>Выберите чат</div>
            <div style={{ fontSize: 13 }}>или начните новую переписку</div>
          </div>
        )}
      </div>

      <Modal title="Новое сообщение" open={newOpen} onCancel={() => { setNewOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => createMut.mutate(v.userId))} okText="Открыть чат" cancelText="Отмена">
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="Кому" rules={[{ required: true, message: "Выберите пользователя" }]}>
            <Select showSearch optionFilterProp="children" placeholder="Выберите пользователя" style={{ width: "100%" }}>
              {(users as any[]).filter((u: any) => u.id !== uid).map((u: any) => (
                <Option key={u.id} value={u.id}>
                  {String(u.first_name ?? "")} {String(u.last_name ?? "")} — {String(u.email ?? "")}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ─── Вкладка групповых чатов ─────────────────────────────────────────────────
const RoomsTab: React.FC<{ uid: number }> = ({ uid }) => {
  const qc = useQueryClient();
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

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Левая колонка */}
      <div style={{ width: 300, borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f0f0f0" }}>
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

      {/* Правая колонка */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selId && selRoom ? (
          <>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar size={36} icon={<TeamOutlined />} style={{ background: "#1890ff" }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{String(selRoom.name ?? "")}</div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>{selRoom.members?.length ?? 0} участников</div>
                </div>
              </div>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>Добавить</Button>
            </div>
            {mLoad ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div> : <MsgList msgs={msgs as any[]} uid={uid} />}
            <Composer onSend={t => sendMut.mutateAsync(t)} />
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#bfbfbf", flexDirection: "column", gap: 12 }}>
            <TeamOutlined style={{ fontSize: 48 }} />
            <div style={{ fontSize: 16 }}>Выберите чат</div>
            <div style={{ fontSize: 13 }}>или создайте новый групповой чат</div>
          </div>
        )}
      </div>

      <Modal title="Создать групповой чат" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} okText="Создать" cancelText="Отмена">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название чата" rules={[{ required: true, message: "Введите название" }]}><Input placeholder="Например: Отдел поддержки" /></Form.Item>
          <Form.Item name="description" label="Описание (необязательно)"><Input.TextArea placeholder="О чём этот чат?" /></Form.Item>
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

// ─── Главный компонент ───────────────────────────────────────────────────────
export const AdminChatsSection: React.FC = () => {
  const { user } = useAdminAuth();
  const uid = (user as any)?.id ?? 0;
  const h = "calc(100vh - 200px)";

  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden", height: h, display: "flex", flexDirection: "column" }}>
      <Tabs defaultActiveKey="direct" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        tabBarStyle={{ padding: "0 20px", marginBottom: 0, borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}
        items={[
          {
            key: "direct",
            label: <span style={{ fontSize: 14 }}><MessageOutlined style={{ marginRight: 6 }} />Личные сообщения</span>,
            children: <div style={{ height: `calc(${h} - 46px)`, overflow: "hidden" }}><DirectTab uid={uid} /></div>,
          },
          {
            key: "rooms",
            label: <span style={{ fontSize: 14 }}><TeamOutlined style={{ marginRight: 6 }} />Групповые чаты</span>,
            children: <div style={{ height: `calc(${h} - 46px)`, overflow: "hidden" }}><RoomsTab uid={uid} /></div>,
          },
        ]}
      />
    </div>
  );
};


