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
  Alert,
  Timeline,
  Popconfirm,
  Steps
} from 'antd';
import { 
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Step } = Steps;

interface ApprovalRequest {
  id: number;
  type: 'escalation' | 'refund' | 'dispute_resolution' | 'account_action' | 'policy_exception';
  requested_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  requested_at: string;
  reason: string;
  proposed_action: string;
  estimated_impact: 'low' | 'medium' | 'high' | 'critical';
  requires_director_approval: boolean;
}

interface Claim {
  id: number;
  title: string;
  description: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  category: 'technical' | 'billing' | 'order' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending_approval';
  created_at: string;
  updated_at: string;
  taken_at: string;
  attachments?: string[];
  messages_count: number;
  assigned_admin: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  approval_request: ApprovalRequest;
  waiting_time_hours: number;
  escalation_level: number;
}

interface PendingApprovalSectionProps {
  claims?: Claim[];
  loading?: boolean;
  onViewClaim?: (claimId: number) => void;
  onApproveClaim?: (claimId: number, decision: string) => void;
  onRejectApproval?: (claimId: number, reason: string) => void;
  onEscalateToDirector?: (claimId: number) => void;
  onRequestMoreInfo?: (claimId: number, questions: string) => void;
}

export const PendingApprovalSection: React.FC<PendingApprovalSectionProps> = ({
  claims = [],
  loading = false,
  onViewClaim,
  onApproveClaim,
  onRejectApproval,
  onEscalateToDirector,
  onRequestMoreInfo,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedEscalation, setSelectedEscalation] = useState<string>('all');
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [moreInfoModalVisible, setMoreInfoModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [moreInfoForm] = Form.useForm();

  // Мок данные для демонстрации
  const mockClaims: Claim[] = [
    {
      id: 15,
      title: 'Запрос на возврат крупной суммы',
      description: 'Клиент запрашивает возврат 25000 рублей за несколько заказов. Требуется одобрение руководства.',
      user: {
        id: 115,
        username: 'big_client',
        first_name: 'Александр',
        last_name: 'Богатов',
        email: 'alexander.bogatov@email.com',
      },
      category: 'billing',
      priority: 'high',
      status: 'pending_approval',
      created_at: '2024-02-03T10:30:00Z',
      updated_at: '2024-02-04T09:15:00Z',
      taken_at: '2024-02-03T11:00:00Z',
      messages_count: 8,
      assigned_admin: {
        id: 2,
        username: 'admin_billing',
        first_name: 'Елена',
        last_name: 'Финансова',
      },
      approval_request: {
        id: 1,
        type: 'refund',
        requested_by: {
          id: 2,
          username: 'admin_billing',
          first_name: 'Елена',
          last_name: 'Финансова',
        },
        requested_at: '2024-02-04T09:15:00Z',
        reason: 'Клиент предоставил веские доказательства некачественного выполнения работ. Сумма превышает лимит администратора.',
        proposed_action: 'Полный возврат 25000 рублей на карту клиента в течение 5 рабочих дней',
        estimated_impact: 'high',
        requires_director_approval: true,
      },
      waiting_time_hours: 22,
      escalation_level: 1,
      attachments: ['receipts.pdf', 'work_quality_report.docx'],
    },
    {
      id: 16,
      title: 'Блокировка аккаунта эксперта',
      description: 'Эксперт нарушил правила платформы. Требуется решение о постоянной блокировке.',
      user: {
        id: 116,
        username: 'problem_expert',
        first_name: 'Сергей',
        last_name: 'Нарушитель',
        email: 'sergey.narushitel@email.com',
      },
      category: 'account',
      priority: 'urgent',
      status: 'pending_approval',
      created_at: '2024-02-02T14:20:00Z',
      updated_at: '2024-02-04T08:30:00Z',
      taken_at: '2024-02-02T15:00:00Z',
      messages_count: 12,
      assigned_admin: {
        id: 4,
        username: 'admin_security',
        first_name: 'Анна',
        last_name: 'Безопасная',
      },
      approval_request: {
        id: 2,
        type: 'account_action',
        requested_by: {
          id: 4,
          username: 'admin_security',
          first_name: 'Анна',
          last_name: 'Безопасная',
        },
        requested_at: '2024-02-04T08:30:00Z',
        reason: 'Множественные нарушения: плагиат, несоблюдение сроков, грубость с клиентами. Повторные нарушения после предупреждений.',
        proposed_action: 'Постоянная блокировка аккаунта с запретом регистрации новых аккаунтов',
        estimated_impact: 'medium',
        requires_director_approval: false,
      },
      waiting_time_hours: 40,
      escalation_level: 2,
      attachments: ['violation_history.pdf', 'client_complaints.docx'],
    },
    {
      id: 17,
      title: 'Исключение из политики возврата',
      description: 'Клиент просит возврат после истечения стандартного срока возврата.',
      user: {
        id: 117,
        username: 'late_client',
        first_name: 'Мария',
        last_name: 'Опоздавшая',
        email: 'maria.opozdavshaya@email.com',
      },
      category: 'billing',
      priority: 'medium',
      status: 'pending_approval',
      created_at: '2024-02-01T16:45:00Z',
      updated_at: '2024-02-04T07:20:00Z',
      taken_at: '2024-02-01T17:30:00Z',
      messages_count: 6,
      assigned_admin: {
        id: 2,
        username: 'admin_billing',
        first_name: 'Елена',
        last_name: 'Финансова',
      },
      approval_request: {
        id: 3,
        type: 'policy_exception',
        requested_by: {
          id: 2,
          username: 'admin_billing',
          first_name: 'Елена',
          last_name: 'Финансова',
        },
        requested_at: '2024-02-04T07:20:00Z',
        reason: 'Клиент находился в больнице и не мог подать заявку вовремя. Предоставлена справка.',
        proposed_action: 'Исключение из политики, возврат 3500 рублей',
        estimated_impact: 'low',
        requires_director_approval: false,
      },
      waiting_time_hours: 62,
      escalation_level: 1,
      attachments: ['medical_certificate.pdf'],
    },
    {
      id: 18,
      title: 'Эскалация сложного спора',
      description: 'Спор между клиентом и экспертом не может быть решен на уровне администратора.',
      user: {
        id: 118,
        username: 'complex_case',
        first_name: 'Дмитрий',
        last_name: 'Сложный',
        email: 'dmitry.slozhny@email.com',
      },
      category: 'order',
      priority: 'high',
      status: 'pending_approval',
      created_at: '2024-01-30T09:15:00Z',
      updated_at: '2024-02-04T06:45:00Z',
      taken_at: '2024-01-30T10:00:00Z',
      messages_count: 25,
      assigned_admin: {
        id: 3,
        username: 'admin_disputes',
        first_name: 'Сергей',
        last_name: 'Арбитров',
      },
      approval_request: {
        id: 4,
        type: 'escalation',
        requested_by: {
          id: 3,
          username: 'admin_disputes',
          first_name: 'Сергей',
          last_name: 'Арбитров',
        },
        requested_at: '2024-02-04T06:45:00Z',
        reason: 'Обе стороны предоставили противоречивые доказательства. Требуется экспертная оценка и решение руководства.',
        proposed_action: 'Привлечение внешнего эксперта для оценки работы, решение принимает директор',
        estimated_impact: 'critical',
        requires_director_approval: true,
      },
      waiting_time_hours: 116,
      escalation_level: 3,
      attachments: ['dispute_materials.zip', 'expert_analysis.pdf'],
    },
  ];

  const claimsData = claims.length > 0 ? claims : mockClaims;

  // Фильтрация данных
  const filteredClaims = claimsData.filter(claim => {
    const matchesSearch = claim.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         claim.description.toLowerCase().includes(searchText.toLowerCase()) ||
                         `${claim.user.first_name} ${claim.user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || claim.category === selectedCategory;
    const matchesType = selectedType === 'all' || claim.approval_request.type === selectedType;
    const matchesImpact = selectedImpact === 'all' || claim.approval_request.estimated_impact === selectedImpact;
    
    let matchesEscalation = true;
    if (selectedEscalation !== 'all') {
      if (selectedEscalation === 'low' && claim.escalation_level > 1) matchesEscalation = false;
      if (selectedEscalation === 'medium' && (claim.escalation_level < 2 || claim.escalation_level > 2)) matchesEscalation = false;
      if (selectedEscalation === 'high' && claim.escalation_level < 3) matchesEscalation = false;
    }
    
    return matchesSearch && matchesCategory && matchesType && matchesImpact && matchesEscalation;
  });

  // Обработчики
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setViewModalVisible(true);
    onViewClaim?.(claim.id);
  };

  const handleApproveClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    approveForm.resetFields();
    setApproveModalVisible(true);
  };

  const handleApproveSubmit = async () => {
    try {
      const values = await approveForm.validateFields();
      if (selectedClaim) {
        onApproveClaim?.(selectedClaim.id, values.decision);
        message.success(`Обращение "${selectedClaim.title}" одобрено`);
        setApproveModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRejectApproval = (claim: Claim) => {
    setSelectedClaim(claim);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (selectedClaim) {
        onRejectApproval?.(selectedClaim.id, values.reason);
        message.success(`Запрос на одобрение отклонен`);
        setRejectModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEscalateToDirector = (claim: Claim) => {
    onEscalateToDirector?.(claim.id);
    message.success(`Обращение "${claim.title}" передано директору`);
  };

  const handleRequestMoreInfo = (claim: Claim) => {
    setSelectedClaim(claim);
    moreInfoForm.resetFields();
    setMoreInfoModalVisible(true);
  };

  const handleMoreInfoSubmit = async () => {
    try {
      const values = await moreInfoForm.validateFields();
      if (selectedClaim) {
        onRequestMoreInfo?.(selectedClaim.id, values.questions);
        message.success('Запрос дополнительной информации отправлен');
        setMoreInfoModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Функции для отображения
  const getCategoryColor = (category: string) => {
    const colors = {
      technical: 'blue',
      billing: 'green',
      order: 'orange',
      account: 'purple',
      other: 'gray',
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const getCategoryText = (category: string) => {
    const texts = {
      technical: 'Техническая',
      billing: 'Оплата',
      order: 'Заказ',
      account: 'Аккаунт',
      other: 'Другое',
    };
    return texts[category as keyof typeof texts] || 'Другое';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      escalation: 'red',
      refund: 'green',
      dispute_resolution: 'orange',
      account_action: 'purple',
      policy_exception: 'blue',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getTypeText = (type: string) => {
    const texts = {
      escalation: 'Эскалация',
      refund: 'Возврат',
      dispute_resolution: 'Решение спора',
      account_action: 'Действие с аккаунтом',
      policy_exception: 'Исключение из политики',
    };
    return texts[type as keyof typeof texts] || 'Другое';
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'magenta',
    };
    return colors[impact as keyof typeof colors] || 'gray';
  };

  const getImpactText = (impact: string) => {
    const texts = {
      low: 'Низкое',
      medium: 'Среднее',
      high: 'Высокое',
      critical: 'Критическое',
    };
    return texts[impact as keyof typeof texts] || 'Среднее';
  };

  const getEscalationColor = (level: number) => {
    if (level >= 3) return 'red';
    if (level >= 2) return 'orange';
    return 'green';
  };

  const formatWaitingTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)} ч`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}д ${remainingHours}ч` : `${days}д`;
  };

  const columns = [
    {
      title: 'Обращение',
      key: 'claim',
      render: (record: Claim) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.title}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description.length > 80 
              ? `${record.description.substring(0, 80)}...` 
              : record.description
            }
          </Text>
          <div style={{ marginTop: 8 }}>
            <Tag color={getCategoryColor(record.category)}>
              {getCategoryText(record.category)}
            </Tag>
            <Tag color={getTypeColor(record.approval_request.type)}>
              {getTypeText(record.approval_request.type)}
            </Tag>
            {record.approval_request.requires_director_approval && (
              <Tag color="gold" icon={<TeamOutlined />}>
                Директор
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Пользователь',
      key: 'user',
      width: 150,
      render: (record: Claim) => (
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
      title: 'Влияние',
      key: 'impact',
      width: 100,
      render: (record: Claim) => (
        <div style={{ textAlign: 'center' }}>
          <Tag color={getImpactColor(record.approval_request.estimated_impact)}>
            {getImpactText(record.approval_request.estimated_impact)}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Ожидание',
      key: 'waiting_time',
      width: 100,
      render: (record: Claim) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontWeight: 500, 
            fontSize: '13px',
            color: record.waiting_time_hours > 48 ? '#ff4d4f' : record.waiting_time_hours > 24 ? '#faad14' : '#52c41a'
          }}>
            {formatWaitingTime(record.waiting_time_hours)}
          </div>
          <Tag 
            color={getEscalationColor(record.escalation_level)}
          >
            Ур. {record.escalation_level}
          </Tag>
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
            <MessageOutlined style={{ fontSize: '16px', color: '#faad14' }} />
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
          <Tooltip title="Одобрить">
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleApproveClaim(record)}
            />
          </Tooltip>
          <Tooltip title="Отклонить">
            <Button 
              size="small" 
              danger
              icon={<CloseOutlined />}
              onClick={() => handleRejectApproval(record)}
            />
          </Tooltip>
          <Tooltip title="Запросить информацию">
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => handleRequestMoreInfo(record)}
            />
          </Tooltip>
          {record.approval_request.requires_director_approval && (
            <Tooltip title="Передать директору">
              <Button 
                size="small" 
                icon={<TeamOutlined />}
                onClick={() => handleEscalateToDirector(record)}
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
          <Title level={4}>Ожидают решения</Title>
          <Text type="secondary">
            Обращения, требующие одобрения руководства или принятия решения
          </Text>
        </div>

        {/* Предупреждение о просроченных */}
        {filteredClaims.some(claim => claim.waiting_time_hours > 48) && (
          <Alert
            message="Внимание!"
            description={`${filteredClaims.filter(claim => claim.waiting_time_hours > 48).length} обращений ожидают решения более 48 часов`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Фильтры */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по обращениям"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Категория"
            style={{ width: 150 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
          >
            <Option value="all">Все категории</Option>
            <Option value="technical">Техническая</Option>
            <Option value="billing">Оплата</Option>
            <Option value="order">Заказ</Option>
            <Option value="account">Аккаунт</Option>
            <Option value="other">Другое</Option>
          </Select>

          <Select
            placeholder="Тип запроса"
            style={{ width: 150 }}
            value={selectedType}
            onChange={setSelectedType}
          >
            <Option value="all">Все типы</Option>
            <Option value="escalation">Эскалация</Option>
            <Option value="refund">Возврат</Option>
            <Option value="dispute_resolution">Решение спора</Option>
            <Option value="account_action">Действие с аккаунтом</Option>
            <Option value="policy_exception">Исключение из политики</Option>
          </Select>

          <Select
            placeholder="Влияние"
            style={{ width: 120 }}
            value={selectedImpact}
            onChange={setSelectedImpact}
          >
            <Option value="all">Все</Option>
            <Option value="critical">Критическое</Option>
            <Option value="high">Высокое</Option>
            <Option value="medium">Среднее</Option>
            <Option value="low">Низкое</Option>
          </Select>

          <Select
            placeholder="Эскалация"
            style={{ width: 120 }}
            value={selectedEscalation}
            onChange={setSelectedEscalation}
          >
            <Option value="all">Все уровни</Option>
            <Option value="high">Высокий (3+)</Option>
            <Option value="medium">Средний (2)</Option>
            <Option value="low">Низкий (1)</Option>
          </Select>
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
              `${range[0]}-${range[1]} из ${total} обращений`
          }}
          locale={{ emptyText: 'Обращения, ожидающие решения, не найдены' }}
          size="small"
          rowClassName={(record) => 
            record.waiting_time_hours > 48 ? 'urgent-row' : 
            record.waiting_time_hours > 24 ? 'warning-row' : ''
          }
        />
      </Card>

      {/* Модальное окно просмотра обращения */}
      <Modal
        title="Детали обращения, ожидающего решения"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              if (selectedClaim) {
                setViewModalVisible(false);
                handleApproveClaim(selectedClaim);
              }
            }}
          >
            Одобрить
          </Button>,
        ]}
        width={900}
      >
        {selectedClaim && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>{selectedClaim.title}</Title>
              <Space>
                <Tag color={getCategoryColor(selectedClaim.category)}>
                  {getCategoryText(selectedClaim.category)}
                </Tag>
                <Tag color={getTypeColor(selectedClaim.approval_request.type)}>
                  {getTypeText(selectedClaim.approval_request.type)}
                </Tag>
                <Tag color={getImpactColor(selectedClaim.approval_request.estimated_impact)}>
                  {getImpactText(selectedClaim.approval_request.estimated_impact)} влияние
                </Tag>
                {selectedClaim.approval_request.requires_director_approval && (
                  <Tag color="gold" icon={<TeamOutlined />}>
                    Требует одобрения директора
                  </Tag>
                )}
              </Space>
            </div>

            <Alert
              message={`Ожидает решения ${formatWaitingTime(selectedClaim.waiting_time_hours)}`}
              type={selectedClaim.waiting_time_hours > 48 ? 'error' : selectedClaim.waiting_time_hours > 24 ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Divider />

            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <Text strong>Пользователь:</Text>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.user.first_name} {selectedClaim.user.last_name}</div>
                    <Text type="secondary">@{selectedClaim.user.username}</Text>
                    <br />
                    <Text type="secondary">{selectedClaim.user.email}</Text>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <Text strong>Администратор:</Text>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.assigned_admin.first_name} {selectedClaim.assigned_admin.last_name}</div>
                    <Text type="secondary">@{selectedClaim.assigned_admin.username}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Описание проблемы:</Text>
              <Paragraph style={{ marginTop: 8 }}>
                {selectedClaim.description}
              </Paragraph>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Обоснование запроса:</Text>
              <Paragraph style={{ marginTop: 8, backgroundColor: '#fff7e6', padding: 12, borderRadius: 6 }}>
                {selectedClaim.approval_request.reason}
              </Paragraph>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Предлагаемое действие:</Text>
              <Paragraph style={{ marginTop: 8, backgroundColor: '#f6ffed', padding: 12, borderRadius: 6 }}>
                {selectedClaim.approval_request.proposed_action}
              </Paragraph>
            </div>

            {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Вложения:</Text>
                <div style={{ marginTop: 8 }}>
                  {selectedClaim.attachments.map((file, index) => (
                    <Tag key={index} color="blue">📎 {file}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
              <span>Создано: {dayjs(selectedClaim.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Взято в работу: {dayjs(selectedClaim.taken_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Запрос одобрения: {dayjs(selectedClaim.approval_request.requested_at).format('DD.MM.YYYY HH:mm')}</span>
            </div>

            <div style={{ marginTop: 8, fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Уровень эскалации: {selectedClaim.escalation_level} | 
              Сообщений: {selectedClaim.messages_count}
            </div>
          </div>
        )}
      </Modal>

      {/* Модальное окно одобрения */}
      <Modal
        title="Одобрить запрос"
        open={approveModalVisible}
        onOk={handleApproveSubmit}
        onCancel={() => setApproveModalVisible(false)}
        okText="Одобрить"
        cancelText="Отмена"
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item
            name="decision"
            label="Решение и комментарии"
            rules={[{ required: true, message: 'Опишите принятое решение' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите принятое решение и дальнейшие действия..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно отклонения */}
      <Modal
        title="Отклонить запрос"
        open={rejectModalVisible}
        onOk={handleRejectSubmit}
        onCancel={() => setRejectModalVisible(false)}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Причина отклонения"
            rules={[{ required: true, message: 'Укажите причину отклонения' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите причину отклонения запроса..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно запроса дополнительной информации */}
      <Modal
        title="Запросить дополнительную информацию"
        open={moreInfoModalVisible}
        onOk={handleMoreInfoSubmit}
        onCancel={() => setMoreInfoModalVisible(false)}
        okText="Отправить"
        cancelText="Отмена"
      >
        <Form form={moreInfoForm} layout="vertical">
          <Form.Item
            name="questions"
            label="Вопросы и уточнения"
            rules={[{ required: true, message: 'Укажите, какая информация нужна' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите, какая дополнительная информация или документы нужны для принятия решения..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .urgent-row {
          background-color: #fff2f0 !important;
        }
        .warning-row {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
};
