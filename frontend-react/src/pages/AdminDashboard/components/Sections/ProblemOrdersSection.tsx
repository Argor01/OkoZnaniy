import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Avatar, 
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
  Divider,
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
  CheckCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

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

interface ProblemOrder {
  id: number;
  title: string;
  description: string;
  subject: string | NamedEntity | null;
  work_type: string | NamedEntity | null;
  status: string;
  problem_type: string;
  problem_severity: string;
  problem_description: string;
  budget: number;
  deadline: string;
  created_at: string;
  problem_detected_at: string;
  days_overdue: number;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  files_count: number;
  messages_count: number;
  last_activity: string;
  completion_percentage: number;
  admin_notes?: string;
  resolution_attempts: number;
}

interface ProblemOrdersSectionProps {
  orders?: ProblemOrder[];
  loading?: boolean;
  onViewOrder?: (orderId: number) => void;
  onResolveIssue?: (orderId: number, resolution: string) => void;
  onEscalateIssue?: (orderId: number, escalationNote: string) => void;
  onContactParticipant?: (orderId: number, participantType: 'client' | 'expert') => void;
  onAssignNewExpert?: (orderId: number, expertId: number) => void;
}

export const ProblemOrdersSection: React.FC<ProblemOrdersSectionProps> = ({
  orders = [],
  loading = false,
  onViewOrder,
  onResolveIssue,
  onEscalateIssue,
  onContactParticipant,
  onAssignNewExpert,
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

  
  const mockProblemOrders: ProblemOrder[] = [
    {
      id: 1,
      title: 'Курсовая работа по математическому анализу',
      description: 'Необходимо выполнить курсовую работу по теме "Дифференциальные уравнения"',
      subject: 'Математика',
      work_type: 'Курсовая работа',
      status: 'overdue',
      problem_type: 'deadline_missed',
      problem_severity: 'high',
      problem_description: 'Заказ просрочен на 5 дней, эксперт не отвечает на сообщения',
      budget: 5000,
      deadline: '2024-01-25T23:59:59Z',
      created_at: '2024-01-10T10:30:00Z',
      problem_detected_at: '2024-01-26T00:00:00Z',
      days_overdue: 5,
      client: {
        id: 1,
        username: 'student1',
        first_name: 'Иван',
        last_name: 'Студентов',
        email: 'student1@example.com',
        phone: '+7 (999) 123-45-67',
      },
      expert: {
        id: 1,
        username: 'expert_math',
        first_name: 'Алексей',
        last_name: 'Математиков',
        email: 'expert_math@example.com',
        phone: '+7 (999) 987-65-43',
      },
      files_count: 3,
      messages_count: 12,
      last_activity: '2024-01-23T15:30:00Z',
      completion_percentage: 30,
      admin_notes: 'Клиент жалуется на отсутствие прогресса',
      resolution_attempts: 2,
    },
    {
      id: 2,
      title: 'Дипломная работа по программированию',
      description: 'Разработка веб-приложения на React с backend на Node.js',
      subject: 'Информатика',
      work_type: 'Дипломная работа',
      status: 'dispute',
      problem_type: 'quality_dispute',
      problem_severity: 'critical',
      problem_description: 'Клиент недоволен качеством работы, требует полную переделку',
      budget: 15000,
      deadline: '2024-03-01T23:59:59Z',
      created_at: '2024-01-15T09:15:00Z',
      problem_detected_at: '2024-01-28T14:20:00Z',
      days_overdue: 0,
      client: {
        id: 2,
        username: 'graduate1',
        first_name: 'Мария',
        last_name: 'Выпускница',
        email: 'graduate1@example.com',
        phone: '+7 (999) 234-56-78',
      },
      expert: {
        id: 2,
        username: 'expert_dev',
        first_name: 'Петр',
        last_name: 'Разработчиков',
        email: 'expert_dev@example.com',
        phone: '+7 (999) 876-54-32',
      },
      files_count: 8,
      messages_count: 25,
      last_activity: '2024-01-29T10:15:00Z',
      completion_percentage: 80,
      admin_notes: 'Спор по качеству кода, требуется техническая экспертиза',
      resolution_attempts: 1,
    },
    {
      id: 3,
      title: 'Контрольная работа по физике',
      description: 'Решение задач по механике и термодинамике',
      subject: 'Физика',
      work_type: 'Контрольная работа',
      status: 'no_expert',
      problem_type: 'no_expert_assigned',
      problem_severity: 'medium',
      problem_description: 'Заказ висит без эксперта уже 3 дня',
      budget: 800,
      deadline: '2024-02-05T23:59:59Z',
      created_at: '2024-01-25T15:30:00Z',
      problem_detected_at: '2024-01-28T15:30:00Z',
      days_overdue: 0,
      client: {
        id: 3,
        username: 'physics_student',
        first_name: 'Анна',
        last_name: 'Физикова',
        email: 'physics@example.com',
        phone: '+7 (999) 345-67-89',
      },
      files_count: 1,
      messages_count: 0,
      last_activity: '2024-01-25T15:30:00Z',
      completion_percentage: 0,
      admin_notes: 'Низкий бюджет, эксперты не берут заказ',
      resolution_attempts: 0,
    },
    {
      id: 4,
      title: 'Реферат по истории России',
      description: 'Тема: "Великая Отечественная война 1941-1945 гг."',
      subject: 'История',
      work_type: 'Реферат',
      status: 'payment_issue',
      problem_type: 'payment_problem',
      problem_severity: 'high',
      problem_description: 'Проблемы с оплатой, средства заблокированы',
      budget: 1500,
      deadline: '2024-02-10T23:59:59Z',
      created_at: '2024-01-20T12:00:00Z',
      problem_detected_at: '2024-01-29T09:00:00Z',
      days_overdue: 0,
      client: {
        id: 4,
        username: 'history_student',
        first_name: 'Петр',
        last_name: 'Историков',
        email: 'history@example.com',
        phone: '+7 (999) 456-78-90',
      },
      expert: {
        id: 3,
        username: 'history_expert',
        first_name: 'Елена',
        last_name: 'Историкова',
        email: 'history_expert@example.com',
        phone: '+7 (999) 765-43-21',
      },
      files_count: 2,
      messages_count: 8,
      last_activity: '2024-01-28T16:45:00Z',
      completion_percentage: 90,
      admin_notes: 'Работа готова, но оплата не прошла',
      resolution_attempts: 3,
    },
  ];

  const dataSource = orders;

  
  const filteredData = dataSource.filter(order => {
    const matchesSearch = 
      order.title.toLowerCase().includes(searchText.toLowerCase()) ||
      order.problem_description.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.username.toLowerCase().includes(searchText.toLowerCase());
    
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
      message.success(`Проблема заказа #${selectedOrder.id} решена`);
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
      message.success(`Проблема заказа #${selectedOrder.id} эскалирована`);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong>#{record.id}</strong>
            {record.days_overdue > 0 && (
              <Tag color="red">
                Просрочен на {record.days_overdue} дн.
              </Tag>
            )}
          </div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.title}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
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
          <div style={{ marginBottom: 4 }}>
            <Tag color={getProblemTypeColor(record.problem_type)}>
              {getProblemTypeLabel(record.problem_type)}
            </Tag>
          </div>
          <Text style={{ fontSize: '12px' }}>
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
          <div style={{ marginBottom: 4, fontSize: '12px' }}>
            <UserOutlined /> {record.client.first_name} {record.client.last_name}
          </div>
          {record.expert ? (
            <div style={{ fontSize: '12px' }}>
              <UserOutlined /> {record.expert.first_name} {record.expert.last_name}
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: '12px' }}>
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
          <Text style={{ fontSize: '11px' }}>
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
          <div style={{ fontSize: '12px' }}>
            <div>{dayjs(date).format('DD.MM.YYYY')}</div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
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
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Проблемные заказы</Title>
          <Text type="secondary">
            Заказы, требующие внимания администратора
          </Text>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
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
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<FireOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Просроченные" 
              value={stats.overdue} 
              valueStyle={{ color: '#faad14' }}
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
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по названию или описанию проблемы"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Тип проблемы"
            style={{ width: 180 }}
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
            style={{ width: 150 }}
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
              style={{ marginBottom: 16 }}
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
                  <Tag color="red" style={{ marginLeft: 8 }}>
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
            <div style={{ marginBottom: 16 }}>
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
            style={{ marginBottom: 16 }}
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

      <style>{`
        .critical-row {
          background-color: #fff2f0 !important;
        }
        .high-priority-row {
          background-color: #fff7e6 !important;
        }
      `}</style>
    </div>
  );
};
