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

import { useClaims, useClaimActions, useTicketActions } from '../../hooks';

export const InProgressClaimsSection: React.FC = () => {
  const { claims, loading, refetch } = useClaims('in_progress', true);
  const { completeClaim, updateProgress } = useClaimActions();
  const { sendMessage, assignAdmin } = useTicketActions();

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

  
  const claimsData = Array.isArray(claims) ? claims : [];

  
  const filteredClaims = claimsData.filter(claim => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = (claim.title || '').toLowerCase().includes(searchLower) ||
                         (claim.description || '').toLowerCase().includes(searchLower) ||
                         `${claim.user.first_name || ''} ${claim.user.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const matchesCategory = selectedCategory === 'all' || claim.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || claim.priority === selectedPriority;
    const matchesAdmin = selectedAdmin === 'all' || claim.assigned_admin.username === selectedAdmin;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesAdmin;
  });

  
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setViewModalVisible(true);
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
        await completeClaim(selectedClaim.id, values.resolution);
        message.success(`Обращение "${selectedClaim.title}" завершено`);
        setCompleteModalVisible(false);
        refetch();
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
        await updateProgress(selectedClaim.id, values.progress);
        message.success('Прогресс обновлен');
        setProgressModalVisible(false);
        refetch();
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
        await sendMessage(selectedClaim.id, values.message, 'claim');
        message.success('Сообщение отправлено');
        setMessageModalVisible(false);
        refetch();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
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
          <div className="inProgressClaimsTitle">
            {record.title}
          </div>
          <Text type="secondary" className="inProgressClaimsDescription">
            {record.description.length > 80 
              ? `${record.description.substring(0, 80)}...` 
              : record.description
            }
          </Text>
          <div className="inProgressClaimsTagRow">
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
        <div className="inProgressClaimsUserRow">
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div className="inProgressClaimsUserName">
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" className="inProgressClaimsUserHandle">
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
          <div className="inProgressClaimsAdminName">
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </div>
          <Text type="secondary" className="inProgressClaimsAdminHandle">
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
          <MessageOutlined className="inProgressClaimsMessageIcon" />
        </Badge>
      ),
    },
    {
      title: 'Активность',
      dataIndex: 'last_activity',
      key: 'last_activity',
      width: 100,
      render: (date: string) => (
        <div className="inProgressClaimsActivityCell">
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
        <div className="inProgressClaimsHeader">
          <Title level={4}>Обращения в работе</Title>
          <Text type="secondary">
            Обращения, которые находятся в процессе обработки
          </Text>
        </div>

        
        <div className="inProgressClaimsFiltersRow">
          <Search
            placeholder="Поиск по обращениям"
            allowClear
            className="inProgressClaimsSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Категория"
            className="inProgressClaimsSelectCategory"
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
            className="inProgressClaimsSelectPriority"
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
            className="inProgressClaimsSelectAdmin"
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
          dataSource={filteredClaims as any[]}
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
            <div className="inProgressClaimsModalHeader">
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

            <div className="inProgressClaimsSectionBlock">
              <Text strong>Прогресс выполнения:</Text>
              <Progress 
                percent={selectedClaim.progress_percentage} 
                strokeColor={getProgressColor(selectedClaim.progress_percentage)}
                className="inProgressClaimsProgress"
              />
            </div>

            <Divider />

            <div className="inProgressClaimsDetailsRow">
              <div className="inProgressClaimsDetailsColumn">
                <Text strong>Пользователь:</Text>
                <div className="inProgressClaimsInfoRow">
                  <Avatar size={32} icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.user.first_name} {selectedClaim.user.last_name}</div>
                    <Text type="secondary">@{selectedClaim.user.username}</Text>
                    <br />
                    <Text type="secondary">{selectedClaim.user.email}</Text>
                  </div>
                </div>
              </div>

              <div className="inProgressClaimsDetailsColumn">
                <Text strong>Администратор:</Text>
                <div className="inProgressClaimsInfoRow">
                  <Avatar size={32} icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.assigned_admin.first_name} {selectedClaim.assigned_admin.last_name}</div>
                    <Text type="secondary">@{selectedClaim.assigned_admin.username}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div className="inProgressClaimsSectionBlock">
              <Text strong>Описание:</Text>
              <Paragraph className="inProgressClaimsParagraph">
                {selectedClaim.description}
              </Paragraph>
            </div>

            {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
              <div className="inProgressClaimsSectionBlock">
                <Text strong>Вложения:</Text>
                <div className="inProgressClaimsAttachmentsRow">
                  {selectedClaim.attachments.map((file, index) => (
                    <Tag key={index} color="blue">📎 {file}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div className="inProgressClaimsMetaRow">
              <span>Создано: {dayjs(selectedClaim.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Взято в работу: {dayjs(selectedClaim.taken_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Сообщений: {selectedClaim.messages_count}</span>
            </div>

            {selectedClaim.estimated_completion && (
              <div className="inProgressClaimsMetaSummary">
                Планируемое завершение: {dayjs(selectedClaim.estimated_completion).format('DD.MM.YYYY HH:mm')}
              </div>
            )}
          </div>
        )}
      </Modal>

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
