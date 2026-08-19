import React, { useEffect, useState } from 'react';
import {
  Badge,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  Slider,
  Radio,
  Form,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  SendOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { arbitrationApi } from '@/features/admin/api/arbitration';
import styles from './ArbitrationSection.module.css';
import './ArbitrationSection.css';
import { logger } from '@/utils/logger';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

interface ArbitrationCase {
  id: number;
  case_number: string;
  plaintiff: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string | null;
    username?: string;
    display_username?: string;
  };
  defendant?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string | null;
    username?: string;
    display_username?: string;
  };
  subject: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  reason: string;
  reason_display: string;
  description?: string;
  refund_type?: 'none' | 'partial' | 'full';
  refund_type_display?: string;
  requested_refund_percentage?: number | string;
  requested_refund_amount?: number | string | null;
  approved_refund_percentage?: number | string | null;
  approved_refund_amount?: number | string | null;
  deadline_relevant?: boolean;
  evidence_files?: Array<{ name?: string; file_name?: string; url?: string; file_url?: string }>;
  assigned_admin?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    display_username?: string;
  };
  order?: {
    id: number;
    title: string;
    budget: number;
    final_price?: number | string | null;
  };
  purchase?: {
    id: number;
    work_title: string;
    work_id: number;
    price_paid: string;
    buyer_username: string;
    author_username: string;
    status: string;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  messages_count: number;
  unread_count: number;
}

interface ArbitrationSectionProps {
  cases: ArbitrationCase[];
  loading: boolean;
  onRefresh: () => void;
  initialCaseNumber?: string;
  stats?: {
    total_cases: number;
    new_cases: number;
    in_progress: number;
    awaiting_decision: number;
    closed_cases: number;
    urgent_cases: number;
  };
}

export const ArbitrationSection: React.FC<ArbitrationSectionProps> = ({
  cases,
  loading,
  onRefresh,
  initialCaseNumber,
  stats,
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [filteredCases, setFilteredCases] = useState<ArbitrationCase[]>(cases);
  const [selectedCase, setSelectedCase] = useState<ArbitrationCase | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [feedData, setFeedData] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [refundPercentage, setRefundPercentage] = useState<number>(50);
  const [refundForm] = Form.useForm();
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [approveRefundProcessing, setApproveRefundProcessing] = useState(false);
  const [rejectRefundProcessing, setRejectRefundProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let filtered = cases;

    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((item) =>
        item.case_number.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        getUserDisplayName(item.plaintiff).toLowerCase().includes(query) ||
        getUserSecondaryLabel(item.plaintiff).toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchText, statusFilter]);

  useEffect(() => {
    if (!initialCaseNumber || cases.length === 0) return;
    const matchedCase = cases.find(c => 
      c.case_number.toLowerCase().includes(initialCaseNumber.toLowerCase()) ||
      c.id.toString() === initialCaseNumber
    );
    if (matchedCase && !modalOpen) {
      loadCaseDetails(matchedCase);
      window.history.replaceState({}, '', '/admin/dashboard');
    }
  }, [initialCaseNumber, cases]);

  const getUserDisplayName = (user?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    display_username?: string;
    email?: string | null;
  } | null) => {
    if (!user) return 'Не указан';
    const fullName = [user.first_name, user.last_name]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ');
    return fullName || user.display_username || user.username || user.email || 'Пользователь';
  };

  const getUserSecondaryLabel = (user?: {
    email?: string | null;
    username?: string;
    display_username?: string;
  } | null) => {
    if (!user) return '';
    return user.email || user.display_username || user.username || '';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'default', icon: <FileTextOutlined /> },
      submitted: { color: 'purple', icon: <ExclamationCircleOutlined /> },
      under_review: { color: 'processing', icon: <ClockCircleOutlined /> },
      awaiting_response: { color: 'warning', icon: <ClockCircleOutlined /> },
      in_arbitration: { color: 'orange', icon: <ExclamationCircleOutlined /> },
      pending_approval: { color: 'gold', icon: <ClockCircleOutlined /> },
      decision_made: { color: 'success', icon: <CheckCircleOutlined /> },
      closed: { color: 'default', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    return configs[status] || { color: 'default', icon: <FileTextOutlined /> };
  };

  const getFeedAuthorName = (item: any) => {
    if (item.sender) {
      const full = `${item.sender.first_name ?? ''} ${item.sender.last_name ?? ''}`.trim();
      if (full) return full;
      if (item.sender.username) return item.sender.username;
      if (item.sender.display_username) return item.sender.display_username;
    }
    return item.kind === 'message' ? 'Участник' : 'Система';
  };

  const getFeedAuthorInitials = (item: any) => {
    const name = getFeedAuthorName(item);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getFeedSide = (item: any): 'plaintiff' | 'defendant' | 'admin' | 'system' => {
    if (item.kind === 'message') {
      if (item.source === 'order_chat') {
        const senderId = item.sender?.id;
        if (item.sender?.role === 'admin') return 'admin';
        if (detailData?.defendant?.id && senderId === detailData.defendant.id) return 'defendant';
        if (detailData?.plaintiff?.id && senderId === detailData.plaintiff.id) return 'plaintiff';
        return 'system';
      }
      if (item.message_type === 'plaintiff') return 'plaintiff';
      if (item.message_type === 'defendant') return 'defendant';
      if (item.message_type === 'admin') return 'admin';
    }
    return 'system';
  };

  const getFeedSideLabel = (item: any) => {
    const side = getFeedSide(item);
    if (side === 'plaintiff') return 'Истец';
    if (side === 'defendant') return 'Ответчик';
    if (side === 'admin') return 'Администратор';
    return 'Система';
  };

  const getFeedAuthorColor = (item: any) => {
    const side = getFeedSide(item);
    if (side === 'plaintiff') return '#1677ff';
    if (side === 'defendant') return '#fa8c16';
    if (side === 'admin') return '#722ed1';
    return '#8c8c8c';
  };

  const loadCaseDetails = async (caseItem: ArbitrationCase) => {
    try {
      setDetailLoading(true);
      setSelectedCase(caseItem);
      setModalOpen(true);
      const detail = await arbitrationApi.getCase(caseItem.id);
      setDetailData(detail);
      const requestedPercentage = Number(detail.requested_refund_percentage ?? 0);
      setRefundPercentage(
        Number.isFinite(requestedPercentage) && requestedPercentage >= 0 && requestedPercentage <= 100
          ? requestedPercentage
          : 0
      );
      const feed = await arbitrationApi.getActivityFeed(detail.id);
      setFeedData(feed.feed || []);
    } catch {
      message.error('Не удалось загрузить дело');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCase(null);
    setDetailData(null);
    setFeedData([]);
    setMessageText('');
  };

  const refreshSelectedCase = async () => {
    if (!selectedCase) return;
    await loadCaseDetails(selectedCase);
    onRefresh();
  };

  const handleStatusChange = async (status: string) => {
    if (!detailData?.id) return;
    try {
      setStatusUpdating(true);
      await arbitrationApi.updateStatus(detailData.id, status);
      await refreshSelectedCase();
      message.success('Статус обновлен');
    } catch {
      message.error('Не удалось обновить статус');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleTakeInWork = async () => {
    if (!detailData?.id) return;
    try {
      setStatusUpdating(true);
      await arbitrationApi.takeInWork(detailData.id);
      await refreshSelectedCase();
      message.success('Дело принято в работу');
    } catch {
      message.error('Не удалось принять дело в работу');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!detailData?.id || !messageText.trim()) return;
    try {
      setSending(true);
      await arbitrationApi.sendMessage(detailData.id, messageText);
      setMessageText('');
      await refreshSelectedCase();
    } catch {
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleRefund = async () => {
    if (!detailData?.order?.id && !detailData?.purchase?.id) {
      message.error('Нет связанного заказа или покупки');
      return;
    }
    
    try {
      await refundForm.validateFields();
      setRefundProcessing(true);
      
      const baseAmount = detailData.order?.budget || (detailData.purchase ? parseFloat(detailData.purchase.price_paid) : 0);
      const refundAmount = Math.round((baseAmount * refundPercentage) / 100);
      const requireApproval = refundForm.getFieldValue('requireApproval') || false;
      
      await arbitrationApi.processRefund(detailData.id, refundPercentage, refundAmount, requireApproval);
      
      if (requireApproval) {
        message.success(`Возврат ${refundAmount.toLocaleString()} ₽ (${refundPercentage}%) отправлен на согласование директору`);
      } else {
        message.success(`Возврат ${refundAmount.toLocaleString()} ₽ (${refundPercentage}%) оформлен`);
      }
      await refreshSelectedCase();
      refundForm.resetFields();
      setRefundPercentage(50);
    } catch (error) {
      logger.error('Refund error:', error);
      message.error('Не удалось оформить возврат');
    } finally {
      setRefundProcessing(false);
    }
  };

  const handleApproveRefund = async () => {
    if (!detailData?.id) return;
    try {
      setApproveRefundProcessing(true);
      await arbitrationApi.approveRefund(detailData.id);
      message.success('Возврат согласован');
      await refreshSelectedCase();
    } catch {
      message.error('Не удалось согласовать возврат');
    } finally {
      setApproveRefundProcessing(false);
    }
  };

  const handleRejectRefund = async () => {
    if (!detailData?.id) return;
    try {
      setRejectRefundProcessing(true);
      await arbitrationApi.rejectRefund(detailData.id);
      message.success('Согласование возврата отклонено');
      await refreshSelectedCase();
    } catch {
      message.error('Не удалось отклонить возврат');
    } finally {
      setRejectRefundProcessing(false);
    }
  };

  const columns: ColumnsType<ArbitrationCase> = [
    {
      title: 'Номер дела',
      dataIndex: 'case_number',
      key: 'case_number',
      width: 150,
      fixed: 'left',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#6435a5', cursor: 'pointer' }} onClick={() => loadCaseDetails(record)}>
            {text}
          </Text>
          {record.unread_count > 0 ? <Badge count={record.unread_count} size="small" /> : null}
        </Space>
      ),
    },
    {
      title: 'Истец',
      key: 'plaintiff',
      width: 200,
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#6435a5' }} />
          <Space direction="vertical" size={0}>
            <Text strong>{getUserDisplayName(record.plaintiff)}</Text>
            {getUserSecondaryLabel(record.plaintiff) ? <Text type="secondary" style={{ fontSize: 12 }}>{getUserSecondaryLabel(record.plaintiff)}</Text> : null}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Ответчик',
      key: 'defendant',
      width: 200,
      render: (_, record) => (
        record.defendant ? (
          <Space>
            <UserOutlined style={{ color: '#fa8c16' }} />
            <Space direction="vertical" size={0}>
              <Text strong>{getUserDisplayName(record.defendant)}</Text>
              {getUserSecondaryLabel(record.defendant) ? <Text type="secondary" style={{ fontSize: 12 }}>{getUserSecondaryLabel(record.defendant)}</Text> : null}
            </Space>
          </Space>
        ) : (
          <Text type="secondary">Не указан</Text>
        )
      ),
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.reason_display}</Text>
        </Space>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 190,
      render: (_, record) => {
        const config = getStatusConfig(record.status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {record.status_display}
          </Tag>
        );
      },
    },
    {
      title: 'Ответственный',
      key: 'assigned_admin',
      width: 160,
      render: (_, record) => (
        record.assigned_admin ? (
          <Text>{getUserDisplayName(record.assigned_admin)}</Text>
        ) : (
          <Text type="secondary">Не назначен</Text>
        )
      ),
    },
    {
      title: 'Создано',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => new Date(text).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Button type="primary" icon={<EyeOutlined />} onClick={() => loadCaseDetails(record)}>
          Открыть
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.arbitrationSection}>
      {stats ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Всего дел" value={stats.total_cases} prefix={<FileTextOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Новые" value={stats.new_cases} valueStyle={{ color: '#6435a5' }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="В работе" value={stats.in_progress} valueStyle={{ color: '#fa8c16' }} prefix={<ClockCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Ожидают решения" value={stats.awaiting_decision} valueStyle={{ color: '#722ed1' }} prefix={<ClockCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Закрыто" value={stats.closed_cases} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Срочные" value={stats.urgent_cases} valueStyle={{ color: '#ff4d4f' }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
        </Row>
      ) : null}

      <Card style={{ marginBottom: 16 }} className={styles.filtersContainer}>
        <Search
          placeholder="Поиск по номеру, теме, истцу..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className={styles.searchInput}
          allowClear
        />

        <div className={styles.filtersRow}>
          <Select placeholder="Статус" value={statusFilter} onChange={setStatusFilter} className={styles.statusSelect} allowClear>
            <Option value="submitted">Подано</Option>
            <Option value="under_review">На рассмотрении</Option>
            <Option value="in_arbitration">В арбитраже</Option>
            <Option value="decision_made">Решение принято</Option>
            <Option value="closed">Закрыто</Option>
          </Select>
        </div>

        <div className={styles.filtersActions}>
          <Button icon={<FilterOutlined />} onClick={() => { setSearchText(''); setStatusFilter(undefined); }}>
            Сбросить фильтры
          </Button>
          <Button type="primary" onClick={onRefresh}>Обновить</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredCases}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Всего: ${total} дел` }}
          onRow={(record) => ({ onClick: () => loadCaseDetails(record), style: { cursor: 'pointer' } })}
        />
      </Card>

      <Modal
        className={styles.arbitrationDetailModal}
        title={selectedCase ? `Арбитраж ${selectedCase.case_number}` : 'Арбитраж'}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={isMobile ? 'calc(100vw - 16px)' : 900}
        destroyOnClose
        styles={{
          body: {
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: isMobile ? 'calc(100dvh - 88px)' : '70vh',
          },
        }}
      >
        {detailLoading || !detailData ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
              <Space direction="vertical" size={4}>
                <Title level={4} style={{ margin: 0 }}>{detailData.subject}</Title>
                <Text type="secondary">{detailData.reason_display || detailData.reason}</Text>
              </Space>
              <Tag color={getStatusConfig(detailData.status).color} icon={getStatusConfig(detailData.status).icon}>
                {detailData.status_display || detailData.status}
              </Tag>
            </Space>

            {(() => {
              const orderAmount = Number(detailData.order?.final_price ?? detailData.order?.budget ?? 0);
              const requestedPercentage = Number(detailData.requested_refund_percentage ?? 0);
              const storedRequestedAmount = Number(detailData.requested_refund_amount ?? 0);
              const requestedAmount = storedRequestedAmount > 0
                ? storedRequestedAmount
                : Math.round((orderAmount * requestedPercentage) / 100 * 100) / 100;
              const evidenceFiles = Array.isArray(detailData.evidence_files) ? detailData.evidence_files : [];
              return (
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Истец">
                    {getUserDisplayName(detailData.plaintiff)}
                    {getUserSecondaryLabel(detailData.plaintiff) && getUserSecondaryLabel(detailData.plaintiff) !== getUserDisplayName(detailData.plaintiff)
                      ? ` · ${getUserSecondaryLabel(detailData.plaintiff)}`
                      : ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ответчик">
                    {getUserDisplayName(detailData.defendant)}
                    {detailData.defendant && getUserSecondaryLabel(detailData.defendant) && getUserSecondaryLabel(detailData.defendant) !== getUserDisplayName(detailData.defendant)
                      ? ` · ${getUserSecondaryLabel(detailData.defendant)}`
                      : ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Причина спора">{detailData.reason_display || detailData.reason || 'Не указана'}</Descriptions.Item>
                  <Descriptions.Item label="Финансовое требование">{detailData.refund_type_display || ({ none: 'Возврат не требуется', partial: 'Частичный возврат', full: 'Полный возврат' } as Record<string, string>)[detailData.refund_type] || 'Не указано'}</Descriptions.Item>
                  <Descriptions.Item label="Запрошенный возврат">
                    {requestedPercentage > 0 ? `${requestedPercentage}%` : '0%'}
                    {requestedAmount > 0 ? ` · ${requestedAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽` : ''}
                  </Descriptions.Item>
                  {orderAmount > 0 ? <Descriptions.Item label="Сумма заказа">{orderAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</Descriptions.Item> : null}
                  <Descriptions.Item label="Сроки важны для спора">{detailData.deadline_relevant ? 'Да' : 'Нет'}</Descriptions.Item>
                  <Descriptions.Item label="Описание заявления">
                    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{detailData.description || 'Описание не заполнено'}</Paragraph>
                  </Descriptions.Item>
                  <Descriptions.Item label="Подано">{detailData.submitted_at || detailData.created_at ? new Date(detailData.submitted_at || detailData.created_at).toLocaleString('ru-RU') : 'Не указано'}</Descriptions.Item>
                  {evidenceFiles.length > 0 ? (
                    <Descriptions.Item label="Доказательства">
                      <Space direction="vertical" size={4}>
                        {evidenceFiles.map((file: any, index: number) => {
                          const href = file.url || file.file_url;
                          const name = file.name || file.file_name || `Файл ${index + 1}`;
                          return href ? <a key={`${href}-${index}`} href={href} target="_blank" rel="noreferrer">{name}</a> : <Text key={index}>{name}</Text>;
                        })}
                      </Space>
                    </Descriptions.Item>
                  ) : null}
                  {detailData.order ? <Descriptions.Item label="Заказ">#{detailData.order.id} · {detailData.order.title}</Descriptions.Item> : null}
                  {detailData.purchase ? (
                    <Descriptions.Item label="Покупка">
                      #{detailData.purchase.id} · {detailData.purchase.work_title} · {detailData.purchase.price_paid} ₽
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Покупатель: {detailData.purchase.buyer_username || 'Не указан'} · Продавец: {detailData.purchase.author_username || 'Не указан'}
                      </Text>
                    </Descriptions.Item>
                  ) : null}
                </Descriptions>
              );
            })()}

            <Card size="small" title="Действия">
              <Space wrap>
                {detailData.status === 'pending_approval' ? (
                  <>
                    <Button type="primary" onClick={handleApproveRefund} loading={approveRefundProcessing}>Согласовать возврат</Button>
                    <Button danger onClick={handleRejectRefund} loading={rejectRefundProcessing}>Отклонить возврат</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleTakeInWork} disabled={!['submitted', 'draft', 'awaiting_response'].includes(detailData.status)} loading={statusUpdating}>Взять в работу</Button>
                    <Button
                      type="primary"
                      onClick={() => handleStatusChange('closed')}
                      disabled={detailData.status === 'closed' || detailData.status === 'rejected'}
                      loading={statusUpdating}
                    >
                      Закрыть дело
                    </Button>
                  </>
                )}
              </Space>
            </Card>

            {(detailData.order || detailData.purchase) && ['under_review', 'in_arbitration', 'awaiting_response'].includes(detailData.status) && (() => {
              const refundAlreadyDone = detailData.approved_refund_percentage != null && detailData.approved_refund_percentage !== '';
              const baseAmount = detailData.order?.budget || (detailData.purchase ? parseFloat(detailData.purchase.price_paid) : 0);
              return (
                <Card size="small" title={<Space><DollarOutlined />Возврат средств</Space>}>
                  <Form form={refundForm} layout="vertical">
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      {refundAlreadyDone && (
                        <div style={{ padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6 }}>
                          <Text style={{ color: '#d46b08' }}>
                            Возврат уже был оформлен ({detailData.approved_refund_percentage}%). Повторное оформление невозможно.
                          </Text>
                        </div>
                      )}

                      <div>
                        <Text strong>Сумма: </Text>
                        <Text style={{ fontSize: 16, color: '#6435a5' }}>
                          {baseAmount.toLocaleString()} ₽
                        </Text>
                      </div>

                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>Процент возврата: {refundPercentage}%</Text>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <Text style={{ fontSize: 18, color: '#52c41a', fontWeight: 600 }}>
                             {Math.round((baseAmount * refundPercentage) / 100).toLocaleString()} ₽
                          </Text>
                        </div>
                        <div className={styles.refundSliderWrap}>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={refundPercentage}
                            onChange={setRefundPercentage}
                            disabled={refundAlreadyDone}
                            tooltip={{
                              formatter: (value) => `${value}% (${Math.round((baseAmount * (value || 0)) / 100).toLocaleString()} ₽)`,
                            }}
                          />
                          <div className={styles.refundSliderMarks} aria-hidden="true">
                            {[0, 25, 50, 75, 100].map((value) => <span key={value}>{value}%</span>)}
                          </div>
                        </div>
                      </div>

                      <Form.Item
                        name="reason"
                        label="Обоснование (опционально)"
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea
                          rows={2}
                          placeholder={`Возврат ${refundPercentage}% от суммы заказа`}
                          maxLength={300}
                          showCount
                          disabled={refundAlreadyDone}
                        />
                      </Form.Item>

                      <Form.Item name="requireApproval" initialValue={false} style={{ marginBottom: 0 }}>
                        <Radio.Group disabled={refundAlreadyDone}>
                          <Radio value={false}>Оформить возврат сразу</Radio>
                          <Radio value={true}>Отправить на согласование</Radio>
                        </Radio.Group>
                      </Form.Item>

                      <Button
                        type="primary"
                        icon={<DollarOutlined />}
                        onClick={handleRefund}
                        loading={refundProcessing}
                        disabled={refundAlreadyDone}
                        size="large"
                        block
                      >
                        Оформить возврат {Math.round((baseAmount * refundPercentage) / 100).toLocaleString()} ₽
                      </Button>
                    </Space>
                  </Form>
                </Card>
              );
            })()}

            {detailData.status === 'pending_approval' && (detailData.order || detailData.purchase) && (() => {
              const baseAmount = detailData.order?.budget || (detailData.purchase ? parseFloat(detailData.purchase.price_paid) : 0);
              return (
                <Card size="small" title={<Space><DollarOutlined />Ожидает согласования возврата</Space>} style={{ borderColor: '#faad14' }}>
                  <Space direction="vertical" size={8}>
                    <Text>Предложенный возврат: <Text strong>{detailData.approved_refund_percentage}%</Text>
                      ({Math.round((baseAmount * (detailData.approved_refund_percentage || 0)) / 100).toLocaleString()} ₽)
                    </Text>
                </Space>
              </Card>
              );
            })()}

            <Card size="small" title="Переписка и история">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {feedData.length === 0 ? (
                  <Empty description="История пока пуста" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  feedData.map((item) => {
                    const side = getFeedSide(item);
                    const authorColor = getFeedAuthorColor(item);
                    const isOrderChat = item.source === 'order_chat';
                    const isInternal = item.is_internal;

                    if (side === 'system') {
                      return (
                        <div key={item.id} className={styles.feedSystem}>
                          <Tag color="default" className={styles.feedSystemTag}>
                            {item.text || item.description || 'Обновление дела'}
                          </Tag>
                          <Text type="secondary" className={styles.feedSystemTime}>
                            {new Date(item.created_at).toLocaleString('ru-RU')}
                          </Text>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className={`${styles.feedRow} ${side === 'plaintiff' ? styles.feedRowLeft : styles.feedRowRight}`}
                      >
                        {side === 'plaintiff' && (
                          <Avatar
                            size={40}
                            style={{ backgroundColor: authorColor, flexShrink: 0 }}
                            icon={!getFeedAuthorName(item) ? <UserOutlined /> : undefined}
                          >
                            {getFeedAuthorInitials(item)}
                          </Avatar>
                        )}

                        <div className={`${styles.feedBubble} ${styles[`feedBubble${side[0].toUpperCase()}${side.slice(1)}`]}`}>
                          <div className={styles.feedBubbleHeader}>
                            <Tag className={styles.feedSideBadge} icon={<UserOutlined />} style={{ backgroundColor: authorColor, borderColor: authorColor }}>
                              {getFeedSideLabel(item)}
                            </Tag>
                            <Text strong className={styles.feedAuthorName}>{getFeedAuthorName(item)}</Text>
                            {isInternal && <Tag color="purple">Внутреннее</Tag>}
                            {isOrderChat && <Tag color="blue">Чат по заказу</Tag>}
                          </div>
                          <div className={styles.feedBubbleText}>
                            {item.text || item.description || 'Обновление дела'}
                          </div>
                          <div className={styles.feedBubbleTime}>
                            {new Date(item.created_at).toLocaleString('ru-RU')}
                          </div>
                        </div>

                        {side !== 'plaintiff' && (
                          <Avatar
                            size={40}
                            style={{ backgroundColor: authorColor, flexShrink: 0 }}
                            icon={!getFeedAuthorName(item) ? <UserOutlined /> : undefined}
                          >
                            {getFeedAuthorInitials(item)}
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
              </Space>
            </Card>

            <Card size="small" title="Сообщение по делу">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input.TextArea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  placeholder="Введите сообщение по арбитражу"
                  disabled={detailData ? ['decision_made', 'closed', 'rejected'].includes(detailData.status) : false}
                />
                <div>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    loading={sending}
                    disabled={!messageText.trim() || (detailData ? ['decision_made', 'closed', 'rejected'].includes(detailData.status) : false)}
                  >
                    Отправить
                  </Button>
                </div>
              </Space>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};
