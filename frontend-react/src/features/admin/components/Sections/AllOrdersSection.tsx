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
import { AdminOrder as Order } from '@/features/orders/types/orders';
import { useAllOrders, useOrderActions } from '@/features/admin/hooks/useAdminOrders';
import { 
  ORDER_STATUSES, 
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_COLORS,
  ORDER_PRIORITY_LABELS,
  ORDER_PRIORITY_COLORS,
  ORDER_PRIORITIES
} from '@/utils/constants';
import apiClient from '@/api/client';

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

interface AllOrdersTableProps {
  orders?: Order[];
  loading?: boolean;
  onViewOrder?: (orderId: number) => void;
  onEditOrder?: (orderId: number) => void;
  onChangeOrderStatus?: (orderId: number, newStatus: string) => void;
  onAssignExpert?: (orderId: number, expertId: number) => void;
  onContactClient?: (orderId: number) => void;
}

const AllOrdersTable: React.FC<AllOrdersTableProps> = ({
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
    const searchLower = searchText.toLowerCase();
    const matchesSearch = 
      (order.title || '').toLowerCase().includes(searchLower) ||
      (order.description || '').toLowerCase().includes(searchLower) ||
      (order.client?.username || '').toLowerCase().includes(searchLower) ||
      (order.client?.first_name || '').toLowerCase().includes(searchLower) ||
      (order.client?.last_name || '').toLowerCase().includes(searchLower);
    
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
    return ORDER_STATUS_LABELS[status] || status;
  };

  const getStatusColor = (status: string) => {
    return ORDER_STATUS_COLORS[status] || 'default';
  };

  const getPriorityLabel = (priority: string) => {
    return ORDER_PRIORITY_LABELS[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    return ORDER_PRIORITY_COLORS[priority] || 'default';
  };

  
  const stats = {
    total: filteredData.length,
    new: filteredData.filter(o => o.status === ORDER_STATUSES.NEW).length,
    inProgress: filteredData.filter(o => o.status === ORDER_STATUSES.IN_PROGRESS).length,
    completed: filteredData.filter(o => o.status === ORDER_STATUSES.COMPLETED).length,
    cancelled: filteredData.filter(o => o.status === ORDER_STATUSES.CANCELLED).length,
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
            <Option value={ORDER_STATUSES.NEW}>{ORDER_STATUS_LABELS[ORDER_STATUSES.NEW]}</Option>
            <Option value={ORDER_STATUSES.IN_PROGRESS}>{ORDER_STATUS_LABELS[ORDER_STATUSES.IN_PROGRESS]}</Option>
            <Option value={ORDER_STATUSES.REVIEW}>{ORDER_STATUS_LABELS[ORDER_STATUSES.REVIEW]}</Option>
            <Option value={ORDER_STATUSES.COMPLETED}>{ORDER_STATUS_LABELS[ORDER_STATUSES.COMPLETED]}</Option>
            <Option value={ORDER_STATUSES.CANCELLED}>{ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED]}</Option>
            <Option value={ORDER_STATUSES.DISPUTE}>{ORDER_STATUS_LABELS[ORDER_STATUSES.DISPUTE]}</Option>
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
            <Option value={ORDER_PRIORITIES.LOW}>{ORDER_PRIORITY_LABELS[ORDER_PRIORITIES.LOW]}</Option>
            <Option value={ORDER_PRIORITIES.MEDIUM}>{ORDER_PRIORITY_LABELS[ORDER_PRIORITIES.MEDIUM]}</Option>
            <Option value={ORDER_PRIORITIES.HIGH}>{ORDER_PRIORITY_LABELS[ORDER_PRIORITIES.HIGH]}</Option>
            <Option value={ORDER_PRIORITIES.URGENT}>{ORDER_PRIORITY_LABELS[ORDER_PRIORITIES.URGENT]}</Option>
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
                onClick={() => handleChangeStatus(selectedOrder, ORDER_STATUSES.IN_PROGRESS)}
                disabled={selectedOrder.status === ORDER_STATUSES.IN_PROGRESS}
              >
                В работу
              </Button>
              <Button 
                onClick={() => handleChangeStatus(selectedOrder, ORDER_STATUSES.COMPLETED)}
                disabled={selectedOrder.status === ORDER_STATUSES.COMPLETED}
              >
                Завершить
              </Button>
              <Button 
                danger
                onClick={() => handleChangeStatus(selectedOrder, ORDER_STATUSES.CANCELLED)}
                disabled={selectedOrder.status === ORDER_STATUSES.CANCELLED}
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

export const AllOrdersSection: React.FC = () => {
  const { orders, loading } = useAllOrders();
  const { changeOrderStatus } = useOrderActions();

  const handleEditOrder = (orderId: number) => {
    // Функционал редактирования будет добавлен позже
    // message.info(`Редактирование заказа #${orderId} будет доступно в следующей версии`);
  };

  const handleContactClient = async (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.client?.id) {
      message.error('Не удалось определить клиента');
      return;
    }

    try {
      // Создаем или получаем существующий чат
      const response = await apiClient.post('/admin-panel/direct-chats/get-or-create/', {
        user_id: order.client.id
      });

      // Открываем чат в новой вкладке или текущей
      const chatUrl = `/admin/chats?chat_id=${response.data.chat_id}&user_id=${order.client.id}`;
      window.open(chatUrl, '_blank');
      
      message.success('Чат с клиентом открыт');
    } catch (error) {
      console.error('Error creating chat:', error);
      message.error('Ошибка при создании чата');
    }
  };

  const handleAssignExpert = (orderId: number, expertId: number) => {
    message.info(`Назначение эксперта ${expertId} на заказ #${orderId} (В разработке)`);
  };

  return (
    <AllOrdersTable
      orders={orders as Order[]}
      loading={loading}
      onChangeOrderStatus={changeOrderStatus}
      onEditOrder={handleEditOrder}
      onContactClient={handleContactClient}
      onAssignExpert={handleAssignExpert}
    />
  );
};
