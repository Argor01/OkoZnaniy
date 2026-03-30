import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Descriptions, Tag, Button, Space, Input,
  message, Spin, Empty, Typography, Divider, Avatar, Timeline,
  Modal, InputNumber, Select, Popconfirm, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, SendOutlined, DollarOutlined,
  CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
  ClockCircleOutlined, MessageOutlined, HistoryOutlined,
  ExclamationCircleOutlined, LinkOutlined
} from '@ant-design/icons';
import { AdminLayout } from '@/features/admin/components/Layout';
import './ArbitrationCaseDetailPage.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
  const [caseData, setCaseData] = useState<ArbitrationCaseDetail | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundPercentage, setRefundPercentage] = useState(0);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [decisionText, setDecisionText] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCaseData();
  }, [caseNumber]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      // Fetch case details
      const caseResponse = await fetch(`/api/arbitration/cases/?case_number=${caseNumber}`, {
        credentials: 'include'
      });
      const caseList = await caseResponse.json();
      const caseDetail = caseList.results?.[0] || caseList[0];
      
      if (!caseDetail) {
        message.error('Дело не найдено');
        return;
      }
      
      setCaseData(caseDetail);

      // Fetch activity feed
      const feedResponse = await fetch(`/api/arbitration/cases/${caseDetail.id}/activity-feed/`, {
        credentials: 'include'
      });
      const feedData = await feedResponse.json();
      setFeed(feedData.feed || []);
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
      const response = await fetch(`/api/arbitration/cases/${caseData.id}/send-message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: messageText })
      });

      if (response.ok) {
        message.success('Сообщение отправлено');
        setMessageText('');
        fetchCaseData();
      } else {
        message.error('Ошибка при отправке сообщения');
      }
    } catch (error) {
      message.error('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const handleTakeInWork = async () => {
    if (!caseData) return;

    try {
      const response = await fetch(`/api/arbitration/cases/${caseData.id}/take-in-work/`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        message.success('Дело взято в работу');
        fetchCaseData();
      } else {
        message.error('Ошибка');
      }
    } catch (error) {
      message.error('Ошибка');
    }
  };

  const handleProcessRefund = async () => {
    if (!caseData) return;

    try {
      const response = await fetch(`/api/arbitration/cases/${caseData.id}/process-refund/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refund_percentage: refundPercentage })
      });

      if (response.ok) {
        message.success(`Возврат ${refundPercentage}% оформлен`);
        setRefundModalVisible(false);
        fetchCaseData();
      } else {
        message.error('Ошибка при оформлении возврата');
      }
    } catch (error) {
      message.error('Ошибка при оформлении возврата');
    }
  };

  const handleMakeDecision = async () => {
    if (!decisionText.trim() || !caseData) return;

    try {
      const response = await fetch(`/api/arbitration/cases/${caseData.id}/make-decision/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision: decisionText,
          approved_refund_percentage: refundPercentage
        })
      });

      if (response.ok) {
        message.success('Решение принято');
        setDecisionModalVisible(false);
        setDecisionText('');
        fetchCaseData();
      } else {
        message.error('Ошибка при принятии решения');
      }
    } catch (error) {
      message.error('Ошибка при принятии решения');
    }
  };

  const handleCloseCase = async (finalMessage: string) => {
    if (!caseData) return;

    try {
      const response = await fetch(`/api/arbitration/cases/${caseData.id}/close-case/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: finalMessage })
      });

      if (response.ok) {
        message.success('Дело закрыто');
        fetchCaseData();
      } else {
        message.error('Ошибка при закрытии дела');
      }
    } catch (error) {
      message.error('Ошибка при закрытии дела');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!caseData) return;

    try {
      const response = await fetch(`/api/arbitration/cases/${caseData.id}/update-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        message.success('Статус обновлен');
        fetchCaseData();
      } else {
        message.error('Ошибка при обновлении статуса');
      }
    } catch (error) {
      message.error('Ошибка при обновлении статуса');
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

  if (loading) {
    return (
      <AdminLayout selectedMenu="arbitration" onMenuSelect={() => {}} onLogout={() => {}}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spin size="large" tip="Загрузка дела..." />
        </div>
      </AdminLayout>
    );
  }

  if (!caseData) {
    return (
      <AdminLayout selectedMenu="arbitration" onMenuSelect={() => {}} onLogout={() => {}}>
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
    <AdminLayout selectedMenu="arbitration" onMenuSelect={() => {}} onLogout={() => {}}>
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

                <Button
                  block
                  size="large"
                  icon={<DollarOutlined />}
                  onClick={() => setRefundModalVisible(true)}
                  disabled={caseData.status === 'closed'}
                  style={{ background: '#52c41a', color: 'white', borderColor: '#52c41a' }}
                >
                  Оформить возврат
                </Button>

                <Button
                  block
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => setDecisionModalVisible(true)}
                  disabled={caseData.status === 'closed'}
                >
                  Принять решение
                </Button>

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

                <Divider />

                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Изменить статус:
                  </Text>
                  <Select
                    value={caseData.status}
                    onChange={handleUpdateStatus}
                    style={{ width: '100%' }}
                    size="large"
                  >
                    <Option value="submitted">Подано</Option>
                    <Option value="under_review">На рассмотрении</Option>
                    <Option value="awaiting_response">Ожидает ответа</Option>
                    <Option value="in_arbitration">В арбитраже</Option>
                    <Option value="decision_made">Решение принято</Option>
                    <Option value="closed">Закрыто</Option>
                  </Select>
                </div>
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
                        return (
                          <Timeline.Item
                            key={item.id}
                            color={isAdmin ? 'blue' : 'green'}
                            dot={<MessageOutlined />}
                          >
                            <div className="feed-message">
                              <Space>
                                <Avatar size={32} style={{ background: isAdmin ? '#1890ff' : '#52c41a' }}>
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
                                  <br />
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {new Date(item.created_at).toLocaleString('ru-RU')}
                                  </Text>
                                </div>
                              </Space>
                              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                {item.text}
                              </Paragraph>
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

        {/* Модальное окно возврата */}
        <Modal
          title="Оформить возврат средств"
          open={refundModalVisible}
          onOk={handleProcessRefund}
          onCancel={() => setRefundModalVisible(false)}
          okText="Оформить"
          cancelText="Отмена"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text>Процент возврата:</Text>
              <InputNumber
                value={refundPercentage}
                onChange={(v) => setRefundPercentage(v || 0)}
                min={0}
                max={100}
                formatter={(v) => `${v}%`}
                parser={(v) => Number(v?.replace('%', ''))}
                style={{ width: '100%', marginTop: 8 }}
                size="large"
              />
            </div>
            <Text type="secondary">
              Укажите процент возврата от суммы заказа. Решение будет зафиксировано в системе.
            </Text>
          </Space>
        </Modal>

        {/* Модальное окно решения */}
        <Modal
          title="Принять решение по делу"
          open={decisionModalVisible}
          onOk={handleMakeDecision}
          onCancel={() => setDecisionModalVisible(false)}
          okText="Принять решение"
          cancelText="Отмена"
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Текст решения:</Text>
              <TextArea
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="Опишите принятое решение подробно..."
                rows={6}
                style={{ marginTop: 8 }}
              />
            </div>
            <div>
              <Text strong>Одобренный процент возврата:</Text>
              <InputNumber
                value={refundPercentage}
                onChange={(v) => setRefundPercentage(v || 0)}
                min={0}
                max={100}
                formatter={(v) => `${v}%`}
                parser={(v) => Number(v?.replace('%', ''))}
                style={{ width: '100%', marginTop: 8 }}
                size="large"
              />
            </div>
          </Space>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default ArbitrationCaseDetailPage;
