import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Descriptions, Input, Select, Tag, Avatar,
  Space, message, Spin, Empty, Breadcrumb, Row, Col, Modal, Checkbox, Tabs,
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, SendOutlined, FileTextOutlined,
  LinkOutlined, TagOutlined, PlusOutlined, SwapOutlined, StarOutlined,
  EyeOutlined, MessageOutlined, HistoryOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTicketActions, useAdminUsers, useTicketByNumber, useTicketActivity } from '@/features/admin/hooks';
import { AdminLayout } from '@/features/admin/components/Layout';
import '@/styles/ticket-detail.css';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TicketDetail {
  id: number;
  ticket_number: string;
  type: 'support_request' | 'claim';
  user: { id: number; username: string; first_name: string; last_name: string; email: string };
  admin?: { id: number; first_name: string; last_name: string };
  assigned_users?: Array<{ id: number; first_name: string; last_name: string; email: string }>;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'new' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  support_chat_id?: number;
  order_id?: number;
  auto_created?: boolean;
  tags?: string;
  tags_list?: string[];
  messages: Array<{ id: number; sender: { id: number; first_name: string; last_name: string }; message: string; is_admin: boolean; created_at: string }>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

const activityIcon = (type: string) => {
  const map: Record<string, React.ReactNode> = {
    status_change: <SwapOutlined style={{ color: '#1890ff' }} />,
    priority_change: <StarOutlined style={{ color: '#faad14' }} />,
    tag_added: <TagOutlined style={{ color: '#52c41a' }} />,
    tag_removed: <TagOutlined style={{ color: '#ff4d4f' }} />,
    observer_added: <EyeOutlined style={{ color: '#722ed1' }} />,
    observer_removed: <EyeOutlined style={{ color: '#ff4d4f' }} />,
    assigned: <UserOutlined style={{ color: '#1890ff' }} />,
    message: <MessageOutlined style={{ color: '#13c2c2' }} />,
    note: <FileTextOutlined style={{ color: '#8c8c8c' }} />,
    created: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  };
  return map[type] ?? <HistoryOutlined />;
};

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

const getStatusColor = (s: string) => ({ open: 'orange', new: 'orange', in_progress: 'blue', completed: 'green', pending_approval: 'purple' }[s] ?? 'gray');
const getStatusText = (s: string) => ({ open: 'Открыт', new: 'Новый', in_progress: 'В работе', completed: 'Завершен', pending_approval: 'Ожидает одобрения' }[s] ?? s);
const getPriorityColor = (p: string) => ({ low: 'green', medium: 'orange', high: 'red', urgent: 'purple' }[p] ?? 'gray');
const getPriorityText = (p: string) => ({ low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный' }[p] ?? p);

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { ticket: rawTicket, loading, refetch } = useTicketByNumber(ticketId || '');
  const ticket = rawTicket as unknown as TicketDetail | null;
  const { adminUsers } = useAdminUsers();
  const { messages: chatMessages, activities, loading: activityLoading, refetch: refetchActivity } =
    useTicketActivity(ticket?.id ?? null, ticket?.type ?? null);
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus, updatePriority: updateTicketPriority, assignUsers, addTag, removeTag } = useTicketActions();

  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get('action');
    if (action === 'tags') setTagModalVisible(true);
    else if (action === 'team-chat') setAssignModalVisible(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !ticket) { message.warning('Введите сообщение'); return; }
    setSending(true);
    try { await sendTicketMessage(ticket.id, messageText, ticket.type); setMessageText(''); refetch(); refetchActivity(); }
    catch { message.error('Не удалось отправить сообщение'); }
    finally { setSending(false); }
  };

  const handleUpdateStatus = async (s: string) => {
    if (!ticket) return;
    try { await updateTicketStatus(ticket.id, s, ticket.type); refetch(); refetchActivity(); }
    catch { message.error('Не удалось обновить статус'); }
  };

  const handleUpdatePriority = async (p: string) => {
    if (!ticket) return;
    try { await updateTicketPriority(ticket.id, p, ticket.type); refetch(); refetchActivity(); }
    catch { message.error('Не удалось обновить приоритет'); }
  };

  const handleAssignUsers = async () => {
    if (!ticket || selectedUserIds.length === 0) return;
    try { await assignUsers(ticket.id, selectedUserIds, ticket.type); setAssignModalVisible(false); setSelectedUserIds([]); refetch(); refetchActivity(); }
    catch { message.error('Не удалось назначить пользователей'); }
  };

  const handleAddTag = async () => {
    if (!ticket || !newTag.trim()) return;
    try { await addTag(ticket.id, newTag.trim(), ticket.type); setTagModalVisible(false); setNewTag(''); refetch(); refetchActivity(); }
    catch { message.error('Не удалось добавить тег'); }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!ticket) return;
    try { await removeTag(ticket.id, tag, ticket.type); refetch(); refetchActivity(); }
    catch { message.error('Не удалось удалить тег'); }
  };

  if (loading) {
    return (
      <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><Spin size="large" /></div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
        <Card><Empty description="Тикет не найден" /><div style={{ textAlign: 'center', marginTop: 16 }}><Button type="primary" onClick={() => navigate('/admin/dashboard')}>Вернуться к тикетам</Button></div></Card>
      </AdminLayout>
    );
  }

  const renderChatTab = () => (
    <div>
      <div style={{ maxHeight: 480, overflowY: 'auto', padding: '8px 0', marginBottom: 16 }}>
        {chatMessages.length === 0 ? <Empty description="Нет сообщений" /> : chatMessages.map((msg: any) => {
          const isAdmin = msg.is_admin;
          const name = `${msg.sender?.first_name ?? ''} ${msg.sender?.last_name ?? ''}`.trim() || 'Пользователь';
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isAdmin ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, padding: '0 8px' }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ background: isAdmin ? '#1890ff' : '#52c41a', flexShrink: 0 }} />
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2, textAlign: isAdmin ? 'right' : 'left' }}>{name}</div>
                <div style={{ background: isAdmin ? '#1890ff' : '#f0f0f0', color: isAdmin ? '#fff' : '#000', padding: '8px 12px', borderRadius: isAdmin ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: 14, wordBreak: 'break-word' }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2, textAlign: isAdmin ? 'right' : 'left' }}>{formatTime(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <TextArea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Введите ответ клиенту... (Ctrl+Enter для отправки)" rows={3} style={{ flex: 1 }} onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') sendMessage(); }} />
          <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} loading={sending} disabled={!messageText.trim()}>Отправить</Button>
        </div>
        {ticket.support_chat_id && (
          <Button size="small" type="link" icon={<LinkOutlined />} style={{ marginTop: 8 }} onClick={() => window.open(`/support-chat/${ticket.support_chat_id}`, '_blank')}>
            Открыть чат #{ticket.support_chat_id}
          </Button>
        )}
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div style={{ maxHeight: 560, overflowY: 'auto' }}>
      {activityLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : activities.length === 0 ? (
        <Empty description="Нет событий в истории" />
      ) : (
        activities.map((act: any) => (
          <div key={act.id} style={{ display: 'flex', gap: 10, padding: '10px 4px', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }}>{activityIcon(act.activity_type)}</div>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 13 }}>{act.text}</Text>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                {act.actor ? `${act.actor.first_name} ${act.actor.last_name}`.trim() : 'Система'} · {formatTime(act.created_at)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
      <div style={{ padding: '0 24px' }}>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/admin/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <ArrowLeftOutlined /><span>Админ панель</span>
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Тикеты</Breadcrumb.Item>
          <Breadcrumb.Item>Тикет {ticket.ticket_number}</Breadcrumb.Item>
        </Breadcrumb>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileTextOutlined />
                  <span>Тикет {ticket.ticket_number}: {ticket.subject}</span>
                  {ticket.auto_created && <Tag color="blue">Из чата</Tag>}
                </div>
              }
              extra={
                <Space>
                  <Select value={ticket.status} onChange={handleUpdateStatus} style={{ width: 140 }} size="small">
                    <Option value="open">Открыт</Option>
                    <Option value="in_progress">В работе</Option>
                    <Option value="completed">Завершен</Option>
                  </Select>
                  <Select value={ticket.priority} onChange={handleUpdatePriority} style={{ width: 120 }} size="small">
                    <Option value="low">Низкий</Option>
                    <Option value="medium">Средний</Option>
                    <Option value="high">Высокий</Option>
                    <Option value="urgent">Срочный</Option>
                  </Select>
                </Space>
              }
            >
              <Card size="small" title="Описание проблемы" style={{ marginBottom: 16 }}>
                <Text>{ticket.description}</Text>
              </Card>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'chat',
                    label: <span><MessageOutlined style={{ marginRight: 4 }} />Переписка{chatMessages.length > 0 && <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{chatMessages.length}</Tag>}</span>,
                    children: renderChatTab(),
                  },
                  {
                    key: 'activity',
                    label: <span><HistoryOutlined style={{ marginRight: 4 }} />История действий{activities.length > 0 && <Tag color="default" style={{ marginLeft: 6, fontSize: 11 }}>{activities.length}</Tag>}</span>,
                    children: renderActivityTab(),
                  },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Информация о тикете" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Статус"><Tag color={getStatusColor(ticket.status)}>{getStatusText(ticket.status)}</Tag></Descriptions.Item>
                <Descriptions.Item label="Приоритет"><Tag color={getPriorityColor(ticket.priority)}>{getPriorityText(ticket.priority)}</Tag></Descriptions.Item>
                <Descriptions.Item label="Клиент">
                  <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    <div>
                      <div>{ticket.user.first_name} {ticket.user.last_name}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{ticket.user.email}</Text>
                    </div>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Создан">{new Date(ticket.created_at).toLocaleString('ru-RU')}</Descriptions.Item>
                <Descriptions.Item label="Обновлен">{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ru })}</Descriptions.Item>
                {ticket.support_chat_id && (
                  <Descriptions.Item label="Связанный чат">
                    <Button type="link" icon={<LinkOutlined />} onClick={() => window.open(`/support-chat/${ticket.support_chat_id}`, '_blank')} style={{ padding: 0 }}>Чат #{ticket.support_chat_id}</Button>
                  </Descriptions.Item>
                )}
                {ticket.order_id && (
                  <Descriptions.Item label="Связанный заказ">
                    <Button type="link" icon={<LinkOutlined />} onClick={() => window.open(`/orders/${ticket.order_id}`, '_blank')} style={{ padding: 0 }}>Заказ #{ticket.order_id}</Button>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="Команда" size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {ticket.admin && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Ответственный:</Text>
                    <Space>
                      <Avatar size={32} icon={<UserOutlined />} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{ticket.admin.first_name} {ticket.admin.last_name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Администратор</Text>
                      </div>
                    </Space>
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Наблюдатели ({ticket.assigned_users?.length ?? 0}):</Text>
                    <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setAssignModalVisible(true)}>Добавить</Button>
                  </div>
                  {ticket.assigned_users && ticket.assigned_users.length > 0 ? (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {ticket.assigned_users.map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                          <Avatar size={24} icon={<UserOutlined />} />
                          <span style={{ fontSize: 13 }}>{u.first_name} {u.last_name}</span>
                        </div>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13 }}>Нет наблюдателей</Text>
                  )}
                </div>
              </Space>
            </Card>

            <Card title="Теги" size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {ticket.tags_list && ticket.tags_list.length > 0 && (
                  <Space wrap size="small">
                    {ticket.tags_list.map(tag => (
                      <Tag key={tag} color={tag.includes('негатив') ? 'red' : tag.includes('срочно') ? 'orange' : 'blue'} closable onClose={() => handleRemoveTag(tag)}>{tag}</Tag>
                    ))}
                  </Space>
                )}
                <Button block size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setTagModalVisible(true)}>Добавить тег</Button>
              </Space>
            </Card>

            <Card title="Быстрые действия" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => handleUpdateStatus('in_progress')} disabled={ticket.status === 'in_progress'}>Взять в работу</Button>
                <Button block onClick={() => handleUpdateStatus('completed')} disabled={ticket.status === 'completed'}>Завершить тикет</Button>
                <Button block onClick={() => handleUpdatePriority('high')} disabled={ticket.priority === 'high' || ticket.priority === 'urgent'}>Повысить приоритет</Button>
              </Space>
            </Card>
          </Col>
        </Row>

        <Modal title="Назначить сотрудников" open={assignModalVisible} onOk={handleAssignUsers} onCancel={() => { setAssignModalVisible(false); setSelectedUserIds([]); }} okText="Назначить" cancelText="Отмена">
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {adminUsers.map((u: any) => (
              <div key={u.id} style={{ padding: '8px 0' }}>
                <Checkbox checked={selectedUserIds.includes(u.id)} onChange={(e) => setSelectedUserIds(e.target.checked ? [...selectedUserIds, u.id] : selectedUserIds.filter(id => id !== u.id))}>
                  <Space><Avatar size={24} icon={<UserOutlined />} /><span>{u.first_name} {u.last_name}</span><Text type="secondary">({u.email})</Text></Space>
                </Checkbox>
              </div>
            ))}
          </div>
        </Modal>

        <Modal title="Добавить тег" open={tagModalVisible} onOk={handleAddTag} onCancel={() => { setTagModalVisible(false); setNewTag(''); }} okText="Добавить" cancelText="Отмена">
          <Input placeholder="Введите тег (например: #негатив, #срочно)" value={newTag} onChange={(e) => setNewTag(e.target.value)} onPressEnter={handleAddTag} prefix={<TagOutlined />} />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Популярные теги:</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {['#негатив', '#срочно', '#баг', '#улучшение', '#вопрос'].map(tag => (
                  <Tag key={tag} style={{ cursor: 'pointer' }} onClick={() => setNewTag(tag)}>{tag}</Tag>
                ))}
              </Space>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default TicketDetailPage;
