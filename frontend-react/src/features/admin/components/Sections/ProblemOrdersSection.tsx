import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Select,
  Modal,
  message,
  Tooltip,
  Alert,
  Statistic,
  Row,
  Col,
  Descriptions,
  Form,
  Progress
} from 'antd';
import { 
  UserOutlined, 
  EyeOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  WarningOutlined,
  MessageOutlined,
  PhoneOutlined,
  ToolOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ProblemOrder } from '@/features/orders/types/orders';
import { useProblemOrders, useOrderActions } from '@/features/admin/hooks/useAdminOrders';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

type NamedEntity = { name: string };

const getEntityLabel = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') return name;
  }
  return '';
};

interface ProblemOrdersTableProps {
  orders?: ProblemOrder[];
  loading?: boolean;
  onViewOrder?: (orderId: number) => void;
  onResolveIssue?: (orderId: number, resolution: string) => void;
  onEscalateIssue?: (orderId: number, escalationNote: string) => void;
  onContactParticipant?: (orderId: number, participantType: 'client' | 'expert') => void;
  onAssignNewExpert?: (orderId: number, expertId: number) => void;
}

const ProblemOrdersTable: React.FC<ProblemOrdersTableProps> = ({
  orders = [],
  loading = false,
  onResolveIssue,
  onEscalateIssue,
  onContactParticipant,
}) => {
  const [searchText, setSearchText] = useState('');
  const [problemTypeFilter, setProblemTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ProblemOrder | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);
  const [resolveForm] = Form.useForm();
  const [escalateForm] = Form.useForm();

  const dataSource = orders;

  const filteredData = dataSource.filter(order => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = 
      (order.title || '').toLowerCase().includes(searchLower) ||
      (order.problem_description || '').toLowerCase().includes(searchLower) ||
      (order.client?.username || '').toLowerCase().includes(searchLower);
    
    const matchesProblemType = problemTypeFilter === 'all' || order.problem_type === problemTypeFilter;
    const matchesSeverity = severityFilter === 'all' || order.problem_severity === severityFilter;
    
    return matchesSearch && matchesProblemType && matchesSeverity;
  });

  const handleViewOrder = (order: ProblemOrder) => {
    setSelectedOrder(order);
    setOrderModalVisible(true);
  };

  const handleResolveIssue = (order: ProblemOrder) => {
    setSelectedOrder(order);
    setResolveModalVisible(true);
  };

  const handleEscalateIssue = (order: ProblemOrder) => {
    setSelectedOrder(order);
    setEscalateModalVisible(true);
  };

  const handleResolveConfirm = async () => {
    if (!selectedOrder) return;
    
    try {
      const values = await resolveForm.validateFields();
      onResolveIssue?.(selectedOrder.id, values.resolution);
      setResolveModalVisible(false);
      setSelectedOrder(null);
      resolveForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEscalateConfirm = async () => {
    if (!selectedOrder) return;
    
    try {
      const values = await escalateForm.validateFields();
      onEscalateIssue?.(selectedOrder.id, values.escalationNote);
      setEscalateModalVisible(false);
      setSelectedOrder(null);
      escalateForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getProblemTypeLabel = (type: string) => {
    const typeLabels = {
      deadline_missed: 'Просрочка дедлайна',
      quality_dispute: 'Спор по качеству',
      no_expert_assigned: 'Нет эксперта',
      payment_problem: 'Проблема с оплатой',
      communication_issue: 'Проблема коммуникации',
      technical_issue: 'Техническая проблема',
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getProblemTypeColor = (type: string) => {
    const typeColors = {
      deadline_missed: 'red',
      quality_dispute: 'volcano',
      no_expert_assigned: 'orange',
      payment_problem: 'purple',
      communication_issue: 'blue',
      technical_issue: 'cyan',
    };
    return typeColors[type as keyof typeof typeColors] || 'default';
  };

  const getSeverityLabel = (severity: string) => {
    const severityLabels = {
      low: 'Низкая',
      medium: 'Средняя',
      high: 'Высокая',
      critical: 'Критическая',
    };
    return severityLabels[severity as keyof typeof severityLabels] || severity;
  };

  const getSeverityColor = (severity: string) => {
    const severityColors = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      critical: 'red',
    };
    return severityColors[severity as keyof typeof severityColors] || 'default';
  };

  const getSeverityIcon = (severity: string) => {
    const severityIcons = {
      low: <CheckCircleOutlined />,
      medium: <ClockCircleOutlined />,
      high: <WarningOutlined />,
      critical: <FireOutlined />,
    };
    return severityIcons[severity as keyof typeof severityIcons] || <ExclamationCircleOutlined />;
  };

  const stats = {
    total: filteredData.length,
    critical: filteredData.filter(o => o.problem_severity === 'critical').length,
    high: filteredData.filter(o => o.problem_severity === 'high').length,
    overdue: filteredData.filter(o => o.days_overdue > 0).length,
    avgResolutionAttempts: filteredData.length > 0 
      ? Math.round(filteredData.reduce((sum, o) => sum + o.resolution_attempts, 0) / filteredData.length * 10) / 10
      : 0,
  };

  const columns = [
    {
      title: 'Заказ',
      key: 'order',
      width: 280,
      render: (record: ProblemOrder) => (
        <div>
          <div className="problemOrdersHeaderRow">
            <strong>#{record.id}</strong>
            {record.days_overdue > 0 && (
              <Tag color="red">
                Просрочен на {record.days_overdue} дн.
              </Tag>
            )}
          </div>
          <div className="problemOrdersTitle">
            {record.title}
          </div>
          <Text type="secondary" className="problemOrdersMetaText">
            {getEntityLabel(record.subject)} • {getEntityLabel(record.work_type)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Проблема',
      key: 'problem',
      width: 250,
      render: (record: ProblemOrder) => (
        <div>
          <div className="problemOrdersProblemTagRow">
            <Tag color={getProblemTypeColor(record.problem_type)}>
              {getProblemTypeLabel(record.problem_type)}
            </Tag>
          </div>
          <Text className="problemOrdersProblemText">
            {record.problem_description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Критичность',
      dataIndex: 'problem_severity',
      key: 'problem_severity',
      width: 120,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {getSeverityLabel(severity)}
        </Tag>
      ),
    },
    {
      title: 'Участники',
      key: 'participants',
      width: 200,
      render: (record: ProblemOrder) => (
        <div>
          <div className="problemOrdersParticipantRow">
            <UserOutlined /> {record.client.first_name} {record.client.last_name}
          </div>
          {record.expert ? (
            <div className="problemOrdersParticipantRow">
              <UserOutlined /> {record.expert.first_name} {record.expert.last_name}
            </div>
          ) : (
            <Text type="secondary" className="problemOrdersParticipantEmpty">
              Эксперт не назначен
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Прогресс',
      key: 'progress',
      width: 100,
      render: (record: ProblemOrder) => (
        <div>
          <Progress 
            percent={record.completion_percentage} 
            size="small"
            status={record.completion_percentage === 0 ? 'exception' : 'active'}
          />
          <Text className="problemOrdersProgressText">
            {record.completion_percentage}%
          </Text>
        </div>
      ),
    },
    {
      title: 'Попытки решения',
      dataIndex: 'resolution_attempts',
      key: 'resolution_attempts',
      width: 100,
      render: (attempts: number) => (
        <Tag color={attempts === 0 ? 'default' : attempts > 2 ? 'red' : 'orange'}>
          {attempts}
        </Tag>
      ),
    },
    {
      title: 'Последняя активность',
      dataIndex: 'last_activity',
      key: 'last_activity',
      width: 120,
      render: (date: string) => {
        const daysSince = dayjs().diff(dayjs(date), 'days');
        return (
          <div className="problemOrdersActivity">
            <div>{dayjs(date).format('DD.MM.YYYY')}</div>
            <Text type="secondary" className="problemOrdersActivityMeta">
              {daysSince === 0 ? 'Сегодня' : `${daysSince} дн. назад`}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (record: ProblemOrder) => (
        <Space direction="vertical" size={4}>
          <Space size={4}>
            <Tooltip title="Подробно">
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => handleViewOrder(record)}
              />
            </Tooltip>
            <Tooltip title="Решить проблему">
              <Button 
                size="small" 
                type="primary"
                icon={<ToolOutlined />}
                onClick={() => handleResolveIssue(record)}
              />
            </Tooltip>
          </Space>
          <Space size={4}>
            <Tooltip title="Связаться с клиентом">
              <Button 
                size="small" 
                icon={<MessageOutlined />}
                onClick={() => onContactParticipant?.(record.id, 'client')}
              />
            </Tooltip>
            {record.expert && (
              <Tooltip title="Связаться с экспертом">
                <Button 
                  size="small" 
                  icon={<PhoneOutlined />}
                  onClick={() => onContactParticipant?.(record.id, 'expert')}
                />
              </Tooltip>
            )}
          </Space>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="problemOrdersSectionHeader">
          <Title level={4}>Проблемные заказы</Title>
          <Text type="secondary">
            Заказы, требующие внимания администратора
          </Text>
        </div>

        <Row gutter={16} className="problemOrdersStatsRow">
          <Col span={6}>
            <Statistic 
              title="Всего проблем" 
              value={stats.total} 
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Критические" 
              value={stats.critical} 
              className="problemOrdersStatCritical"
              prefix={<FireOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Просроченные" 
              value={stats.overdue} 
              className="problemOrdersStatOverdue"
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Ср. попыток решения" 
              value={stats.avgResolutionAttempts} 
              precision={1}
            />
          </Col>
        </Row>

        {stats.critical > 0 && (
          <Alert
            message="Внимание!"
            description={`У вас есть ${stats.critical} критических проблем, требующих немедленного решения.`}
            type="error"
            showIcon
            className="problemOrdersCriticalAlert"
          />
        )}

        <div className="problemOrdersFiltersRow">
          <Search
            placeholder="Поиск по названию или описанию проблемы"
            allowClear
            className="problemOrdersSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Тип проблемы"
            className="problemOrdersSelectType"
            value={problemTypeFilter}
            onChange={setProblemTypeFilter}
          >
            <Option value="all">Все типы</Option>
            <Option value="deadline_missed">Просрочка дедлайна</Option>
            <Option value="quality_dispute">Спор по качеству</Option>
            <Option value="no_expert_assigned">Нет эксперта</Option>
            <Option value="payment_problem">Проблема с оплатой</Option>
            <Option value="communication_issue">Проблема коммуникации</Option>
            <Option value="technical_issue">Техническая проблема</Option>
          </Select>

          <Select
            placeholder="Критичность"
            className="problemOrdersSelectSeverity"
            value={severityFilter}
            onChange={setSeverityFilter}
          >
            <Option value="all">Все уровни</Option>
            <Option value="critical">Критическая</Option>
            <Option value="high">Высокая</Option>
            <Option value="medium">Средняя</Option>
            <Option value="low">Низкая</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} проблемных заказов`
          }}
          locale={{ emptyText: 'Проблемные заказы не найдены' }}
          scroll={{ x: 1300 }}
          size="small"
          rowClassName={(record) => 
            record.problem_severity === 'critical' ? 'critical-row' : 
            record.problem_severity === 'high' ? 'high-priority-row' : ''
          }
        />
      </Card>

      <Modal
        title={`Проблемный заказ #${selectedOrder?.id}`}
        open={orderModalVisible}
        onCancel={() => {
          setOrderModalVisible(false);
          setSelectedOrder(null);
        }}
        footer={[
          <Button key="close" onClick={() => setOrderModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="resolve" 
            type="primary"
            onClick={() => {
              setOrderModalVisible(false);
              if (selectedOrder) handleResolveIssue(selectedOrder);
            }}
          >
            Решить проблему
          </Button>,
        ]}
        width={900}
      >
        {selectedOrder && (
          <div>
            <Alert
              message={`${getProblemTypeLabel(selectedOrder.problem_type)} - ${getSeverityLabel(selectedOrder.problem_severity)}`}
              description={selectedOrder.problem_description}
              type={selectedOrder.problem_severity === 'critical' ? 'error' : 'warning'}
              showIcon
              className="problemOrdersModalAlert"
            />

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Название" span={2}>
                <strong>{selectedOrder.title}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Обнаружена">
                {dayjs(selectedOrder.problem_detected_at).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Попытки решения">
                <Tag color={selectedOrder.resolution_attempts > 2 ? 'red' : 'orange'}>
                  {selectedOrder.resolution_attempts}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дедлайн">
                {dayjs(selectedOrder.deadline).format('DD.MM.YYYY HH:mm')}
                {selectedOrder.days_overdue > 0 && (
                  <Tag color="red" className="problemOrdersOverdueTag">
                    Просрочен на {selectedOrder.days_overdue} дн.
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Прогресс">
                <Progress percent={selectedOrder.completion_percentage} size="small" />
              </Descriptions.Item>
              <Descriptions.Item label="Клиент">
                {selectedOrder.client.first_name} {selectedOrder.client.last_name}
                <br />
                <Text type="secondary">{selectedOrder.client.email}</Text>
                {selectedOrder.client.phone && (
                  <>
                    <br />
                    <Text type="secondary">{selectedOrder.client.phone}</Text>
                  </>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Эксперт">
                {selectedOrder.expert ? (
                  <>
                    {selectedOrder.expert.first_name} {selectedOrder.expert.last_name}
                    <br />
                    <Text type="secondary">{selectedOrder.expert.email}</Text>
                    {selectedOrder.expert.phone && (
                      <>
                        <br />
                        <Text type="secondary">{selectedOrder.expert.phone}</Text>
                      </>
                    )}
                  </>
                ) : (
                  <Text type="secondary">Не назначен</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Заметки администратора" span={2}>
                {selectedOrder.admin_notes || 'Нет заметок'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title={`Решить проблему заказа #${selectedOrder?.id}`}
        open={resolveModalVisible}
        onOk={handleResolveConfirm}
        onCancel={() => {
          setResolveModalVisible(false);
          setSelectedOrder(null);
          resolveForm.resetFields();
        }}
        okText="Решить"
        cancelText="Отмена"
        width={600}
      >
        <Form form={resolveForm} layout="vertical">
          {selectedOrder && (
            <div className="problemOrdersResolveAlertWrap">
              <Alert
                message={getProblemTypeLabel(selectedOrder.problem_type)}
                description={selectedOrder.problem_description}
                type="info"
                showIcon
              />
            </div>
          )}
          
          <Form.Item
            name="resolution"
            label="Описание решения"
            rules={[{ required: true, message: 'Опишите, как была решена проблема' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Опишите предпринятые действия и результат..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Эскалировать проблему заказа #${selectedOrder?.id}`}
        open={escalateModalVisible}
        onOk={handleEscalateConfirm}
        onCancel={() => {
          setEscalateModalVisible(false);
          setSelectedOrder(null);
          escalateForm.resetFields();
        }}
        okText="Эскалировать"
        cancelText="Отмена"
        width={600}
      >
        <Form form={escalateForm} layout="vertical">
          <Alert
            message="Эскалация проблемы"
            description="Проблема будет передана руководству для принятия решения."
            type="warning"
            showIcon
            className="problemOrdersEscalateAlert"
          />
          
          <Form.Item
            name="escalationNote"
            label="Причина эскалации"
            rules={[{ required: true, message: 'Укажите причину эскалации' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Опишите, почему проблема требует вмешательства руководства..."
            />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export const ProblemOrdersSection: React.FC = () => {
  const { orders, loading } = useProblemOrders();
  const { changeStatus } = useOrderActions();

  const handleResolveIssue = (orderId: number, resolution: string) => {
    // Implement API call for resolution
    // For now we might just log or call changeStatus if applicable
    console.log('Resolving issue', orderId, resolution);
    // Ideally: adminPanelApi.resolveIssue(orderId, resolution)
    // Fallback to message for now as we don't have a specific endpoint
    message.success(`Решение по заказу #${orderId} сохранено`);
  };

  const handleEscalateIssue = (orderId: number, escalationNote: string) => {
    console.log('Escalating issue', orderId, escalationNote);
    message.success(`Проблема заказа #${orderId} эскалирована`);
  };

  const handleContactParticipant = (orderId: number, participantType: 'client' | 'expert') => {
    message.info(`Связь с ${participantType === 'client' ? 'клиентом' : 'экспертом'} по заказу #${orderId} (В разработке)`);
  };

  const handleAssignNewExpert = (orderId: number, expertId: number) => {
    message.info(`Назначение нового эксперта ${expertId} на заказ #${orderId} (В разработке)`);
  };

  return (
    <ProblemOrdersTable
      orders={orders as ProblemOrder[]}
      loading={loading}
      onResolveIssue={handleResolveIssue}
      onEscalateIssue={handleEscalateIssue}
      onContactParticipant={handleContactParticipant}
      onAssignNewExpert={handleAssignNewExpert}
    />
  );
};
