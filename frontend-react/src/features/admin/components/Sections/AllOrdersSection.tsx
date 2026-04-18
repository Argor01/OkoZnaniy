import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
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
  Tabs,
  List,
  Avatar,
  Empty
} from 'antd';
import { 
  EyeOutlined,
  SearchOutlined,
  MessageOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
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
import styles from './AllOrdersSection.module.css';

const { Text } = Typography;
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

interface ChatMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  text: string;
  created_at: string;
  message_type: string;
}

interface OrderChatParticipant {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
}

interface OrderChatThread {
  id: number;
  order_id: number | null;
  participants?: OrderChatParticipant[];
  messages?: ChatMessage[];
}

interface OrderChatProps {
  orderId: number;
}

const OrderChat: React.FC<OrderChatProps> = ({ orderId }) => {
  const { data: orderChats = [], isLoading } = useQuery<OrderChatThread[]>({
    queryKey: ['order-chat', orderId],
    queryFn: async () => {
      try {
        const chatResponse = await apiClient.get('/admin-panel/user-chats/');
        const payload = chatResponse.data;
        const chats = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        return chats.filter((chat: OrderChatThread) => Number(chat.order_id) === Number(orderId));
      } catch (error) {
        console.error('Error loading chat:', error);
        return [];
      }
    },
    enabled: !!orderId,
  });

  const messages = orderChats
    .flatMap((chat) => chat.messages || [])
    .sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка переписки...</div>;
  }

  if (messages.length === 0) {
    return (
      <Empty 
        description="Переписка отсутствует"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <List
      dataSource={messages}
      renderItem={(msg) => (
        <List.Item key={msg.id}>
          <List.Item.Meta
            avatar={<Avatar icon={<UserOutlined />} />}
            title={
              <div>
                <Text strong>{msg.sender.first_name} {msg.sender.last_name}</Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  @{msg.sender.username}
                </Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {dayjs(msg.created_at).format('DD.MM.YYYY HH:mm')}
                </Text>
              </div>
            }
            description={msg.text}
          />
        </List.Item>
      )}
      style={{ maxHeight: 400, overflow: 'auto' }}
    />
  );
};

interface OrderParticipantsProps {
  order: Order;
}

const OrderParticipants: React.FC<OrderParticipantsProps> = ({ order }) => {
  const { data: orderChats = [], isLoading } = useQuery<OrderChatThread[]>({
    queryKey: ['order-chat-participants', order.id],
    queryFn: async () => {
      try {
        const chatResponse = await apiClient.get('/admin-panel/user-chats/');
        const payload = chatResponse.data;
        const chats = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        return chats.filter((chat: OrderChatThread) => Number(chat.order_id) === Number(order.id));
      } catch (error) {
        console.error('Error loading order participants:', error);
        return [];
      }
    },
    enabled: !!order.id,
  });

  const participantsMap = new Map<number, OrderChatParticipant>();

  if (order.client?.id) {
    participantsMap.set(order.client.id, { ...order.client, role: 'client' });
  }

  if (order.expert?.id) {
    participantsMap.set(order.expert.id, { ...order.expert, role: 'expert' });
  }

  orderChats.forEach((chat) => {
    (chat.participants || []).forEach((participant) => {
      if (!participant?.id) return;
      participantsMap.set(participant.id, participant);
    });
  });

  const participants = Array.from(participantsMap.values());

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка участников...</div>;
  }

  if (participants.length === 0) {
    return <Empty description="Участники не найдены" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <Descriptions column={1} bordered size="small">
      {participants.map((participant) => (
        <Descriptions.Item
          key={participant.id}
          label={`${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.username}
        >
          <div><strong>Username:</strong> @{participant.username}</div>
          <div><strong>Email:</strong> {participant.email || '-'}</div>
          <div><strong>Роль:</strong> {participant.role || '-'}</div>
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

interface AllOrdersTableProps {
  orders?: Order[];
  loading?: boolean;
  onViewOrder?: (orderId: number) => void;
}

const AllOrdersTable: React.FC<AllOrdersTableProps> = ({
  orders = [],
  loading = false,
  onViewOrder,
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
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
    
    let matchesDate = true;
    if (dateRange) {
      const orderDate = dayjs(order.created_at);
      matchesDate = orderDate.isAfter(dateRange[0]) && orderDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesStatus && matchesSubject && matchesDate;
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderModalVisible(true);
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
    totalBudget: filteredData.reduce((sum, o) => {
      const budget = Number(o.budget) || 0;
      if (isNaN(budget)) {
        console.warn('Invalid budget value:', o.budget, 'for order:', o.id);
        return sum;
      }
      return sum + budget;
    }, 0),
  };

  const columns = [
    {
      title: 'Заказ',
      key: 'order',
      width: 300,
      render: (record: Order) => (
        <div>
          <div className={styles.allOrdersHeaderRow}>
            <strong>#{record.id}</strong>
            {record.is_urgent && <Tag color="red">Срочно</Tag>}
          </div>
          <div className={styles.allOrdersTitle}>
            {record.title}
          </div>
          <Text type="secondary" className={styles.allOrdersMetaText}>
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
          <div className={styles.allOrdersPersonName}>
            {record.client.first_name} {record.client.last_name}
          </div>
          <Text type="secondary" className={styles.allOrdersPersonHandle}>
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
            <div className={styles.allOrdersPersonName}>
              {record.expert.first_name} {record.expert.last_name}
            </div>
            <Text type="secondary" className={styles.allOrdersPersonHandle}>
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
      render: (budget: number) => {
        const budgetNum = Number(budget) || 0;
        return <Text strong>{budgetNum.toLocaleString()} ₽</Text>;
      },
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
          <div className={isOverdue ? styles.allOrdersDeadlineOverdue : isNearDeadline ? styles.allOrdersDeadlineNear : styles.allOrdersDeadline}>
            <div className={styles.allOrdersDeadlineDate}>
              {deadlineDate.format('DD.MM.YYYY')}
            </div>
            <div className={styles.allOrdersDeadlineTime}>
              {deadlineDate.format('HH:mm')}
            </div>
          </div>
        );
      },
    },


    {
      title: 'Действия',
      key: 'actions',
      width: 80,
      render: (record: Order) => (
        <Tooltip title="Подробно">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewOrder(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Statistic title="Всего заказов" value={stats.total} />
          </Col>
          <Col span={4}>
            <Statistic title="Новые" value={stats.new} />
          </Col>
          <Col span={4}>
            <Statistic title="В работе" value={stats.inProgress} />
          </Col>
          <Col span={4}>
            <Statistic title="Завершены" value={stats.completed} />
          </Col>
          <Col span={4}>
            <Statistic title="Отменены" value={stats.cancelled} />
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

        <div className={styles.allOrdersFiltersRow}>
          <Search
            placeholder="Поиск по названию, описанию или клиенту"
            allowClear
            className={styles.allOrdersSearch}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Статус"
            className={styles.allOrdersSelectStatus}
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
            className={styles.allOrdersSelectSubject}
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

          <RangePicker
            placeholder={['Дата от', 'Дата до']}
            className={styles.allOrdersRangePicker}
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
        ]}
        width={900}
      >
        {selectedOrder && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: 'Информация о заказе',
                children: (
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
                    <Descriptions.Item label="Бюджет">
                      <strong>{(Number(selectedOrder.budget) || 0).toLocaleString()} ₽</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Дедлайн">
                      {dayjs(selectedOrder.deadline).format('DD.MM.YYYY HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Создан">
                      {dayjs(selectedOrder.created_at).format('DD.MM.YYYY HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Обновлен">
                      {dayjs(selectedOrder.updated_at).format('DD.MM.YYYY HH:mm')}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'participants',
                label: 'Участники',
                children: <OrderParticipants order={selectedOrder} />,
              },
              {
                key: 'chat',
                label: (
                  <span>
                    <MessageOutlined /> Переписка
                  </span>
                ),
                children: <OrderChat orderId={selectedOrder.id} />,
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export const AllOrdersSection: React.FC = () => {
  const { orders, loading } = useAllOrders();

  return (
    <AllOrdersTable
      orders={orders as Order[]}
      loading={loading}
    />
  );
};
