import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Modal,
  message,
  Tooltip,
  Select,
  DatePicker,
  Form,
  Divider,
  Avatar,
  Badge,
  Progress,
  Alert,
  Statistic,
  Row,
  Col,
  Popconfirm
} from 'antd';
import { 
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  FileTextOutlined,
  TeamOutlined,
  WarningOutlined,
  BellOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface CustomerRequest {
  id: number;
  request_number: string;
  title: string;
  description: string;
  request_type: 'technical_support' | 'billing_question' | 'order_help' | 'account_issue' | 'feature_request' | 'complaint' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
    user_type: 'student' | 'expert' | 'partner';
    registration_date: string;
    total_orders: number;
    is_vip: boolean;
  };
  created_at: string;
  updated_at: string;
  waiting_time_hours: number;
  sla_deadline: string;
  is_overdue: boolean;
  attachments?: {
    id: number;
    name: string;
    type: 'image' | 'document' | 'video';
    url: string;
    size: number;
  }[];
  tags: string[];
  source: 'website' | 'email' | 'phone' | 'chat' | 'mobile_app';
  related_order?: {
    id: number;
    title: string;
    amount: number;
    status: string;
  };
  auto_responses_sent: number;
  escalation_level: number;
}

interface OpenRequestsSectionProps {
  requests?: CustomerRequest[];
  loading?: boolean;
  onViewRequest?: (requestId: number) => void;
  onTakeRequest?: (requestId: number) => void;
  onAssignRequest?: (requestId: number, adminId: number) => void;
  onSendResponse?: (requestId: number, response: string, isAutoResponse?: boolean) => void;
  onEscalateRequest?: (requestId: number, reason: string) => void;
  onCloseRequest?: (requestId: number, reason: string) => void;
  onAddTags?: (requestId: number, tags: string[]) => void;
  onScheduleCall?: (requestId: number, datetime: string) => void;
}

export const OpenRequestsSection: React.FC<OpenRequestsSectionProps> = ({
  requests = [],
  loading = false,
  onViewRequest,
  onTakeRequest,
  onAssignRequest,
  onSendResponse,
  onEscalateRequest,
  onCloseRequest,
  onAddTags,
  onScheduleCall,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedUserType, setSelectedUserType] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  
  const [responseForm] = Form.useForm();
  const [escalateForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [callForm] = Form.useForm(); 
 

  const requestsData = requests;
  
  
  const filteredRequests = requestsData.filter(request => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = (request.title || '').toLowerCase().includes(searchLower) ||
                         (request.description || '').toLowerCase().includes(searchLower) ||
                         (request.request_number || '').toLowerCase().includes(searchLower) ||
                         `${request.user?.first_name || ''} ${request.user?.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const matchesType = selectedType === 'all' || request.request_type === selectedType;
    const matchesPriority = selectedPriority === 'all' || request.priority === selectedPriority;
    const matchesSource = selectedSource === 'all' || request.source === selectedSource;
    const matchesUserType = selectedUserType === 'all' || request.user.user_type === selectedUserType;
    const matchesOverdue = !showOverdueOnly || request.is_overdue;
    
    let matchesDate = true;
    if (dateRange) {
      const requestDate = dayjs(request.created_at);
      matchesDate = requestDate.isAfter(dateRange[0]) && requestDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesType && matchesPriority && matchesSource && matchesUserType && matchesOverdue && matchesDate;
  });

  
  const stats = {
    total: filteredRequests.length,
    overdue: filteredRequests.filter(r => r.is_overdue).length,
    urgent: filteredRequests.filter(r => r.priority === 'urgent').length,
    vip: filteredRequests.filter(r => r.user.is_vip).length,
    avgWaitingTime: filteredRequests.reduce((sum, r) => sum + r.waiting_time_hours, 0) / filteredRequests.length || 0,
  };

  
  const handleViewRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setViewModalVisible(true);
    onViewRequest?.(request.id);
  };

  const handleTakeRequest = (request: CustomerRequest) => {
    onTakeRequest?.(request.id);
    message.success(`Запрос "${request.title}" взят в работу`);
  };

  const handleSendResponse = (request: CustomerRequest) => {
    setSelectedRequest(request);
    responseForm.resetFields();
    setResponseModalVisible(true);
  };

  const handleResponseSubmit = async () => {
    try {
      const values = await responseForm.validateFields();
      if (selectedRequest) {
        onSendResponse?.(selectedRequest.id, values.response, values.isAutoResponse);
        message.success('Ответ отправлен');
        setResponseModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEscalateRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    escalateForm.resetFields();
    setEscalateModalVisible(true);
  };

  const handleEscalateSubmit = async () => {
    try {
      const values = await escalateForm.validateFields();
      if (selectedRequest) {
        onEscalateRequest?.(selectedRequest.id, values.reason);
        message.success(`Запрос "${selectedRequest.title}" эскалирован`);
        setEscalateModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleAssignRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      if (selectedRequest) {
        onAssignRequest?.(selectedRequest.id, values.adminId);
        message.success('Запрос назначен администратору');
        setAssignModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleScheduleCall = (request: CustomerRequest) => {
    setSelectedRequest(request);
    callForm.resetFields();
    setCallModalVisible(true);
  };

  const handleCallSubmit = async () => {
    try {
      const values = await callForm.validateFields();
      if (selectedRequest) {
        onScheduleCall?.(selectedRequest.id, values.datetime);
        message.success('Звонок запланирован');
        setCallModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  
  const getTypeColor = (type: string) => {
    const colors = {
      technical_support: 'blue',
      billing_question: 'green',
      order_help: 'orange',
      account_issue: 'purple',
      feature_request: 'cyan',
      complaint: 'red',
      other: 'gray',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getTypeText = (type: string) => {
    const texts = {
      technical_support: 'Техподдержка',
      billing_question: 'Оплата',
      order_help: 'Помощь с заказом',
      account_issue: 'Проблема аккаунта',
      feature_request: 'Предложение',
      complaint: 'Жалоба',
      other: 'Другое',
    };
    return texts[type as keyof typeof texts] || 'Другое';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      urgent: 'magenta',
    };
    return colors[priority as keyof typeof colors] || 'gray';
  };

  const getPriorityText = (priority: string) => {
    const texts = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочно',
    };
    return texts[priority as keyof typeof texts] || 'Средний';
  };

  const getSourceIcon = (source: string) => {
    const icons = {
      website: '🌐',
      email: '📧',
      phone: '📞',
      chat: '💬',
      mobile_app: '📱',
    };
    return icons[source as keyof typeof icons] || '❓';
  };

  const getUserTypeColor = (userType: string) => {
    const colors = {
      student: 'blue',
      expert: 'green',
      partner: 'gold',
    };
    return colors[userType as keyof typeof colors] || 'gray';
  };

  const formatWaitingTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} мин`;
    }
    if (hours < 24) {
      return `${Math.round(hours)} ч`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}д ${remainingHours}ч` : `${days}д`;
  };

  const columns = [
    {
      title: 'Запрос',
      key: 'request',
      render: (record: CustomerRequest) => (
        <div>
          <div className="openRequestsRequestNumber">
            {record.request_number}
          </div>
          <div className="openRequestsTitle">
            {record.title}
          </div>
          <div className="openRequestsTagRow">
            <Tag color={getTypeColor(record.request_type)}>
              {getTypeText(record.request_type)}
            </Tag>
            <Tag color={getPriorityColor(record.priority)}>
              {getPriorityText(record.priority)}
            </Tag>
            {record.is_overdue && (
              <Tag color="red" icon={<WarningOutlined />}>
                Просрочен
              </Tag>
            )}
            {record.user.is_vip && (
              <Tag color="gold">VIP</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Пользователь',
      key: 'user',
      width: 200,
      render: (record: CustomerRequest) => (
        <div className="openRequestsUserRow">
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div className="openRequestsUserName">
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" className="openRequestsUserHandle">
              @{record.user.username}
            </Text>
            <div className="openRequestsUserTypeRow">
              <Tag color={getUserTypeColor(record.user.user_type)}>
                {record.user.user_type === 'student' ? 'Студент' : 
                 record.user.user_type === 'expert' ? 'Эксперт' : 'Партнер'}
              </Tag>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Источник',
      key: 'source',
      width: 80,
      render: (record: CustomerRequest) => (
        <div className="openRequestsCenterCell">
          <Tooltip title={record.source}>
            <span className="openRequestsSourceIcon">
              {getSourceIcon(record.source)}
            </span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Время ожидания',
      key: 'waiting_time',
      width: 120,
      render: (record: CustomerRequest) => (
        <div className="openRequestsCenterCell">
          <div
            className={`openRequestsWaitingTime ${
              record.is_overdue
                ? 'openRequestsWaitingOverdue'
                : record.waiting_time_hours > 4
                ? 'openRequestsWaitingWarning'
                : 'openRequestsWaitingOk'
            }`}
          >
            {formatWaitingTime(record.waiting_time_hours)}
          </div>
          <div className="openRequestsSlaMeta">
            SLA: {dayjs(record.sla_deadline).format('HH:mm')}
          </div>
          {record.escalation_level > 0 && (
            <Tag color="orange">
              Ур. {record.escalation_level}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Теги',
      key: 'tags',
      width: 150,
      render: (record: CustomerRequest) => (
        <div>
          {record.tags.slice(0, 2).map(tag => (
            <Tag key={tag} className="openRequestsTagItem">
              {tag}
            </Tag>
          ))}
          {record.tags.length > 2 && (
            <Tag color="blue">
              +{record.tags.length - 2}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (date: string) => (
        <div className="openRequestsCreatedCell">
          <div>{dayjs(date).format('DD.MM')}</div>
          <Text type="secondary">{dayjs(date).format('HH:mm')}</Text>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (record: CustomerRequest) => (
        <Space size="small">
          <Tooltip title="Просмотреть">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewRequest(record)}
            />
          </Tooltip>
          <Tooltip title="Взять в работу">
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleTakeRequest(record)}
            />
          </Tooltip>
          <Tooltip title="Ответить">
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => handleSendResponse(record)}
            />
          </Tooltip>
          <Tooltip title="Назначить">
            <Button 
              size="small" 
              icon={<TeamOutlined />}
              onClick={() => handleAssignRequest(record)}
            />
          </Tooltip>
          {record.user.phone && (
            <Tooltip title="Запланировать звонок">
              <Button 
                size="small" 
                icon={<PhoneOutlined />}
                onClick={() => handleScheduleCall(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Эскалировать">
            <Button 
              size="small" 
              icon={<ExclamationCircleOutlined />}
              onClick={() => handleEscalateRequest(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="openRequestsSectionHeader">
          <Title level={4}>Открытые запросы клиентов</Title>
          <Text type="secondary">
            Новые запросы от пользователей, ожидающие обработки
          </Text>
        </div>

        
        <Row gutter={16} className="openRequestsStatsRow">
          <Col span={6}>
            <Statistic title="Всего запросов" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Просроченные" 
              value={stats.overdue} 
              className={stats.overdue > 0 ? 'openRequestsStatOverdue' : 'openRequestsStatOk'}
            />
          </Col>
          <Col span={6}>
            <Statistic title="Срочные" value={stats.urgent} className="openRequestsStatUrgent" />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Среднее время ожидания" 
              value={formatWaitingTime(stats.avgWaitingTime)} 
            />
          </Col>
        </Row>

        {stats.overdue > 0 && (
          <Alert
            message="Внимание!"
            description={`${stats.overdue} запросов просрочены и требуют немедленного внимания`}
            type="error"
            showIcon
            className="openRequestsAlert"
          />
        )}

        <div className="openRequestsFiltersRow">
          <Search
            placeholder="Поиск по запросам"
            allowClear
            className="openRequestsSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Тип запроса"
            className="openRequestsSelectType"
            value={selectedType}
            onChange={setSelectedType}
          >
            <Option value="all">Все типы</Option>
            <Option value="technical_support">Техподдержка</Option>
            <Option value="billing_question">Оплата</Option>
            <Option value="order_help">Помощь с заказом</Option>
            <Option value="account_issue">Проблема аккаунта</Option>
            <Option value="feature_request">Предложение</Option>
            <Option value="complaint">Жалоба</Option>
            <Option value="other">Другое</Option>
          </Select>

          <Select
            placeholder="Приоритет"
            className="openRequestsSelectPriority"
            value={selectedPriority}
            onChange={setSelectedPriority}
          >
            <Option value="all">Все</Option>
            <Option value="urgent">Срочно</Option>
            <Option value="high">Высокий</Option>
            <Option value="medium">Средний</Option>
            <Option value="low">Низкий</Option>
          </Select>

          <Select
            placeholder="Источник"
            className="openRequestsSelectSource"
            value={selectedSource}
            onChange={setSelectedSource}
          >
            <Option value="all">Все</Option>
            <Option value="website">Сайт</Option>
            <Option value="email">Email</Option>
            <Option value="phone">Телефон</Option>
            <Option value="chat">Чат</Option>
            <Option value="mobile_app">Приложение</Option>
          </Select>

          <Select
            placeholder="Тип пользователя"
            className="openRequestsSelectUserType"
            value={selectedUserType}
            onChange={setSelectedUserType}
          >
            <Option value="all">Все</Option>
            <Option value="student">Студенты</Option>
            <Option value="expert">Эксперты</Option>
            <Option value="partner">Партнеры</Option>
          </Select>

          <Button
            type={showOverdueOnly ? 'primary' : 'default'}
            icon={<WarningOutlined />}
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          >
            Только просроченные
          </Button>

          <RangePicker
            placeholder={['От', 'До']}
            value={dateRange}
            onChange={setDateRange}
            className="openRequestsRangePicker"
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredRequests}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} запросов`
          }}
          locale={{ emptyText: 'Открытые запросы не найдены' }}
          size="small"
          rowClassName={(record) => 
            record.is_overdue ? 'overdue-row' : 
            record.priority === 'urgent' ? 'urgent-row' : ''
          }
        />
      </Card>
      
      
      
      
      <Modal
        title={`Запрос ${selectedRequest?.request_number}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="take" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              if (selectedRequest) {
                handleTakeRequest(selectedRequest);
                setViewModalVisible(false);
              }
            }}
          >
            Взять в работу
          </Button>,
        ]}
        width={800}
      >
        {selectedRequest && (
          <div>
            <div className="openRequestsModalHeader">
              <Title level={5}>{selectedRequest.title}</Title>
              <Space>
                <Tag color={getTypeColor(selectedRequest.request_type)}>
                  {getTypeText(selectedRequest.request_type)}
                </Tag>
                <Tag color={getPriorityColor(selectedRequest.priority)}>
                  {getPriorityText(selectedRequest.priority)}
                </Tag>
                {selectedRequest.is_overdue && (
                  <Tag color="red" icon={<WarningOutlined />}>
                    Просрочен
                  </Tag>
                )}
                {selectedRequest.user.is_vip && (
                  <Tag color="gold">VIP клиент</Tag>
                )}
              </Space>
            </div>

            <div className="openRequestsSectionBlock">
              <Text strong>Описание:</Text>
              <Paragraph className="openRequestsParagraphSpacing">
                {selectedRequest.description}
              </Paragraph>
            </div>

            <Row gutter={24}>
              <Col span={12}>
                <div className="openRequestsSectionBlock">
                  <Text strong>Пользователь:</Text>
                  <div className="openRequestsUserInfo">
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <div>{selectedRequest.user.first_name} {selectedRequest.user.last_name}</div>
                      <Text type="secondary">@{selectedRequest.user.username}</Text>
                      <br />
                      <Text type="secondary">{selectedRequest.user.email}</Text>
                      {selectedRequest.user.phone && (
                        <>
                          <br />
                          <Text type="secondary">{selectedRequest.user.phone}</Text>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Col>

              <Col span={12}>
                <div className="openRequestsSectionBlock">
                  <Text strong>Информация о пользователе:</Text>
                  <div className="openRequestsInfoList">
                    <div>Тип: {selectedRequest.user.user_type === 'student' ? 'Студент' : 
                                selectedRequest.user.user_type === 'expert' ? 'Эксперт' : 'Партнер'}</div>
                    <div>Регистрация: {dayjs(selectedRequest.user.registration_date).format('DD.MM.YYYY')}</div>
                    <div>Всего заказов: {selectedRequest.user.total_orders}</div>
                    {selectedRequest.user.is_vip && (
                      <div className="openRequestsVipText">VIP статус</div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            {selectedRequest.related_order && (
              <div className="openRequestsSectionBlock">
                <Text strong>Связанный заказ:</Text>
                <div className="openRequestsRelatedOrderBox">
                  <div>ID: {selectedRequest.related_order.id}</div>
                  <div>Название: {selectedRequest.related_order.title}</div>
                  <div>Сумма: {selectedRequest.related_order.amount.toLocaleString()} ₽</div>
                  <div>Статус: {selectedRequest.related_order.status}</div>
                </div>
              </div>
            )}

            {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
              <div className="openRequestsSectionBlock">
                <Text strong>Вложения:</Text>
                <div className="openRequestsAttachmentsRow">
                  {selectedRequest.attachments.map((file, index) => (
                    <Tag key={index} color="blue">📎 {file.name}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div className="openRequestsSectionBlock">
              <Text strong>Теги:</Text>
              <div className="openRequestsTagsRow">
                {selectedRequest.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>

            <div className="openRequestsMetaRow">
              <span>Создан: {dayjs(selectedRequest.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Источник: {getSourceIcon(selectedRequest.source)} {selectedRequest.source}</span>
              <span>Время ожидания: {formatWaitingTime(selectedRequest.waiting_time_hours)}</span>
            </div>

            <div className="openRequestsMetaSummary">
              SLA дедлайн: {dayjs(selectedRequest.sla_deadline).format('DD.MM.YYYY HH:mm')} | 
              Автоответов отправлено: {selectedRequest.auto_responses_sent} |
              Уровень эскалации: {selectedRequest.escalation_level}
            </div>
          </div>
        )}
      </Modal>

      
      <Modal
        title="Отправить ответ"
        open={responseModalVisible}
        onOk={handleResponseSubmit}
        onCancel={() => setResponseModalVisible(false)}
        okText="Отправить"
        cancelText="Отмена"
      >
        <Form form={responseForm} layout="vertical">
          <Form.Item
            name="response"
            label="Ответ клиенту"
            rules={[{ required: true, message: 'Введите ответ' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="Введите ваш ответ клиенту..."
            />
          </Form.Item>

          <Form.Item
            name="isAutoResponse"
            valuePropName="checked"
          >
            <input type="checkbox" /> Автоматический ответ
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Эскалировать запрос"
        open={escalateModalVisible}
        onOk={handleEscalateSubmit}
        onCancel={() => setEscalateModalVisible(false)}
        okText="Эскалировать"
        cancelText="Отмена"
      >
        <Form form={escalateForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Причина эскалации"
            rules={[{ required: true, message: 'Укажите причину эскалации' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите причину эскалации запроса..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Назначить администратора"
        open={assignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setAssignModalVisible(false)}
        okText="Назначить"
        cancelText="Отмена"
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="adminId"
            label="Администратор"
            rules={[{ required: true, message: 'Выберите администратора' }]}
          >
            <Select placeholder="Выберите администратора">
              <Option value={1}>Анна Главная (Главный администратор)</Option>
              <Option value={2}>Петр Поддержкин (Техподдержка)</Option>
              <Option value={3}>Мария Финансова (Финансы)</Option>
              <Option value={4}>Сергей Арбитров (Споры)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Запланировать звонок"
        open={callModalVisible}
        onOk={handleCallSubmit}
        onCancel={() => setCallModalVisible(false)}
        okText="Запланировать"
        cancelText="Отмена"
      >
        <Form form={callForm} layout="vertical">
          <Form.Item
            name="datetime"
            label="Дата и время звонка"
            rules={[{ required: true, message: 'Выберите дату и время' }]}
          >
            <DatePicker 
              showTime 
              placeholder="Выберите дату и время"
              className="openRequestsDatePicker"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
