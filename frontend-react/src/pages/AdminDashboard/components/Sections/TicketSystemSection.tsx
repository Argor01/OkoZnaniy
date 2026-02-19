import React, { useState, useRef, useEffect } from 'react';
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
  Tooltip
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
  FileTextOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Ticket {
  id: number;
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
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'new' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  claim_type?: string;
  order_id?: number;
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

interface TicketSystemSectionProps {
  tickets?: Ticket[];
  loading?: boolean;
  onSendMessage?: (ticketId: number, message: string) => void;
  onUpdateStatus?: (ticketId: number, status: string) => void;
  onUpdatePriority?: (ticketId: number, priority: string) => void;
  onAssignAdmin?: (ticketId: number, adminId: number) => void;
}

export const TicketSystemSection: React.FC<TicketSystemSectionProps> = ({
  tickets = [],
  loading = false,
  onSendMessage,
  onUpdateStatus,
  onUpdatePriority,
}) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

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
      onSendMessage?.(selectedTicket.id, messageText);
      setMessageText('');
      antMessage.success('Сообщение отправлено');
    } catch (error) {
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
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
        ticket.subject.toLowerCase().includes(query) ||
        ticket.user.first_name.toLowerCase().includes(query) ||
        ticket.user.last_name.toLowerCase().includes(query) ||
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
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Row gutter={[16, 16]}>
        {/* Список тикетов */}
        <Col 
          xs={24} 
          lg={10}
          style={{ display: isMobile && selectedTicket ? 'none' : 'block' }}
        >
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                <span>Тикеты поддержки</span>
              </div>
            }
            extra={
              <Button 
                type="text" 
                icon={<ReloadOutlined />} 
                loading={loading}
                size="small"
              />
            }
          >
            {/* Статистика */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 8
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>{ticketStats.total}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Всего</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fa8c16' }}>{ticketStats.open}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Открыто</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>{ticketStats.inProgress}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>В работе</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>{ticketStats.completed}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Завершено</div>
              </div>
            </div>

            {/* Поиск */}
            <Input
              prefix={<SearchOutlined />}
              placeholder="Поиск по номеру, теме, клиенту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 12 }}
              allowClear
            />
            
            {/* Фильтры */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ flex: 1 }}
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
                style={{ flex: 1 }}
                size="small"
              >
                <Option value="all">Все приоритеты</Option>
                <Option value="urgent">Срочный</Option>
                <Option value="high">Высокий</Option>
                <Option value="medium">Средний</Option>
                <Option value="low">Низкий</Option>
              </Select>
            </div>
            
            {/* Список тикетов */}
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <List
                loading={loading}
                dataSource={filteredTickets}
                locale={{ emptyText: 'Нет тикетов' }}
                renderItem={(ticket) => (
                  <Card
                    size="small"
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      marginBottom: 8,
                      cursor: 'pointer',
                      border: selectedTicket?.id === ticket.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      background: selectedTicket?.id === ticket.id ? '#e6f7ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                    hoverable
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        Тикет #{ticket.id}
                      </Text>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Tag 
                          color={getStatusColor(ticket.status)} 
                          icon={getStatusIcon(ticket.status)}
                          style={{ margin: 0, fontSize: 10 }}
                        >
                          {getStatusText(ticket.status)}
                        </Tag>
                        <Tag 
                          color={getPriorityColor(ticket.priority)}
                          icon={ticket.priority === 'urgent' || ticket.priority === 'high' ? <FlagOutlined /> : undefined}
                          style={{ margin: 0, fontSize: 10 }}
                        >
                          {getPriorityText(ticket.priority)}
                        </Tag>
                      </div>
                    </div>
                    
                    <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                      {ticket.subject}
                    </Text>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Avatar size={20} icon={<UserOutlined />} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {ticket.user.first_name} {ticket.user.last_name}
                      </Text>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatTimestamp(ticket.created_at)}
                      </Text>
                      {ticket.messages && ticket.messages.length > 0 && (
                        <Badge 
                          count={ticket.messages.length} 
                          style={{ backgroundColor: '#1890ff' }}
                          overflowCount={99}
                        />
                      )}
                    </div>
                  </Card>
                )}
              />
            </div>
          </Card>
        </Col>

        {/* Детали тикета */}
        <Col xs={24} lg={14}>
          {selectedTicket ? (
            <Card 
              title={
                <div>
                  {isMobile && (
                    <Button 
                      size="small" 
                      onClick={() => setSelectedTicket(null)}
                      style={{ marginRight: 8 }}
                    >
                      ← Назад
                    </Button>
                  )}
                  <Text strong style={{ fontSize: 16 }}>
                    Тикет #{selectedTicket.id}: {selectedTicket.subject}
                  </Text>
                </div>
              }
              extra={
                <Space>
                  <Select
                    value={selectedTicket.status}
                    onChange={(value) => onUpdateStatus?.(selectedTicket.id, value)}
                    style={{ width: 140 }}
                    size="small"
                  >
                    <Option value="open">Открыт</Option>
                    <Option value="in_progress">В работе</Option>
                    <Option value="completed">Завершен</Option>
                  </Select>
                  <Select
                    value={selectedTicket.priority}
                    onChange={(value) => onUpdatePriority?.(selectedTicket.id, value)}
                    style={{ width: 120 }}
                    size="small"
                  >
                    <Option value="low">Низкий</Option>
                    <Option value="medium">Средний</Option>
                    <Option value="high">Высокий</Option>
                    <Option value="urgent">Срочный</Option>
                  </Select>
                </Space>
              }
            >
              {/* Информация о тикете */}
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Клиент">
                  <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    <span>{selectedTicket.user.first_name} {selectedTicket.user.last_name}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedTicket.user.email}
                </Descriptions.Item>
                <Descriptions.Item label="Создан">
                  {new Date(selectedTicket.created_at).toLocaleString('ru-RU')}
                </Descriptions.Item>
                <Descriptions.Item label="Обновлен">
                  {formatTimestamp(selectedTicket.updated_at)}
                </Descriptions.Item>
                {selectedTicket.admin && (
                  <Descriptions.Item label="Ответственный" span={2}>
                    {selectedTicket.admin.first_name} {selectedTicket.admin.last_name}
                  </Descriptions.Item>
                )}
                {selectedTicket.order_id && (
                  <Descriptions.Item label="Заказ" span={2}>
                    <a href={`/orders/${selectedTicket.order_id}`} target="_blank" rel="noopener noreferrer">
                      Заказ #{selectedTicket.order_id}
                    </a>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Описание проблемы */}
              <Card 
                size="small" 
                title="Описание проблемы" 
                style={{ marginBottom: 16, background: '#fafafa' }}
              >
                <Text>{selectedTicket.description}</Text>
              </Card>

              <Divider>Переписка</Divider>

              {/* Сообщения */}
              <div 
                style={{ 
                  height: '400px', 
                  overflowY: 'auto', 
                  padding: 16,
                  background: '#fafafa',
                  borderRadius: 8,
                  marginBottom: 16
                }}
              >
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  <Timeline>
                    {selectedTicket.messages.map((msg) => (
                      <Timeline.Item
                        key={msg.id}
                        color={msg.is_admin ? '#1890ff' : '#52c41a'}
                        dot={msg.is_admin ? <MessageOutlined /> : <UserOutlined />}
                      >
                        <div style={{
                          background: 'white',
                          padding: 12,
                          borderRadius: 8,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                        }}>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>{msg.sender.first_name} {msg.sender.last_name}</Text>
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                              {formatMessageTime(msg.created_at)}
                            </Text>
                            {msg.is_admin && (
                              <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>Поддержка</Tag>
                            )}
                          </div>
                          <Text>{msg.message}</Text>
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                ) : (
                  <Empty description="Нет сообщений" />
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Форма ответа */}
              <div style={{ display: 'flex', gap: 8 }}>
                <TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите ответ..."
                  rows={3}
                  style={{ flex: 1 }}
                  onPressEnter={(e) => {
                    if (e.ctrlKey) {
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={sendMessage}
                  loading={sending}
                  disabled={!messageText.trim()}
                  style={{ height: 'auto' }}
                >
                  Отправить
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                💡 Ctrl+Enter для отправки
              </Text>
            </Card>
          ) : (
            <Card>
              <Empty 
                description="Выберите тикет для просмотра деталей"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TicketSystemSection;
