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
  DatePicker,
  Statistic,
  Row,
  Col,
  Descriptions,
  Divider
} from 'antd';
import { 
  EyeOutlined,
  SearchOutlined,
  EditOutlined,
  MessageOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

type NamedEntity = { name: string };

const getEntityLabel = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') return name;
  }
  return '';
};

interface Order {
  id: number;
  title: string;
  description: string;
  subject: string | NamedEntity | null;
  work_type: string | NamedEntity | null;
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

  const dataSource = orders;

  
  const filteredData = dataSource.filter(order => {
    const matchesSearch = 
      order.title.toLowerCase().includes(searchText.toLowerCase()) ||
      order.description.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.username.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
      order.client.last_name.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSubject = subjectFilter === 'all' || getEntityLabel(order.subject) === subjectFilter;
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
          <div className="allOrdersHeaderRow">
            <strong>#{record.id}</strong>
            {record.is_urgent && <Tag color="red">Срочно</Tag>}
          </div>
          <div className="allOrdersTitle">
            {record.title}
          </div>
          <Text type="secondary" className="allOrdersMetaText">
            {getEntityLabel(record.subject)} • {getEntityLabel(record.work_type)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Клиент',
      key: 'client',
      width: 180,
      render: (record: Order) => (
        <div>
          <div className="allOrdersPersonName">
            {record.client.first_name} {record.client.last_name}
          </div>
          <Text type="secondary" className="allOrdersPersonHandle">
            @{record.client.username}
          </Text>
        </div>
      ),
    },
    {
      title: 'Эксперт',
      key: 'expert',
      width: 180,
      render: (record: Order) => (
        record.expert ? (
          <div>
            <div className="allOrdersPersonName">
              {record.expert.first_name} {record.expert.last_name}
            </div>
            <Text type="secondary" className="allOrdersPersonHandle">
              @{record.expert.username}
            </Text>
          </div>
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
          <div className={isOverdue ? 'allOrdersDeadlineOverdue' : isNearDeadline ? 'allOrdersDeadlineNear' : 'allOrdersDeadline'}>
            <div className="allOrdersDeadlineDate">
              {deadlineDate.format('DD.MM.YYYY')}
            </div>
            <div className="allOrdersDeadlineTime">
              {deadlineDate.format('HH:mm')}
            </div>
          </div>
        );
      },
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
        <div className="allOrdersSectionHeader">
          <Title level={4}>Все заказы</Title>
          <Text type="secondary">
            Управление всеми заказами в системе
          </Text>
        </div>

        <Row gutter={16} className="allOrdersStatsRow">
          <Col span={4}>
            <Statistic title="Всего заказов" value={stats.total} />
          </Col>
          <Col span={4}>
            <Statistic title="Новые" value={stats.new} className="allOrdersStatNew" />
          </Col>
          <Col span={4}>
            <Statistic title="В работе" value={stats.inProgress} className="allOrdersStatInProgress" />
          </Col>
          <Col span={4}>
            <Statistic title="Завершены" value={stats.completed} className="allOrdersStatCompleted" />
          </Col>
          <Col span={4}>
            <Statistic title="Отменены" value={stats.cancelled} className="allOrdersStatCancelled" />
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

        <div className="allOrdersFiltersRow">
          <Search
            placeholder="Поиск по названию, описанию или клиенту"
            allowClear
            className="allOrdersSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Статус"
            className="allOrdersSelectStatus"
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
            className="allOrdersSelectSubject"
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
            className="allOrdersSelectPriority"
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
            className="allOrdersRangePicker"
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
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>

      
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
                {getEntityLabel(selectedOrder.subject)}
              </Descriptions.Item>
              <Descriptions.Item label="Тип работы">
                {getEntityLabel(selectedOrder.work_type)}
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

            <div className="allOrdersModalActions">
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
