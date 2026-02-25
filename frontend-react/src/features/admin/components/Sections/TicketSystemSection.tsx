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
import { useTickets, useTicketActions } from '@/features/admin/hooks/useAdminPanelData';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Ticket {
  id: number;
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

export const TicketSystemSection: React.FC = () => {
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
    <div className={`ticketSystemWrapper ${isMobile ? 'ticketSystemWrapperMobile' : ''}`}>
      <Row gutter={[16, 16]}>
        <Col 
          xs={24} 
          lg={10}
          className={isMobile && selectedTicket ? 'ticketSystemListColHidden' : 'ticketSystemListCol'}
        >
          <Card 
            title={
              <div className="ticketSystemTitleRow">
                <FileTextOutlined className="ticketSystemTitleIcon" />
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
            <div className="ticketSystemStatsGrid">
              <div className="ticketSystemStatItem">
                <div className="ticketSystemStatValue ticketSystemStatTotal">{ticketStats.total}</div>
                <div className="ticketSystemStatLabel">Всего</div>
              </div>
              <div className="ticketSystemStatItem">
                <div className="ticketSystemStatValue ticketSystemStatOpen">{ticketStats.open}</div>
                <div className="ticketSystemStatLabel">Открыто</div>
              </div>
              <div className="ticketSystemStatItem">
                <div className="ticketSystemStatValue ticketSystemStatInProgress">{ticketStats.inProgress}</div>
                <div className="ticketSystemStatLabel">В работе</div>
              </div>
              <div className="ticketSystemStatItem">
                <div className="ticketSystemStatValue ticketSystemStatCompleted">{ticketStats.completed}</div>
                <div className="ticketSystemStatLabel">Завершено</div>
              </div>
            </div>

            <Input
              prefix={<SearchOutlined />}
              placeholder="Поиск по номеру, теме, клиенту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ticketSystemSearch"
              allowClear
            />
            
            <div className="ticketSystemFiltersRow">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className="ticketSystemFilterSelect"
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
                className="ticketSystemFilterSelect"
                size="small"
              >
                <Option value="all">Все приоритеты</Option>
                <Option value="urgent">Срочный</Option>
                <Option value="high">Высокий</Option>
                <Option value="medium">Средний</Option>
                <Option value="low">Низкий</Option>
              </Select>
            </div>
            
            <div className="ticketSystemListBody">
              <List
                loading={loading}
                dataSource={filteredTickets}
                locale={{ emptyText: 'Нет тикетов' }}
                renderItem={(ticket) => (
                  <Card
                    size="small"
                    onClick={() => setSelectedTicket(ticket)}
                    className={`ticketSystemTicketCard ${selectedTicket?.id === ticket.id ? 'ticketSystemTicketCardSelected' : ''}`}
                    hoverable
                  >
                    <div className="ticketSystemTicketHeader">
                      <Text strong className="ticketSystemTicketNumber">
                        Тикет #{ticket.id}
                      </Text>
                      <div className="ticketSystemTicketTags">
                        <Tag 
                          color={getStatusColor(ticket.status)} 
                          icon={getStatusIcon(ticket.status)}
                          className="ticketSystemTag"
                        >
                          {getStatusText(ticket.status)}
                        </Tag>
                        <Tag 
                          color={getPriorityColor(ticket.priority)}
                          icon={ticket.priority === 'urgent' || ticket.priority === 'high' ? <FlagOutlined /> : undefined}
                          className="ticketSystemTag"
                        >
                          {getPriorityText(ticket.priority)}
                        </Tag>
                      </div>
                    </div>
                    
                    <Text strong className="ticketSystemTicketSubject">
                      {ticket.subject}
                    </Text>
                    
                    <div className="ticketSystemTicketUser">
                      <Avatar size={20} icon={<UserOutlined />} />
                      <Text type="secondary" className="ticketSystemTicketUserName">
                        {ticket.user.first_name} {ticket.user.last_name}
                      </Text>
                    </div>
                    
                    <div className="ticketSystemTicketFooter">
                      <Text type="secondary" className="ticketSystemTicketTime">
                        {formatTimestamp(ticket.created_at)}
                      </Text>
                      {ticket.messages && ticket.messages.length > 0 && (
                        <Badge 
                          count={ticket.messages.length} 
                          className="ticketSystemMessageBadge"
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

        <Col xs={24} lg={14}>
          {selectedTicket ? (
            <Card 
              title={
                <div>
                  {isMobile && (
                    <Button 
                      size="small" 
                      onClick={() => setSelectedTicket(null)}
                      className="ticketSystemBackButton"
                    >
                      ← Назад
                    </Button>
                  )}
                  <Text strong className="ticketSystemDetailTitle">
                    Тикет #{selectedTicket.id}: {selectedTicket.subject}
                  </Text>
                </div>
              }
              extra={
                <Space>
                  <Select
                    value={selectedTicket.status}
                    onChange={(value) => handleUpdateStatus(selectedTicket.id, value)}
                    className="ticketSystemStatusSelect"
                    size="small"
                  >
                    <Option value="open">Открыт</Option>
                    <Option value="in_progress">В работе</Option>
                    <Option value="completed">Завершен</Option>
                  </Select>
                  <Select
                    value={selectedTicket.priority}
                    onChange={(value) => handleUpdatePriority(selectedTicket.id, value)}
                    className="ticketSystemPrioritySelect"
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
              <Descriptions bordered size="small" column={2} className="ticketSystemDetails">
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

              
              <Card 
                size="small" 
                title="Описание проблемы" 
                className="ticketSystemDescriptionCard"
              >
                <Text>{selectedTicket.description}</Text>
              </Card>

              <Divider>Переписка</Divider>

              
              <div className="ticketSystemMessages">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  <Timeline>
                    {selectedTicket.messages.map((msg) => (
                      <Timeline.Item
                        key={msg.id}
                        color={msg.is_admin ? '#1890ff' : '#52c41a'}
                        dot={msg.is_admin ? <MessageOutlined /> : <UserOutlined />}
                      >
                        <div className="ticketSystemMessageBubble">
                          <div className="ticketSystemMessageHeader">
                            <Text strong>{msg.sender.first_name} {msg.sender.last_name}</Text>
                            <Text type="secondary" className="ticketSystemMessageTime">
                              {formatMessageTime(msg.created_at)}
                            </Text>
                            {msg.is_admin && (
                              <Tag color="blue" className="ticketSystemSupportTag">Поддержка</Tag>
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

              
              <div className="ticketSystemReplyRow">
                <TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите ответ..."
                  rows={3}
                  className="ticketSystemReplyInput"
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
                  className="ticketSystemSendButton"
                >
                  Отправить
                </Button>
              </div>
              <Text type="secondary" className="ticketSystemHint">
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
