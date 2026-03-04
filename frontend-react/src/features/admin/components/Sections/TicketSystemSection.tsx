import React, { useState, useRef, useEffect } from 'react';
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
  List,
  Row,
  Col,
  Empty,
  Select,
  Tag,
  Descriptions,
  Divider,
  Timeline,
  Tooltip,
  Drawer
} from 'antd';
import {
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FlagOutlined,
  MessageOutlined,
  FileTextOutlined,
  TeamOutlined,
  CloseOutlined,
  ExpandOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTickets, useTicketActions } from '@/features/admin/hooks';
import styles from './TicketSystemSection.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Ticket {
  id: number;
  ticket_number: string; // Добавляем номер тикета
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
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus, updatePriority: updateTicketPriority } = useTicketActions();

  // Cast rawTickets to Ticket[] because the API response might differ slightly or be inferred as any[]
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
      antMessage.error('Тикет не выбран');
      return;
    }

    setSending(true);
    try {
      await sendTicketMessage(selectedTicket.id, messageText, selectedTicket.type);
      
      setMessageText('');
      antMessage.success('Сообщение отправлено');
      refetch(); // Refresh tickets to show new message
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
        ticket.id.toString().includes(query);
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

  return (
    <div className={styles.ticketSystemWrapper}>
      <div 
        className={styles.ticketSystemMainContent}
        style={{
          marginRight: detailsVisible && !isMobile ? '50%' : '0',
          width: detailsVisible && !isMobile ? '50%' : '100%'
        }}
      >
        <Card 
          title={
            <div className={styles.ticketSystemTitleRow}>
              <FileTextOutlined className={styles.ticketSystemTitleIcon} />
              <span>Тикеты поддержки</span>
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
            
            <div className={styles.ticketSystemListBody}>
              <List
                loading={loading}
                dataSource={filteredTickets}
                locale={{ emptyText: 'Нет тикетов' }}
                renderItem={(ticket) => (
                  <Card
                    size="small"
                    onClick={() => handleTicketClick(ticket)}
                    className={`${styles.ticketSystemTicketCard} ${selectedTicket?.id === ticket.id ? styles.ticketSystemTicketCardSelected : ''}`}
                    hoverable
                  >
                    <div className={styles.ticketSystemTicketHeader}>
                      <Text strong className={styles.ticketSystemTicketNumber}>
                        Тикет {ticket.ticket_number}
                      </Text>
                      <div className={styles.ticketSystemTicketTags}>
                        <Tag 
                          color={getStatusColor(ticket.status)} 
                          icon={getStatusIcon(ticket.status)}
                          className={styles.ticketSystemTag}
                        >
                          {getStatusText(ticket.status)}
                        </Tag>
                        <Tag 
                          color={getPriorityColor(ticket.priority)}
                          icon={ticket.priority === 'urgent' || ticket.priority === 'high' ? <FlagOutlined /> : undefined}
                          className={styles.ticketSystemTag}
                        >
                          {getPriorityText(ticket.priority)}
                        </Tag>
                      </div>
                    </div>
                    
                    <Text strong className={styles.ticketSystemTicketSubject}>
                      {ticket.subject}
                      {ticket.auto_created && (
                        <Tag color="blue" size="small" style={{ marginLeft: 8 }}>
                          Из чата
                        </Tag>
                      )}
                    </Text>
                    
                    {/* Отображение тегов */}
                    {ticket.tags_list && ticket.tags_list.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <Space wrap size="small">
                          {ticket.tags_list.slice(0, 3).map(tag => (
                            <Tag 
                              key={tag} 
                              size="small"
                              color={tag.includes('негатив') ? 'red' : 'blue'}
                            >
                              {tag}
                            </Tag>
                          ))}
                          {ticket.tags_list.length > 3 && (
                            <Tag size="small" color="default">
                              +{ticket.tags_list.length - 3}
                            </Tag>
                          )}
                        </Space>
                      </div>
                    )}
                    
                    <div className={styles.ticketSystemTicketUser}>
                      <Avatar size={20} icon={<UserOutlined />} />
                      <Text type="secondary" className={styles.ticketSystemTicketUserName}>
                        {ticket.user.first_name} {ticket.user.last_name}
                      </Text>
                      {/* Отображение назначенных пользователей */}
                      {ticket.assigned_users && ticket.assigned_users.length > 0 && (
                        <Tag size="small" icon={<TeamOutlined />} style={{ marginLeft: 8 }}>
                          {ticket.assigned_users.length}
                        </Tag>
                      )}
                    </div>
                    
                    <div className={styles.ticketSystemTicketFooter}>
                      <Text type="secondary" className={styles.ticketSystemTicketTime}>
                        {formatTimestamp(ticket.created_at)}
                      </Text>
                      {ticket.messages && ticket.messages.length > 0 && (
                        <Badge 
                          count={ticket.messages.length} 
                          className={styles.ticketSystemMessageBadge}
                          overflowCount={99}
                        />
                      )}
                    </div>
                  </Card>
                )}
              />
            </div>
          </Card>
        </div>

        {/* Боковая панель с деталями тикета */}
        {isMobile ? (
          <Drawer
            title={
              selectedTicket ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileTextOutlined />
                  <span>Тикет #{selectedTicket.ticket_number}</span>
                </div>
              ) : 'Детали тикета'
            }
            placement="right"
            onClose={handleCloseDetails}
            open={detailsVisible}
            width="100%"
            extra={
              selectedTicket && (
                <Button 
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={() => navigate(`/admin/tickets/${selectedTicket.id}`)}
                >
                  Открыть отдельно
                </Button>
              )
            }
          >
            {selectedTicket && <TicketDetails ticket={selectedTicket} />}
          </Drawer>
        ) : (
          <div
            className={`${styles.ticketSystemSidePanel} ${detailsVisible ? styles.open : ''}`}
          >
            {selectedTicket && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileTextOutlined />
                    <Text strong>Тикет #{selectedTicket.ticket_number}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      size="small"
                      icon={<ExpandOutlined />}
                      onClick={() => navigate(`/admin/tickets/${selectedTicket.id}`)}
                    >
                      Открыть отдельно
                    </Button>
                    <Button 
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={handleCloseDetails}
                    />
                  </div>
                </div>
                <TicketDetails ticket={selectedTicket} />
              </div>
            )}
          </div>
        )}
      </div>
    );

  // Компонент деталей тикета
  const TicketDetails: React.FC<{ ticket: Ticket }> = ({ ticket }) => (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <Select
          value={ticket.status}
          onChange={(value) => handleUpdateStatus(ticket.id, value)}
          size="small"
          style={{ minWidth: '120px' }}
        >
          <Option value="open">Открыт</Option>
          <Option value="in_progress">В работе</Option>
          <Option value="completed">Завершен</Option>
        </Select>
        <Select
          value={ticket.priority}
          onChange={(value) => handleUpdatePriority(ticket.id, value)}
          size="small"
          style={{ minWidth: '120px' }}
        >
          <Option value="low">Низкий</Option>
          <Option value="medium">Средний</Option>
          <Option value="high">Высокий</Option>
          <Option value="urgent">Срочный</Option>
        </Select>
      </div>

      <Card size="small" title="Информация о тикете" style={{ marginBottom: '16px' }}>
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
                    size="small"
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
            <Timeline size="small">
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
                        <Tag color="blue" size="small">Поддержка</Tag>
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
            💡 Ctrl+Enter для отправки
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
};

export default TicketSystemSection;
