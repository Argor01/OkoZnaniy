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
  DatePicker,
  Statistic,
  Row,
  Col,
  Descriptions,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
  EditOutlined,
  MessageOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface Order {
  id: number;
  title: string;
  description: string;
  subject: string;
  work_type: string;
  status: string;
  priority: string;
  budget: number;
  deadline: string;
  created_at: string;
  updated_at: string;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  files_count: number;
  messages_count: number;
  is_urgent: boolean;
  completion_percentage: number;
}

interface AllOrdersSectionProps {
  orders?: Order[];
  loading?: boolean;
  onViewOrder?: (orderId: number) => void;
  onEditOrder?: (orderId: number) => void;
  onChangeOrderStatus?: (orderId: number, newStatus: string) => void;
  onAssignExpert?: (orderId: number, expertId: number) => void;
  onContactClient?: (orderId: number) => void;
}

export const AllOrdersSection: React.FC<AllOrdersSectionProps> = ({
  orders = [],
  loading = false,
  onViewOrder,
  onEditOrder,
  onChangeOrderStatus,
  onAssignExpert,
  onContactClient,
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // Мок данные для демонстрации
  const mockOrders: Order[] = [
    {
      id: 1,
      title: 'Курсовая работа по математическому анализу',
      description: 'Необходимо выполнить курсовую работу по теме "Дифференциальные уравнения"',
      subject: 'Математика',
      work_type: 'Курсовая работа',
      status: 'new',
      priority: 'high',
      budget: 5000,
      deadline: '2024-02-15T23:59:59Z',
      created_at: '2024-01-20T10:30:00Z',
      updated_at: '2024-01-20T10:30:00Z',
      client: {
        id: 1,
        username: 'student1',
        first_name: 'Иван',
        last_name: 'Студентов',
        email: 'student1@example.com',
      },
      files_count: 3,
      messages_count: 0,
      is_urgent: true,
      completion_percentage: 0,
    },
    {
      id: 2,
      title: 'Дипломная работа по программированию',
      description: 'Разработка веб-приложения на React с backend на Node.js',
      subject: 'Информатика',
      work_type: 'Дипломная работа',
      status: 'in_progress',
      priority: 'high',
      budget: 15000,
      deadline: '2024-03-01T23:59:59Z',
      created_at: '2024-01-15T09:15:00Z',
      updated_at: '2024-01-25T14:20:00Z',
      client: {
        id: 2,
        username: 'graduate1',
        first_name: 'Мария',
        last_name: 'Выпускница',
        email: 'graduate1@example.com',
      },
      expert: {
        id: 1,
        username: 'expert_dev',
        first_name: 'Алексей',
        last_name: 'Разработчиков',
        email: 'expert_dev@example.com',
      },
      files_count: 8,
      messages_count: 15,
      is_urgent: false,
      completion_percentage: 45,
    },
    {
      id: 3,
      title: 'Реферат по истории России',
      description: 'Тема: "Великая Отечественная война 1941-1945 гг."',
      subject: 'История',
      work_type: 'Реферат',
      status: 'completed',
      priority: 'medium',
      budget: 1500,
      deadline: '2024-01-30T23:59:59Z',
      created_at: '2024-01-10T12:00:00Z',
      updated_at: '2024-01-28T16:45:00Z',
      client: {
        id: 3,
        username: 'history_student',
        first_name: 'Петр',
        last_name: 'Историков',
        email: 'history@example.com',
      },
      expert: {
        id: 2,
        username: 'history_expert',
        first_name: 'Елена',
        last_name: 'Историкова',
        email: 'history_expert@example.com',
      },
      files_count: 2,
      messages_count: 8,
      is_urgent: false,
      completion_percentage: 100,
    },
    {
      id: 4,
      title: 'Контрольная работа по физике',
      description: 'Решение задач по механике и термодинамике',
      subject: 'Физика',
      work_type: 'Контрольная работа',
      status: 'cancelled',
      priority: 'low',
      budget: 800,
      deadline: '2024-01-25T23:59:59Z',
      created_at: '2024-01-18T15:30:00Z',
      updated_at: '2024-01-22T10:15:00Z',
      client: {
        id: 4,
        username: 'physics_student',
        first_name: 'Анна',
        last_name: 'Физикова',
        email: 'physics@example.com',
      },
      files_count: 1,
      messages_count: 3,
      is_urgent: false,
      completion_percentage: 0,
    },
  ];

  const dataSource = orders.length > 0 ? orders : mockOrders;

  // Фильтрация данных
  const filteredData = dataSource.filter(order => {
    const matchesSearch = 
      order.title.toLowerCase().includes(searchText.toLowerCase()) ||
      order.description.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.username.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.last_name.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSubject = subjectFilter === 'all' || order.subject === subjectFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
    
    let matchesDate = true;
    if (dateRange) {
      const orderDate = dayjs(order.created_at);
      matchesDate = orderDate.isAfter(dateRange[0]) && orderDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesStatus && matchesSubject && matchesPriority && matchesDate;
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderModalVisible(true);
  };

  const handleChangeStatus = (order: Order, newStatus: string) => {
    Modal.confirm({
      title: 'Изменить статус заказа?',
      content: `Вы уверены, что хотите изменить статус заказа "${order.title}" на "${getStatusLabel(newStatus)}"?`,
      okText: 'Изменить',
      cancelText: 'Отмена',
      onOk: () => {
        onChangeOrderStatus?.(order.id, newStatus);
        message.success(`Статус заказа изменен на "${getStatusLabel(newStatus)}"`);
      },
    });
  };

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      new: 'Новый',
      in_progress: 'В работе',
      review: 'На проверке',
      completed: 'Завершен',
      cancelled: 'Отменен',
      dispute: 'Спор',
    };
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      new: 'blue',
      in_progress: 'orange',
      review: 'purple',
      completed: 'green',
      cancelled: 'red',
      dispute: 'volcano',
    };
    return statusColors[status as keyof typeof statusColors] || 'default';
  };

  const getPriorityLabel = (priority: string) => {
    const priorityLabels = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочный',
    };
    return priorityLabels[priority as keyof typeof priorityLabels] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return priorityColors[priority as keyof typeof priorityColors] || 'default';
  };

  // Статистика
  const stats = {
    total: filteredData.length,
    new: filteredData.filter(o => o.status === 'new').length,
    inProgress: filteredData.filter(o => o.status === 'in_progress').length,
    completed: filteredData.filter(o => o.status === 'completed').length,
    cancelled: filteredData.filter(o => o.status === 'cancelled').length,
    totalBudget: filteredData.reduce((sum, o) => sum + o.budget, 0),
  };

  const columns = [
    {
      title: 'Заказ',
      key: 'order',
      width: 300,
      render: (record: Order) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong>#{record.id}</strong>
            {record.is_urgent && <Tag color="red" size="small">Срочно</Tag>}
          </div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.title}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.subject} • {record.work_type}
          </Text>
        </div>
      ),
    },
    {
      title: 'Клиент',
      key: 'client',
      width: 180,
      render: (record: Order) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>
              {record.client.first_name} {record.client.last_name}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              @{record.client.username}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Эксперт',
      key: 'expert',
      width: 180,
      render: (record: Order) => (
        record.expert ? (
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>
                {record.expert.first_name} {record.expert.last_name}
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                @{record.expert.username}
              </Text>
            </div>
          </Space>
        ) : (
          <Text type="secondary">Не назначен</Text>
        )
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)} size="small">
          {getPriorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: 'Бюджет',
      dataIndex: 'budget',
      key: 'budget',
      width: 100,
      render: (budget: number) => (
        <Text strong>{budget.toLocaleString()} ₽</Text>
      ),
    },
    {
      title: 'Дедлайн',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (deadline: string) => {
        const deadlineDate = dayjs(deadline);
        const isOverdue = deadlineDate.isBefore(dayjs());
        const isNearDeadline = deadlineDate.diff(dayjs(), 'days') <= 3;
        
        return (
          <div style={{ 
            color: isOverdue ? '#ff4d4f' : isNearDeadline ? '#faad14' : undefined 
          }}>
            <div style={{ fontSize: '12px' }}>
              {deadlineDate.format('DD.MM.YYYY')}
            </div>
            <div style={{ fontSize: '11px' }}>
              {deadlineDate.format('HH:mm')}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Прогресс',
      key: 'progress',
      width: 100,
      render: (record: Order) => (
        <div>
          <div style={{ fontSize: '12px', marginBottom: 2 }}>
            {record.completion_percentage}%
          </div>
          <div style={{ 
            width: '60px', 
            height: '4px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${record.completion_percentage}%`,
              height: '100%',
              backgroundColor: record.completion_percentage === 100 ? '#52c41a' : '#1890ff',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      ),
    },
    {
      title: 'Активность',
      key: 'activity',
      width: 100,
      render: (record: Order) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            📎 {record.files_count} файлов
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            💬 {record.messages_count} сообщений
          </Text>
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Order) => (
        <Space>
          <Tooltip title="Подробно">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewOrder(record)}
            />
          </Tooltip>
          <Tooltip title="Редактировать">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => onEditOrder?.(record.id)}
            />
          </Tooltip>
          <Tooltip title="Связаться с клиентом">
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => onContactClient?.(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Все заказы</Title>
          <Text type="secondary">
            Управление всеми заказами в системе
          </Text>
        </div>

        {/* Статистика */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Statistic title="Всего заказов" value={stats.total} />
          </Col>
          <Col span={4}>
            <Statistic title="Новые" value={stats.new} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={4}>
            <Statistic title="В работе" value={stats.inProgress} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={4}>
            <Statistic title="Завершены" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={4}>
            <Statistic title="Отменены" value={stats.cancelled} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Общий бюджет" 
              value={stats.totalBudget} 
              suffix="₽"
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Col>
        </Row>

        {/* Фильтры */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по названию, описанию или клиенту"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Статус"
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">Все статусы</Option>
            <Option value="new">Новые</Option>
            <Option value="in_progress">В работе</Option>
            <Option value="review">На проверке</Option>
            <Option value="completed">Завершены</Option>
            <Option value="cancelled">Отменены</Option>
            <Option value="dispute">Споры</Option>
          </Select>

          <Select
            placeholder="Предмет"
            style={{ width: 150 }}
            value={subjectFilter}
            onChange={setSubjectFilter}
          >
            <Option value="all">Все предметы</Option>
            <Option value="Математика">Математика</Option>
            <Option value="Информатика">Информатика</Option>
            <Option value="История">История</Option>
            <Option value="Физика">Физика</Option>
            <Option value="Химия">Химия</Option>
          </Select>

          <Select
            placeholder="Приоритет"
            style={{ width: 120 }}
            value={priorityFilter}
            onChange={setPriorityFilter}
          >
            <Option value="all">Все</Option>
            <Option value="low">Низкий</Option>
            <Option value="medium">Средний</Option>
            <Option value="high">Высокий</Option>
            <Option value="urgent">Срочный</Option>
          </Select>

          <RangePicker
            placeholder={['Дата от', 'Дата до']}
            style={{ width: 240 }}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} заказов`
          }}
          locale={{ emptyText: 'Заказы не найдены' }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>

      {/* Модальное окно просмотра заказа */}
      <Modal
        title={`Заказ #${selectedOrder?.id}`}
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
            key="edit" 
            type="primary"
            onClick={() => {
              if (selectedOrder) {
                onEditOrder?.(selectedOrder.id);
                setOrderModalVisible(false);
              }
            }}
          >
            Редактировать
          </Button>,
        ]}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Название" span={2}>
                <strong>{selectedOrder.title}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Описание" span={2}>
                {selectedOrder.description}
              </Descriptions.Item>
              <Descriptions.Item label="Предмет">
                {selectedOrder.subject}
              </Descriptions.Item>
              <Descriptions.Item label="Тип работы">
                {selectedOrder.work_type}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={getStatusColor(selectedOrder.status)}>
                  {getStatusLabel(selectedOrder.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Приоритет">
                <Tag color={getPriorityColor(selectedOrder.priority)}>
                  {getPriorityLabel(selectedOrder.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Бюджет">
                <strong>{selectedOrder.budget.toLocaleString()} ₽</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Дедлайн">
                {dayjs(selectedOrder.deadline).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Клиент">
                {selectedOrder.client.first_name} {selectedOrder.client.last_name}
                <br />
                <Text type="secondary">@{selectedOrder.client.username}</Text>
                <br />
                <Text type="secondary">{selectedOrder.client.email}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Эксперт">
                {selectedOrder.expert ? (
                  <>
                    {selectedOrder.expert.first_name} {selectedOrder.expert.last_name}
                    <br />
                    <Text type="secondary">@{selectedOrder.expert.username}</Text>
                    <br />
                    <Text type="secondary">{selectedOrder.expert.email}</Text>
                  </>
                ) : (
                  <Text type="secondary">Не назначен</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Прогресс">
                {selectedOrder.completion_percentage}%
              </Descriptions.Item>
              <Descriptions.Item label="Файлы">
                {selectedOrder.files_count} файлов
              </Descriptions.Item>
              <Descriptions.Item label="Создан">
                {dayjs(selectedOrder.created_at).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Обновлен">
                {dayjs(selectedOrder.updated_at).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button 
                type="primary" 
                onClick={() => handleChangeStatus(selectedOrder, 'in_progress')}
                disabled={selectedOrder.status === 'in_progress'}
              >
                В работу
              </Button>
              <Button 
                onClick={() => handleChangeStatus(selectedOrder, 'completed')}
                disabled={selectedOrder.status === 'completed'}
              >
                Завершить
              </Button>
              <Button 
                danger
                onClick={() => handleChangeStatus(selectedOrder, 'cancelled')}
                disabled={selectedOrder.status === 'cancelled'}
              >
                Отменить
              </Button>
              <Button 
                onClick={() => onContactClient?.(selectedOrder.id)}
              >
                Связаться с клиентом
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};