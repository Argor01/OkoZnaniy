import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Button,
  Avatar,
  Space,
  Typography,
  Card,
  Table,
  Select,
  Tag,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FlagOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTickets } from '@/features/admin/hooks';
import styles from './TicketSystemSection.module.css';

const { Text } = Typography;
const { Option } = Select;

interface Ticket {
  id: number;
  ticket_number: string;
  type: 'support_request' | 'claim';
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject: string;
  status: 'open' | 'in_progress' | 'completed' | 'new' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  auto_created?: boolean;
  tags_list?: string[];
  created_at: string;
}

export const TicketSystemSection: React.FC = () => {
  const navigate = useNavigate();
  const { tickets: rawTickets = [], loading, refetch } = useTickets(true);
  const tickets = rawTickets as unknown as Ticket[];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const openTicket = (ticket: Ticket) => {
    if (ticket.type === 'claim') {
      navigate(`/admin/arbitration/${ticket.ticket_number}`);
      return;
    }

    navigate(`/admin/tickets/${ticket.ticket_number}`);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'orange',
      new: 'orange',
      in_progress: 'blue',
      completed: 'green',
      pending_approval: 'purple',
    };

    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      open: 'Открыт',
      new: 'Новый',
      in_progress: 'В работе',
      completed: 'Завершен',
      pending_approval: 'Ожидает одобрения',
    };

    return texts[status as keyof typeof texts] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      open: <ExclamationCircleOutlined />,
      new: <ExclamationCircleOutlined />,
      in_progress: <ClockCircleOutlined />,
      completed: <CheckCircleOutlined />,
      pending_approval: <ClockCircleOutlined />,
    };

    return icons[status as keyof typeof icons] || <FileTextOutlined />;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      urgent: 'purple',
    };

    return colors[priority as keyof typeof colors] || 'gray';
  };

  const getPriorityText = (priority: string) => {
    const texts = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочный',
    };

    return texts[priority as keyof typeof texts] || priority;
  };

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch {
      return dateString;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (ticket.type === 'claim') {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (ticket.subject || '').toLowerCase().includes(query) ||
        (ticket.user.first_name || '').toLowerCase().includes(query) ||
        (ticket.user.last_name || '').toLowerCase().includes(query) ||
        ticket.id.toString().includes(query) ||
        ticket.ticket_number.toLowerCase().includes(query);

      if (!matchesSearch) {
        return false;
      }
    }

    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false;
    }

    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  const ticketStats = {
    total: tickets.filter((ticket) => ticket.type !== 'claim').length,
    open: tickets.filter((ticket) => ticket.type !== 'claim' && (ticket.status === 'open' || ticket.status === 'new')).length,
    inProgress: tickets.filter((ticket) => ticket.type !== 'claim' && ticket.status === 'in_progress').length,
    completed: tickets.filter((ticket) => ticket.type !== 'claim' && ticket.status === 'completed').length,
  };

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 120,
      render: (text: string) => <Text strong>#{text}</Text>,
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      width: 280,
      render: (text: string, record: Ticket) => (
        <div>
          <div>{text}</div>
          {record.auto_created && (
            <Tag color="blue" style={{ marginTop: 4 }}>
              Из чата
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Клиент',
      key: 'client',
      width: 180,
      render: (record: Ticket) => (
        <Space>
          <Avatar size={24} icon={<UserOutlined />} />
          <span>{record.user.first_name} {record.user.last_name}</span>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)} icon={priority === 'urgent' || priority === 'high' ? <FlagOutlined /> : undefined}>
          {getPriorityText(priority)}
        </Tag>
      ),
    },
    {
      title: 'Теги',
      dataIndex: 'tags_list',
      key: 'tags_list',
      width: 170,
      render: (tags: string[]) => (
        tags && tags.length > 0 ? (
          <Space wrap size="small">
            {tags.slice(0, 2).map((tag) => (
              <Tag key={tag} color={tag.includes('негатив') ? 'red' : 'blue'}>
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && <Tag color="default">+{tags.length - 2}</Tag>}
          </Space>
        ) : '-'
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatTimestamp(date),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Ticket) => (
        <Button
          size="small"
          type="primary"
          onClick={(event) => {
            event.stopPropagation();
            openTicket(record);
          }}
        >
          Открыть обращение
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.ticketSystemWrapper}>
      <div style={{ width: '100%' }}>
        <Card
          title={(
            <div className={styles.ticketSystemTitleRow}>
              <FileTextOutlined className={styles.ticketSystemTitleIcon} />
              <span>Обращения</span>
            </div>
          )}
          extra={(
            <Button
              type="text"
              icon={<ReloadOutlined />}
              loading={loading}
              size="small"
              onClick={() => refetch()}
            />
          )}
        >
          <div className={styles.ticketSystemStatsGrid}>
            <div className={styles.ticketSystemStatItem}>
              <div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatTotal}`}>{ticketStats.total}</div>
              <div className={styles.ticketSystemStatLabel}>Всего</div>
            </div>
            <div className={styles.ticketSystemStatItem}>
              <div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatOpen}`}>{ticketStats.open}</div>
              <div className={styles.ticketSystemStatLabel}>Открыто</div>
            </div>
            <div className={styles.ticketSystemStatItem}>
              <div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatInProgress}`}>{ticketStats.inProgress}</div>
              <div className={styles.ticketSystemStatLabel}>В работе</div>
            </div>
            <div className={styles.ticketSystemStatItem}>
              <div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatCompleted}`}>{ticketStats.completed}</div>
              <div className={styles.ticketSystemStatLabel}>Завершено</div>
            </div>
          </div>

          <Input
            prefix={<SearchOutlined />}
            placeholder="Поиск по номеру, теме или клиенту..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.ticketSystemSearch}
            allowClear
          />

          <div className={styles.ticketSystemFiltersRow}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className={styles.ticketSystemFilterSelect}
              size="small"
            >
              <Option value="all">Все статусы</Option>
              <Option value="open">Открыт</Option>
              <Option value="new">Новый</Option>
              <Option value="in_progress">В работе</Option>
              <Option value="completed">Завершен</Option>
            </Select>

            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              className={styles.ticketSystemFilterSelect}
              size="small"
            >
              <Option value="all">Все приоритеты</Option>
              <Option value="urgent">Срочный</Option>
              <Option value="high">Высокий</Option>
              <Option value="medium">Средний</Option>
              <Option value="low">Низкий</Option>
            </Select>
          </div>

          <Table
            columns={columns}
            dataSource={filteredTickets}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} обращений`,
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Нет обращений"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            scroll={{ x: 1200 }}
            size="small"
            onRow={(record) => ({
              onClick: () => openTicket(record),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>
      </div>
    </div>
  );
};
