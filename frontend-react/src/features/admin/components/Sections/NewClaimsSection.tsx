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
  Popconfirm
} from 'antd';
import { 
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  FilterOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useClaims, useClaimActions } from '@/features/admin/hooks/useAdminPanelData';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

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
  attachments?: string[];
  messages_count: number;
  assigned_admin?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
}

export const NewClaimsSection: React.FC = () => {
  const { claims, loading, refetch } = useClaims('new', true);
  const { takeInWork, rejectClaim } = useClaimActions();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  const [rejectForm] = Form.useForm();

  
  const claimsData = (Array.isArray(claims) ? claims : []) as Claim[];

  
  const filteredClaims = claimsData.filter(claim => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = (claim.title || '').toLowerCase().includes(searchLower) ||
                         (claim.description || '').toLowerCase().includes(searchLower) ||
                         `${claim.user.first_name || ''} ${claim.user.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const matchesCategory = selectedCategory === 'all' || claim.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || claim.priority === selectedPriority;
    
    let matchesDate = true;
    if (dateRange) {
      const claimDate = dayjs(claim.created_at);
      matchesDate = claimDate.isAfter(dateRange[0]) && claimDate.isBefore(dateRange[1]);
    }
    
    return matchesSearch && matchesCategory && matchesPriority && matchesDate;
  });

  
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setViewModalVisible(true);
  };

  const handleTakeInWork = async (claim: Claim) => {
    await takeInWork(claim.id);
    message.success(`Обращение "${claim.title}" взято в работу`);
    refetch();
  };

  const handleRejectClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (selectedClaim) {
        await rejectClaim(selectedClaim.id, values.reason);
        message.success(`Обращение "${selectedClaim.title}" отклонено`);
        setRejectModalVisible(false);
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

  const columns = [
    {
      title: 'Обращение',
      key: 'claim',
      render: (record: Claim) => (
        <div>
          <div className="newClaimsTitle">
            {record.title}
          </div>
          <Text type="secondary" className="newClaimsDescription">
            {record.description.length > 100 
              ? `${record.description.substring(0, 100)}...` 
              : record.description
            }
          </Text>
          <div className="newClaimsTagRow">
            <Tag color={getCategoryColor(record.category)}>
              {getCategoryText(record.category)}
            </Tag>
            <Tag color={getPriorityColor(record.priority)}>
              {getPriorityText(record.priority)}
            </Tag>
            {record.attachments && record.attachments.length > 0 && (
              <Tag color="blue">📎 {record.attachments.length}</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Пользователь',
      key: 'user',
      width: 200,
      render: (record: Claim) => (
        <div className="newClaimsUserRow">
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div className="newClaimsUserName">
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" className="newClaimsUserHandle">
              @{record.user.username}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Сообщения',
      dataIndex: 'messages_count',
      key: 'messages_count',
      width: 100,
      render: (count: number) => (
        <Badge count={count} showZero>
          <MessageOutlined className="newClaimsMessageIcon" />
        </Badge>
      ),
    },
    {
      title: 'Создано',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <div className="newClaimsCreatedCell">
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
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
          <Tooltip title="Взять в работу">
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleTakeInWork(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Отклонить обращение?"
            description="Вы уверены, что хотите отклонить это обращение?"
            onConfirm={() => handleRejectClaim(record)}
            okText="Отклонить"
            cancelText="Отмена"
          >
            <Tooltip title="Отклонить">
              <Button 
                size="small" 
                danger
                icon={<CloseOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="newClaimsHeader">
          <Title level={4}>Новые обращения</Title>
          <Text type="secondary">
            Обращения пользователей, ожидающие обработки
          </Text>
        </div>

        <div className="newClaimsFiltersRow">
          <Search
            placeholder="Поиск по обращениям"
            allowClear
            className="newClaimsSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Категория"
            className="newClaimsSelectCategory"
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
            className="newClaimsSelectPriority"
            value={selectedPriority}
            onChange={setSelectedPriority}
          >
            <Option value="all">Все</Option>
            <Option value="urgent">Срочно</Option>
            <Option value="high">Высокий</Option>
            <Option value="medium">Средний</Option>
            <Option value="low">Низкий</Option>
          </Select>

          <RangePicker
            placeholder={['От', 'До']}
            value={dateRange}
            onChange={setDateRange}
            className="newClaimsDateRange"
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
              `${range[0]}-${range[1]} из ${total} обращений`
          }}
          locale={{ emptyText: 'Новые обращения не найдены' }}
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
            key="take" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              if (selectedClaim) {
                handleTakeInWork(selectedClaim);
                setViewModalVisible(false);
              }
            }}
          >
            Взять в работу
          </Button>,
        ]}
        width={700}
      >
        {selectedClaim && (
          <div>
            <div className="newClaimsModalHeader">
              <Title level={5}>{selectedClaim.title}</Title>
              <Space>
                <Tag color={getCategoryColor(selectedClaim.category)}>
                  {getCategoryText(selectedClaim.category)}
                </Tag>
                <Tag color={getPriorityColor(selectedClaim.priority)}>
                  {getPriorityText(selectedClaim.priority)}
                </Tag>
              </Space>
            </div>

            <Divider />

            <div className="newClaimsSectionBlock">
              <Text strong>Пользователь:</Text>
              <div className="newClaimsInfoRow">
                <Avatar size={32} icon={<UserOutlined />} />
                <div>
                  <div>{selectedClaim.user.first_name} {selectedClaim.user.last_name}</div>
                  <Text type="secondary">@{selectedClaim.user.username}</Text>
                  <br />
                  <Text type="secondary">{selectedClaim.user.email}</Text>
                </div>
              </div>
            </div>

            <div className="newClaimsSectionBlock">
              <Text strong>Описание:</Text>
              <Paragraph className="newClaimsParagraph">
                {selectedClaim.description}
              </Paragraph>
            </div>

            {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
              <div className="newClaimsSectionBlock">
                <Text strong>Вложения:</Text>
                <div className="newClaimsAttachmentsRow">
                  {selectedClaim.attachments.map((file, index) => (
                    <Tag key={index} color="blue">📎 {file}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div className="newClaimsMetaRow">
              <span>Создано: {dayjs(selectedClaim.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Сообщений: {selectedClaim.messages_count}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Отклонить обращение"
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
              placeholder="Опишите причину отклонения обращения..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
