import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Form, 
  Input, 
  Select,
  Modal,
  message,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tabs,
  Tag,
  Avatar,
  Badge,
  Timeline,
  Upload,
  Alert,
  Statistic,
  Progress,
  DatePicker,
  Radio,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  SendOutlined,
  PlusOutlined,
  EyeOutlined,
  RollbackOutlined,
  PaperClipOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  BellOutlined,
  StarOutlined,
  FlagOutlined,
  MessageOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface DirectorMessage {
  id: number;
  subject: string;
  content: string;
  message_type: 'report' | 'request' | 'proposal' | 'urgent' | 'feedback' | 'meeting_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'sent' | 'read' | 'replied' | 'archived';
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    department: string;
    avatar?: string;
  };
  recipient: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar?: string;
  };
  created_at: string;
  sent_at?: string;
  read_at?: string;
  replied_at?: string;
  attachments: {
    id: number;
    filename: string;
    size: number;
    type: string;
    url: string;
  }[];
  replies: DirectorMessage[];
  tags: string[];
  is_confidential: boolean;
  requires_response: boolean;
  response_deadline?: string;
}

interface MeetingRequest {
  id: number;
  title: string;
  description: string;
  requested_by: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    department: string;
  };
  proposed_dates: string[];
  duration_minutes: number;
  meeting_type: 'in_person' | 'video_call' | 'phone_call';
  participants: string[];
  agenda_items: string[];
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'completed';
  approved_date?: string;
  meeting_link?: string;
  created_at: string;
  updated_at: string;
}

interface DirectorCommunicationSectionProps {
  messages?: DirectorMessage[];
  meetingRequests?: MeetingRequest[];
  currentUser?: any;
  loading?: boolean;
  onSendMessage?: (messageData: Partial<DirectorMessage>) => void;
  onReplyToMessage?: (messageId: number, replyData: Partial<DirectorMessage>) => void;
  onMarkAsRead?: (messageId: number) => void;
  onArchiveMessage?: (messageId: number) => void;
  onRequestMeeting?: (meetingData: Partial<MeetingRequest>) => void;
  onApproveMeeting?: (meetingId: number, approvedDate: string) => void;
  onRejectMeeting?: (meetingId: number, reason: string) => void;
  onUploadAttachment?: (file: File) => Promise<any>;
}

export const DirectorCommunicationSection: React.FC<DirectorCommunicationSectionProps> = ({
  messages = [],
  meetingRequests = [],
  currentUser,
  loading = false,
  onSendMessage,
  onReplyToMessage,
  onMarkAsRead,
  onArchiveMessage,
  onRequestMeeting,
  onApproveMeeting,
  onRejectMeeting,
  onUploadAttachment,
}) => {
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [viewMessageModalVisible, setViewMessageModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectorMessage | null>(null);
  const [messageForm] = Form.useForm();
  const [meetingForm] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('messages');
  const [messageFilter, setMessageFilter] = useState('all');

  // Мок данные для демонстрации
  const mockMessages: DirectorMessage[] = [
    {
      id: 1,
      subject: 'Еженедельный отчет о работе платформы',
      content: 'Уважаемый директор,\n\nПредставляю еженедельный отчет о работе платформы ОкоЗнаний:\n\n• Новых пользователей: 127\n• Выполненных заказов: 89\n• Общий оборот: 245,600 ₽\n• Количество споров: 3 (все решены)\n• Средняя оценка качества: 4.7/5\n\nОсновные достижения недели:\n- Запущена новая система автоматических уведомлений\n- Улучшена система поиска экспертов\n- Проведено обучение 15 новых экспертов\n\nПроблемы и предложения:\n- Необходимо увеличить штат службы поддержки\n- Предлагаю рассмотреть внедрение системы лояльности\n\nС уважением,\nАнна Главная',
      message_type: 'report',
      priority: 'medium',
      status: 'sent',
      sender: {
        id: 1,
        username: 'admin_chief',
        first_name: 'Анна',
        last_name: 'Главная',
        role: 'Главный администратор',
        department: 'Администрация',
      },
      recipient: {
        id: 100,
        username: 'director',
        first_name: 'Владимир',
        last_name: 'Директоров',
        role: 'Директор',
      },
      created_at: '2024-02-04T09:00:00Z',
      sent_at: '2024-02-04T09:15:00Z',
      attachments: [
        {
          id: 1,
          filename: 'weekly_report_2024_02_04.pdf',
          size: 1024000,
          type: 'application/pdf',
          url: '/files/reports/weekly_report_2024_02_04.pdf',
        }
      ],
      replies: [],
      tags: ['отчет', 'еженедельный', 'статистика'],
      is_confidential: false,
      requires_response: false,
    },
    {
      id: 2,
      subject: 'СРОЧНО: Проблема с платежной системой',
      content: 'Директор,\n\nОбнаружена критическая проблема с платежной системой. Около 15% транзакций не проходят из-за технического сбоя.\n\nПринятые меры:\n- Переключились на резервный платежный шлюз\n- Уведомили всех пользователей о временных неудобствах\n- Связались с технической поддержкой платежной системы\n\nТребуется ваше решение:\n1. Одобрить дополнительные расходы на экстренное подключение второго провайдера\n2. Рассмотреть компенсации пользователям за неудобства\n\nЖду срочного ответа.\n\nПетр Поддержкин',
      message_type: 'urgent',
      priority: 'urgent',
      status: 'read',
      sender: {
        id: 2,
        username: 'admin_support',
        first_name: 'Петр',
        last_name: 'Поддержкин',
        role: 'Администратор поддержки',
        department: 'Техническая поддержка',
      },
      recipient: {
        id: 100,
        username: 'director',
        first_name: 'Владимир',
        last_name: 'Директоров',
        role: 'Директор',
      },
      created_at: '2024-02-04T11:30:00Z',
      sent_at: '2024-02-04T11:35:00Z',
      read_at: '2024-02-04T11:45:00Z',
      attachments: [],
      replies: [
        {
          id: 21,
          subject: 'Re: СРОЧНО: Проблема с платежной системой',
          content: 'Петр, одобряю подключение второго провайдера. Компенсации обсудим после решения проблемы. Держите меня в курсе.',
          message_type: 'urgent',
          priority: 'urgent',
          status: 'sent',
          sender: {
            id: 100,
            username: 'director',
            first_name: 'Владимир',
            last_name: 'Директоров',
            role: 'Директор',
          },
          recipient: {
            id: 2,
            username: 'admin_support',
            first_name: 'Петр',
            last_name: 'Поддержкин',
            role: 'Администратор поддержки',
            department: 'Техническая поддержка',
          },
          created_at: '2024-02-04T12:00:00Z',
          sent_at: '2024-02-04T12:00:00Z',
          attachments: [],
          replies: [],
          tags: [],
          is_confidential: false,
          requires_response: false,
        }
      ],
      tags: ['срочно', 'платежи', 'техническая проблема'],
      is_confidential: true,
      requires_response: true,
      response_deadline: '2024-02-04T14:00:00Z',
    },
  ];

  const mockMeetingRequests: MeetingRequest[] = [
    {
      id: 1,
      title: 'Планирование развития платформы на Q2 2024',
      description: 'Обсуждение стратегии развития, новых функций и бюджета на второй квартал',
      requested_by: {
        id: 1,
        first_name: 'Анна',
        last_name: 'Главная',
        role: 'Главный администратор',
        department: 'Администрация',
      },
      proposed_dates: [
        '2024-02-10T10:00:00Z',
        '2024-02-10T14:00:00Z',
        '2024-02-11T09:00:00Z',
      ],
      duration_minutes: 90,
      meeting_type: 'in_person',
      participants: ['Главный администратор', 'Финансовый директор', 'Технический директор'],
      agenda_items: [
        'Анализ результатов Q1',
        'Планы развития функционала',
        'Бюджет на маркетинг',
        'Расширение команды',
      ],
      status: 'pending',
      created_at: '2024-02-04T08:00:00Z',
      updated_at: '2024-02-04T08:00:00Z',
    },
  ];

  const messagesData = messages.length > 0 ? messages : mockMessages;
  const meetingRequestsData = meetingRequests.length > 0 ? meetingRequests : mockMeetingRequests;

  // Фильтрация сообщений
  const filteredMessages = messagesData.filter(message => {
    if (messageFilter === 'all') return true;
    if (messageFilter === 'unread') return message.status === 'sent';
    if (messageFilter === 'urgent') return message.priority === 'urgent';
    if (messageFilter === 'requires_response') return message.requires_response;
    return message.status === messageFilter;
  });

  // Статистика
  const stats = {
    total: messagesData.length,
    unread: messagesData.filter(m => m.status === 'sent').length,
    urgent: messagesData.filter(m => m.priority === 'urgent').length,
    requiresResponse: messagesData.filter(m => m.requires_response && !m.replied_at).length,
    pendingMeetings: meetingRequestsData.filter(m => m.status === 'pending').length,
  };

  // Обработчики
  const handleSendMessage = async () => {
    try {
      const values = await messageForm.validateFields();
      onSendMessage?.(values);
      setMessageModalVisible(false);
      messageForm.resetFields();
      message.success('Сообщение отправлено директору');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleReplyToMessage = async () => {
    try {
      const values = await replyForm.validateFields();
      if (selectedMessage) {
        onReplyToMessage?.(selectedMessage.id, values);
        setReplyModalVisible(false);
        replyForm.resetFields();
        setSelectedMessage(null);
        message.success('Ответ отправлен');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRequestMeeting = async () => {
    try {
      const values = await meetingForm.validateFields();
      onRequestMeeting?.(values);
      setMeetingModalVisible(false);
      meetingForm.resetFields();
      message.success('Запрос на встречу отправлен');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleViewMessage = (msg: DirectorMessage) => {
    setSelectedMessage(msg);
    setViewMessageModalVisible(true);
    if (msg.status === 'sent') {
      onMarkAsRead?.(msg.id);
    }
  };

  // Функции для отображения
  const getMessageTypeColor = (type: string) => {
    const colors = {
      report: 'blue',
      request: 'orange',
      proposal: 'green',
      urgent: 'red',
      feedback: 'purple',
      meeting_request: 'cyan',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getMessageTypeText = (type: string) => {
    const texts = {
      report: 'Отчет',
      request: 'Запрос',
      proposal: 'Предложение',
      urgent: 'Срочное',
      feedback: 'Обратная связь',
      meeting_request: 'Запрос встречи',
    };
    return texts[type as keyof typeof texts] || 'Сообщение';
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

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'gray',
      sent: 'blue',
      read: 'orange',
      replied: 'green',
      archived: 'default',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Черновик',
      sent: 'Отправлено',
      read: 'Прочитано',
      replied: 'Отвечено',
      archived: 'Архив',
    };
    return texts[status as keyof typeof texts] || 'Неизвестно';
  };

  // Колонки для таблицы сообщений
  const messageColumns = [
    {
      title: 'Тема',
      key: 'subject',
      render: (record: DirectorMessage) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {record.is_confidential && <FlagOutlined style={{ color: '#ff4d4f' }} />}
            {record.requires_response && <ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            <span style={{ fontWeight: record.status === 'sent' ? 'bold' : 'normal' }}>
              {record.subject}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Tag color={getMessageTypeColor(record.message_type)}>
              {getMessageTypeText(record.message_type)}
            </Tag>
            <Tag color={getPriorityColor(record.priority)}>
              {record.priority.toUpperCase()}
            </Tag>
            {record.attachments.length > 0 && (
              <Tag icon={<PaperClipOutlined />}>
                {record.attachments.length}
              </Tag>
            )}
          </div>
        </div>
      ),
      width: 300,
    },
    {
      title: 'Отправитель',
      key: 'sender',
      render: (record: DirectorMessage) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.sender.first_name} {record.sender.last_name}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.sender.role} • {record.sender.department}
            </Text>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: DirectorMessage) => (
        <div>
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          {record.requires_response && !record.replied_at && (
            <div style={{ fontSize: '11px', color: '#faad14', marginTop: 2 }}>
              <ClockCircleOutlined /> Требует ответа
              {record.response_deadline && (
                <div>до {dayjs(record.response_deadline).format('DD.MM HH:mm')}</div>
              )}
            </div>
          )}
        </div>
      ),
      width: 120,
    },
    {
      title: 'Дата',
      key: 'date',
      render: (record: DirectorMessage) => (
        <div>
          <div>{dayjs(record.sent_at || record.created_at).format('DD.MM.YYYY')}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {dayjs(record.sent_at || record.created_at).format('HH:mm')}
          </Text>
          {record.replies.length > 0 && (
            <div style={{ fontSize: '11px', color: '#52c41a', marginTop: 2 }}>
              <RollbackOutlined /> {record.replies.length} ответов
            </div>
          )}
        </div>
      ),
      width: 100,
      sorter: (a: DirectorMessage, b: DirectorMessage) => 
        dayjs(a.sent_at || a.created_at).unix() - dayjs(b.sent_at || b.created_at).unix(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: DirectorMessage) => (
        <Space>
          <Tooltip title="Просмотреть">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewMessage(record)}
            />
          </Tooltip>
          <Tooltip title="Ответить">
            <Button 
              size="small" 
              icon={<RollbackOutlined />}
              onClick={() => {
                setSelectedMessage(record);
                setReplyModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Архивировать">
            <Button 
              size="small" 
              icon={<DeleteOutlined />}
              onClick={() => onArchiveMessage?.(record.id)}
            />
          </Tooltip>
        </Space>
      ),
      width: 120,
      fixed: 'right' as const,
    },
  ];

  return (
    <div>
      <Alert
        message="Коммуникация с дирекцией"
        description="Канал связи с руководством компании для отчетов, предложений и решения важных вопросов."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Статистические панели */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="Всего сообщений"
              value={stats.total}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Непрочитанные"
              value={stats.unread}
              prefix={<BellOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Срочные"
              value={stats.urgent}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Требуют ответа"
              value={stats.requiresResponse}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Запросы встреч"
              value={stats.pendingMeetings}
              prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setMessageModalVisible(true)}
                style={{ marginBottom: 8 }}
              >
                Написать директору
              </Button>
              <br />
              <Button 
                icon={<CalendarOutlined />}
                onClick={() => setMeetingModalVisible(true)}
              >
                Запросить встречу
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Сообщения" key="messages">
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Переписка с дирекцией</span>
                <Select
                  value={messageFilter}
                  onChange={setMessageFilter}
                  style={{ width: 200 }}
                >
                  <Option value="all">Все сообщения</Option>
                  <Option value="unread">Непрочитанные</Option>
                  <Option value="urgent">Срочные</Option>
                  <Option value="requires_response">Требуют ответа</Option>
                  <Option value="replied">Отвеченные</Option>
                  <Option value="archived">Архив</Option>
                </Select>
              </div>
            }
          >
            <Table
              columns={messageColumns}
              dataSource={filteredMessages}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} сообщений`,
              }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Запросы встреч" key="meetings">
          <Card title="Запросы на встречи с директором">
            <Table
              dataSource={meetingRequestsData}
              rowKey="id"
              loading={loading}
              columns={[
                {
                  title: 'Тема встречи',
                  dataIndex: 'title',
                  key: 'title',
                },
                {
                  title: 'Инициатор',
                  key: 'requested_by',
                  render: (record: MeetingRequest) => (
                    `${record.requested_by.first_name} ${record.requested_by.last_name}`
                  ),
                },
                {
                  title: 'Длительность',
                  dataIndex: 'duration_minutes',
                  key: 'duration_minutes',
                  render: (minutes: number) => `${minutes} мин`,
                },
                {
                  title: 'Тип встречи',
                  dataIndex: 'meeting_type',
                  key: 'meeting_type',
                  render: (type: string) => {
                    const types = {
                      in_person: 'Личная встреча',
                      video_call: 'Видеозвонок',
                      phone_call: 'Телефонный звонок',
                    };
                    return types[type as keyof typeof types] || type;
                  },
                },
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => {
                    const colors = {
                      pending: 'orange',
                      approved: 'green',
                      rejected: 'red',
                      scheduled: 'blue',
                      completed: 'default',
                    };
                    const texts = {
                      pending: 'Ожидает',
                      approved: 'Одобрено',
                      rejected: 'Отклонено',
                      scheduled: 'Запланировано',
                      completed: 'Завершено',
                    };
                    return (
                      <Tag color={colors[status as keyof typeof colors]}>
                        {texts[status as keyof typeof texts] || status}
                      </Tag>
                    );
                  },
                },
                {
                  title: 'Дата создания',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
                },
              ]}
              pagination={{
                pageSize: 10,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} запросов`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Модальное окно создания сообщения */}
      <Modal
        title="Написать сообщение директору"
        open={messageModalVisible}
        onOk={handleSendMessage}
        onCancel={() => {
          setMessageModalVisible(false);
          messageForm.resetFields();
        }}
        okText="Отправить"
        cancelText="Отмена"
        width={800}
      >
        <Form form={messageForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="message_type"
                label="Тип сообщения"
                rules={[{ required: true, message: 'Выберите тип сообщения' }]}
              >
                <Select placeholder="Выберите тип">
                  <Option value="report">Отчет</Option>
                  <Option value="request">Запрос</Option>
                  <Option value="proposal">Предложение</Option>
                  <Option value="urgent">Срочное сообщение</Option>
                  <Option value="feedback">Обратная связь</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Приоритет"
                rules={[{ required: true, message: 'Выберите приоритет' }]}
              >
                <Select placeholder="Выберите приоритет">
                  <Option value="low">Низкий</Option>
                  <Option value="medium">Средний</Option>
                  <Option value="high">Высокий</Option>
                  <Option value="urgent">Срочный</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subject"
            label="Тема сообщения"
            rules={[{ required: true, message: 'Введите тему сообщения' }]}
          >
            <Input placeholder="Краткая тема сообщения" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Содержание"
            rules={[{ required: true, message: 'Введите содержание сообщения' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="Подробное содержание сообщения..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_confidential"
                label="Конфиденциальность"
                valuePropName="checked"
              >
                <Radio.Group>
                  <Radio value={false}>Обычное</Radio>
                  <Radio value={true}>Конфиденциальное</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="requires_response"
                label="Требует ответа"
                valuePropName="checked"
              >
                <Radio.Group>
                  <Radio value={false}>Информационное</Radio>
                  <Radio value={true}>Требует ответа</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="response_deadline"
            label="Срок ответа (если требуется)"
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }}
              placeholder="Выберите срок ответа"
            />
          </Form.Item>

          <Form.Item label="Вложения">
            <Upload
              beforeUpload={(file) => {
                onUploadAttachment?.(file);
                return false;
              }}
              multiple
            >
              <Button icon={<UploadOutlined />}>Прикрепить файлы</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно запроса встречи */}
      <Modal
        title="Запросить встречу с директором"
        open={meetingModalVisible}
        onOk={handleRequestMeeting}
        onCancel={() => {
          setMeetingModalVisible(false);
          meetingForm.resetFields();
        }}
        okText="Отправить запрос"
        cancelText="Отмена"
        width={700}
      >
        <Form form={meetingForm} layout="vertical">
          <Form.Item
            name="title"
            label="Тема встречи"
            rules={[{ required: true, message: 'Введите тему встречи' }]}
          >
            <Input placeholder="Краткая тема встречи" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание и цель встречи"
            rules={[{ required: true, message: 'Опишите цель встречи' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Подробное описание вопросов для обсуждения..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration_minutes"
                label="Длительность (минуты)"
                rules={[{ required: true, message: 'Укажите длительность' }]}
              >
                <Select placeholder="Выберите длительность">
                  <Option value={30}>30 минут</Option>
                  <Option value={60}>1 час</Option>
                  <Option value={90}>1.5 часа</Option>
                  <Option value={120}>2 часа</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="meeting_type"
                label="Тип встречи"
                rules={[{ required: true, message: 'Выберите тип встречи' }]}
              >
                <Select placeholder="Выберите тип">
                  <Option value="in_person">Личная встреча</Option>
                  <Option value="video_call">Видеозвонок</Option>
                  <Option value="phone_call">Телефонный звонок</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="proposed_dates"
            label="Предлагаемые даты и время"
            rules={[{ required: true, message: 'Предложите варианты времени' }]}
          >
            <DatePicker.RangePicker 
              showTime 
              style={{ width: '100%' }}
              placeholder={['Начало периода', 'Конец периода']}
            />
          </Form.Item>

          <Form.Item
            name="agenda_items"
            label="Повестка дня"
          >
            <TextArea 
              rows={3} 
              placeholder="Основные пункты для обсуждения (по одному на строку)"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно просмотра сообщения */}
      <Modal
        title="Просмотр сообщения"
        open={viewMessageModalVisible}
        onCancel={() => {
          setViewMessageModalVisible(false);
          setSelectedMessage(null);
        }}
        footer={[
          <Button key="reply" type="primary" icon={<RollbackOutlined />} onClick={() => {
            setViewMessageModalVisible(false);
            setReplyModalVisible(true);
          }}>
            Ответить
          </Button>,
          <Button key="close" onClick={() => {
            setViewMessageModalVisible(false);
            setSelectedMessage(null);
          }}>
            Закрыть
          </Button>
        ]}
        width={800}
      >
        {selectedMessage && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={4}>{selectedMessage.subject}</Title>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Tag color={getMessageTypeColor(selectedMessage.message_type)}>
                  {getMessageTypeText(selectedMessage.message_type)}
                </Tag>
                <Tag color={getPriorityColor(selectedMessage.priority)}>
                  {selectedMessage.priority.toUpperCase()}
                </Tag>
                {selectedMessage.is_confidential && (
                  <Tag color="red" icon={<FlagOutlined />}>Конфиденциально</Tag>
                )}
                {selectedMessage.requires_response && (
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>Требует ответа</Tag>
                )}
              </div>
              <Text type="secondary">
                От: {selectedMessage.sender.first_name} {selectedMessage.sender.last_name} ({selectedMessage.sender.role})
                <br />
                Дата: {dayjs(selectedMessage.sent_at || selectedMessage.created_at).format('DD.MM.YYYY HH:mm')}
              </Text>
            </div>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {selectedMessage.content}
              </Paragraph>
            </div>

            {selectedMessage.attachments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>Вложения:</Title>
                {selectedMessage.attachments.map(attachment => (
                  <div key={attachment.id} style={{ marginBottom: 8 }}>
                    <Button 
                      icon={<DownloadOutlined />}
                      href={attachment.url}
                      target="_blank"
                    >
                      {attachment.filename} ({Math.round(attachment.size / 1024)} KB)
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedMessage.replies.length > 0 && (
              <div>
                <Divider />
                <Title level={5}>Ответы:</Title>
                <Timeline>
                  {selectedMessage.replies.map(reply => (
                    <Timeline.Item key={reply.id}>
                      <div>
                        <Text strong>
                          {reply.sender.first_name} {reply.sender.last_name}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {dayjs(reply.sent_at).format('DD.MM.YYYY HH:mm')}
                        </Text>
                        <div style={{ marginTop: 8 }}>
                          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                            {reply.content}
                          </Paragraph>
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно ответа */}
      <Modal
        title="Ответить на сообщение"
        open={replyModalVisible}
        onOk={handleReplyToMessage}
        onCancel={() => {
          setReplyModalVisible(false);
          setSelectedMessage(null);
          replyForm.resetFields();
        }}
        okText="Отправить ответ"
        cancelText="Отмена"
        width={700}
      >
        {selectedMessage && (
          <div>
            <Alert
              message={`Ответ на: ${selectedMessage.subject}`}
              description={`От: ${selectedMessage.sender.first_name} ${selectedMessage.sender.last_name}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Form form={replyForm} layout="vertical">
              <Form.Item
                name="content"
                label="Ваш ответ"
                rules={[{ required: true, message: 'Введите ответ' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="Введите ваш ответ..."
                />
              </Form.Item>

              <Form.Item label="Вложения">
                <Upload
                  beforeUpload={(file) => {
                    onUploadAttachment?.(file);
                    return false;
                  }}
                  multiple
                >
                  <Button icon={<UploadOutlined />}>Прикрепить файлы</Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};