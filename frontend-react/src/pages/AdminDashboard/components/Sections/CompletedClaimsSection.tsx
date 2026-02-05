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
  Rate,
  Timeline,
  Statistic
} from 'antd';
import { 
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  StarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ClaimResolution {
  id: number;
  resolution_text: string;
  resolved_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  resolved_at: string;
  resolution_time_hours: number;
  user_satisfaction_rating?: number;
  user_feedback?: string;
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
  status: 'completed';
  created_at: string;
  updated_at: string;
  taken_at: string;
  completed_at: string;
  attachments?: string[];
  messages_count: number;
  assigned_admin: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  resolution: ClaimResolution;
}

interface CompletedClaimsSectionProps {
  claims?: Claim[];
  loading?: boolean;
  onViewClaim?: (claimId: number) => void;
  onReopenClaim?: (claimId: number, reason: string) => void;
  onExportReport?: (filters: any) => void;
}

export const CompletedClaimsSection: React.FC<CompletedClaimsSectionProps> = ({
  claims = [],
  loading = false,
  onViewClaim,
  onReopenClaim,
  onExportReport,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  const [reopenForm] = Form.useForm();

  // Мок данные для демонстрации
  const mockClaims: Claim[] = [
    {
      id: 10,
      title: 'Проблема с авторизацией через Google',
      description: 'Не могу войти в систему через Google аккаунт. Постоянно перенаправляет на главную страницу.',
      user: {
        id: 110,
        username: 'user_google',
        first_name: 'Ольга',
        last_name: 'Кузнецова',
        email: 'olga.kuznetsova@email.com',
      },
      category: 'technical',
      priority: 'medium',
      status: 'completed',
      created_at: '2024-02-01T09:30:00Z',
      updated_at: '2024-02-02T14:20:00Z',
      taken_at: '2024-02-01T10:15:00Z',
      completed_at: '2024-02-02T14:20:00Z',
      messages_count: 6,
      assigned_admin: {
        id: 1,
        username: 'admin_tech',
        first_name: 'Алексей',
        last_name: 'Техников',
      },
      resolution: {
        id: 1,
        resolution_text: 'Проблема была связана с устаревшими cookies. Очистили кеш браузера и обновили настройки OAuth. Пользователь может теперь входить через Google без проблем.',
        resolved_by: {
          id: 1,
          username: 'admin_tech',
          first_name: 'Алексей',
          last_name: 'Техников',
        },
        resolved_at: '2024-02-02T14:20:00Z',
        resolution_time_hours: 28,
        user_satisfaction_rating: 5,
        user_feedback: 'Спасибо за быстрое решение! Все работает отлично.',
      },
      attachments: ['google_error.png'],
    },
    {
      id: 11,
      title: 'Возврат средств обработан',
      description: 'Запрос на возврат средств за отмененный заказ №5678.',
      user: {
        id: 111,
        username: 'client_refund',
        first_name: 'Игорь',
        last_name: 'Морозов',
        email: 'igor.morozov@email.com',
      },
      category: 'billing',
      priority: 'high',
      status: 'completed',
      created_at: '2024-01-30T11:45:00Z',
      updated_at: '2024-02-01T16:30:00Z',
      taken_at: '2024-01-30T12:00:00Z',
      completed_at: '2024-02-01T16:30:00Z',
      messages_count: 4,
      assigned_admin: {
        id: 2,
        username: 'admin_billing',
        first_name: 'Елена',
        last_name: 'Финансова',
      },
      resolution: {
        id: 2,
        resolution_text: 'Возврат средств в размере 3500 рублей успешно обработан. Деньги поступят на карту клиента в течение 3-5 рабочих дней. Отправлено уведомление на email.',
        resolved_by: {
          id: 2,
          username: 'admin_billing',
          first_name: 'Елена',
          last_name: 'Финансова',
        },
        resolved_at: '2024-02-01T16:30:00Z',
        resolution_time_hours: 52,
        user_satisfaction_rating: 4,
        user_feedback: 'Долго ждал, но в итоге все решили.',
      },
    },
    {
      id: 12,
      title: 'Спор по заказу разрешен',
      description: 'Спор между клиентом и экспертом по качеству выполненной курсовой работы.',
      user: {
        id: 112,
        username: 'student_dispute',
        first_name: 'Татьяна',
        last_name: 'Белова',
        email: 'tatyana.belova@email.com',
      },
      category: 'order',
      priority: 'urgent',
      status: 'completed',
      created_at: '2024-01-28T14:20:00Z',
      updated_at: '2024-01-31T18:45:00Z',
      taken_at: '2024-01-28T15:00:00Z',
      completed_at: '2024-01-31T18:45:00Z',
      messages_count: 15,
      assigned_admin: {
        id: 3,
        username: 'admin_disputes',
        first_name: 'Сергей',
        last_name: 'Арбитров',
      },
      resolution: {
        id: 3,
        resolution_text: 'После детального рассмотрения материалов спор разрешен в пользу клиента. Эксперт доработал работу согласно требованиям. Клиент получил качественную курсовую работу.',
        resolved_by: {
          id: 3,
          username: 'admin_disputes',
          first_name: 'Сергей',
          last_name: 'Арбитров',
        },
        resolved_at: '2024-01-31T18:45:00Z',
        resolution_time_hours: 76,
        user_satisfaction_rating: 5,
        user_feedback: 'Отличная работа администрации! Справедливо разрешили спор.',
      },
      attachments: ['coursework_v1.docx', 'coursework_v2.docx', 'requirements.pdf'],
    },
    {
      id: 13,
      title: 'Восстановление аккаунта завершено',
      description: 'Помощь в восстановлении доступа к аккаунту после взлома.',
      user: {
        id: 113,
        username: 'hacked_user',
        first_name: 'Максим',
        last_name: 'Соколов',
        email: 'maxim.sokolov@email.com',
      },
      category: 'account',
      priority: 'urgent',
      status: 'completed',
      created_at: '2024-01-29T08:15:00Z',
      updated_at: '2024-01-30T12:30:00Z',
      taken_at: '2024-01-29T08:30:00Z',
      completed_at: '2024-01-30T12:30:00Z',
      messages_count: 8,
      assigned_admin: {
        id: 4,
        username: 'admin_security',
        first_name: 'Анна',
        last_name: 'Безопасная',
      },
      resolution: {
        id: 4,
        resolution_text: 'Аккаунт успешно восстановлен. Изменен пароль, включена двухфакторная аутентификация, проверены все активные сессии. Пользователь получил инструкции по безопасности.',
        resolved_by: {
          id: 4,
          username: 'admin_security',
          first_name: 'Анна',
          last_name: 'Безопасная',
        },
        resolved_at: '2024-01-30T12:30:00Z',
        resolution_time_hours: 28,
        user_satisfaction_rating: 5,
        user_feedback: 'Быстро и профессионально! Спасибо за помощь.',
      },
    },
    {
      id: 14,
      title: 'Консультация по партнерской программе',
      description: 'Вопросы по условиям партнерской программы и выплатам комиссий.',
      user: {
        id: 114,
        username: 'partner_question',
        first_name: 'Виктория',
        last_name: 'Лебедева',
        email: 'victoria.lebedeva@email.com',
      },
      category: 'other',
      priority: 'low',
      status: 'completed',
      created_at: '2024-01-31T16:40:00Z',
      updated_at: '2024-02-01T10:15:00Z',
      taken_at: '2024-01-31T17:00:00Z',
      completed_at: '2024-02-01T10:15:00Z',
      messages_count: 3,
      assigned_admin: {
        id: 5,
        username: 'admin_support',
        first_name: 'Дмитрий',
        last_name: 'Поддержкин',
      },
      resolution: {
        id: 5,
        resolution_text: 'Предоставлена подробная консультация по партнерской программе. Отправлены документы с условиями, схемой начисления комиссий и инструкцией по выводу средств.',
        resolved_by: {
          id: 5,
          username: 'admin_support',
          first_name: 'Дмитрий',
          last_name: 'Поддержкин',
        },
        resolved_at: '2024-02-01T10:15:00Z',
        resolution_time_hours: 17,
        user_satisfaction_rating: 4,
        user_feedback: 'Все понятно объяснили, спасибо!',
      },
    },
  ];

  const claimsData = claims.length > 0 ? claims : mockClaims;

  // Фильтрация данных
  const filteredClaims = claimsData.filter(claim => {
    const matchesSearch = claim.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         claim.description.toLowerCase().includes(searchText.toLowerCase()) ||
                         `${claim.user.first_name} ${claim.user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || claim.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || claim.priority === selectedPriority;
    const matchesAdmin = selectedAdmin === 'all' || claim.assigned_admin.username === selectedAdmin;
    
    let matchesRating = true;
    if (selectedRating !== 'all') {
      const rating = claim.resolution.user_satisfaction_rating;
      if (selectedRating === 'high' && (!rating || rating < 4)) matchesRating = false;
      if (selectedRating === 'medium' && (!rating || rating < 3 || rating > 4)) matchesRating = false;
      if (selectedRating === 'low' && (!rating || rating > 2)) matchesRating = false;
      if (selectedRating === 'no_rating' && rating) matchesRating = false;
    }
    
    let matchesDate = true;
    if (dateRange) {
      const claimDate = dayjs(claim.completed_at);
      matchesDate = claimDate.isAfter(dateRange[0]) && claimDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesCategory && matchesPriority && matchesAdmin && matchesRating && matchesDate;
  });

  // Статистика
  const stats = {
    total: filteredClaims.length,
    avgResolutionTime: filteredClaims.reduce((sum, claim) => sum + claim.resolution.resolution_time_hours, 0) / filteredClaims.length || 0,
    avgRating: filteredClaims.reduce((sum, claim) => sum + (claim.resolution.user_satisfaction_rating || 0), 0) / filteredClaims.filter(c => c.resolution.user_satisfaction_rating).length || 0,
    withFeedback: filteredClaims.filter(claim => claim.resolution.user_feedback).length,
  };

  // Обработчики
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setViewModalVisible(true);
    onViewClaim?.(claim.id);
  };

  const handleReopenClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    reopenForm.resetFields();
    setReopenModalVisible(true);
  };

  const handleReopenSubmit = async () => {
    try {
      const values = await reopenForm.validateFields();
      if (selectedClaim) {
        onReopenClaim?.(selectedClaim.id, values.reason);
        message.success(`Обращение "${selectedClaim.title}" переоткрыто`);
        setReopenModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleExportReport = () => {
    const filters = {
      category: selectedCategory,
      priority: selectedPriority,
      admin: selectedAdmin,
      rating: selectedRating,
      dateRange,
      searchText,
    };
    onExportReport?.(filters);
    message.success('Отчет экспортируется...');
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

  const formatResolutionTime = (hours: number) => {
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
            <Tag color={getPriorityColor(record.priority)}>
              {getPriorityText(record.priority)}
            </Tag>
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Завершено
            </Tag>
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
      title: 'Время решения',
      key: 'resolution_time',
      width: 100,
      render: (record: Claim) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 500, fontSize: '13px' }}>
            {formatResolutionTime(record.resolution.resolution_time_hours)}
          </div>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {dayjs(record.completed_at).format('DD.MM HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Оценка',
      key: 'rating',
      width: 100,
      render: (record: Claim) => (
        <div style={{ textAlign: 'center' }}>
          {record.resolution.user_satisfaction_rating ? (
            <>
              <Rate 
                disabled 
                value={record.resolution.user_satisfaction_rating} 
                style={{ fontSize: '12px' }}
              />
              <div style={{ fontSize: '10px', color: '#666' }}>
                {record.resolution.user_satisfaction_rating}/5
              </div>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Нет оценки
            </Text>
          )}
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
            <MessageOutlined style={{ fontSize: '16px', color: '#52c41a' }} />
          </Badge>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Claim) => (
        <Space size="small">
          <Tooltip title="Просмотреть">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewClaim(record)}
            />
          </Tooltip>
          <Tooltip title="Переоткрыть">
            <Button 
              size="small" 
              icon={<FileTextOutlined />}
              onClick={() => handleReopenClaim(record)}
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
          <Title level={4}>Завершённые обращения</Title>
          <Text type="secondary">
            Обращения, которые были успешно решены
          </Text>
        </div>

        {/* Статистика */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Statistic title="Всего" value={stats.total} />
          <Statistic 
            title="Среднее время решения" 
            value={formatResolutionTime(stats.avgResolutionTime)} 
          />
          <Statistic 
            title="Средняя оценка" 
            value={stats.avgRating.toFixed(1)} 
            suffix="/ 5"
          />
          <Statistic title="С отзывами" value={stats.withFeedback} />
        </div>

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
            <Option value="admin_tech">Алексей Техников</Option>
            <Option value="admin_billing">Елена Финансова</Option>
            <Option value="admin_disputes">Сергей Арбитров</Option>
            <Option value="admin_security">Анна Безопасная</Option>
            <Option value="admin_support">Дмитрий Поддержкин</Option>
          </Select>

          <Select
            placeholder="Оценка"
            style={{ width: 120 }}
            value={selectedRating}
            onChange={setSelectedRating}
          >
            <Option value="all">Все</Option>
            <Option value="high">4-5 звезд</Option>
            <Option value="medium">3 звезды</Option>
            <Option value="low">1-2 звезды</Option>
            <Option value="no_rating">Без оценки</Option>
          </Select>

          <RangePicker
            placeholder={['От', 'До']}
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 250 }}
          />

          <Button 
            icon={<DownloadOutlined />}
            onClick={handleExportReport}
          >
            Экспорт
          </Button>
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
          locale={{ emptyText: 'Завершённые обращения не найдены' }}
          size="small"
        />
      </Card>

      {/* Модальное окно просмотра обращения */}
      <Modal
        title="Детали завершённого обращения"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="reopen" 
            type="primary" 
            icon={<FileTextOutlined />}
            onClick={() => {
              if (selectedClaim) {
                setViewModalVisible(false);
                handleReopenClaim(selectedClaim);
              }
            }}
          >
            Переоткрыть
          </Button>,
        ]}
        width={800}
      >
        {selectedClaim && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>{selectedClaim.title}</Title>
              <Space>
                <Tag color={getCategoryColor(selectedClaim.category)}>
                  {getCategoryText(selectedClaim.category)}
                </Tag>
                <Tag color={getPriorityColor(selectedClaim.priority)}>
                  {getPriorityText(selectedClaim.priority)}
                </Tag>
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Завершено
                </Tag>
              </Space>
            </div>

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
              <Text strong>Решение:</Text>
              <Paragraph style={{ marginTop: 8, backgroundColor: '#f6ffed', padding: 12, borderRadius: 6 }}>
                {selectedClaim.resolution.resolution_text}
              </Paragraph>
            </div>

            {selectedClaim.resolution.user_satisfaction_rating && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>Оценка пользователя:</Text>
                <div style={{ marginTop: 8 }}>
                  <Rate disabled value={selectedClaim.resolution.user_satisfaction_rating} />
                  <Text style={{ marginLeft: 8 }}>
                    {selectedClaim.resolution.user_satisfaction_rating}/5
                  </Text>
                </div>
                {selectedClaim.resolution.user_feedback && (
                  <div style={{ marginTop: 8, fontStyle: 'italic', color: '#666' }}>
                    "{selectedClaim.resolution.user_feedback}"
                  </div>
                )}
              </div>
            )}

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
              <span>Завершено: {dayjs(selectedClaim.completed_at).format('DD.MM.YYYY HH:mm')}</span>
            </div>

            <div style={{ marginTop: 8, fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Время решения: {formatResolutionTime(selectedClaim.resolution.resolution_time_hours)} | 
              Сообщений: {selectedClaim.messages_count}
            </div>
          </div>
        )}
      </Modal>

      {/* Модальное окно переоткрытия */}
      <Modal
        title="Переоткрыть обращение"
        open={reopenModalVisible}
        onOk={handleReopenSubmit}
        onCancel={() => setReopenModalVisible(false)}
        okText="Переоткрыть"
        cancelText="Отмена"
      >
        <Form form={reopenForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Причина переоткрытия"
            rules={[{ required: true, message: 'Укажите причину переоткрытия' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Опишите причину, по которой обращение нужно переоткрыть..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};