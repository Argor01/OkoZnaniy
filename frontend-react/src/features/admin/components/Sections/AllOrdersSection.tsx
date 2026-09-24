import React, { useState, useEffect } from 'react';
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
  Empty
} from 'antd';
import {
  EyeOutlined,
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
import { logger } from '@/utils/logger';
import { truncateDisplayName } from '@/utils/formatters';
import { useSubjects } from '@/hooks/queries';

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
  messages?: unknown[];
};

interface OrderParticipantsProps {
  order: Order;
}

const OrderParticipants: React.FC<OrderParticipantsProps> = ({ order }) => {
  const { data: orderChats = [], isLoading } = useQuery<OrderChatThread[]>({
    queryKey: ['order-chat-participants', order.id],
    queryFn: async () => {
      try {
        const chatResponse = await apiClient.get(`/admin-panel/user-chats/?order_id=${order.id}`);
        const payload = chatResponse.data;
        const chats = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        return chats;
      } catch (error) {
        logger.error('Error loading order participants:', error);
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
          label={truncateDisplayName(`${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.username)}
        >
          <div><strong>Username:</strong> {truncateDisplayName(participant.username)}</div>
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
  initialOrderId?: number;
}

const AllOrdersTable: React.FC<AllOrdersTableProps> = ({
  orders = [],
  loading = false,
  onViewOrder,
  initialOrderId,
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const { data: catalogSubjects = [] } = useSubjects();

  useEffect(() => {
    if (initialOrderId && orders.length > 0 && !selectedOrder) {
      const order = orders.find(o => o.id === initialOrderId);
      if (order) {
        setSelectedOrder(order);
        setOrderModalVisible(true);
      }
    }
  }, [initialOrderId, orders]);

  const dataSource = orders;


  const filteredData = dataSource.filter(order => {
    const searchLower = searchText.trim().toLowerCase();
    const orderNumber = searchLower.replace(/^[#№]\s*/, '');
    const matchesSearch =
      String(order.id) === orderNumber ||
      (order.title || '').toLowerCase().includes(searchLower) ||
      (order.description || '').toLowerCase().includes(searchLower) ||
      (order.client?.username || '').toLowerCase().includes(searchLower) ||
      (order.client?.first_name || '').toLowerCase().includes(searchLower) ||
      (order.client?.last_name || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || (order.admin_status || order.status) === statusFilter;
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
    return ({ completed: 'Выполнен', refund: 'Возврат' } as Record<string, string>)[status] || ORDER_STATUS_LABELS[status] || status;
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
      const budget = Number(o.order_amount ?? o.budget) || 0;
      if (isNaN(budget)) {
        logger.warn('Invalid budget value:', o.budget, 'for order:', o.id);
        return sum;
      }
      return sum + budget;
    }, 0),
  };

  const columns = [
    {
      title: '№ заказа', key: 'order', width: 120,
      render: (record: Order) => <strong>#{record.id}</strong>,
    },
    {
      title: 'Сумма заказа', key: 'order_amount', width: 150,
      render: (record: Order) => <Text strong>{Number(record.order_amount ?? record.budget ?? 0).toLocaleString('ru-RU')} ₽</Text>,
    },
    {
      title: 'Партнёр', key: 'partner', width: 170,
      render: (record: Order) => record.partner
        ? truncateDisplayName([record.partner.first_name, record.partner.last_name].filter(Boolean).join(' ') || record.partner.username)
        : <Text type="secondary">Нет партнёра</Text>,
    },
    {
      title: 'Автор', key: 'author', width: 190,
      render: (record: Order) => record.expert
        ? <div><div className={styles.allOrdersPersonName}>{truncateDisplayName(`${record.expert.first_name || ''} ${record.expert.last_name || ''}`.trim())}</div><Text type="secondary">{truncateDisplayName(record.expert.username)}</Text></div>
        : <Text type="secondary">Не назначен</Text>,
    },
    {
      title: 'Сумма автора', key: 'author_amount', width: 150,
      render: (record: Order) => <Text>{record.author_amount == null ? '0 ₽' : `${Number(record.author_amount).toLocaleString('ru-RU')} ₽`}</Text>,
    },
    {
      title: 'Статус', dataIndex: 'status', key: 'status', width: 140,
      render: (status: string, record: Order) => <Tag color={getStatusColor(record.admin_status || status)}>{getStatusLabel(record.admin_status || status)}</Tag>,
    },
    {
      title: 'Сколько внесено', key: 'paid_amount', width: 160,
      render: (record: Order) => <Text>{record.paid_amount == null ? '0 ₽' : `${Number(record.paid_amount).toLocaleString('ru-RU')} ₽`}</Text>,
    },
    {
      title: 'Действия', key: 'actions', width: 80,
      render: (record: Order) => <Tooltip title="Подробно"><Button size="small" icon={<EyeOutlined />} onClick={() => handleViewOrder(record)} /></Tooltip>,
    },
  ];

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} xl={4}>
            <Statistic title="Всего заказов" value={stats.total} />
          </Col>
          <Col xs={12} sm={8} xl={4}>
            <Statistic title="Новые" value={stats.new} />
          </Col>
          <Col xs={12} sm={8} xl={4}>
            <Statistic title="В работе" value={stats.inProgress} />
          </Col>
          <Col xs={12} sm={8} xl={4}>
            <Statistic title="Завершены" value={stats.completed} />
          </Col>
          <Col xs={12} sm={8} xl={4}>
            <Statistic title="Отменены" value={stats.cancelled} />
          </Col>
          <Col xs={12} sm={8} xl={4}>
            <Statistic
              title="Общая сумма заказов"
              value={stats.totalBudget}
              suffix="₽"
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Col>
        </Row>

        <div className={styles.allOrdersFiltersRow}>
          <Search
            placeholder="Номер заказа, название или клиент"
            allowClear
            className={styles.allOrdersSearch}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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
            <Option value={ORDER_STATUSES.COMPLETED}>Выполнен</Option>
            <Option value={ORDER_STATUSES.REVISION}>На доработке</Option>
            <Option value="refund">Возврат</Option>
            <Option value={ORDER_STATUSES.CANCELLED}>{ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED]}</Option>
            <Option value={ORDER_STATUSES.DISPUTE}>{ORDER_STATUS_LABELS[ORDER_STATUSES.DISPUTE]}</Option>
          </Select>

          <Select
            placeholder="Предмет"
            className={styles.allOrdersSelectSubject}
            value={subjectFilter}
            onChange={setSubjectFilter}
            showSearch
            optionFilterProp="label"
            options={[
              { value: 'all', label: 'Все предметы' },
              ...catalogSubjects
                .filter((subject) => subject?.name)
                .map((subject) => ({ value: subject.name, label: subject.name })),
            ]}
          />

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
          scroll={{ x: 1100 }}
          size="small"
        />
      </Card>


      <Modal
        title={`Заказ #${selectedOrder?.id}`}
        open={orderModalVisible}
        className={styles.orderDetailsModal}
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
                    <Descriptions.Item label="Сумма заказа">
                      <strong>{(Number(selectedOrder.order_amount ?? selectedOrder.budget) || 0).toLocaleString()} ₽</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Сумма автора">
                      {selectedOrder.author_amount == null ? '0 ₽' : `${Number(selectedOrder.author_amount).toLocaleString('ru-RU')} ₽`}
                    </Descriptions.Item>
                    <Descriptions.Item label="Сколько внесено">
                      {selectedOrder.paid_amount == null ? '0 ₽' : `${Number(selectedOrder.paid_amount).toLocaleString('ru-RU')} ₽`}
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
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export const AllOrdersSection: React.FC<{ initialOrderId?: number }> = ({ initialOrderId }) => {
  const { orders, loading } = useAllOrders();

  return (
    <AllOrdersTable
      orders={orders as Order[]}
      loading={loading}
      initialOrderId={initialOrderId}
    />
  );
};
