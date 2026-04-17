import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Descriptions, Tag, Button, Space, Input,
  message, Spin, Empty, Typography, Divider, Avatar, Timeline,
  Popconfirm, Tooltip, Modal, Select, InputNumber
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, SendOutlined, FileTextOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DollarOutlined,
  ClockCircleOutlined, MessageOutlined, HistoryOutlined,
  ExclamationCircleOutlined, LinkOutlined
} from '@ant-design/icons';
import { AdminLayout } from '@/features/admin/components/Layout';
import { useAdminAuth } from '@/features/admin/hooks';
import { apiClient } from '@/api/client';
import type { MenuKey } from '@/features/admin/types';
import './ArbitrationCaseDetailPage.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ArbitrationCaseDetail {
  id: number;
  case_number: string;
  plaintiff: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  defendant?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  order?: {
    id: number;
    title: string;
  };
  subject: string;
  description: string;
  reason: string;
  reason_display: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  refund_type: string;
  refund_type_display: string;
  requested_refund_percentage: number;
  requested_refund_amount?: number;
  approved_refund_percentage?: number;
  approved_refund_amount?: number;
  assigned_admin?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  decision?: string;
  decision_made_by?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  decision_date?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  closed_at?: string;
  deadline_relevant: boolean;
}

interface FeedItem {
  kind: 'message' | 'activity';
  id: string;
  created_at: string;
  sender?: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  text?: string;
  message_type?: string;
  is_internal?: boolean;
  source?: 'order_chat';
  source_label?: string;
  chat_id?: number;
  chat_context_title?: string | null;
  file_name?: string;
  file_url?: string | null;
  activity_type?: string;
  description?: string;
  actor?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

export const ArbitrationCaseDetailPage: React.FC = () => {
  const { caseNumber } = useParams<{ caseNumber: string }>();
  const navigate = useNavigate();
  const { user, handleLogout } = useAdminAuth();
  const [caseData, setCaseData] = useState<ArbitrationCaseDetail | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundPercentage, setRefundPercentage] = useState(100);
  const [refundAmount, setRefundAmount] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);

  const handleMenuSelect = (key: MenuKey) => {
    try {
      localStorage.setItem('adminDashboard_selectedMenu', key);
    } catch {
      // Ignore storage failures and still navigate back to the dashboard.
    }

    navigate('/admin/dashboard');
  };

  useEffect(() => {
    fetchCaseData();
  }, [caseNumber]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      const caseResponse = await apiClient.get(`/arbitration/cases/?case_number=${caseNumber}`);
      const caseList = caseResponse.data;
      const caseDetail = caseList.results?.[0] || caseList[0];
      
      if (!caseDetail) {
        message.error('Дело не найдено');
        return;
      }
      
      setCaseData(caseDetail);

      const feedResponse = await apiClient.get(`/arbitration/cases/${caseDetail.id}/activity-feed/`);
      setFeed(feedResponse.data.feed || []);
    } catch (error) {
      message.error('Ошибка при загрузке данных');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !caseData) return;

    try {
      setSending(true);
      await apiClient.post(`/arbitration/cases/${caseData.id}/send-message/`, { message: messageText });
      message.success('Сообщение отправлено');
      setMessageText('');
      fetchCaseData();
    } catch (error) {
      message.error('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const handleTakeInWork = async () => {
    if (!caseData) return;

    try {
      await apiClient.post(`/arbitration/cases/${caseData.id}/take-in-work/`);
      message.success('Дело взято в работу');
      fetchCaseData();
    } catch (error) {
      message.error('Ошибка');
    }
  };

  const handleCloseCase = async (finalMessage: string) => {
    if (!caseData) return;

    try {
      await apiClient.post(`/arbitration/cases/${caseData.id}/close-case/`, { message: finalMessage });
      message.success('Дело закрыто');
      fetchCaseData();
    } catch (error) {
      message.error('Ошибка при закрытии дела');
    }
  };

  const openRefundModal = () => {
    if (!caseData) return;

    setRefundPercentage(Number(caseData.requested_refund_percentage) || 100);
    setRefundAmount(caseData.requested_refund_amount ?? null);
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!caseData) return;

    if (!Number.isFinite(refundPercentage) || refundPercentage < 1 || refundPercentage > 100) {
      message.error('Укажите корректный процент возврата от 1 до 100');
      return;
    }

    try {
      setProcessingRefund(true);
      await apiClient.post(`/arbitration/cases/${caseData.id}/process-refund/`, {
        refund_percentage: refundPercentage,
        refund_amount: refundAmount ?? undefined,
      });
      message.success(`Возврат ${refundPercentage}% оформлен`);
      setRefundModalOpen(false);
      fetchCaseData();
    } catch (error) {
      message.error('Ошибка при оформлении возврата');
      console.error(error);
    } finally {
      setProcessingRefund(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      submitted: 'blue',
      under_review: 'processing',
      awaiting_response: 'warning',
      in_arbitration: 'orange',
      decision_made: 'success',
      closed: 'default',
      rejected: 'error',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'default';
  };

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      admin: 'Админ',
      client: 'Заказчик',
      expert: 'Исполнитель',
      user: 'Пользователь',
    };
    return labels[role || ''] || role || 'Участник';
  };

  if (loading) {
    return (
      <AdminLayout user={user} selectedMenu="arbitration" onMenuSelect={handleMenuSelect} onLogout={handleLogout}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spin size="large" tip="Загрузка дела..." />
        </div>
      </AdminLayout>
    );
  }

  if (!caseData) {
    return (
      <AdminLayout user={user} selectedMenu="arbitration" onMenuSelect={handleMenuSelect} onLogout={handleLogout}>
        <Card>
          <Empty description="Дело не найдено" />
          <Button type="primary" onClick={() => navigate('/admin/dashboard')}>
            Вернуться к списку
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user} selectedMenu="arbitration" onMenuSelect={handleMenuSelect} onLogout={handleLogout}>
      <div className="arbitration-detail-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/admin/dashboard')}
              style={{ marginBottom: 8 }}
            >
              Назад к списку
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              <FileTextOutlined style={{ color: '#1890ff', marginRight: 12 }} />
              Арбитражное дело #{caseData.case_number}
            </Title>
          </div>
          <Space>
            <Tag color={getStatusColor(caseData.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
              {caseData.status_display}
            </Tag>
            <Tag color={getPriorityColor(caseData.priority)} style={{ fontSize: 14, padding: '4px 12px' }}>
              {caseData.priority_display}
            </Tag>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* Левая колонка - Информация о деле */}
          <Col xs={24} lg={8}>
            {/* Стороны */}
            <Card title="Стороны" className="info-card" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className="party-info">
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Истец
                  </Text>
                  <Space>
                    <Avatar size={40} style={{ background: '#1890ff' }}>
                      {getInitials(caseData.plaintiff.first_name, caseData.plaintiff.last_name)}
                    </Avatar>
                    <div>
                      <Text strong style={{ display: 'block' }}>
                        {caseData.plaintiff.first_name} {caseData.plaintiff.last_name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {caseData.plaintiff.email}
                      </Text>
                    </div>
                  </Space>
                </div>

                <Divider style={{ margin: 0 }} />

                <div className="party-info">
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Ответчик
                  </Text>
                  {caseData.defendant ? (
                    <Space>
                      <Avatar size={40} style={{ background: '#fa8c16' }}>
                        {getInitials(caseData.defendant.first_name, caseData.defendant.last_name)}
                      </Avatar>
                      <div>
                        <Text strong style={{ display: 'block' }}>
                          {caseData.defendant.first_name} {caseData.defendant.last_name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {caseData.defendant.email}
                        </Text>
                      </div>
                    </Space>
                  ) : (
                    <Text type="secondary">Не указан</Text>
                  )}
                </div>
              </Space>
            </Card>

            {/* Детали дела */}
            <Card title="Детали дела" className="info-card" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Причина">
                  {caseData.reason_display}
                </Descriptions.Item>
                <Descriptions.Item label="Тема">
                  {caseData.subject}
                </Descriptions.Item>
                {caseData.order && (
                  <Descriptions.Item label="Заказ">
                    <a href={`/orders/${caseData.order.id}`} target="_blank" rel="noopener noreferrer">
                      <LinkOutlined /> #{caseData.order.id} - {caseData.order.title}
                    </a>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Создано">
                  {new Date(caseData.created_at).toLocaleString('ru-RU')}
                </Descriptions.Item>
                {caseData.submitted_at && (
                  <Descriptions.Item label="Подано">
                    {new Date(caseData.submitted_at).toLocaleString('ru-RU')}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Сроки актуальны">
                  {caseData.deadline_relevant ? 'Да' : 'Нет'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Финансовые требования */}
            {caseData.refund_type !== 'none' && (
              <Card
                title={<><DollarOutlined /> Финансовые требования</>}
                className="info-card"
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Тип возврата:</Text>
                    <br />
                    <Text strong>{caseData.refund_type_display}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Запрошено:</Text>
                    <br />
                    <Text strong style={{ fontSize: 16, color: '#fa8c16' }}>
                      {caseData.requested_refund_percentage}%
                    </Text>
                    {caseData.requested_refund_amount && (
                      <Text type="secondary"> ({caseData.requested_refund_amount} ₽)</Text>
                    )}
                  </div>
                  {caseData.approved_refund_percentage !== null && (
                    <div>
                      <Text type="secondary">Одобрено:</Text>
                      <br />
                      <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                        {caseData.approved_refund_percentage}%
                      </Text>
                      {caseData.approved_refund_amount && (
                        <Text type="secondary"> ({caseData.approved_refund_amount} ₽)</Text>
                      )}
                    </div>
                  )}
                </Space>
              </Card>
            )}

            {/* Действия */}
            <Card title="Действия" className="info-card">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleTakeInWork}
                  disabled={caseData.status === 'closed'}
                >
                  Взять в работу
                </Button>

                {caseData.refund_type !== 'none' && (
                  <Button
                    block
                    size="large"
                    icon={<DollarOutlined />}
                    onClick={openRefundModal}
                    disabled={caseData.status === 'closed'}
                  >
                    Оформить возврат
                  </Button>
                )}

                <Popconfirm
                  title="Закрыть дело?"
                  description={
                    <TextArea
                      placeholder="Финальное сообщение..."
                      rows={3}
                      id="close-message-input"
                    />
                  }
                  onConfirm={() => {
                    const input = document.getElementById('close-message-input') as HTMLTextAreaElement;
                    handleCloseCase(input?.value || '');
                  }}
                  okText="Закрыть"
                  cancelText="Отмена"
                >
                  <Button
                    block
                    size="large"
                    danger
                    icon={<CloseCircleOutlined />}
                    disabled={caseData.status === 'closed'}
                  >
                    Закрыть дело
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Col>

          {/* Правая колонка - Переписка */}
          <Col xs={24} lg={16}>
            <Card
              title={<><MessageOutlined /> Переписка и история</>}
              className="messages-card"
            >
              {/* Описание проблемы */}
              <div className="problem-description">
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Описание проблемы:
                </Text>
                <Paragraph style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
                  {caseData.description}
                </Paragraph>
              </div>

              <Divider />

              {/* Лента сообщений и активностей */}
              <div className="feed-container">
                {feed.length === 0 ? (
                  <Empty description="Нет сообщений" />
                ) : (
                  <Timeline mode="left">
                    {feed.map((item) => {
                      if (item.kind === 'message') {
                        const isAdmin = item.message_type === 'admin';
                        const isOrderChatMessage = item.source === 'order_chat';
                        const messageBody = item.text?.trim() || item.file_name || 'Сообщение без текста';
                        return (
                          <Timeline.Item
                            key={item.id}
                            color={isOrderChatMessage ? 'orange' : isAdmin ? 'blue' : 'green'}
                            dot={<MessageOutlined />}
                          >
                            <div className="feed-message">
                              <Space>
                                <Avatar size={32} style={{ background: isOrderChatMessage ? '#fa8c16' : isAdmin ? '#1890ff' : '#52c41a' }}>
                                  {getInitials(
                                    item.sender?.first_name || '',
                                    item.sender?.last_name || ''
                                  )}
                                </Avatar>
                                <div>
                                  <Text strong>
                                    {item.sender?.first_name} {item.sender?.last_name}
                                  </Text>
                                  {isAdmin && <Tag color="blue" style={{ marginLeft: 8 }}>Админ</Tag>}
                                  {!isAdmin && item.sender?.role && (
                                    <Tag color={isOrderChatMessage ? 'orange' : 'default'} style={{ marginLeft: 8 }}>
                                      {getRoleLabel(item.sender.role)}
                                    </Tag>
                                  )}
                                  {isOrderChatMessage && (
                                    <Tag color="orange" style={{ marginLeft: 8 }}>
                                      {item.source_label || 'Переписка по заказу'}
                                    </Tag>
                                  )}
                                  <br />
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {new Date(item.created_at).toLocaleString('ru-RU')}
                                  </Text>
                                  {isOrderChatMessage && (
                                    <>
                                      <br />
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        Чат #{item.chat_id}{item.chat_context_title ? ` • ${item.chat_context_title}` : ''}
                                      </Text>
                                    </>
                                  )}
                                </div>
                              </Space>
                              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                {messageBody}
                              </Paragraph>
                              {item.file_url && (
                                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                                    Открыть файл{item.file_name ? `: ${item.file_name}` : ''}
                                  </a>
                                </Paragraph>
                              )}
                            </div>
                          </Timeline.Item>
                        );
                      } else {
                        return (
                          <Timeline.Item
                            key={item.id}
                            color="gray"
                            dot={<HistoryOutlined />}
                          >
                            <div className="feed-activity">
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {item.description}
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(item.created_at).toLocaleString('ru-RU')}
                              </Text>
                            </div>
                          </Timeline.Item>
                        );
                      }
                    })}
                  </Timeline>
                )}
                <div ref={feedEndRef} />
              </div>

              <Divider />

              {/* Поле ввода сообщения - ИСПРАВЛЕНО */}
              <div className="message-input-container">
                <TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение... (Ctrl+Enter для отправки)"
                  rows={4}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  disabled={caseData.status === 'closed'}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={sending}
                  disabled={!messageText.trim() || caseData.status === 'closed'}
                  size="large"
                  style={{ marginTop: 12 }}
                >
                  Отправить сообщение
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
      <Modal
        title="Оформить возврат"
        open={refundModalOpen}
        onCancel={() => setRefundModalOpen(false)}
        onOk={handleProcessRefund}
        okText="Оформить"
        cancelText="Отмена"
        confirmLoading={processingRefund}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="refund-modal-field">
            <Text strong>Быстрый выбор процента</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={refundPercentage}
              onChange={(value) => setRefundPercentage(value)}
              options={[
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' },
              ]}
            />
          </div>

          <div className="refund-modal-field">
            <Text strong>Процент возврата</Text>
            <InputNumber
              min={1}
              max={100}
              addonAfter="%"
              value={refundPercentage}
              onChange={(value) => setRefundPercentage(Number(value) || 0)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div className="refund-modal-field">
            <Text strong>Сумма возврата</Text>
            <InputNumber
              min={0}
              precision={2}
              addonAfter="₽"
              value={refundAmount}
              onChange={(value) => setRefundAmount(value === null ? null : Number(value))}
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Необязательно"
            />
            <Text type="secondary" className="refund-modal-hint">
              Если сумму не заполнять, система сохранит только процент возврата.
            </Text>
          </div>

          <div className="refund-modal-summary">
            <Text type="secondary">
              Запрошено клиентом: {caseData.requested_refund_percentage}%
              {caseData.requested_refund_amount ? ` (${caseData.requested_refund_amount} ₽)` : ''}
            </Text>
          </div>
        </Space>
      </Modal>
    </AdminLayout>
  );
};

export default ArbitrationCaseDetailPage;
