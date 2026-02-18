import React from 'react';
import { Card, Table, Button, Tag, Space, Avatar, Typography } from 'antd';
import { UserOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  avatar?: string;
}

interface UsersManagementSectionProps {
  users?: User[];
  loading?: boolean;
  onBlockUser?: (userId: number) => void;
  onUnblockUser?: (userId: number) => void;
  onChangeRole?: (userId: number, role: string) => void;
}

export const UsersManagementSection: React.FC<UsersManagementSectionProps> = ({
  users = [],
  loading = false,
  onBlockUser,
  onUnblockUser,
  onChangeRole,
}) => {
  const navigate = useNavigate();

  console.log('👥 UsersManagementSection - users:', users);
  console.log('👥 First user:', users[0]);

  const handleUserClick = (userId: number) => {
    navigate(`/user/${userId}`);
  };
  const columns = [
    {
      title: 'Пользователь',
      key: 'user',
      render: (record: User) => (
        <Space>
          <Avatar size={40} src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div>
              <Button 
                type="link" 
                style={{ 
                  padding: 0, 
                  height: 'auto', 
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
                onClick={() => handleUserClick(record.id)}
              >
                {record.username}
              </Button>
            </div>
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
      render: (role: string) => {
        const roleColors = {
          admin: 'red',
          expert: 'blue',
          client: 'green',
          partner: 'orange',
        };
        const roleLabels = {
          admin: 'Администратор',
          expert: 'Эксперт',
          client: 'Клиент',
          partner: 'Партнер',
        };
        return (
          <Tag color={roleColors[role as keyof typeof roleColors]}>
            {roleLabels[role as keyof typeof roleLabels] || role}
          </Tag>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag 
          color={isActive ? 'green' : 'red'} 
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
        >
          {isActive ? 'Активен' : 'Заблокирован'}
        </Tag>
      ),
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => {
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
      },
    },
    {
      title: 'Последний вход',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date?: string | null) => {
        if (!date) return <Text type="secondary">—</Text>;
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: User) => (
        <Space>
          {record.is_active ? (
            <Button 
              size="small" 
              danger
              icon={<StopOutlined />}
              onClick={() => onBlockUser?.(record.id)}
            >
              Заблокировать
            </Button>
          ) : (
            <Button 
              size="small" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => onUnblockUser?.(record.id)}
            >
              Разблокировать
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Мок данные для демонстрации
  const mockUsers: User[] = [
    {
      id: 1,
      username: 'john_doe',
      email: 'john@example.com',
      first_name: 'Иван',
      last_name: 'Иванов',
      role: 'client',
      is_active: true,
      date_joined: '2024-01-15T10:30:00Z',
      last_login: '2024-02-01T14:20:00Z',
    },
    {
      id: 2,
      username: 'expert_maria',
      email: 'maria@example.com',
      first_name: 'Мария',
      last_name: 'Петрова',
      role: 'expert',
      is_active: true,
      date_joined: '2024-01-10T09:15:00Z',
      last_login: '2024-02-02T16:45:00Z',
    },
    {
      id: 3,
      username: 'blocked_user',
      email: 'blocked@example.com',
      first_name: 'Заблокированный',
      last_name: 'Пользователь',
      role: 'client',
      is_active: false,
      date_joined: '2024-01-05T12:00:00Z',
    },
  ];

  return (
    <Card title="Управление пользователями">
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: 'Пользователи не найдены' }}
      />
    </Card>
  );
};