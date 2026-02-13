import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Select,
  DatePicker,
  Modal,
  Rate,
  Tooltip,
  Avatar,
  Badge,
  Statistic,
  Row,
  Col,
  Progress,
  Timeline,
  Divider,
  message,
  Dropdown,
  Menu
} from 'antd';
import { 
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  EyeOutlined,
  RedoOutlined,
  StarOutlined,
  MessageOutlined,
  DownloadOutlined,
  MoreOutlined,
  FileTextOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface CompletedRequest {
  id: number;
  title: string;
  description: string;
  type: 'technical' | 'billing' | 'order' | 'account' | 'suggestion' | 'complaint' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    is_vip: boolean;
    registration_date: string;
    total_orders: number;
    total_spent: number;
  };
  assigned_admin: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  created_at: string;
  completed_at: string;
  resolution: string;
  resolution_type: 'resolved' | 'closed_no_action' | 'escalated' | 'duplicate' | 'invalid';
  satisfaction_rating?: number;
  satisfaction_comment?: string;
  response_time_minutes: number;
  total_time_minutes: number;
  messages_count: number;
  tags: string[];
  related_order_id?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
}

interface CompletedRequestsSectionProps {
  requests?: CompletedRequest[];
  loading?: boolean;
  onViewRequest?: (requestId: number) => void;
  onReopenRequest?: (requestId: number, reason: string) => void;
  onExportReport?: (filters: any) => void;
  onViewUserProfile?: (userId: number) => void;
  onViewRelatedOrder?: (orderId: number) => void;
  onScheduleFollowUp?: (requestId: number, date: string, notes: string) => void;
}

export const CompletedRequestsSection: React.FC<CompletedRequestsSectionProps> = ({
  requests = [],
  loading = false,
  onViewRequest,
  onReopenRequest,
  onExportReport,
  onViewUserProfile,
  onViewRelatedOrder,
  onScheduleFollowUp,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedResolutionType, setSelectedResolutionType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CompletedRequest | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<dayjs.Dayjs | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState('');

  const requestsData = requests;

  // Фильтрация запросов
  const filteredRequests = requestsData.filter(request => {
    const matchesSearch = searchText === '' || 
      request.title.toLowerCase().includes(searchText.toLowerCase()) ||
      request.description.toLowerCase().includes(searchText.toLowerCase()) ||
      request.user.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
      request.user.last_name.toLowerCase().includes(searchText.toLowerCase()) ||
      request.id.toString().includes(searchText);

    const matchesType = selectedType === 'all' || request.type === selectedType;
    const matchesPriority = selectedPriority === 'all' || request.priority === selectedPriority;
    const matchesResolutionType = selectedResolutionType === 'all' || request.resolution_type === selectedResolutionType;

    const matchesDateRange = !dateRange || (
      dayjs(request.completed_at).isAfter(dateRange[0]) &&
      dayjs(request.completed_at).isBefore(dayjs(dateRange[1]).add(1, 'day'))
    );

    return matchesSearch && matchesType && matchesPriority && matchesResolutionType && matchesDateRange;
  });

  // Статистика
  const stats = {
    total: filteredRequests.length,
    resolved: filteredRequests.filter(r => r.resolution_type === 'resolved').length,
    avgSatisfaction: filteredRequests
      .filter(r => r.satisfaction_rating)
      .reduce((sum, r) => sum + (r.satisfaction_rating || 0), 0) / 
      filteredRequests.filter(r => r.satisfaction_rating).length || 0,
    avgResponseTime: filteredRequests.reduce((sum, r) => sum + r.response_time_minutes, 0) / filteredRequests.length || 0,
    followUpRequired: filteredRequests.filter(r => r.follow_up_required).length,
  };

  // Обработчики
  const handleViewRequest = (request: CompletedRequest) => {
    setSelectedRequest(request);
    setDetailsModalVisible(true);
    onViewRequest?.(request.id);
  };

  const handleReopenRequest = () => {
    if (selectedRequest && reopenReason.trim()) {
      onReopenRequest?.(selectedRequest.id, reopenReason);
      setReopenModalVisible(false);
      setReopenReason('');
      setSelectedRequest(null);
      message.success('Запрос переоткрыт');
    }
  };

  const handleScheduleFollowUp = () => {
    if (selectedRequest && followUpDate && followUpNotes.trim()) {
      onScheduleFollowUp?.(selectedRequest.id, followUpDate.toISOString(), followUpNotes);
      setFollowUpModalVisible(false);
      setFollowUpDate(null);
      setFollowUpNotes('');
      setSelectedRequest(null);
      message.success('Последующий контакт запланирован');
    }
  };

  const handleExport = () => {
    const filters = {
      searchText,
      type: selectedType,
      priority: selectedPriority,
      resolutionType: selectedResolutionType,
      dateRange,
    };
    onExportReport?.(filters);
    message.success('Отчет экспортируется...');
  };

  // Функции для отображения
  const getTypeColor = (type: string) => {
    const colors = {
      technical: 'blue',
      billing: 'green',
      order: 'orange',
      account: 'purple',
      suggestion: 'cyan',
      complaint: 'red',
      other: 'gray',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getTypeText = (type: string) => {
    const texts = {
      technical: 'Техническая поддержка',
      billing: 'Вопросы по оплате',
      order: 'Помощь с заказами',
      account: 'Проблемы аккаунта',
      suggestion: 'Предложения',
      complaint: 'Жалобы',
      other: 'Другие вопросы',
    };
    return texts[type as keyof typeof texts] || 'Другое';
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
    return texts[priority as keyof typeof texts] || 'Неизвестно';
  };

  const getResolutionTypeColor = (type: string) => {
    const colors = {
      resolved: 'green',
      closed_no_action: 'gray',
      escalated: 'orange',
      duplicate: 'blue',
      invalid: 'red',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getResolutionTypeText = (type: string) => {
    const texts = {
      resolved: 'Решен',
      closed_no_action: 'Закрыт без действий',
      escalated: 'Эскалирован',
      duplicate: 'Дубликат',
      invalid: 'Недействительный',
    };
    return texts[type as keyof typeof texts] || 'Неизвестно';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: CompletedRequest, b: CompletedRequest) => a.id - b.id,
    },
    {
      title: 'Запрос',
      key: 'request',
      render: (record: CompletedRequest) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {record.title}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description.length > 60 
              ? `${record.description.substring(0, 60)}...` 
              : record.description
            }
          </Text>
          <div style={{ marginTop: 4 }}>
            {record.tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      ),
      width: 300,
    },
    {
      title: 'Клиент',
      key: 'user',
      render: (record: CompletedRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge dot={record.user.is_vip} color="gold">
            <Avatar src={record.user.avatar} icon={<UserOutlined />} />
          </Badge>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.user.first_name} {record.user.last_name}
              {record.user.is_vip && <Tag color="gold" style={{ marginLeft: 4 }}>VIP</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.user.total_orders} заказов • {record.user.total_spent.toLocaleString()} ₽
            </Text>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: 'Тип / Приоритет',
      key: 'type_priority',
      render: (record: CompletedRequest) => (
        <div>
          <Tag color={getTypeColor(record.type)}>
            {getTypeText(record.type)}
          </Tag>
          <br />
          <Tag color={getPriorityColor(record.priority)} style={{ marginTop: 4 }}>
            {getPriorityText(record.priority)}
          </Tag>
        </div>
      ),
      width: 150,
    },
    {
      title: 'Администратор',
      key: 'admin',
      render: (record: CompletedRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontSize: '13px' }}>
              {record.assigned_admin.first_name} {record.assigned_admin.last_name}
            </div>
          </div>
        </div>
      ),
      width: 150,
    },
    {
      title: 'Время решения',
      key: 'timing',
      render: (record: CompletedRequest) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            <ClockCircleOutlined /> Ответ: {Math.floor(record.response_time_minutes / 60)}ч {record.response_time_minutes % 60}м
          </div>
          <div style={{ fontSize: '12px', marginTop: 2 }}>
            <CheckCircleOutlined /> Решение: {Math.floor(record.total_time_minutes / 60)}ч {record.total_time_minutes % 60}м
          </div>
        </div>
      ),
      width: 120,
    },
    {
      title: 'Результат',
      key: 'result',
      render: (record: CompletedRequest) => (
        <div>
          <Tag color={getResolutionTypeColor(record.resolution_type)}>
            {getResolutionTypeText(record.resolution_type)}
          </Tag>
          {record.satisfaction_rating && (
            <div style={{ marginTop: 4 }}>
              <Rate disabled value={record.satisfaction_rating} style={{ fontSize: '12px' }} />
            </div>
          )}
          {record.follow_up_required && (
            <Tag color="orange" style={{ marginTop: 4 }}>
              Требует контроля
            </Tag>
          )}
        </div>
      ),
      width: 150,
    },
    {
      title: 'Завершен',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </div>
      ),
      width: 100,
      sorter: (a: CompletedRequest, b: CompletedRequest) => 
        dayjs(a.completed_at).unix() - dayjs(b.completed_at).unix(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: CompletedRequest) => {
        const menu = (
          <Menu>
            <Menu.Item key="view" icon={<EyeOutlined />} onClick={() => handleViewRequest(record)}>
              Подробности
            </Menu.Item>
            <Menu.Item key="reopen" icon={<RedoOutlined />} onClick={() => {
              setSelectedRequest(record);
              setReopenModalVisible(true);
            }}>
              Переоткрыть
            </Menu.Item>
            {record.follow_up_required && (
              <Menu.Item key="followup" icon={<CalendarOutlined />} onClick={() => {
                setSelectedRequest(record);
                setFollowUpModalVisible(true);
              }}>
                Запланировать контроль
              </Menu.Item>
            )}
            <Menu.Item key="user" icon={<UserOutlined />} onClick={() => onViewUserProfile?.(record.user.id)}>
              Профиль клиента
            </Menu.Item>
            {record.related_order_id && (
              <Menu.Item key="order" icon={<FileTextOutlined />} onClick={() => onViewRelatedOrder?.(record.related_order_id!)}>
                Связанный заказ
              </Menu.Item>
            )}
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
      width: 80,
      fixed: 'right' as const,
    },
  ];

  return (
    <div>
      {/* Статистические панели */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего завершено"
              value={stats.total}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Успешно решено"
              value={stats.resolved}
              suffix={`/ ${stats.total}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Средняя оценка"
              value={stats.avgSatisfaction}
              precision={1}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
              suffix="/ 5"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Среднее время ответа"
              value={Math.round(stats.avgResponseTime)}
              suffix="мин"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Фильтры и поиск */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Поиск по запросам, клиентам..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Тип запроса"
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: '100%' }}
            >
              <Option value="all">Все типы</Option>
              <Option value="technical">Техническая поддержка</Option>
              <Option value="billing">Вопросы по оплате</Option>
              <Option value="order">Помощь с заказами</Option>
              <Option value="account">Проблемы аккаунта</Option>
              <Option value="suggestion">Предложения</Option>
              <Option value="complaint">Жалобы</Option>
              <Option value="other">Другие вопросы</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Приоритет"
              value={selectedPriority}
              onChange={setSelectedPriority}
              style={{ width: '100%' }}
            >
              <Option value="all">Все приоритеты</Option>
              <Option value="low">Низкий</Option>
              <Option value="medium">Средний</Option>
              <Option value="high">Высокий</Option>
              <Option value="urgent">Срочный</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Результат"
              value={selectedResolutionType}
              onChange={setSelectedResolutionType}
              style={{ width: '100%' }}
            >
              <Option value="all">Все результаты</Option>
              <Option value="resolved">Решен</Option>
              <Option value="closed_no_action">Закрыт без действий</Option>
              <Option value="escalated">Эскалирован</Option>
              <Option value="duplicate">Дубликат</Option>
              <Option value="invalid">Недействительный</Option>
            </Select>
          </Col>
          <Col span={4}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              placeholder={['Дата от', 'Дата до']}
            />
          </Col>
          <Col span={2}>
            <Button 
              type="primary" 
              icon={<ExportOutlined />}
              onClick={handleExport}
              style={{ width: '100%' }}
            >
              Экспорт
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Таблица завершенных запросов */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredRequests}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredRequests.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} завершенных запросов`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Модальное окно с подробностями запроса */}
      <Modal
        title="Подробности завершенного запроса"
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Закрыть
          </Button>
        ]}
        width={800}
      >
        {selectedRequest && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Title level={5}>Информация о запросе</Title>
                <p><strong>ID:</strong> {selectedRequest.id}</p>
                <p><strong>Заголовок:</strong> {selectedRequest.title}</p>
                <p><strong>Описание:</strong> {selectedRequest.description}</p>
                <p><strong>Тип:</strong> <Tag color={getTypeColor(selectedRequest.type)}>{getTypeText(selectedRequest.type)}</Tag></p>
                <p><strong>Приоритет:</strong> <Tag color={getPriorityColor(selectedRequest.priority)}>{getPriorityText(selectedRequest.priority)}</Tag></p>
                <p><strong>Теги:</strong> {selectedRequest.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</p>
              </Col>
              <Col span={12}>
                <Title level={5}>Клиент</Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Avatar src={selectedRequest.user.avatar} icon={<UserOutlined />} />
                  <div>
                    <div><strong>{selectedRequest.user.first_name} {selectedRequest.user.last_name}</strong></div>
                    <Text type="secondary">{selectedRequest.user.email}</Text>
                  </div>
                </div>
                <p><strong>Заказов:</strong> {selectedRequest.user.total_orders}</p>
                <p><strong>Потрачено:</strong> {selectedRequest.user.total_spent.toLocaleString()} ₽</p>
                <p><strong>Регистрация:</strong> {dayjs(selectedRequest.user.registration_date).format('DD.MM.YYYY')}</p>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Title level={5}>Обработка</Title>
                <p><strong>Администратор:</strong> {selectedRequest.assigned_admin.first_name} {selectedRequest.assigned_admin.last_name}</p>
                <p><strong>Создан:</strong> {dayjs(selectedRequest.created_at).format('DD.MM.YYYY HH:mm')}</p>
                <p><strong>Завершен:</strong> {dayjs(selectedRequest.completed_at).format('DD.MM.YYYY HH:mm')}</p>
                <p><strong>Время ответа:</strong> {Math.floor(selectedRequest.response_time_minutes / 60)}ч {selectedRequest.response_time_minutes % 60}м</p>
                <p><strong>Общее время:</strong> {Math.floor(selectedRequest.total_time_minutes / 60)}ч {selectedRequest.total_time_minutes % 60}м</p>
                <p><strong>Сообщений:</strong> {selectedRequest.messages_count}</p>
              </Col>
              <Col span={12}>
                <Title level={5}>Результат</Title>
                <p><strong>Тип решения:</strong> <Tag color={getResolutionTypeColor(selectedRequest.resolution_type)}>{getResolutionTypeText(selectedRequest.resolution_type)}</Tag></p>
                <p><strong>Описание решения:</strong></p>
                <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 12 }}>
                  {selectedRequest.resolution}
                </div>
                {selectedRequest.satisfaction_rating && (
                  <div>
                    <p><strong>Оценка клиента:</strong></p>
                    <Rate disabled value={selectedRequest.satisfaction_rating} />
                    {selectedRequest.satisfaction_comment && (
                      <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                        "{selectedRequest.satisfaction_comment}"
                      </div>
                    )}
                  </div>
                )}
              </Col>
            </Row>

            {selectedRequest.follow_up_required && (
              <>
                <Divider />
                <div>
                  <Title level={5}>Последующий контроль</Title>
                  <p>Требуется контроль выполнения решения</p>
                  {selectedRequest.follow_up_date && (
                    <p><strong>Запланирован на:</strong> {dayjs(selectedRequest.follow_up_date).format('DD.MM.YYYY HH:mm')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно переоткрытия запроса */}
      <Modal
        title="Переоткрыть запрос"
        open={reopenModalVisible}
        onOk={handleReopenRequest}
        onCancel={() => {
          setReopenModalVisible(false);
          setReopenReason('');
          setSelectedRequest(null);
        }}
        okText="Переоткрыть"
        cancelText="Отмена"
      >
        <p>Укажите причину переоткрытия запроса:</p>
        <Input.TextArea
          value={reopenReason}
          onChange={(e) => setReopenReason(e.target.value)}
          placeholder="Например: Клиент сообщил о повторной проблеме..."
          rows={4}
        />
      </Modal>

      {/* Модальное окно планирования контроля */}
      <Modal
        title="Запланировать последующий контроль"
        open={followUpModalVisible}
        onOk={handleScheduleFollowUp}
        onCancel={() => {
          setFollowUpModalVisible(false);
          setFollowUpDate(null);
          setFollowUpNotes('');
          setSelectedRequest(null);
        }}
        okText="Запланировать"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 16 }}>
          <label>Дата и время контроля:</label>
          <DatePicker
            showTime
            value={followUpDate}
            onChange={setFollowUpDate}
            style={{ width: '100%', marginTop: 4 }}
            placeholder="Выберите дату и время"
          />
        </div>
        <div>
          <label>Заметки:</label>
          <Input.TextArea
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
            placeholder="Что нужно проверить или уточнить..."
            rows={4}
            style={{ marginTop: 4 }}
          />
        </div>
      </Modal>
    </div>
  );
};
