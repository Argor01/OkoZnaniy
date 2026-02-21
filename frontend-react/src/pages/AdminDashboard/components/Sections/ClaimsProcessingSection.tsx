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
  Tabs,
  Timeline,
  Steps,
  Alert,
  Statistic,
  Row,
  Col,
  Progress,
  Popconfirm,
  Upload,
  List
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
  FileTextOutlined,
  TeamOutlined,
  WarningOutlined,
  PlusOutlined,
  EditOutlined,
  HistoryOutlined,
  PhoneOutlined,
  MailOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Step } = Steps;

interface ClaimAction {
  id: number;
  action_type: 'investigation' | 'contact_user' | 'contact_expert' | 'evidence_review' | 'decision' | 'follow_up';
  description: string;
  performed_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  performed_at: string;
  attachments?: string[];
  notes?: string;
}

interface ClaimEvidence {
  id: number;
  type: 'screenshot' | 'document' | 'communication' | 'work_file' | 'payment_proof' | 'other';
  title: string;
  file_url: string;
  uploaded_by: 'user' | 'expert' | 'admin';
  uploaded_at: string;
  verified: boolean;
}

interface Claim {
  id: number;
  claim_number: string;
  title: string;
  description: string;
  claim_type: 'quality_issue' | 'payment_dispute' | 'deadline_violation' | 'communication_problem' | 'refund_request' | 'plagiarism' | 'other';
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  order?: {
    id: number;
    title: string;
    amount: number;
    created_at: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'investigating' | 'awaiting_response' | 'in_mediation' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  assigned_admin: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  deadline: string;
  resolution?: {
    decision: 'favor_user' | 'favor_expert' | 'partial_refund' | 'no_action' | 'escalated';
    amount?: number;
    description: string;
    resolved_at: string;
  };
  actions: ClaimAction[];
  evidence: ClaimEvidence[];
  messages_count: number;
  days_open: number;
}

interface ClaimsProcessingSectionProps {
  claims?: Claim[];
  loading?: boolean;
  onViewClaim?: (claimId: number) => void;
  onAssignClaim?: (claimId: number, adminId: number) => void;
  onUpdateStatus?: (claimId: number, status: string, notes: string) => void;
  onAddAction?: (claimId: number, action: Partial<ClaimAction>) => void;
  onResolveClaim?: (claimId: number, resolution: any) => void;
  onSendMessage?: (claimId: number, message: string, recipient: 'user' | 'expert') => void;
  onUploadEvidence?: (claimId: number, file: File, type: string) => void;
  onScheduleCall?: (claimId: number, datetime: string, participants: string[]) => void;
}

export const ClaimsProcessingSection: React.FC<ClaimsProcessingSectionProps> = ({
  claims = [],
  loading = false,
  onViewClaim,
  onAssignClaim,
  onUpdateStatus,
  onAddAction,
  onResolveClaim,
  onSendMessage,
  onUploadEvidence,
  onScheduleCall,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [actionForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [messageForm] = Form.useForm();
  const [callForm] = Form.useForm();

  const claimsData = claims;

  
  const filteredClaims = claimsData.filter(claim => {
    const matchesSearch = claim.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         claim.claim_number.toLowerCase().includes(searchText.toLowerCase()) ||
                         `${claim.user.first_name} ${claim.user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesType = selectedType === 'all' || claim.claim_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || claim.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || claim.priority === selectedPriority;
    const matchesAdmin = selectedAdmin === 'all' || claim.assigned_admin.username === selectedAdmin;
    
    let matchesDate = true;
    if (dateRange) {
      const claimDate = dayjs(claim.created_at);
      matchesDate = claimDate.isAfter(dateRange[0]) && claimDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesAdmin && matchesDate;
  });

  
  const stats = {
    total: filteredClaims.length,
    new: filteredClaims.filter(c => c.status === 'new').length,
    investigating: filteredClaims.filter(c => c.status === 'investigating').length,
    overdue: filteredClaims.filter(c => dayjs().isAfter(dayjs(c.deadline))).length,
    avgDaysOpen: filteredClaims.reduce((sum, c) => sum + c.days_open, 0) / filteredClaims.length || 0,
  };

  
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setActiveTab('overview');
    setViewModalVisible(true);
    onViewClaim?.(claim.id);
  };

  const handleAddAction = (claim: Claim) => {
    setSelectedClaim(claim);
    actionForm.resetFields();
    setActionModalVisible(true);
  };

  const handleActionSubmit = async () => {
    try {
      const values = await actionForm.validateFields();
      if (selectedClaim) {
        onAddAction?.(selectedClaim.id, values);
        message.success('Действие добавлено');
        setActionModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleResolveClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    resolveForm.resetFields();
    setResolveModalVisible(true);
  };

  const handleResolveSubmit = async () => {
    try {
      const values = await resolveForm.validateFields();
      if (selectedClaim) {
        onResolveClaim?.(selectedClaim.id, values);
        message.success(`Претензия "${selectedClaim.title}" разрешена`);
        setResolveModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSendMessage = (claim: Claim, recipient: 'user' | 'expert') => {
    setSelectedClaim(claim);
    messageForm.resetFields();
    messageForm.setFieldsValue({ recipient });
    setMessageModalVisible(true);
  };

  const handleMessageSubmit = async () => {
    try {
      const values = await messageForm.validateFields();
      if (selectedClaim) {
        onSendMessage?.(selectedClaim.id, values.message, values.recipient);
        message.success('Сообщение отправлено');
        setMessageModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleScheduleCall = (claim: Claim) => {
    setSelectedClaim(claim);
    callForm.resetFields();
    setCallModalVisible(true);
  };

  const handleCallSubmit = async () => {
    try {
      const values = await callForm.validateFields();
      if (selectedClaim) {
        onScheduleCall?.(selectedClaim.id, values.datetime, values.participants);
        message.success('Звонок запланирован');
        setCallModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  
  const getTypeColor = (type: string) => {
    const colors = {
      quality_issue: 'red',
      payment_dispute: 'green',
      deadline_violation: 'orange',
      communication_problem: 'blue',
      refund_request: 'purple',
      plagiarism: 'magenta',
      other: 'gray',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getTypeText = (type: string) => {
    const texts = {
      quality_issue: 'Качество работы',
      payment_dispute: 'Спор по оплате',
      deadline_violation: 'Нарушение сроков',
      communication_problem: 'Проблемы общения',
      refund_request: 'Запрос возврата',
      plagiarism: 'Плагиат',
      other: 'Другое',
    };
    return texts[type as keyof typeof texts] || 'Другое';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'blue',
      investigating: 'orange',
      awaiting_response: 'yellow',
      in_mediation: 'purple',
      resolved: 'green',
      closed: 'gray',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      new: 'Новая',
      investigating: 'Расследование',
      awaiting_response: 'Ожидает ответа',
      in_mediation: 'Медиация',
      resolved: 'Разрешена',
      closed: 'Закрыта',
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

  const columns = [
    {
      title: 'Претензия',
      key: 'claim',
      render: (record: Claim) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.claim_number}
          </div>
          <div style={{ fontSize: '13px', marginBottom: 4 }}>
            {record.title}
          </div>
          <div style={{ marginTop: 8 }}>
            <Tag color={getTypeColor(record.claim_type)}>
              {getTypeText(record.claim_type)}
            </Tag>
            <Tag color={getPriorityColor(record.priority)}>
              {getPriorityText(record.priority)}
            </Tag>
            {dayjs().isAfter(dayjs(record.deadline)) && (
              <Tag color="red" icon={<WarningOutlined />}>
                Просрочена
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Участники',
      key: 'participants',
      width: 200,
      render: (record: Claim) => (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: '11px' }}>Клиент:</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar size={32} icon={<UserOutlined />} />
              <span style={{ fontSize: '12px' }}>
                {record.user.first_name} {record.user.last_name}
              </span>
            </div>
          </div>
          {record.expert && (
            <div>
              <Text strong style={{ fontSize: '11px' }}>Эксперт:</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Avatar size={32} icon={<UserOutlined />} />
                <span style={{ fontSize: '12px' }}>
                  {record.expert.first_name} {record.expert.last_name}
                </span>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (record: Claim) => (
        <div style={{ textAlign: 'center' }}>
          <Tag color={getStatusColor(record.status)}>
            {getStatusText(record.status)}
          </Tag>
          <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
            {record.days_open} дн.
          </div>
        </div>
      ),
    },
    {
      title: 'Администратор',
      key: 'admin',
      width: 120,
      render: (record: Claim) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '12px' }}>
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </div>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            @{record.assigned_admin.username}
          </Text>
        </div>
      ),
    },
    {
      title: 'Дедлайн',
      key: 'deadline',
      width: 100,
      render: (record: Claim) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '12px',
            color: dayjs().isAfter(dayjs(record.deadline)) ? '#ff4d4f' : '#666'
          }}>
            {dayjs(record.deadline).format('DD.MM')}
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {dayjs(record.deadline).format('HH:mm')}
          </div>
        </div>
      ),
    },
    {
      title: 'Сообщения',
      dataIndex: 'messages_count',
      key: 'messages_count',
      width: 80,
      render: (count: number) => (
        <div style={{ textAlign: 'center' }}>
          <Badge count={count} showZero>
            <MessageOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
          </Badge>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (record: Claim) => (
        <Space size="small">
          <Tooltip title="Просмотреть">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewClaim(record)}
            />
          </Tooltip>
          <Tooltip title="Добавить действие">
            <Button 
              size="small" 
              icon={<PlusOutlined />}
              onClick={() => handleAddAction(record)}
            />
          </Tooltip>
          <Tooltip title="Написать клиенту">
            <Button 
              size="small" 
              icon={<MailOutlined />}
              onClick={() => handleSendMessage(record, 'user')}
            />
          </Tooltip>
          {record.expert && (
            <Tooltip title="Написать эксперту">
              <Button 
                size="small" 
                icon={<MessageOutlined />}
                onClick={() => handleSendMessage(record, 'expert')}
              />
            </Tooltip>
          )}
          <Tooltip title="Запланировать звонок">
            <Button 
              size="small" 
              icon={<PhoneOutlined />}
              onClick={() => handleScheduleCall(record)}
            />
          </Tooltip>
          {record.status !== 'resolved' && record.status !== 'closed' && (
            <Tooltip title="Разрешить">
              <Button 
                size="small" 
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleResolveClaim(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Обработка претензий</Title>
          <Text type="secondary">
            Комплексная система обработки претензий и споров между пользователями
          </Text>
        </div>

        
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="Всего претензий" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic title="Новые" value={stats.new} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title="В расследовании" value={stats.investigating} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Просроченные" 
              value={stats.overdue} 
              valueStyle={{ color: stats.overdue > 0 ? '#ff4d4f' : '#52c41a' }} 
            />
          </Col>
        </Row>

        {stats.overdue > 0 && (
          <Alert
            message="Внимание!"
            description={`${stats.overdue} претензий просрочены и требуют немедленного внимания`}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по претензиям"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Тип претензии"
            style={{ width: 150 }}
            value={selectedType}
            onChange={setSelectedType}
          >
            <Option value="all">Все типы</Option>
            <Option value="quality_issue">Качество работы</Option>
            <Option value="payment_dispute">Спор по оплате</Option>
            <Option value="deadline_violation">Нарушение сроков</Option>
            <Option value="communication_problem">Проблемы общения</Option>
            <Option value="refund_request">Запрос возврата</Option>
            <Option value="plagiarism">Плагиат</Option>
            <Option value="other">Другое</Option>
          </Select>

          <Select
            placeholder="Статус"
            style={{ width: 150 }}
            value={selectedStatus}
            onChange={setSelectedStatus}
          >
            <Option value="all">Все статусы</Option>
            <Option value="new">Новая</Option>
            <Option value="investigating">Расследование</Option>
            <Option value="awaiting_response">Ожидает ответа</Option>
            <Option value="in_mediation">Медиация</Option>
            <Option value="resolved">Разрешена</Option>
            <Option value="closed">Закрыта</Option>
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

          <Select
            placeholder="Администратор"
            style={{ width: 150 }}
            value={selectedAdmin}
            onChange={setSelectedAdmin}
          >
            <Option value="all">Все</Option>
            <Option value="admin_claims">Мария Разбирательная</Option>
            <Option value="admin_mediator">Сергей Посредник</Option>
            <Option value="admin_plagiarism">Анна Антиплагиат</Option>
          </Select>

          <RangePicker
            placeholder={['От', 'До']}
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 250 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredClaims}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} претензий`
          }}
          locale={{ emptyText: 'Претензии не найдены' }}
          size="small"
          rowClassName={(record) => 
            dayjs().isAfter(dayjs(record.deadline)) ? 'overdue-row' : ''
          }
        />
      </Card>

      
      <Modal
        title={`Претензия ${selectedClaim?.claim_number}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="action" 
            icon={<PlusOutlined />}
            onClick={() => {
              if (selectedClaim) {
                setViewModalVisible(false);
                handleAddAction(selectedClaim);
              }
            }}
          >
            Добавить действие
          </Button>,
          <Button 
            key="resolve" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              if (selectedClaim) {
                setViewModalVisible(false);
                handleResolveClaim(selectedClaim);
              }
            }}
            disabled={selectedClaim?.status === 'resolved' || selectedClaim?.status === 'closed'}
          >
            Разрешить
          </Button>,
        ]}
        width={1000}
      >
        {selectedClaim && (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="Обзор" key="overview">
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>{selectedClaim.title}</Title>
                <Space>
                  <Tag color={getTypeColor(selectedClaim.claim_type)}>
                    {getTypeText(selectedClaim.claim_type)}
                  </Tag>
                  <Tag color={getStatusColor(selectedClaim.status)}>
                    {getStatusText(selectedClaim.status)}
                  </Tag>
                  <Tag color={getPriorityColor(selectedClaim.priority)}>
                    {getPriorityText(selectedClaim.priority)}
                  </Tag>
                </Space>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text strong>Описание:</Text>
                <Paragraph style={{ marginTop: 8 }}>
                  {selectedClaim.description}
                </Paragraph>
              </div>

              <Row gutter={24}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Клиент:</Text>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar size={32} icon={<UserOutlined />} />
                      <div>
                        <div>{selectedClaim.user.first_name} {selectedClaim.user.last_name}</div>
                        <Text type="secondary">@{selectedClaim.user.username}</Text>
                        <br />
                        <Text type="secondary">{selectedClaim.user.email}</Text>
                        {selectedClaim.user.phone && (
                          <>
                            <br />
                            <Text type="secondary">{selectedClaim.user.phone}</Text>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Col>

                <Col span={12}>
                  {selectedClaim.expert && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>Эксперт:</Text>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar size={32} icon={<UserOutlined />} />
                        <div>
                          <div>{selectedClaim.expert.first_name} {selectedClaim.expert.last_name}</div>
                          <Text type="secondary">@{selectedClaim.expert.username}</Text>
                          <br />
                          <Text type="secondary">{selectedClaim.expert.email}</Text>
                          {selectedClaim.expert.phone && (
                            <>
                              <br />
                              <Text type="secondary">{selectedClaim.expert.phone}</Text>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Col>
              </Row>

              {selectedClaim.order && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Связанный заказ:</Text>
                  <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
                    <div>ID: {selectedClaim.order.id}</div>
                    <div>Название: {selectedClaim.order.title}</div>
                    <div>Сумма: {selectedClaim.order.amount.toLocaleString()} ₽</div>
                    <div>Создан: {dayjs(selectedClaim.order.created_at).format('DD.MM.YYYY HH:mm')}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                <span>Создана: {dayjs(selectedClaim.created_at).format('DD.MM.YYYY HH:mm')}</span>
                <span>Дедлайн: {dayjs(selectedClaim.deadline).format('DD.MM.YYYY HH:mm')}</span>
                <span>Дней открыта: {selectedClaim.days_open}</span>
              </div>
            </TabPane>

            <TabPane tab="Действия" key="actions">
              <Timeline>
                {selectedClaim.actions.map((action, index) => (
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
                      {action.notes && (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: 4 }}>
                          Примечание: {action.notes}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </TabPane>

            <TabPane tab="Доказательства" key="evidence">
              <List
                dataSource={selectedClaim.evidence}
                renderItem={(evidence) => (
                  <List.Item
                    actions={[
                      <Button size="small" icon={<DownloadOutlined />}>
                        Скачать
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={evidence.title}
                      description={
                        <div>
                          <Tag color="blue">{evidence.type}</Tag>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            Загружено {evidence.uploaded_by === 'admin' ? 'администратором' : 
                                     evidence.uploaded_by === 'user' ? 'клиентом' : 'экспертом'} • 
                            {dayjs(evidence.uploaded_at).format('DD.MM.YYYY HH:mm')}
                          </span>
                          {evidence.verified && (
                            <Tag color="green" style={{ marginLeft: 8 }}>
                              Проверено
                            </Tag>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>

      
      
      <Modal
        title="Добавить действие"
        open={actionModalVisible}
        onOk={handleActionSubmit}
        onCancel={() => setActionModalVisible(false)}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={actionForm} layout="vertical">
          <Form.Item
            name="action_type"
            label="Тип действия"
            rules={[{ required: true, message: 'Выберите тип действия' }]}
          >
            <Select placeholder="Выберите тип действия">
              <Option value="investigation">Расследование</Option>
              <Option value="contact_user">Связь с клиентом</Option>
              <Option value="contact_expert">Связь с экспертом</Option>
              <Option value="evidence_review">Анализ доказательств</Option>
              <Option value="decision">Принятие решения</Option>
              <Option value="follow_up">Последующие действия</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание действия"
            rules={[{ required: true, message: 'Опишите выполненное действие' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Подробно опишите выполненное действие..."
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Дополнительные заметки"
          >
            <TextArea 
              rows={2} 
              placeholder="Дополнительные заметки или комментарии..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Разрешить претензию"
        open={resolveModalVisible}
        onOk={handleResolveSubmit}
        onCancel={() => setResolveModalVisible(false)}
        okText="Разрешить"
        cancelText="Отмена"
      >
        <Form form={resolveForm} layout="vertical">
          <Form.Item
            name="decision"
            label="Решение"
            rules={[{ required: true, message: 'Выберите решение' }]}
          >
            <Select placeholder="Выберите решение">
              <Option value="favor_user">В пользу клиента</Option>
              <Option value="favor_expert">В пользу эксперта</Option>
              <Option value="partial_refund">Частичный возврат</Option>
              <Option value="no_action">Без действий</Option>
              <Option value="escalated">Эскалировано</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Сумма возврата (если применимо)"
          >
            <Input type="number" placeholder="Введите сумму в рублях" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Обоснование решения"
            rules={[{ required: true, message: 'Опишите обоснование решения' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Подробно опишите обоснование принятого решения..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Отправить сообщение"
        open={messageModalVisible}
        onOk={handleMessageSubmit}
        onCancel={() => setMessageModalVisible(false)}
        okText="Отправить"
        cancelText="Отмена"
      >
        <Form form={messageForm} layout="vertical">
          <Form.Item
            name="recipient"
            label="Получатель"
            rules={[{ required: true, message: 'Выберите получателя' }]}
          >
            <Select placeholder="Выберите получателя">
              <Option value="user">Клиент</Option>
              <Option value="expert">Эксперт</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="message"
            label="Сообщение"
            rules={[{ required: true, message: 'Введите сообщение' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Введите ваше сообщение..."
            />
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
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="participants"
            label="Участники"
            rules={[{ required: true, message: 'Выберите участников' }]}
          >
            <Select 
              mode="multiple" 
              placeholder="Выберите участников звонка"
            >
              <Option value="user">Клиент</Option>
              <Option value="expert">Эксперт</Option>
              <Option value="admin">Администратор</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .overdue-row {
          background-color: #fff2f0 !important;
        }
      `}</style>
    </div>
  );
};
