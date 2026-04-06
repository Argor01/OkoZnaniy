import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Input, 
  Button, 
  Avatar, 
  Badge, 
  Space, 
  Typography, 
  message as antMessage, 
  Card,
  Table,
  Empty,
  Select,
  Tag,
  Descriptions,
  Divider,
  Timeline,
  Tooltip,
  Drawer,
  Modal
} from 'antd';
import {
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FlagOutlined,
  MessageOutlined,
  FileTextOutlined,
  TeamOutlined,
  TagOutlined,
  DollarOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTickets, useTicketActions } from '@/features/admin/hooks';
import { supportApi } from '@/features/admin/api/support';
import styles from './TicketSystemSection.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;
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
  admin?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  assigned_users?: Array<{
    id: number;
    first_name: string;
    last_name: string;
  }>;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'new' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  claim_type?: string;
  order_id?: number;
  support_chat_id?: number;
  auto_created?: boolean;
  tags?: string;
  tags_list?: string[];
  messages: Array<{
    id: number;
    sender: {
      id: number;
      first_name: string;
      last_name: string;
    };
    message: string;
    is_admin: boolean;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export const TicketSystemSection: React.FC = () => {
  const navigate = useNavigate();
  const { tickets: rawTickets = [], loading, refetch } = useTickets(true);
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus, updatePriority: updateTicketPriority, deleteTicket: deleteTicketFn } = useTicketActions();

  const tickets = rawTickets as unknown as Ticket[];

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailsVisible(true);
  };

  const handleCloseDetails = () => {
    setDetailsVisible(false);
    setSelectedTicket(null);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  const sendMessage = async () => {
    if (!messageText.trim()) {
      antMessage.warning('Введите сообщение');
      return;
    }

    if (!selectedTicket) {
      antMessage.error('Обращение не выбрано');
      return;
    }

    setSending(true);
    try {
      await sendTicketMessage(selectedTicket.id, messageText, selectedTicket.type);
      
      setMessageText('');
      antMessage.success('Сообщение отправлено');
      refetch();
    } catch (error) {
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      try {
        await updateTicketStatus(ticketId, status, ticket.type);
        antMessage.success('Статус обновлен');
        refetch();
      } catch (error) {
        antMessage.error('Не удалось обновить статус');
      }
    }
  };

  const handleUpdatePriority = async (ticketId: number, priority: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      try {
        await updateTicketPriority(ticketId, priority, ticket.type);
        antMessage.success('Приоритет обновлен');
        refetch();
      } catch (error) {
        antMessage.error('Не удалось обновить приоритет');
      }
    }
  };

  const handleTransferToArbitration = async (ticket: Ticket) => {
    if (!confirm('Передать обращение в арбитраж?')) return;
    try {
      await supportApi.transferToArbitration(ticket.id);
      antMessage.success('Обращение передано в арбитраж');
      handleCloseDetails();
      refetch();
    } catch (error) {
      antMessage.error('Не удалось передать обращение в арбитраж');
    }
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!confirm('Удалить обращение? Это действие нельзя отменить.')) return;
    try {
      await deleteTicketFn(ticket.id, ticket.type);
      handleCloseDetails();
      refetch();
    } catch (error) {
      antMessage.error('Не удалось удалить обращение');
    }
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

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        (ticket.subject || '').toLowerCase().includes(query) ||
        (ticket.user.first_name || '').toLowerCase().includes(query) ||
        (ticket.user.last_name || '').toLowerCase().includes(query) ||
        ticket.id.toString().includes(query) ||
        ticket.ticket_number.toLowerCase().includes(query);
      if (!matchesSearch) return false;
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
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'new').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    completed: tickets.filter(t => t.status === 'completed').length,
  };

  const TicketDetails: React.FC<{
    ticket: Ticket;
    messageText: string;
    setMessageText: (text: string) => void;
    sendMessage: () => void;
    sending: boolean;
  }> = useMemo(() => {
    const TicketDetailsComponent: React.FC<{
      ticket: Ticket;
      messageText: string;
      setMessageText: (text: string) => void;
      sendMessage: () => void;
      sending: boolean;
    }> = ({ ticket, messageText, setMessageText, sendMessage, sending }) => (
      <div>
        <Card size="small" title="Информация об обращении" style={{ marginBottom: '16px' }}>
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Тема">{ticket.subject}</Descriptions.Item>
            <Descriptions.Item label="Клиент">
              <Space>
                <Avatar size={20} icon={<UserOutlined />} />
                <span>{ticket.user.first_name} {ticket.user.last_name}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Email">{ticket.user.email}</Descriptions.Item>
            <Descriptions.Item label="Создан">
              {new Date(ticket.created_at).toLocaleString('ru-RU')}
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={getStatusColor(ticket.status)}>
                {getStatusText(ticket.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Приоритет">
              <Tag color={getPriorityColor(ticket.priority)}>
                {getPriorityText(ticket.priority)}
              </Tag>
            </Descriptions.Item>
            {ticket.tags_list && ticket.tags_list.length > 0 && (
              <Descriptions.Item label="Теги">
                <Space wrap size="small">
                  {ticket.tags_list.map(tag => (
                    <Tag
                      key={tag}
                      color={tag.includes('нарушение') ? 'red' : 'blue'}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card size="small" title="Описание" style={{ marginBottom: '16px' }}>
          <Text>{ticket.description}</Text>
        </Card>

        <Card size="small" title="Переписка" style={{ marginBottom: '16px' }}>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {ticket.messages && ticket.messages.length > 0 ? (
              <Timeline>
                {ticket.messages.map((msg) => (
                  <Timeline.Item
                    key={msg.id}
                    color={msg.is_admin ? '#1890ff' : '#52c41a'}
                    dot={msg.is_admin ? <MessageOutlined /> : <UserOutlined />}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Text strong style={{ fontSize: '12px' }}>
                          {msg.sender.first_name} {msg.sender.last_name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {formatMessageTime(msg.created_at)}
                        </Text>
                        {msg.is_admin && (
                          <Tag color="blue">Поддержка</Tag>
                        )}
                      </div>
                      <Text style={{ fontSize: '13px' }}>{msg.message}</Text>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="Нет сообщений" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {ticket.type === 'support_request' && (
          <Card size="small" title="Действия" style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => handleTransferToArbitration(ticket)}
              block
              style={{ marginBottom: '8px' }}
            >
              Передать в арбитраж
            </Button>
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTicket(ticket)}
              block
            >
              Удалить обращение
            </Button>
          </Card>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TextArea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Введите ответ..."
            rows={3}
            onPressEnter={(e) => {
              if (e.ctrlKey) {
                sendMessage();
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Ctrl+Enter для отправки
            </Text>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
              loading={sending}
              disabled={!messageText.trim()}
              size="small"
            >
              Отправить
            </Button>
          </div>
        </div>
      </div>
    );
    return TicketDetailsComponent;
  }, [handleTransferToArbitration, messagesEndRef]);

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 120,
      render: (text: string, record: Ticket) => (
        <Text strong>#{text}</Text>
      ),
    },
    {
      title: 'Тип',
      key: 'type',
      width: 100,
      render: (record: Ticket) => (
        <Tag color={record.type === 'claim' ? 'red' : 'blue'}>
          {record.type === 'claim' ? 'Арбитраж' : 'Обращение'}
        </Tag>
      ),
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      width: 250,
      render: (text: string, record: Ticket) => (
        <div>
          <div>{text}</div>
          {record.auto_created && (
            <Tag color="blue" style={{ marginTop: 4 }}>Из чата</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Клиент',
      key: 'client',
      width: 150,
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
      width: 120,
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
      width: 100,
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
      width: 150,
      render: (tags: string[]) => (
        tags && tags.length > 0 ? (
          <Space wrap size="small">
            {tags.slice(0, 2).map(tag => (
              <Tag key={tag} color={tag.includes('негатив') ? 'red' : 'blue'}>
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && (
              <Tag color="default">+{tags.length - 2}</Tag>
            )}
          </Space>
        ) : '-'
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => formatTimestamp(date),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Ticket) => (
        <Space>
          {record.type === 'claim' && (
            <Button
              size="small"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => navigate(`/admin/arbitration/${record.ticket_number}`)}
            >
              Арбитраж
            </Button>
          )}
          <Button
            size="small"
            onClick={() => handleTicketClick(record)}
          >
            Подробнее
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.ticketSystemWrapper}>
      <div style={{ width: '100%' }}>
        <Card 
          title={
            <div className={styles.ticketSystemTitleRow}>
              <FileTextOutlined className={styles.ticketSystemTitleIcon} />
              <span>Обращения</span>
            </div>
          }
          extra={
            <Button 
              type="text" 
              icon={<ReloadOutlined />} 
              loading={loading}
              size="small"
              onClick={() => refetch()}
            />
          }
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
            placeholder="Поиск по номеру, теме, клиенту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} из ${total} обращений`
            }}
            locale={{ emptyText: 'Нет обращений' }}
            scroll={{ x: 1200 }}
            size="small"
            onRow={(record) => ({
              onClick: () => handleTicketClick(record),
              style: { 
                cursor: 'pointer',
                background: selectedTicket?.id === record.id ? '#e6f7ff' : undefined
              }
            })}
          />
        </Card>
      </div>

      <Drawer
        title={`Обращение #${selectedTicket?.ticket_number}`}
        placement="right"
        width={isMobile ? '100%' : 500}
        open={detailsVisible}
        onClose={handleCloseDetails}
        destroyOnClose
      >
        {selectedTicket && (
          <TicketDetails
            ticket={selectedTicket}
            messageText={messageText}
            setMessageText={setMessageText}
            sendMessage={sendMessage}
            sending={sending}
          />
        )}
      </Drawer>
    </div>
  );
};
