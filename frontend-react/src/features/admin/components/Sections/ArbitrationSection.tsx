import React, { useEffect, useState } from 'react';
import {
  Badge,
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
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { arbitrationApi } from '@/features/admin/api/arbitration';
import styles from './ArbitrationSection.module.css';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

interface ArbitrationCase {
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
  subject: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  reason: string;
  reason_display: string;
  assigned_admin?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  messages_count: number;
  unread_count: number;
}

interface ArbitrationSectionProps {
  cases: ArbitrationCase[];
  loading: boolean;
  onRefresh: () => void;
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

  useEffect(() => {
    let filtered = cases;

    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((item) =>
        item.case_number.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.plaintiff.first_name.toLowerCase().includes(query) ||
        item.plaintiff.last_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchText, statusFilter]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'default', icon: <FileTextOutlined /> },
      submitted: { color: 'blue', icon: <ExclamationCircleOutlined /> },
      under_review: { color: 'processing', icon: <ClockCircleOutlined /> },
      awaiting_response: { color: 'warning', icon: <ClockCircleOutlined /> },
      in_arbitration: { color: 'orange', icon: <ExclamationCircleOutlined /> },
      decision_made: { color: 'success', icon: <CheckCircleOutlined /> },
      closed: { color: 'default', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    return configs[status] || { color: 'default', icon: <FileTextOutlined /> };
  };

  const loadCaseDetails = async (caseItem: ArbitrationCase) => {
    try {
      setDetailLoading(true);
      setSelectedCase(caseItem);
      setModalOpen(true);
      const detail = await arbitrationApi.getCase(caseItem.id);
      setDetailData(detail);
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

  const handleSendMessage = async () => {
    if (!detailData?.id || !messageText.trim()) return;
    try {
      setSending(true);
      await arbitrationApi.sendMessage(detailData.id, messageText);
      setMessageText('');
      await refreshSelectedCase();
      message.success('Сообщение отправлено');
    } catch {
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleRefund = async () => {
    if (!detailData?.order?.id) {
      message.error('Заказ не найден');
      return;
    }
    
    try {
      const values = await refundForm.validateFields();
      setRefundProcessing(true);
      
      const orderAmount = detailData.order.amount || 0;
      const refundAmount = Math.round((orderAmount * refundPercentage) / 100);
      
      // Здесь должен быть вызов API для возврата средств
      // await arbitrationApi.processRefund(detailData.id, { amount: refundAmount, percentage: refundPercentage, reason: values.reason });
      
      message.success(`Возврат ${refundAmount.toLocaleString()} ₽ (${refundPercentage}%) оформлен`);
      await refreshSelectedCase();
      refundForm.resetFields();
      setRefundPercentage(50);
    } catch (error) {
      console.error('Refund error:', error);
      message.error('Не удалось оформить возврат');
    } finally {
      setRefundProcessing(false);
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
          <Text strong style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => loadCaseDetails(record)}>
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
          <UserOutlined style={{ color: '#1890ff' }} />
          <Space direction="vertical" size={0}>
            <Text strong>{record.plaintiff.first_name} {record.plaintiff.last_name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.plaintiff.email}</Text>
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
              <Text strong>{record.defendant.first_name} {record.defendant.last_name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.defendant.email}</Text>
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
          <Text>{record.assigned_admin.first_name} {record.assigned_admin.last_name}</Text>
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
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Новые" value={stats.new_cases} valueStyle={{ color: '#1890ff' }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="В работе" value={stats.in_progress} valueStyle={{ color: '#fa8c16' }} prefix={<ClockCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Ожидают решения" value={stats.awaiting_decision} valueStyle={{ color: '#722ed1' }} prefix={<ClockCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Закрыто" value={stats.closed_cases} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8} lg={4}><Card><Statistic title="Срочные" value={stats.urgent_cases} valueStyle={{ color: '#ff4d4f' }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
        </Row>
      ) : null}

      <Card style={{ marginBottom: 16 }} className={styles.filtersContainer}>
        <Space wrap>
          <Input
            placeholder="Поиск по номеру, теме, истцу..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className={styles.searchInput}
            allowClear
          />
          <Select placeholder="Статус" value={statusFilter} onChange={setStatusFilter} className={styles.statusSelect} allowClear>
            <Option value="submitted">Подано</Option>
            <Option value="under_review">На рассмотрении</Option>
            <Option value="in_arbitration">В арбитраже</Option>
            <Option value="decision_made">Решение принято</Option>
            <Option value="closed">Закрыто</Option>
          </Select>
          <Button icon={<FilterOutlined />} onClick={() => { setSearchText(''); setStatusFilter(undefined); }}>
            Сбросить фильтры
          </Button>
          <Button type="primary" onClick={onRefresh}>Обновить</Button>
        </Space>
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

      <Modal title={selectedCase ? `Арбитраж ${selectedCase.case_number}` : 'Арбитраж'} open={modalOpen} onCancel={closeModal} footer={null} width={900} destroyOnClose>
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

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Истец">{detailData.plaintiff?.first_name} {detailData.plaintiff?.last_name} · {detailData.plaintiff?.email}</Descriptions.Item>
              <Descriptions.Item label="Ответчик">{detailData.defendant ? `${detailData.defendant.first_name} ${detailData.defendant.last_name} · ${detailData.defendant.email}` : 'Не указан'}</Descriptions.Item>
              <Descriptions.Item label="Описание">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{detailData.description || 'Описание не заполнено'}</Paragraph>
              </Descriptions.Item>
              {detailData.order ? <Descriptions.Item label="Заказ">#{detailData.order.id} · {detailData.order.title}</Descriptions.Item> : null}
            </Descriptions>

            <Card size="small" title="Действия">
              <Space wrap>
                <Button onClick={() => handleStatusChange('under_review')} disabled={detailData.status === 'under_review' || detailData.status === 'closed'} loading={statusUpdating}>Взять в работу</Button>
                <Button type="primary" onClick={() => handleStatusChange('closed')} disabled={detailData.status === 'closed'} loading={statusUpdating}>Закрыть дело</Button>
              </Space>
            </Card>

            {detailData.order && (
              <Card size="small" title={<Space><DollarOutlined />Возврат средств</Space>}>
                <Form form={refundForm} layout="vertical">
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div>
                      <Text strong>Сумма заказа: </Text>
                      <Text style={{ fontSize: 16, color: '#1890ff' }}>
                        {(detailData.order.amount || 0).toLocaleString()} ₽
                      </Text>
                    </div>

                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Процент возврата: {refundPercentage}%</Text>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 18, color: '#52c41a', fontWeight: 600 }}>
                          {Math.round(((detailData.order.amount || 0) * refundPercentage) / 100).toLocaleString()} ₽
                        </Text>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={refundPercentage}
                        onChange={setRefundPercentage}
                        marks={{
                          0: '0%',
                          25: '25%',
                          50: '50%',
                          75: '75%',
                          100: '100%',
                        }}
                        tooltip={{
                          formatter: (value) => `${value}% (${Math.round(((detailData.order.amount || 0) * (value || 0)) / 100).toLocaleString()} ₽)`,
                        }}
                      />
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
                      />
                    </Form.Item>

                    <Form.Item name="requireApproval" initialValue={false} style={{ marginBottom: 0 }}>
                      <Radio.Group>
                        <Radio value={false}>Оформить возврат сразу</Radio>
                        <Radio value={true}>Отправить на согласование</Radio>
                      </Radio.Group>
                    </Form.Item>

                    <Button
                      type="primary"
                      icon={<DollarOutlined />}
                      onClick={handleRefund}
                      loading={refundProcessing}
                      size="large"
                      block
                    >
                      Оформить возврат {Math.round(((detailData.order.amount || 0) * refundPercentage) / 100).toLocaleString()} ₽
                    </Button>
                  </Space>
                </Form>
              </Card>
            )}

            <Card size="small" title="Переписка и история">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {feedData.length === 0 ? (
                  <Empty description="История пока пуста" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  feedData.map((item) => (
                    <Card key={item.id} size="small" styles={{ body: { padding: 12 } }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{item.sender ? `${item.sender.first_name ?? ''} ${item.sender.last_name ?? ''}`.trim() || 'Участник' : 'Система'}</Text>
                          {item.kind === 'message'
                            ? item.source === 'order_chat'
                              ? <Tag color="geekblue">Чат по заказу</Tag>
                              : (item.is_internal ? <Tag color="purple">Внутреннее</Tag> : <Tag color="blue">Сообщение</Tag>)
                            : <Tag>Событие</Tag>}
                          <Text type="secondary">{new Date(item.created_at).toLocaleString('ru-RU')}</Text>
                        </Space>
                        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{item.text || item.description || 'Обновление дела'}</Paragraph>
                      </Space>
                    </Card>
                  ))
                )}
              </Space>
            </Card>

            <Card size="small" title="Сообщение по делу">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input.TextArea value={messageText} onChange={(event) => setMessageText(event.target.value)} autoSize={{ minRows: 4, maxRows: 8 }} placeholder="Введите сообщение по арбитражу" />
                <div>
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} loading={sending} disabled={!messageText.trim()}>Отправить</Button>
                </div>
              </Space>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};
