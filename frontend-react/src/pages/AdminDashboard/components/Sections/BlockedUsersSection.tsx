import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Avatar, 
  Typography, 
  Input,
  Select,
  Modal,
  message,
  Tooltip,
  DatePicker,
  Form
} from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  UnlockOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface BlockedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  blocked_at: string;
  blocked_by: string;
  block_reason: string;
  block_duration?: string; // temporary, permanent
  unblock_date?: string;
  last_login?: string;
  registration_date: string;
  violation_count: number;
}

interface BlockedUsersSectionProps {
  users?: BlockedUser[];
  loading?: boolean;
  onUnblockUser?: (userId: number, reason?: string) => void;
  onViewUserDetails?: (userId: number) => void;
}

export const BlockedUsersSection: React.FC<BlockedUsersSectionProps> = ({
  users = [],
  loading = false,
  onUnblockUser,
  onViewUserDetails,
}) => {
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [blockTypeFilter, setBlockTypeFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [unblockModalVisible, setUnblockModalVisible] = useState(false);
  const [unblockForm] = Form.useForm();

  // Мок данные для демонстрации
  const mockBlockedUsers: BlockedUser[] = [
    {
      id: 1,
      username: 'blocked_user1',
      email: 'blocked1@example.com',
      first_name: 'Иван',
      last_name: 'Заблокированный',
      role: 'client',
      blocked_at: '2024-01-20T10:30:00Z',
      blocked_by: 'admin',
      block_reason: 'Нарушение правил сообщества',
      block_duration: 'temporary',
      unblock_date: '2024-02-20T10:30:00Z',
      last_login: '2024-01-19T15:20:00Z',
      registration_date: '2023-12-01T09:00:00Z',
      violation_count: 3,
    },
    {
      id: 2,
      username: 'spammer_user',
      email: 'spam@example.com',
      first_name: 'Спам',
      last_name: 'Пользователь',
      role: 'expert',
      blocked_at: '2024-01-15T14:45:00Z',
      blocked_by: 'admin',
      block_reason: 'Спам и реклама',
      block_duration: 'permanent',
      last_login: '2024-01-15T12:30:00Z',
      registration_date: '2023-11-15T11:20:00Z',
      violation_count: 5,
    },
    {
      id: 3,
      username: 'fraud_user',
      email: 'fraud@example.com',
      first_name: 'Мошенник',
      last_name: 'Пользователь',
      role: 'client',
      blocked_at: '2024-01-10T16:20:00Z',
      blocked_by: 'admin',
      block_reason: 'Мошенничество',
      block_duration: 'permanent',
      last_login: '2024-01-10T14:15:00Z',
      registration_date: '2023-10-05T13:45:00Z',
      violation_count: 1,
    },
  ];

  const dataSource = users.length > 0 ? users : mockBlockedUsers;

  // Фильтрация данных
  const filteredData = dataSource.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesBlockType = blockTypeFilter === 'all' || user.block_duration === blockTypeFilter;
    
    return matchesSearch && matchesRole && matchesBlockType;
  });

  const handleUnblockUser = (user: BlockedUser) => {
    setSelectedUser(user);
    setUnblockModalVisible(true);
  };

  const handleUnblockConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      const values = await unblockForm.validateFields();
      onUnblockUser?.(selectedUser.id, values.reason);
      message.success(`Пользователь ${selectedUser.username} разблокирован`);
      setUnblockModalVisible(false);
      setSelectedUser(null);
      unblockForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      admin: 'Администратор',
      expert: 'Эксперт',
      client: 'Клиент',
      partner: 'Партнер',
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors = {
      admin: 'red',
      expert: 'blue',
      client: 'green',
      partner: 'orange',
    };
    return roleColors[role as keyof typeof roleColors] || 'default';
  };

  const getBlockTypeColor = (blockType: string) => {
    return blockType === 'permanent' ? 'red' : 'orange';
  };

  const getBlockTypeLabel = (blockType: string) => {
    return blockType === 'permanent' ? 'Постоянная' : 'Временная';
  };

  const columns = [
    {
      title: 'Пользователь',
      key: 'user',
      width: 250,
      render: (record: BlockedUser) => (
        <Space>
          <div>
            <div><strong>{record.username}</strong></div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.first_name} {record.last_name}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleLabel(role)}
        </Tag>
      ),
    },
    {
      title: 'Тип блокировки',
      dataIndex: 'block_duration',
      key: 'block_duration',
      width: 120,
      render: (blockType: string) => (
        <Tag color={getBlockTypeColor(blockType)} icon={<ClockCircleOutlined />}>
          {getBlockTypeLabel(blockType)}
        </Tag>
      ),
    },
    {
      title: 'Причина блокировки',
      dataIndex: 'block_reason',
      key: 'block_reason',
      width: 200,
      render: (reason: string) => (
        <Tooltip title={reason}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {reason}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Дата блокировки',
      dataIndex: 'blocked_at',
      key: 'blocked_at',
      width: 120,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Разблокировка',
      dataIndex: 'unblock_date',
      key: 'unblock_date',
      width: 120,
      render: (date: string | undefined, record: BlockedUser) => {
        if (record.block_duration === 'permanent') {
          return <Text type="secondary">Постоянно</Text>;
        }
        return date ? dayjs(date).format('DD.MM.YYYY') : '-';
      },
    },
    {
      title: 'Нарушения',
      dataIndex: 'violation_count',
      key: 'violation_count',
      width: 100,
      render: (count: number) => (
        <Tag color={count > 3 ? 'red' : count > 1 ? 'orange' : 'green'}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (record: BlockedUser) => (
        <Space>
          <Tooltip title="Подробно">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => onViewUserDetails?.(record.id)}
            />
          </Tooltip>
          <Tooltip title="Разблокировать">
            <Button 
              size="small" 
              type="primary"
              icon={<UnlockOutlined />}
              onClick={() => handleUnblockUser(record)}
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
          <Title level={4}>Заблокированные пользователи</Title>
          <Text type="secondary">
            Управление заблокированными пользователями системы
          </Text>
        </div>

        {/* Фильтры */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по имени, email или username"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Роль"
            style={{ width: 150 }}
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="all">Все роли</Option>
            <Option value="client">Клиенты</Option>
            <Option value="expert">Эксперты</Option>
            <Option value="partner">Партнеры</Option>
          </Select>

          <Select
            placeholder="Тип блокировки"
            style={{ width: 150 }}
            value={blockTypeFilter}
            onChange={setBlockTypeFilter}
          >
            <Option value="all">Все типы</Option>
            <Option value="temporary">Временная</Option>
            <Option value="permanent">Постоянная</Option>
          </Select>
        </div>

        {/* Статистика */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Tag color="red">
            Всего заблокированных: {filteredData.length}
          </Tag>
          <Tag color="orange">
            Временно: {filteredData.filter(u => u.block_duration === 'temporary').length}
          </Tag>
          <Tag color="red">
            Постоянно: {filteredData.filter(u => u.block_duration === 'permanent').length}
          </Tag>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} пользователей`
          }}
          locale={{ emptyText: 'Заблокированные пользователи не найдены' }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Модальное окно разблокировки */}
      <Modal
        title={`Разблокировать пользователя ${selectedUser?.username}`}
        open={unblockModalVisible}
        onOk={handleUnblockConfirm}
        onCancel={() => {
          setUnblockModalVisible(false);
          setSelectedUser(null);
          unblockForm.resetFields();
        }}
        okText="Разблокировать"
        cancelText="Отмена"
        okButtonProps={{ danger: false, type: 'primary' }}
      >
        <Form form={unblockForm} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <Text strong>Информация о пользователе:</Text>
            <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <div><strong>Имя:</strong> {selectedUser?.first_name} {selectedUser?.last_name}</div>
              <div><strong>Email:</strong> {selectedUser?.email}</div>
              <div><strong>Причина блокировки:</strong> {selectedUser?.block_reason}</div>
              <div><strong>Дата блокировки:</strong> {selectedUser?.blocked_at ? dayjs(selectedUser.blocked_at).format('DD.MM.YYYY HH:mm') : '-'}</div>
            </div>
          </div>
          
          <Form.Item
            name="reason"
            label="Причина разблокировки"
            rules={[{ required: true, message: 'Укажите причину разблокировки' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Укажите причину разблокировки пользователя..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};