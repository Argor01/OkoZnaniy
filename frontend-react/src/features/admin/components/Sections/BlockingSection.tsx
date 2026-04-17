import React, { useState } from 'react';
import { Table, Button, Space, Tag, Modal, message, Tooltip, Input, Form, Select, Card, Typography } from 'antd';
import { LockOutlined, UnlockOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUsers, useUserActions } from '@/features/admin/hooks';
import { AdminUser } from '@/features/admin/types/admin';

const { Text, Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface BlockingTableProps {
  users?: AdminUser[];
  loading?: boolean;
  onBlockUser?: (userId: number) => Promise<void>;
  onUnblockUser?: (userId: number) => Promise<void>;
}

export const BlockingTable: React.FC<BlockingTableProps> = ({
  users = [],
  loading = false,
  onBlockUser,
  onUnblockUser,
}) => {
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'block' | 'unblock' | null>(null);
  const [form] = Form.useForm();

  const dataSource = users;

  const filteredData = dataSource.filter(user => {
    // Исключаем директоров из списка - администратор не может их блокировать
    if (user.role === 'director') {
      return false;
    }
    
    const searchLower = searchText.toLowerCase();
    const matchesSearch = 
      (user.username || '').toLowerCase().includes(searchLower) ||
      (user.email || '').toLowerCase().includes(searchLower) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleBlockUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActionType('block');
    setActionModalVisible(true);
    form.resetFields();
  };

  const handleUnblockUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActionType('unblock');
    setActionModalVisible(true);
    form.resetFields();
  };

  const handleActionConfirm = async () => {
    if (!selectedUser || !actionType) return;
    
    try {
      const values = await form.validateFields();
      if (actionType === 'block' && onBlockUser) {
        await onBlockUser(selectedUser.id);
        message.success(`Пользователь ${selectedUser.username} заблокирован`);
      } else if (actionType === 'unblock' && onUnblockUser) {
        await onUnblockUser(selectedUser.id);
        message.success(`Пользователь ${selectedUser.username} разблокирован`);
      }
      setActionModalVisible(false);
      setSelectedUser(null);
      setActionType(null);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: 'Администратор',
      director: 'Директор',
      expert: 'Эксперт',
      client: 'Клиент',
      partner: 'Партнер',
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'red',
      director: 'purple',
      expert: 'blue',
      client: 'green',
      partner: 'orange',
    };
    return roleColors[role] || 'default';
  };

  const columns = [
    {
      title: 'Пользователь',
      key: 'user',
      width: 250,
      render: (record: AdminUser) => (
        <Space>
          <div>
            <div><strong>{record.username}</strong></div>
            <Text type="secondary">
              {record.first_name} {record.last_name}
            </Text>
            <br />
            <Text type="secondary">
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
      width: 120,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleLabel(role)}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      key: 'is_blocked',
      width: 100,
      render: (record: AdminUser) => (
        <Tag color={record.is_blocked ? 'red' : 'green'}>
          {record.is_blocked ? 'Заблокирован' : 'Активен'}
        </Tag>
      ),
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      width: 120,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (record: AdminUser) => (
        <Space>
          {record.is_blocked ? (
            <Tooltip title="Разблокировать">
              <Button 
                size="small" 
                type="primary"
                icon={<UnlockOutlined />}
                onClick={() => handleUnblockUser(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Заблокировать">
              <Button 
                size="small" 
                danger
                icon={<LockOutlined />}
                onClick={() => handleBlockUser(record)}
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
        <div className="blockedUsersHeader">
          <Title level={4}>Блокировка пользователей</Title>
          <Text type="secondary">
            Управление доступом пользователей системы
          </Text>
        </div>

        
        <div className="blockedUsersFiltersRow">
          <Search
            placeholder="Поиск по имени, email или username"
            allowClear
            className="blockedUsersSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Роль"
            className="blockedUsersSelectRole"
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="all">Все роли</Option>
            <Option value="admin">Администраторы</Option>
            <Option value="expert">Эксперты</Option>
            <Option value="client">Клиенты</Option>
            <Option value="partner">Партнеры</Option>
          </Select>
        </div>

        <div className="blockedUsersSummaryRow">
          <Tag color="green">
            Активных: {filteredData.filter(u => !u.is_blocked).length}
          </Tag>
          <Tag color="red">
            Заблокировано: {filteredData.filter(u => u.is_blocked).length}
          </Tag>
          <Tag color="blue">
            Всего: {filteredData.length}
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
          locale={{ emptyText: 'Пользователи не найдены' }}
          scroll={{ x: 800 }}
        />
      </Card>

      
      <Modal
        title={actionType === 'block' 
          ? `Заблокировать пользователя ${selectedUser?.username}`
          : `Разблокировать пользователя ${selectedUser?.username}`
        }
        open={actionModalVisible}
        onOk={handleActionConfirm}
        onCancel={() => {
          setActionModalVisible(false);
          setSelectedUser(null);
          setActionType(null);
          form.resetFields();
        }}
        okText={actionType === 'block' ? 'Заблокировать' : 'Разблокировать'}
        cancelText="Отмена"
        okButtonProps={{ 
          danger: actionType === 'block', 
          type: actionType === 'block' ? 'default' : 'primary' 
        }}
      >
        <Form form={form} layout="vertical">
          <div className="blockedUsersModalInfo">
            <Text strong>Информация о пользователе:</Text>
            <div className="blockedUsersModalInfoBox">
              <div><strong>Имя:</strong> {selectedUser?.first_name} {selectedUser?.last_name}</div>
              <div><strong>Email:</strong> {selectedUser?.email}</div>
              <div><strong>Роль:</strong> {getRoleLabel(selectedUser?.role || '')}</div>
              <div><strong>Статус:</strong> {selectedUser?.is_blocked ? 'Заблокирован' : 'Активен'}</div>
            </div>
          </div>
          
          <Form.Item
            name="reason"
            label={actionType === 'block' ? 'Причина блокировки' : 'Причина разблокировки'}
            rules={[{ required: true, message: `Укажите причину ${actionType === 'block' ? 'блокировки' : 'разблокировки'}` }]}
          >
            <Input.TextArea
              rows={3}
              placeholder={actionType === 'block' 
                ? 'Укажите причину блокировки пользователя...' 
                : 'Укажите причину разблокировки пользователя...'
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const BlockingSection: React.FC = () => {
  const { users, loading } = useUsers();
  const { blockUser, unblockUser } = useUserActions();

  return (
    <BlockingTable
      users={users}
      loading={loading}
      onBlockUser={blockUser}
      onUnblockUser={unblockUser}
    />
  );
};
