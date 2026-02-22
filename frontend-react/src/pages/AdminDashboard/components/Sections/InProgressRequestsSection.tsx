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
  Timeline,
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
  ClockCircleOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  FileTextOutlined,
  TeamOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface RequestAction {
  id: number;
  action_type: 'response_sent' | 'status_changed' | 'assigned' | 'escalated' | 'call_scheduled' | 'note_added';
  description: string;
  performed_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  performed_at: string;
  details?: string;
}

interface CustomerRequest {
  id: number;
  request_number: string;
  title: string;
  description: string;
  request_type: 'technical_support' | 'billing_question' | 'order_help' | 'account_issue' | 'feature_request' | 'complaint' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'assigned' | 'in_progress' | 'waiting_response' | 'on_hold';
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
    user_type: 'student' | 'expert' | 'partner';
    is_vip: boolean;
  };
  assigned_admin: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
  taken_at: string;
  progress_percentage: number;
  estimated_completion?: string;
  last_response_at?: string;
  response_count: number;
  sla_deadline: string;
  is_overdue: boolean;
  tags: string[];
  source: 'website' | 'email' | 'phone' | 'chat' | 'mobile_app';
  related_order?: {
    id: number;
    title: string;
    amount: number;
    status: string;
  };
  actions: RequestAction[];
  notes?: string;
  next_action?: string;
  waiting_for?: 'user_response' | 'internal_approval' | 'external_service' | 'escalation_review';
}

interface InProgressRequestsSectionProps {
  requests?: CustomerRequest[];
  loading?: boolean;
  onViewRequest?: (requestId: number) => void;
  onUpdateProgress?: (requestId: number, progress: number) => void;
  onSendResponse?: (requestId: number, response: string) => void;
  onCompleteRequest?: (requestId: number, resolution: string) => void;
  onPauseRequest?: (requestId: number, reason: string) => void;
  onResumeRequest?: (requestId: number) => void;
  onAddNote?: (requestId: number, note: string) => void;
  onScheduleFollowUp?: (requestId: number, datetime: string, action: string) => void;
  onReassignRequest?: (requestId: number, adminId: number) => void;
}

export const InProgressRequestsSection: React.FC<InProgressRequestsSectionProps> = ({
  requests = [],
  loading = false,
  onViewRequest,
  onUpdateProgress,
  onSendResponse,
  onCompleteRequest,
  onPauseRequest,
  onResumeRequest,
  onAddNote,
  onScheduleFollowUp,
  onReassignRequest,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  
  const [progressForm] = Form.useForm();
  const [responseForm] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [pauseForm] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [followUpForm] = Form.useForm(); 
 

  const requestsData = requests;
  
  
  const filteredRequests = requestsData.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchText.toLowerCase()) ||
                         request.request_number.toLowerCase().includes(searchText.toLowerCase()) ||
                         `${request.user.first_name} ${request.user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesType = selectedType === 'all' || request.request_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesAdmin = selectedAdmin === 'all' || request.assigned_admin.username === selectedAdmin;
    const matchesPriority = selectedPriority === 'all' || request.priority === selectedPriority;
    
    return matchesSearch && matchesType && matchesStatus && matchesAdmin && matchesPriority;
  });

  
  const stats = {
    total: filteredRequests.length,
    overdue: filteredRequests.filter(r => r.is_overdue).length,
    waitingResponse: filteredRequests.filter(r => r.status === 'waiting_response').length,
    onHold: filteredRequests.filter(r => r.status === 'on_hold').length,
    avgProgress: filteredRequests.reduce((sum, r) => sum + r.progress_percentage, 0) / filteredRequests.length || 0,
  };

  
  const handleViewRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setViewModalVisible(true);
    onViewRequest?.(request.id);
  };

  const handleUpdateProgress = (request: CustomerRequest) => {
    setSelectedRequest(request);
    progressForm.setFieldsValue({ progress: request.progress_percentage });
    setProgressModalVisible(true);
  };

  const handleProgressSubmit = async () => {
    try {
      const values = await progressForm.validateFields();
      if (selectedRequest) {
        onUpdateProgress?.(selectedRequest.id, values.progress);
        message.success('Прогресс обновлен');
        setProgressModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
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
        onSendResponse?.(selectedRequest.id, values.response);
        message.success('Ответ отправлен');
        setResponseModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCompleteRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    completeForm.resetFields();
    setCompleteModalVisible(true);
  };

  const handleCompleteSubmit = async () => {
    try {
      const values = await completeForm.validateFields();
      if (selectedRequest) {
        onCompleteRequest?.(selectedRequest.id, values.resolution);
        message.success(`Запрос "${selectedRequest.title}" завершен`);
        setCompleteModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePauseRequest = (request: CustomerRequest) => {
    setSelectedRequest(request);
    pauseForm.resetFields();
    setPauseModalVisible(true);
  };

  const handlePauseSubmit = async () => {
    try {
      const values = await pauseForm.validateFields();
      if (selectedRequest) {
        onPauseRequest?.(selectedRequest.id, values.reason);
        message.success('Запрос поставлен на паузу');
        setPauseModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleResumeRequest = (request: CustomerRequest) => {
    onResumeRequest?.(request.id);
    message.success('Работа по запросу возобновлена');
  };

  const handleAddNote = (request: CustomerRequest) => {
    setSelectedRequest(request);
    noteForm.resetFields();
    setNoteModalVisible(true);
  };

  const handleNoteSubmit = async () => {
    try {
      const values = await noteForm.validateFields();
      if (selectedRequest) {
        onAddNote?.(selectedRequest.id, values.note);
        message.success('Заметка добавлена');
        setNoteModalVisible(false);
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

  const getStatusColor = (status: string) => {
    const colors = {
      assigned: 'blue',
      in_progress: 'orange',
      waiting_response: 'yellow',
      on_hold: 'gray',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      assigned: 'Назначен',
      in_progress: 'В процессе',
      waiting_response: 'Ожидает ответа',
      on_hold: 'На паузе',
    };
    return texts[status as keyof typeof texts] || 'Неизвестно';
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

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#52c41a';
    if (progress >= 50) return '#faad14';
    return '#ff4d4f';
  }; 
 const columns = [
    {
      title: 'Запрос',
      key: 'request',
      render: (record: CustomerRequest) => (
        <div>
          <div className="inProgressRequestsNumber">
            {record.request_number}
          </div>
          <div className="inProgressRequestsTitle">
            {record.title}
          </div>
          <div className="inProgressRequestsTagRow">
            <Tag color={getTypeColor(record.request_type)}>
              {getTypeText(record.request_type)}
            </Tag>
            <Tag color={getPriorityColor(record.priority)}>
              {getPriorityText(record.priority)}
            </Tag>
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
      width: 150,
      render: (record: CustomerRequest) => (
        <div className="inProgressRequestsUserRow">
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div className="inProgressRequestsUserName">
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" className="inProgressRequestsUserHandle">
              @{record.user.username}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Администратор',
      key: 'admin',
      width: 150,
      render: (record: CustomerRequest) => (
        <div>
          <div className="inProgressRequestsAdminName">
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </div>
          <Text type="secondary" className="inProgressRequestsAdminRole">
            {record.assigned_admin.role}
          </Text>
        </div>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (record: CustomerRequest) => (
        <div className="inProgressRequestsStatusCell">
          <Tag color={getStatusColor(record.status)}>
            {getStatusText(record.status)}
          </Tag>
          {record.is_overdue && (
            <div className="inProgressRequestsOverdueLabel">
              Просрочен
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Прогресс',
      key: 'progress',
      width: 120,
      render: (record: CustomerRequest) => (
        <div>
          <Progress 
            percent={record.progress_percentage} 
            size="small"
            strokeColor={getProgressColor(record.progress_percentage)}
          />
          <Text className="inProgressRequestsProgressMeta">
            {record.progress_percentage}%
          </Text>
        </div>
      ),
    },
    {
      title: 'Ответы',
      dataIndex: 'response_count',
      key: 'response_count',
      width: 80,
      render: (count: number, record: CustomerRequest) => (
        <div className="inProgressRequestsResponsesCell">
          <Badge count={count} showZero>
            <MessageOutlined className="inProgressRequestsResponseIcon" />
          </Badge>
          {record.last_response_at && (
            <div className="inProgressRequestsResponseTime">
              {dayjs(record.last_response_at).format('HH:mm')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Дедлайн',
      key: 'deadline',
      width: 100,
      render: (record: CustomerRequest) => (
        <div className="inProgressRequestsDeadlineCell">
          <div className={record.is_overdue ? 'inProgressRequestsDeadlineDate inProgressRequestsDeadlineOverdue' : 'inProgressRequestsDeadlineDate'}>
            {dayjs(record.sla_deadline).format('DD.MM')}
          </div>
          <div className="inProgressRequestsDeadlineTime">
            {dayjs(record.sla_deadline).format('HH:mm')}
          </div>
          {record.estimated_completion && (
            <div className="inProgressRequestsDeadlineEstimate">
              ~{dayjs(record.estimated_completion).format('HH:mm')}
            </div>
          )}
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
          <Tooltip title="Обновить прогресс">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleUpdateProgress(record)}
            />
          </Tooltip>
          <Tooltip title="Ответить">
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => handleSendResponse(record)}
            />
          </Tooltip>
          {record.status === 'on_hold' ? (
            <Tooltip title="Возобновить">
              <Button 
                size="small" 
                icon={<PlayCircleOutlined />}
                onClick={() => handleResumeRequest(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Поставить на паузу">
              <Button 
                size="small" 
                icon={<PauseCircleOutlined />}
                onClick={() => handlePauseRequest(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Завершить">
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleCompleteRequest(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="inProgressRequestsHeader">
          <Title level={4}>Запросы в процессе решения</Title>
          <Text type="secondary">
            Запросы, которые находятся в активной работе
          </Text>
        </div>

        
        <Row gutter={16} className="inProgressRequestsStatsRow">
          <Col span={6}>
            <Statistic title="Всего в работе" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Просроченные" 
              value={stats.overdue} 
              className={stats.overdue > 0 ? 'inProgressRequestsStatOverdue' : 'inProgressRequestsStatOk'}
            />
          </Col>
          <Col span={6}>
            <Statistic title="Ожидают ответа" value={stats.waitingResponse} className="inProgressRequestsStatWaiting" />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Средний прогресс" 
              value={`${Math.round(stats.avgProgress)}%`}
              className={
                stats.avgProgress >= 80 
                  ? 'inProgressRequestsStatProgressHigh' 
                  : stats.avgProgress >= 50 
                    ? 'inProgressRequestsStatProgressMedium' 
                    : 'inProgressRequestsStatProgressLow'
              }
            />
          </Col>
        </Row>

        <div className="inProgressRequestsFiltersRow">
          <Search
            placeholder="Поиск по запросам"
            allowClear
            className="inProgressRequestsSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Тип запроса"
            className="inProgressRequestsSelectType"
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
            placeholder="Статус"
            className="inProgressRequestsSelectStatus"
            value={selectedStatus}
            onChange={setSelectedStatus}
          >
            <Option value="all">Все статусы</Option>
            <Option value="assigned">Назначен</Option>
            <Option value="in_progress">В процессе</Option>
            <Option value="waiting_response">Ожидает ответа</Option>
            <Option value="on_hold">На паузе</Option>
          </Select>

          <Select
            placeholder="Администратор"
            className="inProgressRequestsSelectAdmin"
            value={selectedAdmin}
            onChange={setSelectedAdmin}
          >
            <Option value="all">Все</Option>
            <Option value="admin_tech">Алексей Техников</Option>
            <Option value="admin_billing">Мария Финансова</Option>
            <Option value="admin_support">Петр Поддержкин</Option>
          </Select>

          <Select
            placeholder="Приоритет"
            className="inProgressRequestsSelectPriority"
            value={selectedPriority}
            onChange={setSelectedPriority}
          >
            <Option value="all">Все</Option>
            <Option value="urgent">Срочно</Option>
            <Option value="high">Высокий</Option>
            <Option value="medium">Средний</Option>
            <Option value="low">Низкий</Option>
          </Select>
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
          locale={{ emptyText: 'Запросы в процессе решения не найдены' }}
          size="small"
          rowClassName={(record) => 
            record.is_overdue ? 'overdue-row' : 
            record.status === 'on_hold' ? 'hold-row' : ''
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
            key="complete" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              if (selectedRequest) {
                setViewModalVisible(false);
                handleCompleteRequest(selectedRequest);
              }
            }}
          >
            Завершить
          </Button>,
        ]}
        width={900}
      >
        {selectedRequest && (
          <div>
            <div className="inProgressRequestsModalHeader">
              <Title level={5}>{selectedRequest.title}</Title>
              <Space>
                <Tag color={getTypeColor(selectedRequest.request_type)}>
                  {getTypeText(selectedRequest.request_type)}
                </Tag>
                <Tag color={getStatusColor(selectedRequest.status)}>
                  {getStatusText(selectedRequest.status)}
                </Tag>
                <Tag color={getPriorityColor(selectedRequest.priority)}>
                  {getPriorityText(selectedRequest.priority)}
                </Tag>
                {selectedRequest.user.is_vip && (
                  <Tag color="gold">VIP клиент</Tag>
                )}
              </Space>
            </div>

            <div className="inProgressRequestsSectionBlock">
              <Text strong>Прогресс выполнения:</Text>
              <Progress 
                percent={selectedRequest.progress_percentage} 
                strokeColor={getProgressColor(selectedRequest.progress_percentage)}
                className="inProgressRequestsProgress"
              />
            </div>

            <div className="inProgressRequestsSectionBlock">
              <Text strong>Описание:</Text>
              <Paragraph className="inProgressRequestsParagraph">
                {selectedRequest.description}
              </Paragraph>
            </div>

            <Row gutter={24}>
              <Col span={12}>
                <div className="inProgressRequestsSectionBlock">
                  <Text strong>Пользователь:</Text>
                  <div className="inProgressRequestsInfoRow">
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <div>{selectedRequest.user.first_name} {selectedRequest.user.last_name}</div>
                      <Text type="secondary">@{selectedRequest.user.username}</Text>
                      <br />
                      <Text type="secondary">{selectedRequest.user.email}</Text>
                    </div>
                  </div>
                </div>
              </Col>

              <Col span={12}>
                <div className="inProgressRequestsSectionBlock">
                  <Text strong>Администратор:</Text>
                  <div className="inProgressRequestsInfoRow">
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <div>{selectedRequest.assigned_admin.first_name} {selectedRequest.assigned_admin.last_name}</div>
                      <Text type="secondary">{selectedRequest.assigned_admin.role}</Text>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {selectedRequest.related_order && (
              <div className="inProgressRequestsSectionBlock">
                <Text strong>Связанный заказ:</Text>
                <div className="inProgressRequestsRelatedOrder">
                  <div>ID: {selectedRequest.related_order.id}</div>
                  <div>Название: {selectedRequest.related_order.title}</div>
                  <div>Сумма: {selectedRequest.related_order.amount.toLocaleString()} ₽</div>
                  <div>Статус: {selectedRequest.related_order.status}</div>
                </div>
              </div>
            )}

            {selectedRequest.notes && (
              <div className="inProgressRequestsSectionBlock">
                <Text strong>Заметки:</Text>
                <div className="inProgressRequestsNotesBox">
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            {selectedRequest.next_action && (
              <div className="inProgressRequestsSectionBlock">
                <Text strong>Следующее действие:</Text>
                <div className="inProgressRequestsNextAction">
                  {selectedRequest.next_action}
                </div>
              </div>
            )}

            <div className="inProgressRequestsSectionBlock">
              <Text strong>История действий:</Text>
              <Timeline className="inProgressRequestsTimeline">
                {selectedRequest.actions.map((action, index) => (
                  <Timeline.Item 
                    key={action.id}
                    color={index === 0 ? 'green' : 'blue'}
                  >
                    <div>
                      <Text strong>{action.description}</Text>
                      <div className="inProgressRequestsTimelineMeta">
                        {action.performed_by.first_name} {action.performed_by.last_name} • 
                        {dayjs(action.performed_at).format('DD.MM.YYYY HH:mm')}
                      </div>
                      {action.details && (
                        <div className="inProgressRequestsTimelineDetails">
                          {action.details}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>

            <div className="inProgressRequestsMetaRow">
              <span>Создан: {dayjs(selectedRequest.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Взят в работу: {dayjs(selectedRequest.taken_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Ответов: {selectedRequest.response_count}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Обновить прогресс"
        open={progressModalVisible}
        onOk={handleProgressSubmit}
        onCancel={() => setProgressModalVisible(false)}
        okText="Обновить"
        cancelText="Отмена"
      >
        <Form form={progressForm} layout="vertical">
          <Form.Item
            name="progress"
            label="Прогресс выполнения (%)"
            rules={[{ required: true, message: 'Укажите прогресс' }]}
          >
            <Input type="number" min={0} max={100} />
          </Form.Item>
        </Form>
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
        </Form>
      </Modal>

      
      <Modal
        title="Завершить запрос"
        open={completeModalVisible}
        onOk={handleCompleteSubmit}
        onCancel={() => setCompleteModalVisible(false)}
        okText="Завершить"
        cancelText="Отмена"
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="resolution"
            label="Решение"
            rules={[{ required: true, message: 'Опишите решение' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите, как был решен запрос..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Поставить запрос на паузу"
        open={pauseModalVisible}
        onOk={handlePauseSubmit}
        onCancel={() => setPauseModalVisible(false)}
        okText="Поставить на паузу"
        cancelText="Отмена"
      >
        <Form form={pauseForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Причина паузы"
            rules={[{ required: true, message: 'Укажите причину' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Опишите причину постановки на паузу..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Добавить заметку"
        open={noteModalVisible}
        onOk={handleNoteSubmit}
        onCancel={() => setNoteModalVisible(false)}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={noteForm} layout="vertical">
          <Form.Item
            name="note"
            label="Заметка"
            rules={[{ required: true, message: 'Введите заметку' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Введите заметку по запросу..."
            />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};
