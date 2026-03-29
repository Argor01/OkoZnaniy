import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Button, Card, Descriptions, Empty, Input, message as antMessage,
  Modal, Select, Space, Spin, Tag, Typography, Row, Col, Divider, Rate, Tooltip,
  InputNumber, Popconfirm
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, SendOutlined, FileTextOutlined,
  LinkOutlined, CheckCircleOutlined, CloseCircleOutlined, DollarOutlined,
  MessageOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  TeamOutlined, HistoryOutlined, SwapOutlined, StarOutlined, EyeOutlined,
  TagOutlined, PlusOutlined, UndoOutlined, CustomerServiceOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTicketActions, useAdminUsers, useTicketByNumber, useTicketActivity } from '@/features/admin/hooks';
import { AdminLayout } from '@/features/admin/components/Layout';
import '../../../styles/arbitration-detail.css';

const { Text, Title, Paragraph } = Typography;
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
  plaintiff?: { id: number; first_name: string; last_name: string; email: string };
  defendant?: { id: number; first_name: string; last_name: string; email: string };
  reason?: string;
  refund_type?: 'full' | 'partial' | 'none';
  refund_percentage?: number;
  refund_amount?: number;
  claim_type?: string;
  order?: { id: number; title: string; amount: number; status: string };
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    new: { color: '#fa8c16', text: 'Новый', icon: <ExclamationCircleOutlined /> },
    open: { color: '#fa8c16', text: 'Открыт', icon: <ExclamationCircleOutlined /> },
    in_progress: { color: '#1890ff', text: 'В работе', icon: <ClockCircleOutlined /> },
    completed: { color: '#52c41a', text: 'Завершен', icon: <CheckCircleOutlined /> },
    pending_approval: { color: '#722ed1', text: 'Ожидает одобрения', icon: <ClockCircleOutlined /> },
  };
  return configs[status] || { color: '#8c8c8c', text: status, icon: <FileTextOutlined /> };
};

const getPriorityConfig = (priority: string) => {
  const configs: Record<string, { color: string; text: string }> = {
    low: { color: '#52c41a', text: 'Низкий' },
    medium: { color: '#fa8c16', text: 'Средний' },
    high: { color: '#ff4d4f', text: 'Высокий' },
    urgent: { color: '#722ed1', text: 'Срочный' },
  };
  return configs[priority] || { color: '#8c8c8c', text: priority };
};

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

const formatRelativeTime = (iso: string) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru }); }
  catch { return iso; }
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

export const ArbitrationDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundPercentage, setRefundPercentage] = useState(0);
  const [finalModalVisible, setFinalModalVisible] = useState(false);
  const [finalText, setFinalText] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { ticket: rawTicket, loading, refetch } = useTicketByNumber(ticketId || '');
  const ticket = rawTicket as unknown as TicketDetail | null;
  const { feed, loading: feedLoading, refetch: refetchFeed } = useTicketActivity(ticket?.id ?? null, ticket?.type ?? null);
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus } = useTicketActions();

  const doRefetch = () => { refetch(); refetchFeed(); };

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !ticket) return;
    setSending(true);
    try { 
      await sendTicketMessage(ticket.id, replyText, ticket.type); 
      setReplyText(''); 
      doRefetch(); 
      antMessage.success('Сообщение отправлено');
    } catch { 
      antMessage.error('Не удалось отправить сообщение'); 
    } finally { 
      setSending(false); 
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!ticket) return;
    try { 
      await updateTicketStatus(ticket.id, status, ticket.type); 
      doRefetch(); 
      antMessage.success('Статус обновлен');
    } catch { 
      antMessage.error('Не удалось обновить статус'); 
    }
  };

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
        antMessage.success(`Возврат ${refundPercentage}% оформлен`);
        setRefundModalVisible(false);
        doRefetch();
      } else {
        antMessage.error('Ошибка при оформлении возврата');
      }
    } catch {
      antMessage.error('Ошибка при оформлении возврата');
    } finally {
      setSending(false);
    }
  };

  const handleFinalClose = async () => {
    if (!finalText.trim() || !ticket) return;
    setSending(true);
    try {
      await sendTicketMessage(ticket.id, finalText, ticket.type);
      await updateTicketStatus(ticket.id, 'completed', ticket.type);
      setFinalModalVisible(false);
      setFinalText('');
      doRefetch();
      antMessage.success('Обращение закрыто');
    } catch { 
      antMessage.error('Ошибка при закрытии'); 
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (msg: any, isAdmin: boolean) => (
    <div key={msg.id} className={`message-bubble ${isAdmin ? 'mine' : ''}`}>
      <div className="message-avatar">
        {getInitials(msg.sender?.first_name || '', msg.sender?.last_name || '')}
      </div>
      <div className="message-content">
        <div className="message-bubble-header">
          <span className="message-sender-name">
            {msg.sender?.first_name} {msg.sender?.last_name}
          </span>
          {isAdmin && <Tag color="blue" className="role-badge admin">Админ</Tag>}
          <span className="message-time">{formatTime(msg.created_at)}</span>
        </div>
        <div className="message-text">{msg.message}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
        <div className="arbitration-page">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Spin size="large" tip="Загрузка обращения..." />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
        <div className="arbitration-page">
          <Card className="arbitration-card">
            <Empty description="Обращение не найдено" />
            <Button type="primary" onClick={() => navigate('/admin/dashboard')}>
              Вернуться к списку
            </Button>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);

  return (
    <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
      <div className="arbitration-page">
        {/* Header */}
        <div className="arbitration-header">
          <div>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/admin/dashboard')}
              style={{ marginBottom: 8 }}
            >
              Назад к списку
            </Button>
            <h1>
              <FileTextOutlined style={{ color: '#1890ff' }} />
              {ticket.type === 'claim' ? 'Арбитражное обращение' : 'Обращение в поддержку'}
              <span className="ticket-number">#{ticket.ticket_number}</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Tag 
              className="arbitration-status-badge" 
              style={{ background: statusConfig.color + '15', color: statusConfig.color }}
            >
              {statusConfig.icon} {statusConfig.text}
            </Tag>
            <Tag color={getPriorityConfig(ticket.priority).color}>
              {getPriorityConfig(ticket.priority).text}
            </Tag>
          </div>
        </div>

        {/* Основная информация для арбитража */}
        {ticket.type === 'claim' && (
          <div className="arbitration-details-grid">
            {/* Истец */}
            <Card className="detail-card">
              <div className="detail-card-label">Истец</div>
              {ticket.plaintiff ? (
                <div className="party-card plaintiff">
                  <div className="party-avatar">
                    {getInitials(ticket.plaintiff.first_name, ticket.plaintiff.last_name)}
                  </div>
                  <div className="party-info">
                    <h4>{ticket.plaintiff.first_name} {ticket.plaintiff.last_name}</h4>
                    <p>{ticket.plaintiff.email}</p>
                  </div>
                </div>
              ) : (
                <div className="party-info">
                  <Text>{ticket.user.first_name} {ticket.user.last_name}</Text>
                  <br />
                  <Text type="secondary">{ticket.user.email}</Text>
                </div>
              )}
            </Card>

            {/* Ответчик */}
            <Card className="detail-card">
              <div className="detail-card-label">Ответчик</div>
              {ticket.defendant ? (
                <div className="party-card defendant">
                  <div className="party-avatar" style={{ background: '#fa8c16' }}>
                    {getInitials(ticket.defendant.first_name, ticket.defendant.last_name)}
                  </div>
                  <div className="party-info">
                    <h4>{ticket.defendant.first_name} {ticket.defendant.last_name}</h4>
                    <p>{ticket.defendant.email}</p>
                  </div>
                </div>
              ) : (
                <div className="party-info">
                  <Text>Не указан</Text>
                </div>
              )}
            </Card>

            {/* Причина */}
            <Card className="detail-card">
              <div className="detail-card-label">Причина обращения</div>
              <div className="detail-card-value">
                {ticket.reason ? {
                  order_not_completed: 'Заказ не выполнен',
                  poor_quality: 'Низкое качество',
                  deadline_violation: 'Нарушение сроков',
                  contact_violation: 'Нарушение контактов',
                  other: 'Другое',
                }[ticket.reason] : 'Не указана'}
              </div>
            </Card>

            {/* Дата создания */}
            <Card className="detail-card">
              <div className="detail-card-label">Дата создания</div>
              <div className="detail-card-value">
                <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                {formatTime(ticket.created_at)}
              </div>
            </Card>

            {/* Связанный заказ */}
            {ticket.order && (
              <Card className="detail-card">
                <div className="detail-card-label">Связанный заказ</div>
                <div className="detail-card-value">
                  <LinkOutlined style={{ color: '#1890ff' }} />
                  <a href={`/orders/${ticket.order.id}`} target="_blank" rel="noopener noreferrer">
                    #{ticket.order.id} - {ticket.order.title}
                  </a>
                </div>
              </Card>
            )}

            {/* Финансовые требования */}
            {ticket.refund_type && (
              <Card className="detail-card">
                <div className="detail-card-label">Финансовые требования</div>
                <div className="detail-card-value" style={{ color: '#fa8c16' }}>
                  <DollarOutlined />
                  {ticket.refund_type === 'full' ? 'Полный возврат' : 
                   ticket.refund_type === 'partial' ? `Частичный (${ticket.refund_percentage}%)` : 
                   'Без возврата'}
                </div>
              </Card>
            )}
          </div>
        )}

        <Row gutter={[24, 24]}>
          {/* Основная колонка - сообщения */}
          <Col xs={24} lg={ticket.type === 'claim' ? 16 : 18}>
            <Card className="arbitration-card" title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MessageOutlined style={{ color: '#1890ff' }} />
                Переписка
              </span>
            }>
              {/* Описание проблемы */}
              {ticket.description && (
                <>
                  <div style={{ marginBottom: 20, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Описание проблемы:</Text>
                    <Paragraph style={{ margin: 0 }}>{ticket.description}</Paragraph>
                  </div>
                  <Divider />
                </>
              )}

              {/* Лента сообщений */}
              <div className="message-timeline">
                {feedLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                  </div>
                ) : feed.length === 0 ? (
                  <Empty description="Нет сообщений" style={{ padding: 40 }} />
                ) : (
                  feed.map((item: any) => 
                    item.kind === 'message' 
                      ? renderMessage(item, item.is_admin)
                      : (
                          <div key={item.id} style={{ textAlign: 'center', padding: 8, color: '#8c8c8c', fontSize: 12 }}>
                            <HistoryOutlined style={{ marginRight: 4 }} />
                            {item.text}
                          </div>
                        )
                  )
                )}
                <div ref={feedEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="message-input-container">
                <TextArea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Введите сообщение... (Ctrl+Enter для отправки)"
                  rows={3}
                  className="message-input"
                  onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleSendMessage(); }}
                />
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={sending}
                  disabled={!replyText.trim()}
                  className="message-send-button"
                >
                  Отправить
                </Button>
              </div>
            </Card>
          </Col>

          {/* Боковая панель - действия */}
          <Col xs={24} lg={ticket.type === 'claim' ? 8 : 6}>
            {/* Кнопка открытия чата для арбитража */}
            {ticket.type === 'claim' && ticket.support_chat_id && (
              <Card className="arbitration-card" style={{ marginBottom: 24, borderLeft: '4px solid #1890ff' }}>
                <div style={{ textAlign: 'center' }}>
                  <MessageOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 12 }} />
                  <Title level={5} style={{ margin: '0 0 8px 0' }}>История переписки</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                    Изучите все сообщения между сторонами для понимания сути конфликта
                  </Text>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<LinkOutlined />}
                    onClick={() => window.open(`/support-chat/${ticket.support_chat_id}`, '_blank')}
                    block
                  >
                    Открыть чат между сторонами
                  </Button>
                </div>
              </Card>
            )}

            {/* Карточка с информацией */}
            <Card className="arbitration-card" title="Информация" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Клиент">
                  <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    {ticket.user.first_name} {ticket.user.last_name}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{ticket.user.email}</Descriptions.Item>
                <Descriptions.Item label="Создано">{formatTime(ticket.created_at)}</Descriptions.Item>
                <Descriptions.Item label="Обновлено">{formatRelativeTime(ticket.updated_at)}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Карточка администратора */}
            {ticket.admin && (
              <Card className="arbitration-card" title="Ответственный" size="small" style={{ marginBottom: 16 }}>
                <Space>
                  <Avatar size={32} icon={<UserOutlined />} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{ticket.admin.first_name} {ticket.admin.last_name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Администратор</Text>
                  </div>
                </Space>
              </Card>
            )}

            {/* Кнопки действий */}
            <Card className="arbitration-card" title="Действия">
              <div className="action-buttons-grid">
                <Tooltip title={ticket.status === 'in_progress' ? 'Уже в работе' : 'Взять в работу'}>
                  <div 
                    className={`action-button ${ticket.status !== 'in_progress' ? 'primary' : ''}`}
                    onClick={() => ticket.status !== 'in_progress' && handleUpdateStatus('in_progress')}
                    style={{ opacity: ticket.status === 'in_progress' ? 0.5 : 1, cursor: ticket.status === 'in_progress' ? 'not-allowed' : 'pointer' }}
                  >
                    <TeamOutlined className="action-button-icon" />
                    <span className="action-button-text">Взять в работу</span>
                  </div>
                </Tooltip>

                {ticket.type === 'claim' && (
                  <Popconfirm
                    title="Оформить возврат средств?"
                    description={
                      <div style={{ padding: '12px 0' }}>
                        <InputNumber
                          value={refundPercentage}
                          onChange={(v) => setRefundPercentage(v || 0)}
                          min={0}
                          max={100}
                          style={{ width: '100%' }}
                          formatter={(v) => `${v}%`}
                          parser={(v) => Number(v?.replace('%', ''))}
                        />
                        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                          Укажите процент возврата от суммы заказа
                        </Text>
                      </div>
                    }
                    onConfirm={handleProcessRefund}
                    okText="Оформить"
                    cancelText="Отмена"
                    icon={<DollarOutlined style={{ color: '#fa8c16' }} />}
                  >
                    <div className="action-button success">
                      <DollarOutlined className="action-button-icon" />
                      <span className="action-button-text">Возврат средств</span>
                    </div>
                  </Popconfirm>
                )}

                <Popconfirm
                  title="Закрыть обращение?"
                  description={
                    <div style={{ padding: '12px 0' }}>
                      <TextArea
                        value={finalText}
                        onChange={(e) => setFinalText(e.target.value)}
                        placeholder="Введите финальный ответ клиенту..."
                        rows={3}
                        autoFocus
                      />
                    </div>
                  }
                  onConfirm={handleFinalClose}
                  okText="Закрыть"
                  cancelText="Отмена"
                  okButtonProps={{ disabled: !finalText.trim() }}
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                >
                  <div className="action-button danger">
                    <CheckCircleOutlined className="action-button-icon" />
                    <span className="action-button-text">Закрыть</span>
                  </div>
                </Popconfirm>
              </div>

              <Divider />

              {/* Смена статуса и приоритета */}
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text strong style={{ fontSize: 13 }}>Статус:</Text>
                <Select 
                  value={ticket.status} 
                  onChange={handleUpdateStatus} 
                  style={{ width: '100%' }}
                  size="large"
                >
                  <Option value="new">Новый</Option>
                  <Option value="open">Открыт</Option>
                  <Option value="in_progress">В работе</Option>
                  <Option value="completed">Завершен</Option>
                </Select>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
};

export default ArbitrationDetailPage;
