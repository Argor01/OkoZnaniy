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

  
  const claimsData = Array.isArray(claims) ? claims : [];

  
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

  
  const stats = {
    total: filteredClaims.length,
    avgResolutionTime: filteredClaims.reduce((sum, claim) => sum + claim.resolution.resolution_time_hours, 0) / filteredClaims.length || 0,
    avgRating: filteredClaims.reduce((sum, claim) => sum + (claim.resolution.user_satisfaction_rating || 0), 0) / filteredClaims.filter(c => c.resolution.user_satisfaction_rating).length || 0,
    withFeedback: filteredClaims.filter(claim => claim.resolution.user_feedback).length,
  };

  
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
          <div className="completedClaimsTitle">
            {record.title}
          </div>
          <Text type="secondary" className="completedClaimsDescription">
            {record.description.length > 80 
              ? `${record.description.substring(0, 80)}...` 
              : record.description
            }
          </Text>
          <div className="completedClaimsTagRow">
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
        <div className="completedClaimsUserRow">
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div className="completedClaimsUserName">
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" className="completedClaimsUserHandle">
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
          <div className="completedClaimsAdminName">
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </div>
          <Text type="secondary" className="completedClaimsAdminHandle">
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
        <div className="completedClaimsResolutionCell">
          <div className="completedClaimsResolutionValue">
            {formatResolutionTime(record.resolution.resolution_time_hours)}
          </div>
          <Text type="secondary" className="completedClaimsResolutionDate">
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
        <div className="completedClaimsRatingCell">
          {record.resolution.user_satisfaction_rating ? (
            <>
              <Rate 
                disabled 
                value={record.resolution.user_satisfaction_rating} 
                className="completedClaimsRatingStars"
              />
              <div className="completedClaimsRatingValue">
                {record.resolution.user_satisfaction_rating}/5
              </div>
            </>
          ) : (
            <Text type="secondary" className="completedClaimsRatingEmpty">
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
        <div className="completedClaimsMessagesCell">
          <Badge count={count} showZero>
            <MessageOutlined className="completedClaimsMessageIcon" />
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
        <div className="completedClaimsHeader">
          <Title level={4}>Завершённые обращения</Title>
          <Text type="secondary">
            Обращения, которые были успешно решены
          </Text>
        </div>

        
        <div className="completedClaimsStatsRow">
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

        
        <div className="completedClaimsFiltersRow">
          <Search
            placeholder="Поиск по обращениям"
            allowClear
            className="completedClaimsSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Категория"
            className="completedClaimsSelectCategory"
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
            className="completedClaimsSelectPriority"
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
            className="completedClaimsSelectAdmin"
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
            className="completedClaimsSelectRating"
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
            className="completedClaimsDateRange"
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
            <div className="completedClaimsModalHeader">
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

            <div className="completedClaimsDetailsRow">
              <div className="completedClaimsDetailsColumn">
                <Text strong>Пользователь:</Text>
                <div className="completedClaimsInfoRow">
                  <Avatar size={32} icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.user.first_name} {selectedClaim.user.last_name}</div>
                    <Text type="secondary">@{selectedClaim.user.username}</Text>
                    <br />
                    <Text type="secondary">{selectedClaim.user.email}</Text>
                  </div>
                </div>
              </div>

              <div className="completedClaimsDetailsColumn">
                <Text strong>Администратор:</Text>
                <div className="completedClaimsInfoRow">
                  <Avatar size={32} icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.assigned_admin.first_name} {selectedClaim.assigned_admin.last_name}</div>
                    <Text type="secondary">@{selectedClaim.assigned_admin.username}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div className="completedClaimsSectionBlock">
              <Text strong>Описание проблемы:</Text>
              <Paragraph className="completedClaimsParagraph">
                {selectedClaim.description}
              </Paragraph>
            </div>

            <div className="completedClaimsSectionBlock">
              <Text strong>Решение:</Text>
              <Paragraph className="completedClaimsSolution">
                {selectedClaim.resolution.resolution_text}
              </Paragraph>
            </div>

            {selectedClaim.resolution.user_satisfaction_rating && (
              <div className="completedClaimsSectionBlock">
                <Text strong>Оценка пользователя:</Text>
                <div className="completedClaimsRatingRow">
                  <Rate disabled value={selectedClaim.resolution.user_satisfaction_rating} />
                  <Text className="completedClaimsRatingScore">
                    {selectedClaim.resolution.user_satisfaction_rating}/5
                  </Text>
                </div>
                {selectedClaim.resolution.user_feedback && (
                  <div className="completedClaimsFeedback">
                    "{selectedClaim.resolution.user_feedback}"
                  </div>
                )}
              </div>
            )}

            {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
              <div className="completedClaimsSectionBlock">
                <Text strong>Вложения:</Text>
                <div className="completedClaimsAttachmentsRow">
                  {selectedClaim.attachments.map((file, index) => (
                    <Tag key={index} color="blue">📎 {file}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div className="completedClaimsMetaRow">
              <span>Создано: {dayjs(selectedClaim.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Взято в работу: {dayjs(selectedClaim.taken_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Завершено: {dayjs(selectedClaim.completed_at).format('DD.MM.YYYY HH:mm')}</span>
            </div>

            <div className="completedClaimsMetaSummary">
              Время решения: {formatResolutionTime(selectedClaim.resolution.resolution_time_hours)} | 
              Сообщений: {selectedClaim.messages_count}
            </div>
          </div>
        )}
      </Modal>

      
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
