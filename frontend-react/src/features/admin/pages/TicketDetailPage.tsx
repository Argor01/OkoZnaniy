import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Descriptions, Input, Select, Tag, Avatar,
  Space, message, Spin, Empty, Breadcrumb, Row, Col, Modal, Checkbox, InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, SendOutlined, FileTextOutlined,
  LinkOutlined, TagOutlined, PlusOutlined, SwapOutlined, StarOutlined,
  EyeOutlined, MessageOutlined, HistoryOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAdminAuth, useTicketActions, useAdminUsers, useTicketByNumber, useTicketActivity } from '@/features/admin/hooks';
import { AdminLayout } from '@/features/admin/components/Layout';
import type { MenuKey } from '@/features/admin/types';
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
  // Поля для арбитража
  plaintiff?: { id: number; first_name: string; last_name: string; email: string };
  defendant?: { id: number; first_name: string; last_name: string; email: string };
  reason?: string;
  refund_type?: 'full' | 'partial' | 'none';
  refund_percentage?: number;
  refund_amount?: number;
  claim_type?: string;
}

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  status_change: <SwapOutlined style={{ color: '#1890ff' }} />,
  priority_change: <StarOutlined style={{ color: '#faad14' }} />,
  tag_added: <TagOutlined style={{ color: '#52c41a' }} />,
  tag_removed: <TagOutlined style={{ color: '#ff4d4f' }} />,
  observer_added: <EyeOutlined style={{ color: '#722ed1' }} />,
  observer_removed: <EyeOutlined style={{ color: '#ff4d4f' }} />,
  assigned: <UserOutlined style={{ color: '#1890ff' }} />,
  completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
};

const fmt = (iso: string) => {
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
  const { user, handleLogout } = useAdminAuth();
  const [replyText, setReplyText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [sending, setSending] = useState(false);
  const [finalModalVisible, setFinalModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [refundPercentage, setRefundPercentage] = useState(0);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { ticket: rawTicket, loading, refetch } = useTicketByNumber(ticketId || '');
  const ticket = rawTicket as unknown as TicketDetail | null;
  const { adminUsers } = useAdminUsers();
  const { feed, loading: feedLoading, refetch: refetchFeed } =
    useTicketActivity(ticket?.id ?? null, ticket?.type ?? null);
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus, updatePriority: updateTicketPriority, assignUsers, addTag, removeTag } = useTicketActions();

  const handleMenuSelect = (key: MenuKey) => {
    try {
      localStorage.setItem('adminDashboard_selectedMenu', key);
    } catch {
      // Ignore storage failures and still navigate back to the dashboard.
    }

    navigate('/admin/dashboard');
  };

  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get('action');
    if (action === 'tags') setTagModalVisible(true);
    else if (action === 'team-chat') setAssignModalVisible(true);
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  const doRefetch = () => { refetch(); refetchFeed(); };

  const handleProcessRefund = async () => {
    if (!ticket) return;
    setSending(true);
    try {
      const endpoint = ticket.type === 'claim'
        ? `/api/admin-panel/claims/${ticket.id}/process_refund/`
        : `/api/admin-panel/support-requests/${ticket.id}/process_refund/`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refund_percentage: refundPercentage }),
      });
      if (response.ok) {
        message.success(`Возврат ${refundPercentage}% оформлен`);
        setRefundModalVisible(false);
        doRefetch();
      } else {
        message.error('Ошибка при оформлении возврата');
      }
    } catch {
      message.error('Ошибка при оформлении возврата');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    setSending(true);
    try { await sendTicketMessage(ticket.id, replyText, ticket.type); setReplyText(''); doRefetch(); }
    catch { message.error('Не удалось отправить сообщение'); }
    finally { setSending(false); }
  };

  const sendFinalReply = async () => {
    if (!finalText.trim() || !ticket) return;
    setSending(true);
    try {
      await sendTicketMessage(ticket.id, finalText, ticket.type);
      await updateTicketStatus(ticket.id, 'completed', ticket.type);
      setFinalText('');
      setFinalModalVisible(false);
      doRefetch();
      message.success('Финальный ответ отправлен, тикет закрыт');
    } catch { message.error('Ошибка при отправке финального ответа'); }
    finally { setSending(false); }
  };

  const handleUpdateStatus = async (s: string) => {
    if (!ticket) return;
    try { await updateTicketStatus(ticket.id, s, ticket.type); doRefetch(); }
    catch { message.error('Не удалось обновить статус'); }
  };

  const handleUpdatePriority = async (p: string) => {
    if (!ticket) return;
    try { await updateTicketPriority(ticket.id, p, ticket.type); doRefetch(); }
    catch { message.error('Не удалось обновить приоритет'); }
  };

  const handleAssignUsers = async () => {
    if (!ticket || selectedUserIds.length === 0) return;
    try { await assignUsers(ticket.id, selectedUserIds, ticket.type); setAssignModalVisible(false); setSelectedUserIds([]); doRefetch(); }
    catch { message.error('Не удалось назначить пользователей'); }
  };

  const handleAddTag = async () => {
    if (!ticket || !newTag.trim()) return;
    try { await addTag(ticket.id, newTag.trim(), ticket.type); setTagModalVisible(false); setNewTag(''); doRefetch(); }
    catch { message.error('Не удалось добавить тег'); }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!ticket) return;
    try { await removeTag(ticket.id, tag, ticket.type); doRefetch(); }
    catch { message.error('Не удалось удалить тег'); }
  };

  if (loading) {
    return (
      <AdminLayout user={user} selectedMenu="tickets" onMenuSelect={handleMenuSelect} onLogout={handleLogout}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><Spin size="large" /></div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout user={user} selectedMenu="tickets" onMenuSelect={handleMenuSelect} onLogout={handleLogout}>
        <Card>
          <Empty description="Обращение не найдено" />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/admin/dashboard')}>Вернуться к обращениям</Button>
          </div>
        </Card>
      </AdminLayout>
    );
  }

  // Единая лента: сообщения + события активности, отсортированные по времени
  const renderFeedItem = (item: any) => {
    if (item.kind === 'message') {
      const isAdmin = item.is_admin;
      const name = `${item.sender?.first_name ?? ''} ${item.sender?.last_name ?? ''}`.trim() || 'Пользователь';
      const fromChat = item.source === 'chat';
      return (
        <div key={item.id} style={{ display: 'flex', flexDirection: isAdmin ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 16, padding: '0 4px' }}>
          <Avatar size={32} icon={<UserOutlined />} style={{ background: isAdmin ? '#1890ff' : '#52c41a', flexShrink: 0 }} />
          <div style={{ maxWidth: '72%' }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 3, textAlign: isAdmin ? 'right' : 'left' }}>
              {name}
              {fromChat && <Tag color="cyan" style={{ marginLeft: 4, fontSize: 10, lineHeight: '16px' }}>из чата</Tag>}
            </div>
            <div style={{
              background: isAdmin ? '#1890ff' : '#f0f0f0',
              color: isAdmin ? '#fff' : '#000',
              padding: '8px 14px',
              borderRadius: isAdmin ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
              fontSize: 14,
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}>
              {item.text}
            </div>
            <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 3, textAlign: isAdmin ? 'right' : 'left' }}>{fmt(item.created_at)}</div>
          </div>
        </div>
      );
    }

    // activity item
    const icon = ACTIVITY_ICON[item.activity_type] ?? <HistoryOutlined style={{ color: '#8c8c8c' }} />;
    const actor = item.actor ? `${item.actor.first_name} ${item.actor.last_name}`.trim() : 'Система';
    return (
      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', marginBottom: 4 }}>
        <div style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>{icon}</div>
        <div style={{ flex: 1, fontSize: 12, color: '#595959' }}>
          {item.text}
          <span style={{ color: '#bfbfbf', marginLeft: 6 }}>{actor} · {fmt(item.created_at)}</span>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout user={user} selectedMenu="tickets" onMenuSelect={handleMenuSelect} onLogout={handleLogout}>
      <div style={{ padding: '0 24px' }}>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/admin/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <ArrowLeftOutlined /><span>Админ панель</span>
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Обращения</Breadcrumb.Item>
          <Breadcrumb.Item>Обращение {ticket.ticket_number}</Breadcrumb.Item>
        </Breadcrumb>

        <Row gutter={[24, 24]}>
          {/* Основная колонка - для арбитража показываем кнопку открытия чата */}
          <Col xs={24} lg={ticket.type === 'claim' ? 24 : 16}>
            {ticket.type === 'claim' && ticket.support_chat_id && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>История переписки между сторонами</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Изучите все сообщения для понимания сути конфликта
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<MessageOutlined />}
                    onClick={() => window.open(`/support-chat/${ticket.support_chat_id}`, '_blank')}
                  >
                    Открыть чат между сторонами
                  </Button>
                </div>
              </Card>
            )}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileTextOutlined />
                  <span>Обращение {ticket.ticket_number}: {ticket.subject}</span>
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
              {/* Описание */}
              <Card size="small" title="Описание проблемы" style={{ marginBottom: 16 }}>
                <Text>{ticket.description}</Text>
              </Card>

              {/* Единая лента */}
              <div style={{ minHeight: 200, maxHeight: 520, overflowY: 'auto', padding: '8px 4px', marginBottom: 16, borderTop: '1px solid #f0f0f0' }}>
                {feedLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                ) : feed.length === 0 ? (
                  <Empty description="История пуста" style={{ padding: 32 }} />
                ) : (
                  feed.map((item: any) => renderFeedItem(item))
                )}
                <div ref={feedEndRef} />
              </div>

              {/* Форма ответа */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <TextArea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Написать клиенту... (Ctrl+Enter для отправки)"
                    rows={3}
                    style={{ flex: 1 }}
                    onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') sendReply(); }}
                  />
                  <Space direction="vertical">
                    <Button type="primary" icon={<SendOutlined />} onClick={sendReply} loading={sending} disabled={!replyText.trim()}>
                      Ответить
                    </Button>
                    <Button
                      icon={<CloseCircleOutlined />}
                      onClick={() => setFinalModalVisible(true)}
                      disabled={ticket.status === 'completed'}
                      style={{ borderColor: '#52c41a', color: '#52c41a' }}
                    >
                      Закрыть обращение
                    </Button>
                  </Space>
                </div>
                {ticket.support_chat_id && (
                  <Button size="small" type="link" icon={<LinkOutlined />} style={{ marginTop: 6 }} onClick={() => window.open(`/support-chat/${ticket.support_chat_id}`, '_blank')}>
                    Открыть чат #{ticket.support_chat_id}
                  </Button>
                )}
              </div>
            </Card>
          </Col>

          {/* Боковая панель */}
          <Col xs={24} lg={8}>
            <Card title="Информация об обращении" size="small" style={{ marginBottom: 16 }}>
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

            {/* Секция арбитража для претензий */}
            {ticket.type === 'claim' && (
              <Card title="Детали арбитража" size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={1} size="small">
                  {ticket.plaintiff && (
                    <Descriptions.Item label="Истец">
                      <Space>
                        <Avatar size={24} icon={<UserOutlined />} />
                        <span>{ticket.plaintiff.first_name} {ticket.plaintiff.last_name}</span>
                      </Space>
                    </Descriptions.Item>
                  )}
                  {ticket.defendant && (
                    <Descriptions.Item label="Ответчик">
                      <Space>
                        <Avatar size={24} icon={<UserOutlined />} />
                        <span>{ticket.defendant.first_name} {ticket.defendant.last_name}</span>
                      </Space>
                    </Descriptions.Item>
                  )}
                  {ticket.reason && (
                    <Descriptions.Item label="Причина">
                      {{
                        order_not_completed: 'Заказ не выполнен',
                        poor_quality: 'Низкое качество',
                        deadline_violation: 'Нарушение сроков',
                        contact_violation: 'Нарушение контактов',
                        other: 'Другое',
                      }[ticket.reason]}
                    </Descriptions.Item>
                  )}
                  {ticket.refund_type && (
                    <Descriptions.Item label="Возврат">
                      {{
                        full: 'Полный возврат',
                        partial: `Частичный (${ticket.refund_percentage}%)`,
                        none: 'Без возврата',
                      }[ticket.refund_type]}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            <Card title="Быстрые действия" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => handleUpdateStatus('in_progress')} disabled={ticket.status === 'in_progress'}>Взять в работу</Button>
                <Button block onClick={() => handleUpdatePriority('high')} disabled={ticket.priority === 'high' || ticket.priority === 'urgent'}>Повысить приоритет</Button>
                {ticket.type === 'claim' && (
                  <Button
                    block
                    icon={<DollarOutlined />}
                    onClick={() => setRefundModalVisible(true)}
                    disabled={ticket.status === 'completed'}
                  >
                    Возврат средств
                  </Button>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Модал: финальный ответ */}
        <Modal
          title="Финальный ответ и закрытие обращения"
          open={finalModalVisible}
          onOk={sendFinalReply}
          onCancel={() => { setFinalModalVisible(false); setFinalText(''); }}
          okText="Отправить и закрыть"
          cancelText="Отмена"
          okButtonProps={{ loading: sending, disabled: !finalText.trim() }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Это сообщение будет отправлено клиенту, после чего тикет будет закрыт.
          </Text>
          <TextArea
            value={finalText}
            onChange={(e) => setFinalText(e.target.value)}
            placeholder="Введите финальный ответ клиенту..."
            rows={5}
            autoFocus
          />
        </Modal>

        {/* Модал: назначить наблюдателей */}
        <Modal title="Назначить сотрудников" open={assignModalVisible} onOk={handleAssignUsers} onCancel={() => { setAssignModalVisible(false); setSelectedUserIds([]); }} okText="Назначить" cancelText="Отмена">
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {adminUsers.map((u: any) => (
              <div key={u.id} style={{ padding: '8px 0' }}>
                <Checkbox checked={selectedUserIds.includes(u.id)} onChange={(e) => setSelectedUserIds(e.target.checked ? [...selectedUserIds, u.id] : selectedUserIds.filter((id: number) => id !== u.id))}>
                  <Space><Avatar size={24} icon={<UserOutlined />} /><span>{u.first_name} {u.last_name}</span><Text type="secondary">({u.email})</Text></Space>
                </Checkbox>
              </div>
            ))}
          </div>
        </Modal>

        {/* Модал: возврат средств */}
        <Modal
          title="Возврат средств по претензии"
          open={refundModalVisible}
          onOk={handleProcessRefund}
          onCancel={() => { setRefundModalVisible(false); setRefundPercentage(0); }}
          okText="Оформить возврат"
          cancelText="Отмена"
          okButtonProps={{ loading: sending }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Укажите процент возврата средств клиенту:
          </Text>
          <InputNumber
            value={refundPercentage}
            onChange={(value) => setRefundPercentage(value || 0)}
            min={0}
            max={100}
            style={{ width: '100%' }}
            formatter={(value) => `${value}%`}
            parser={(value) => Number(value?.replace('%', ''))}
            size="large"
          />
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text type="secondary">
              При указании 100% будет оформлен полный возврат суммы заказа.
            </Text>
          </div>
        </Modal>

        {/* Модал: добавить тег */}
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
