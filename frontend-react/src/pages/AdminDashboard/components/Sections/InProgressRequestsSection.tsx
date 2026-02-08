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
 // Мок данные для демонстрации
  const mockRequests: CustomerRequest[] = [
    {
      id: 6,
      request_number: 'REQ-2024-006',
      title: 'Проблема с доступом к заказу',
      description: 'Не могу получить доступ к выполненному заказу в личном кабинете. Ссылка не работает.',
      request_type: 'technical_support',
      priority: 'medium',
      status: 'in_progress',
      user: {
        id: 106,
        username: 'student_elena',
        first_name: 'Елена',
        last_name: 'Васильева',
        email: 'elena.vasileva@email.com',
        phone: '+7 (999) 456-78-90',
        user_type: 'student',
        is_vip: false,
      },
      assigned_admin: {
        id: 1,
        username: 'admin_tech',
        first_name: 'Алексей',
        last_name: 'Техников',
        role: 'Технический администратор',
      },
      created_at: '2024-02-03T14:20:00Z',
      updated_at: '2024-02-04T10:30:00Z',
      taken_at: '2024-02-03T15:00:00Z',
      progress_percentage: 75,
      estimated_completion: '2024-02-04T16:00:00Z',
      last_response_at: '2024-02-04T09:15:00Z',
      response_count: 3,
      sla_deadline: '2024-02-04T14:20:00Z',
      is_overdue: false,
      tags: ['access_issue', 'personal_cabinet'],
      source: 'website',
      related_order: {
        id: 1003,
        title: 'Контрольная работа по физике',
        amount: 2500,
        status: 'completed',
      },
      actions: [
        {
          id: 1,
          action_type: 'assigned',
          description: 'Запрос назначен администратору',
          performed_by: {
            id: 1,
            username: 'admin_chief',
            first_name: 'Анна',
            last_name: 'Главная',
          },
          performed_at: '2024-02-03T15:00:00Z',
        },
        {
          id: 2,
          action_type: 'response_sent',
          description: 'Отправлен запрос на дополнительную информацию',
          performed_by: {
            id: 1,
            username: 'admin_tech',
            first_name: 'Алексей',
            last_name: 'Техников',
          },
          performed_at: '2024-02-03T16:30:00Z',
        },
        {
          id: 3,
          action_type: 'status_changed',
          description: 'Статус изменен на "В процессе решения"',
          performed_by: {
            id: 1,
            username: 'admin_tech',
            first_name: 'Алексей',
            last_name: 'Техников',
          },
          performed_at: '2024-02-04T09:15:00Z',
        },
      ],
      notes: 'Проблема связана с кешированием. Проверяем настройки сервера.',
      next_action: 'Ожидаем ответ от технической службы',
      waiting_for: 'external_service',
    },
    {
      id: 7,
      request_number: 'REQ-2024-007',
      title: 'Возврат средств за некачественную работу',
      description: 'Эксперт выполнил работу с ошибками. Требую полный возврат средств.',
      request_type: 'billing_question',
      priority: 'high',
      status: 'waiting_response',
      user: {
        id: 107,
        username: 'student_dmitry',
        first_name: 'Дмитрий',
        last_name: 'Кузнецов',
        email: 'dmitry.kuznetsov@email.com',
        user_type: 'student',
        is_vip: true,
      },
      assigned_admin: {
        id: 2,
        username: 'admin_billing',
        first_name: 'Мария',
        last_name: 'Финансова',
        role: 'Финансовый администратор',
      },
      created_at: '2024-02-02T11:45:00Z',
      updated_at: '2024-02-04T08:20:00Z',
      taken_at: '2024-02-02T12:30:00Z',
      progress_percentage: 60,
      estimated_completion: '2024-02-05T12:00:00Z',
      last_response_at: '2024-02-03T16:45:00Z',
      response_count: 4,
      sla_deadline: '2024-02-04T11:45:00Z',
      is_overdue: true,
      tags: ['refund_request', 'quality_issue', 'vip_client'],
      source: 'email',
      related_order: {
        id: 1004,
        title: 'Дипломная работа по экономике',
        amount: 18000,
        status: 'disputed',
      },
      actions: [
        {
          id: 4,
          action_type: 'assigned',
          description: 'Запрос назначен финансовому администратору',
          performed_by: {
            id: 1,
            username: 'admin_chief',
            first_name: 'Анна',
            last_name: 'Главная',
          },
          performed_at: '2024-02-02T12:30:00Z',
        },
        {
          id: 5,
          action_type: 'escalated',
          description: 'Запрос эскалирован из-за высокой суммы возврата',
          performed_by: {
            id: 2,
            username: 'admin_billing',
            first_name: 'Мария',
            last_name: 'Финансова',
          },
          performed_at: '2024-02-03T10:15:00Z',
        },
      ],
      notes: 'VIP клиент. Требуется одобрение руководства для возврата.',
      next_action: 'Ожидаем решение от дирекции',
      waiting_for: 'internal_approval',
    },
    {
      id: 8,
      request_number: 'REQ-2024-008',
      title: 'Помощь с размещением заказа',
      description: 'Не понимаю, как правильно оформить заказ на курсовую работу. Нужна помощь.',
      request_type: 'order_help',
      priority: 'low',
      status: 'assigned',
      user: {
        id: 108,
        username: 'student_olga',
        first_name: 'Ольга',
        last_name: 'Морозова',
        email: 'olga.morozova@email.com',
        user_type: 'student',
        is_vip: false,
      },
      assigned_admin: {
        id: 3,
        username: 'admin_support',
        first_name: 'Петр',
        last_name: 'Поддержкин',
        role: 'Администратор поддержки',
      },
      created_at: '2024-02-04T09:30:00Z',
      updated_at: '2024-02-04T10:15:00Z',
      taken_at: '2024-02-04T10:15:00Z',
      progress_percentage: 25,
      estimated_completion: '2024-02-04T18:00:00Z',
      response_count: 1,
      sla_deadline: '2024-02-06T09:30:00Z',
      is_overdue: false,
      tags: ['order_help', 'new_user'],
      source: 'chat',
      actions: [
        {
          id: 6,
          action_type: 'assigned',
          description: 'Запрос назначен администратору поддержки',
          performed_by: {
            id: 1,
            username: 'admin_chief',
            first_name: 'Анна',
            last_name: 'Главная',
          },
          performed_at: '2024-02-04T10:15:00Z',
        },
      ],
      notes: 'Новый пользователь, нужна подробная консультация.',
      next_action: 'Подготовить пошаговую инструкцию',
      waiting_for: 'user_response',
    },
    {
      id: 9,
      request_number: 'REQ-2024-009',
      title: 'Проблема с партнерскими выплатами',
      description: 'Не получил партнерскую комиссию за прошлый месяц. В личном кабинете показывает нулевой баланс.',
      request_type: 'billing_question',
      priority: 'medium',
      status: 'on_hold',
      user: {
        id: 109,
        username: 'partner_ivan',
        first_name: 'Иван',
        last_name: 'Партнеров',
        email: 'ivan.partnerov@email.com',
        phone: '+7 (999) 567-89-01',
        user_type: 'partner',
        is_vip: true,
      },
      assigned_admin: {
        id: 2,
        username: 'admin_billing',
        first_name: 'Мария',
        last_name: 'Финансова',
        role: 'Финансовый администратор',
      },
      created_at: '2024-02-01T16:20:00Z',
      updated_at: '2024-02-04T07:30:00Z',
      taken_at: '2024-02-01T17:00:00Z',
      progress_percentage: 40,
      last_response_at: '2024-02-03T14:20:00Z',
      response_count: 2,
      sla_deadline: '2024-02-03T16:20:00Z',
      is_overdue: true,
      tags: ['partner_commission', 'payment_issue'],
      source: 'email',
      actions: [
        {
          id: 7,
          action_type: 'assigned',
          description: 'Запрос назначен финансовому администратору',
          performed_by: {
            id: 1,
            username: 'admin_chief',
            first_name: 'Анна',
            last_name: 'Главная',
          },
          performed_at: '2024-02-01T17:00:00Z',
        },
        {
          id: 8,
          action_type: 'status_changed',
          description: 'Запрос поставлен на паузу для проверки данных',
          performed_by: {
            id: 2,
            username: 'admin_billing',
            first_name: 'Мария',
            last_name: 'Финансова',
          },
          performed_at: '2024-02-03T14:20:00Z',
        },
      ],
      notes: 'Проверяем данные в системе партнерских выплат.',
      next_action: 'Ожидаем ответ от бухгалтерии',
      waiting_for: 'external_service',
    },
  ];

  const requestsData = requests.length > 0 ? requests : mockRequests;
  
  // Фильтрация данных
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

  // Статистика
  const stats = {
    total: filteredRequests.length,
    overdue: filteredRequests.filter(r => r.is_overdue).length,
    waitingResponse: filteredRequests.filter(r => r.status === 'waiting_response').length,
    onHold: filteredRequests.filter(r => r.status === 'on_hold').length,
    avgProgress: filteredRequests.reduce((sum, r) => sum + r.progress_percentage, 0) / filteredRequests.length || 0,
  };

  // Обработчики
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

  // Функции для отображения
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
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.request_number}
          </div>
          <div style={{ fontSize: '13px', marginBottom: 4 }}>
            {record.title}
          </div>
          <div style={{ marginTop: 8 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div style={{ fontWeight: 500, fontSize: '12px' }}>
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>
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
          <div style={{ fontWeight: 500, fontSize: '12px' }}>
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </div>
          <Text type="secondary" style={{ fontSize: '10px' }}>
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
        <div style={{ textAlign: 'center' }}>
          <Tag color={getStatusColor(record.status)}>
            {getStatusText(record.status)}
          </Tag>
          {record.is_overdue && (
            <div style={{ fontSize: '10px', color: '#ff4d4f', marginTop: 2 }}>
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
          <Text style={{ fontSize: '11px', color: '#666' }}>
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
        <div style={{ textAlign: 'center' }}>
          <Badge count={count} showZero>
            <MessageOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
          </Badge>
          {record.last_response_at && (
            <div style={{ fontSize: '10px', color: '#999', marginTop: 2 }}>
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '12px',
            color: record.is_overdue ? '#ff4d4f' : '#666'
          }}>
            {dayjs(record.sla_deadline).format('DD.MM')}
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {dayjs(record.sla_deadline).format('HH:mm')}
          </div>
          {record.estimated_completion && (
            <div style={{ fontSize: '10px', color: '#52c41a', marginTop: 2 }}>
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
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Запросы в процессе решения</Title>
          <Text type="secondary">
            Запросы, которые находятся в активной работе
          </Text>
        </div>

        {/* Статистика */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="Всего в работе" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Просроченные" 
              value={stats.overdue} 
              valueStyle={{ color: stats.overdue > 0 ? '#ff4d4f' : '#52c41a' }} 
            />
          </Col>
          <Col span={6}>
            <Statistic title="Ожидают ответа" value={stats.waitingResponse} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Средний прогресс" 
              value={`${Math.round(stats.avgProgress)}%`}
              valueStyle={{ color: getProgressColor(stats.avgProgress) }}
            />
          </Col>
        </Row>

        {/* Фильтры */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по запросам"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Тип запроса"
            style={{ width: 150 }}
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
            style={{ width: 150 }}
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
            style={{ width: 150 }}
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
            style={{ width: 120 }}
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
     {/* Модальные окна */}
      
      {/* Просмотр запроса */}
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
            <div style={{ marginBottom: 16 }}>
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

            <div style={{ marginBottom: 16 }}>
              <Text strong>Прогресс выполнения:</Text>
              <Progress 
                percent={selectedRequest.progress_percentage} 
                strokeColor={getProgressColor(selectedRequest.progress_percentage)}
                style={{ marginTop: 8 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Описание:</Text>
              <Paragraph style={{ marginTop: 8 }}>
                {selectedRequest.description}
              </Paragraph>
            </div>

            <Row gutter={24}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Пользователь:</Text>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Администратор:</Text>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <div style={{ marginBottom: 16 }}>
                <Text strong>Связанный заказ:</Text>
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                  <div>ID: {selectedRequest.related_order.id}</div>
                  <div>Название: {selectedRequest.related_order.title}</div>
                  <div>Сумма: {selectedRequest.related_order.amount.toLocaleString()} ₽</div>
                  <div>Статус: {selectedRequest.related_order.status}</div>
                </div>
              </div>
            )}

            {selectedRequest.notes && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Заметки:</Text>
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#fff7e6', borderRadius: 6 }}>
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            {selectedRequest.next_action && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Следующее действие:</Text>
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f0f8ff', borderRadius: 6 }}>
                  {selectedRequest.next_action}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text strong>История действий:</Text>
              <Timeline style={{ marginTop: 8 }}>
                {selectedRequest.actions.map((action, index) => (
                  <Timeline.Item 
                    key={action.id}
                    color={index === 0 ? 'green' : 'blue'}
                  >
                    <div>
                      <Text strong>{action.description}</Text>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                        {action.performed_by.first_name} {action.performed_by.last_name} • 
                        {dayjs(action.performed_at).format('DD.MM.YYYY HH:mm')}
                      </div>
                      {action.details && (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: 4 }}>
                          {action.details}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
              <span>Создан: {dayjs(selectedRequest.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Взят в работу: {dayjs(selectedRequest.taken_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Ответов: {selectedRequest.response_count}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Обновление прогресса */}
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

      {/* Отправка ответа */}
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

      {/* Завершение запроса */}
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

      {/* Постановка на паузу */}
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

      {/* Добавление заметки */}
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

      <style>{`
        .overdue-row {
          background-color: #fff2f0 !important;
        }
        .hold-row {
          background-color: #f5f5f5 !important;
        }
      `}</style>
    </div>
  );
};
