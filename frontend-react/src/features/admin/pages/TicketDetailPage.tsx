import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Typography, 
  Descriptions, 
  Timeline, 
  Input, 
  Select, 
  Tag, 
  Avatar, 
  Space, 
  message, 
  Spin, 
  Empty,
  Breadcrumb,
  Row,
  Col,
  Divider,
  Modal,
  Checkbox
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  MessageOutlined,
  SendOutlined,
  FileTextOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TagOutlined,
  TeamOutlined,
  PlusOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTicket, useTicketActions, useAdminUsers } from '@/features/admin/hooks';
import { AdminLayout } from '@/features/admin/components/Layout';
import '@/styles/ticket-detail.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TicketDetail {
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
    email: string;
  }>;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'new' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  support_chat_id?: number;
  order_id?: number;
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

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Используем существующие хуки
  const { ticket, loading, refetch } = useTicket(ticketId ? parseInt(ticketId) : 0);
  const { adminUsers } = useAdminUsers();
  const { 
    sendMessage: sendTicketMessage, 
    updateStatus: updateTicketStatus, 
    updatePriority: updateTicketPriority,
    assignUsers,
    addTag,
    removeTag,
    updateTags
  } = useTicketActions();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.messages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !ticket) {
      message.warning('Введите сообщение');
      return;
    }

    setSending(true);
    try {
      await sendTicketMessage(ticket.id, messageText, ticket.type);
      setMessageText('');
      message.success('Сообщение отправлено');
      refetch();
    } catch (error) {
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!ticket) return;
    
    try {
      await updateTicketStatus(ticket.id, status, ticket.type);
      message.success('Статус обновлен');
      refetch();
    } catch (error) {
      message.error('Не удалось обновить статус');
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    if (!ticket) return;
    
    try {
      await updateTicketPriority(ticket.id, priority, ticket.type);
      message.success('Приоритет обновлен');
      refetch();
    } catch (error) {
      message.error('Не удалось обновить приоритет');
    }
  };

  const handleAssignUsers = async () => {
    if (!ticket || selectedUserIds.length === 0) return;
    
    try {
      await assignUsers(ticket.id, selectedUserIds, ticket.type);
      message.success('Пользователи назначены');
      setAssignModalVisible(false);
      setSelectedUserIds([]);
      refetch();
    } catch (error) {
      message.error('Не удалось назначить пользователей');
    }
  };

  const handleAddTag = async () => {
    if (!ticket || !newTag.trim()) return;
    
    try {
      await addTag(ticket.id, newTag.trim(), ticket.type);
      message.success('Тег добавлен');
      setTagModalVisible(false);
      setNewTag('');
      refetch();
    } catch (error) {
      message.error('Не удалось добавить тег');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!ticket) return;
    
    try {
      await removeTag(ticket.id, tag, ticket.type);
      message.success('Тег удален');
      refetch();
    } catch (error) {
      message.error('Не удалось удалить тег');
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

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
        <Card>
          <Empty description="Тикет не найден" />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/admin/dashboard')}>
              Вернуться к тикетам
            </Button>
          </div>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout selectedMenu="tickets" onMenuSelect={() => {}} onLogout={() => {}}>
      <div style={{ padding: '0 24px' }}>
        {/* Breadcrumb */}
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/admin/dashboard')}
              style={{ padding: 0 }}
            >
              Админ панель
            </Button>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Тикеты</Breadcrumb.Item>
          <Breadcrumb.Item>Тикет {ticket.ticket_number}</Breadcrumb.Item>
        </Breadcrumb>

        <Row gutter={[24, 24]}>
          {/* Основная информация */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileTextOutlined />
                  <span>Тикет {ticket.ticket_number}: {ticket.subject}</span>
                  {ticket.auto_created && (
                    <Tag color="blue">Из чата</Tag>
                  )}
                </div>
              }
              extra={
                <Space>
                  <Select
                    value={ticket.status}
                    onChange={handleUpdateStatus}
                    style={{ width: 140 }}
                    size="small"
                  >
                    <Option value="open">Открыт</Option>
                    <Option value="in_progress">В работе</Option>
                    <Option value="completed">Завершен</Option>
                  </Select>
                  <Select
                    value={ticket.priority}
                    onChange={handleUpdatePriority}
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
              {/* Описание проблемы */}
              <Card size="small" title="Описание проблемы" style={{ marginBottom: 24 }}>
                <Text>{ticket.description}</Text>
              </Card>

              {/* Переписка */}
              <Divider>Переписка</Divider>
              
              <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: 24 }}>
                {ticket.messages && ticket.messages.length > 0 ? (
                  <Timeline>
                    {ticket.messages.map((msg) => (
                      <Timeline.Item
                        key={msg.id}
                        color={msg.is_admin ? '#1890ff' : '#52c41a'}
                        dot={msg.is_admin ? <MessageOutlined /> : <UserOutlined />}
                      >
                        <div style={{ 
                          background: '#f5f5f5', 
                          padding: '12px 16px', 
                          borderRadius: '8px',
                          marginBottom: '8px'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <Text strong>{msg.sender.first_name} {msg.sender.last_name}</Text>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                              {msg.is_admin && (
                                <Tag color="blue" size="small">Поддержка</Tag>
                              )}
                            </div>
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
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
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
                >
                  Отправить
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                💡 Ctrl+Enter для отправки
              </Text>
            </Card>
          </Col>

          {/* Боковая панель с информацией */}
          <Col xs={24} lg={8}>
            <Card title="Информация о тикете" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Статус">
                  <Tag 
                    color={getStatusColor(ticket.status)} 
                    icon={getStatusIcon(ticket.status)}
                  >
                    {getStatusText(ticket.status)}
                  </Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="Приоритет">
                  <Tag color={getPriorityColor(ticket.priority)}>
                    {getPriorityText(ticket.priority)}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Клиент">
                  <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    <div>
                      <div>{ticket.user.first_name} {ticket.user.last_name}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {ticket.user.email}
                      </Text>
                    </div>
                  </Space>
                </Descriptions.Item>

                {ticket.admin && (
                  <Descriptions.Item label="Ответственный">
                    <Space>
                      <Avatar size={24} icon={<UserOutlined />} />
                      <span>{ticket.admin.first_name} {ticket.admin.last_name}</span>
                    </Space>
                  </Descriptions.Item>
                )}

                {ticket.assigned_users && ticket.assigned_users.length > 0 && (
                  <Descriptions.Item label="Назначенные" span={2}>
                    <Space wrap>
                      {ticket.assigned_users.map(user => (
                        <Tag key={user.id} icon={<UserOutlined />}>
                          {user.first_name} {user.last_name}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                {ticket.tags_list && ticket.tags_list.length > 0 && (
                  <Descriptions.Item label="Теги" span={2}>
                    <Space wrap>
                      {ticket.tags_list.map(tag => (
                        <Tag 
                          key={tag} 
                          color={tag.includes('негатив') ? 'red' : 'blue'}
                          closable
                          onClose={() => handleRemoveTag(tag)}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="Создан">
                  {new Date(ticket.created_at).toLocaleString('ru-RU')}
                </Descriptions.Item>

                <Descriptions.Item label="Обновлен">
                  {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ru })}
                </Descriptions.Item>

                {ticket.support_chat_id && (
                  <Descriptions.Item label="Связанный чат">
                    <Button 
                      type="link" 
                      icon={<LinkOutlined />}
                      onClick={() => window.open(`/support/chat/${ticket.support_chat_id}`, '_blank')}
                      style={{ padding: 0 }}
                    >
                      Чат #{ticket.support_chat_id}
                    </Button>
                  </Descriptions.Item>
                )}

                {ticket.order_id && (
                  <Descriptions.Item label="Связанный заказ">
                    <Button 
                      type="link" 
                      icon={<LinkOutlined />}
                      onClick={() => window.open(`/orders/${ticket.order_id}`, '_blank')}
                      style={{ padding: 0 }}
                    >
                      Заказ #{ticket.order_id}
                    </Button>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Быстрые действия */}
            <Card title="Быстрые действия" size="small" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  block 
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={ticket.status === 'in_progress'}
                >
                  Взять в работу
                </Button>
                <Button 
                  block 
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={ticket.status === 'completed'}
                >
                  Завершить тикет
                </Button>
                <Button 
                  block 
                  onClick={() => handleUpdatePriority('high')}
                  disabled={ticket.priority === 'high' || ticket.priority === 'urgent'}
                >
                  Повысить приоритет
                </Button>
                <Button 
                  block 
                  icon={<TeamOutlined />}
                  onClick={() => setAssignModalVisible(true)}
                >
                  Назначить сотрудников
                </Button>
                <Button 
                  block 
                  icon={<TagOutlined />}
                  onClick={() => setTagModalVisible(true)}
                >
                  Добавить тег
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Модальное окно назначения пользователей */}
        <Modal
          title="Назначить сотрудников"
          open={assignModalVisible}
          onOk={handleAssignUsers}
          onCancel={() => {
            setAssignModalVisible(false);
            setSelectedUserIds([]);
          }}
          okText="Назначить"
          cancelText="Отмена"
        >
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {adminUsers.map(user => (
              <div key={user.id} style={{ padding: '8px 0' }}>
                <Checkbox
                  checked={selectedUserIds.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUserIds([...selectedUserIds, user.id]);
                    } else {
                      setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                    }
                  }}
                >
                  <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    <span>{user.first_name} {user.last_name}</span>
                    <Text type="secondary">({user.email})</Text>
                  </Space>
                </Checkbox>
              </div>
            ))}
          </div>
        </Modal>

        {/* Модальное окно добавления тега */}
        <Modal
          title="Добавить тег"
          open={tagModalVisible}
          onOk={handleAddTag}
          onCancel={() => {
            setTagModalVisible(false);
            setNewTag('');
          }}
          okText="Добавить"
          cancelText="Отмена"
        >
          <Input
            placeholder="Введите тег (например: #негатив, #срочно)"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onPressEnter={handleAddTag}
            prefix={<TagOutlined />}
          />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              Популярные теги:
            </Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {['#негатив', '#срочно', '#баг', '#улучшение', '#вопрос'].map(tag => (
                  <Tag 
                    key={tag}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setNewTag(tag)}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        </Modal>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
};

export default TicketDetailPage;