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
  HistoryOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface ClaimMessage {
  id: number;
  message: string;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
  };
  created_at: string;
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
  status: 'new' | 'in_progress' | 'completed' | 'rejected';
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
  progress_percentage: number;
  estimated_completion?: string;
  last_activity: string;
  messages?: ClaimMessage[];
}

interface InProgressClaimsSectionProps {
  claims?: Claim[];
  loading?: boolean;
  onViewClaim?: (claimId: number) => void;
  onCompleteClaim?: (claimId: number, resolution: string) => void;
  onUpdateProgress?: (claimId: number, progress: number) => void;
  onSendMessage?: (claimId: number, message: string) => void;
  onReassignClaim?: (claimId: number, adminId: number) => void;
}

export const InProgressClaimsSection: React.FC<InProgressClaimsSectionProps> = ({
  claims = [],
  loading = false,
  onViewClaim,
  onCompleteClaim,
  onUpdateProgress,
  onSendMessage,
  onReassignClaim,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  const [completeForm] = Form.useForm();
  const [messageForm] = Form.useForm();
  const [progressForm] = Form.useForm();

  // Мок данные для демонстрации
  const mockClaims: Claim[] = [
    {
      id: 6,
      title: 'Проблема с загрузкой файлов',
      description: 'При попытке загрузить файл размером более 10MB система выдает ошибку. Нужно увеличить лимит или исправить баг.',
      user: {
        id: 106,
        username: 'expert_physics',
        first_name: 'Дмитрий',
        last_name: 'Федоров',
        email: 'dmitry.fedorov@email.com',
      },
      category: 'technical',
      priority: 'high',
      status: 'in_progress',
      created_at: '2024-02-03T14:20:00Z',
      updated_at: '2024-02-04T09:15:00Z',
      taken_at: '2024-02-03T15:30:00Z',
      messages_count: 5,
      assigned_admin: {
        id: 1,
        username: 'admin_tech',
        first_name: 'Алексей',
        last_name: 'Техников',
      },
      progress_percentage: 75,
      estimated_completion: '2024-02-04T18:00:00Z',
      last_activity: '2024-02-04T09:15:00Z',
      attachments: ['error_screenshot.png', 'console_log.txt'],
    },
    {
      id: 7,
      title: 'Возврат средств за отмененный заказ',
      description: 'Заказ был отменен экспертом, но деньги не вернулись на карту. Прошло уже 3 дня.',
      user: {
        id: 107,
        username: 'student_maria',
        first_name: 'Мария',
        last_name: 'Смирнова',
        email: 'maria.smirnova@email.com',
      },
      category: 'billing',
      priority: 'urgent',
      status: 'in_progress',
      created_at: '2024-02-02T10:45:00Z',
      updated_at: '2024-02-04T08:30:00Z',
      taken_at: '2024-02-02T11:15:00Z',
      messages_count: 8,
      assigned_admin: {
        id: 2,
        username: 'admin_billing',
        first_name: 'Елена',
        last_name: 'Финансова',
      },
      progress_percentage: 90,
      estimated_completion: '2024-02-04T15:00:00Z',
      last_activity: '2024-02-04T08:30:00Z',
    },
    {
      id: 8,
      title: 'Спор по качеству выполненной работы',
      description: 'Работа выполнена не по требованиям. Эксперт отказывается исправлять. Нужно разбирательство.',
      user: {
        id: 108,
        username: 'client_pavel',
        first_name: 'Павел',
        last_name: 'Иванов',
        email: 'pavel.ivanov@email.com',
      },
      category: 'order',
      priority: 'high',
      status: 'in_progress',
      created_at: '2024-02-01T16:30:00Z',
      updated_at: '2024-02-04T07:45:00Z',
      taken_at: '2024-02-01T17:00:00Z',
      messages_count: 12,
      assigned_admin: {
        id: 3,
        username: 'admin_disputes',
        first_name: 'Сергей',
        last_name: 'Арбитров',
      },
      progress_percentage: 60,
      estimated_completion: '2024-02-05T12:00:00Z',
      last_activity: '2024-02-04T07:45:00Z',
      attachments: ['work_file.docx', 'requirements.pdf', 'correspondence.pdf'],
    },
    {
      id: 9,
      title: 'Проблема с двухфакторной аутентификацией',
      description: 'Не могу отключить 2FA, так как потерял доступ к телефону. Нужна помощь с восстановлением.',
      user: {
        id: 109,
        username: 'user_lost_phone',
        first_name: 'Андрей',
        last_name: 'Потеряев',
        email: 'andrey.poteryaev@email.com',
      },
      category: 'account',
      priority: 'medium',
      status: 'in_progress',
      created_at: '2024-02-03T09:15:00Z',
      updated_at: '2024-02-04T06:20:00Z',
      taken_at: '2024-02-03T10:00:00Z',
      messages_count: 4,
      assigned_admin: {
        id: 4,
        username: 'admin_security',
        first_name: 'Анна',
        last_name: 'Безопасная',
      },
      progress_percentage: 40,
      estimated_completion: '2024-02-04T20:00:00Z',
      last_activity: '2024-02-04T06:20:00Z',
    },
  ];

  const claimsData = claims;

  // Фильтрация данных
  const filteredClaims = claimsData.filter(claim => {
    const matchesSearch = claim.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         claim.description.toLowerCase().includes(searchText.toLowerCase()) ||
                         `${claim.user.first_name} ${claim.user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || claim.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || claim.priority === selectedPriority;
    const matchesAdmin = selectedAdmin === 'all' || claim.assigned_admin.username === selectedAdmin;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesAdmin;
  });

  // Обработчики
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setViewModalVisible(true);
    onViewClaim?.(claim.id);
  };

  const handleCompleteClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    completeForm.resetFields();
    setCompleteModalVisible(true);
  };

  const handleCompleteSubmit = async () => {
    try {
      const values = await completeForm.validateFields();
      if (selectedClaim) {
        onCompleteClaim?.(selectedClaim.id, values.resolution);
        message.success(`Обращение "${selectedClaim.title}" завершено`);
        setCompleteModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleUpdateProgress = (claim: Claim) => {
    setSelectedClaim(claim);
    progressForm.setFieldsValue({ progress: claim.progress_percentage });
    setProgressModalVisible(true);
  };

  const handleProgressSubmit = async () => {
    try {
      const values = await progressForm.validateFields();
      if (selectedClaim) {
        onUpdateProgress?.(selectedClaim.id, values.progress);
        message.success('Прогресс обновлен');
        setProgressModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSendMessage = (claim: Claim) => {
    setSelectedClaim(claim);
    messageForm.resetFields();
    setMessageModalVisible(true);
  };

  const handleMessageSubmit = async () => {
    try {
      const values = await messageForm.validateFields();
      if (selectedClaim) {
        onSendMessage?.(selectedClaim.id, values.message);
        message.success('Сообщение отправлено');
        setMessageModalVisible(false);
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
      title: 'Сообщения',
      dataIndex: 'messages_count',
      key: 'messages_count',
      width: 80,
      render: (count: number) => (
        <Badge count={count} showZero>
          <MessageOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
        </Badge>
      ),
    },
    {
      title: 'Активность',
      dataIndex: 'last_activity',
      key: 'last_activity',
      width: 100,
      render: (date: string) => (
        <div style={{ fontSize: '11px' }}>
          <div>{dayjs(date).format('DD.MM')}</div>
          <Text type="secondary">{dayjs(date).format('HH:mm')}</Text>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (record: Claim) => (
        <Space size="small">
          <Tooltip title="Просмотреть">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewClaim(record)}
            />
          </Tooltip>
          <Tooltip title="Обновить прогресс">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleUpdateProgress(record)}
            />
          </Tooltip>
          <Tooltip title="Отправить сообщение">
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => handleSendMessage(record)}
            />
          </Tooltip>
          <Tooltip title="Завершить">
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleCompleteClaim(record)}
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
          <Title level={4}>Обращения в работе</Title>
          <Text type="secondary">
            Обращения, которые находятся в процессе обработки
          </Text>
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
          locale={{ emptyText: 'Обращения в работе не найдены' }}
          size="small"
        />
      </Card>

      {/* Модальное окно просмотра обращения */}
      <Modal
        title="Детали обращения"
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
              if (selectedClaim) {
                setViewModalVisible(false);
                handleCompleteClaim(selectedClaim);
              }
            }}
          >
            Завершить
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
                <Tag color="blue">В работе</Tag>
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Прогресс выполнения:</Text>
              <Progress 
                percent={selectedClaim.progress_percentage} 
                strokeColor={getProgressColor(selectedClaim.progress_percentage)}
                style={{ marginTop: 8 }}
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <Text strong>Пользователь:</Text>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar size={32} icon={<UserOutlined />} />
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
                  <Avatar size={32} icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.assigned_admin.first_name} {selectedClaim.assigned_admin.last_name}</div>
                    <Text type="secondary">@{selectedClaim.assigned_admin.username}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Описание:</Text>
              <Paragraph style={{ marginTop: 8 }}>
                {selectedClaim.description}
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
              <span>Сообщений: {selectedClaim.messages_count}</span>
            </div>

            {selectedClaim.estimated_completion && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                Планируемое завершение: {dayjs(selectedClaim.estimated_completion).format('DD.MM.YYYY HH:mm')}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно завершения */}
      <Modal
        title="Завершить обращение"
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
            rules={[{ required: true, message: 'Опишите решение проблемы' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите, как была решена проблема..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно обновления прогресса */}
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

      {/* Модальное окно отправки сообщения */}
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
    </div>
  );
};