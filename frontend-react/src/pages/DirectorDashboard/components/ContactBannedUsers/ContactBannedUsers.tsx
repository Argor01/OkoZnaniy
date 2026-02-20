import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Select,
  Modal,
  message,
  Tooltip,
  Form
} from 'antd';
import { 
  UserOutlined, 
  SearchOutlined,
  EyeOutlined,
  UnlockOutlined,
  WarningOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../../../api/api';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

interface ContactBannedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  contact_ban_date: string;
  contact_ban_reason: string;
  contact_violations_count: number;
  banned_by: string;
  phone: string;
  telegram_id: number | null;
}

const ContactBannedUsers: React.FC = () => {
  const [users, setUsers] = useState<ContactBannedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<ContactBannedUser | null>(null);
  const [unbanModalVisible, setUnbanModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [unbanForm] = Form.useForm();

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  const fetchBannedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users/contact_banned_users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки забаненных пользователей:', error);
      message.error('Не удалось загрузить список забаненных пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = (user: ContactBannedUser) => {
    setSelectedUser(user);
    setUnbanModalVisible(true);
  };

  const handleUnbanConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      await api.patch(`/api/users/${selectedUser.id}/unban_for_contacts/`);
      message.success(`Пользователь ${selectedUser.username} разбанен`);
      setUnbanModalVisible(false);
      setSelectedUser(null);
      unbanForm.resetFields();
      fetchBannedUsers();
    } catch (error) {
      console.error('Ошибка разбана:', error);
      message.error('Не удалось разбанить пользователя');
    }
  };

  const handleViewDetails = (user: ContactBannedUser) => {
    setSelectedUser(user);
    setDetailsModalVisible(true);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: 'Администратор',
      expert: 'Эксперт',
      client: 'Клиент',
      partner: 'Партнер',
      arbitrator: 'Арбитр',
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'red',
      expert: 'blue',
      client: 'green',
      partner: 'orange',
      arbitrator: 'purple',
    };
    return roleColors[role] || 'default';
  };

  const filteredData = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const columns = [
    {
      title: 'Пользователь',
      key: 'user',
      width: 250,
      render: (record: ContactBannedUser) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.username}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.first_name} {record.last_name}
          </Text>
          {record.email && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <MailOutlined /> {record.email}
            </Text>
          )}
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
      title: 'Причина бана',
      dataIndex: 'contact_ban_reason',
      key: 'contact_ban_reason',
      width: 250,
      render: (reason: string) => (
        <Tooltip title={reason}>
          <Text ellipsis style={{ maxWidth: 230, display: 'block' }}>
            {reason}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Дата бана',
      dataIndex: 'contact_ban_date',
      key: 'contact_ban_date',
      width: 150,
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: 'Нарушений',
      dataIndex: 'contact_violations_count',
      key: 'contact_violations_count',
      width: 100,
      render: (count: number) => (
        <Tag color={count > 3 ? 'red' : count > 1 ? 'orange' : 'yellow'} icon={<WarningOutlined />}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Забанил',
      dataIndex: 'banned_by',
      key: 'banned_by',
      width: 120,
      render: (bannedBy: string) => (
        <Text type="secondary">{bannedBy}</Text>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (record: ContactBannedUser) => (
        <Space>
          <Tooltip title="Подробно">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Разбанить">
            <Button 
              size="small" 
              type="primary"
              icon={<UnlockOutlined />}
              onClick={() => handleUnbanUser(record)}
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
          <Title level={4}>Баны за обмен контактами</Title>
          <Text type="secondary">
            Пользователи, забаненные за попытку обмена контактными данными в переписках
          </Text>
        </div>

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
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Tag color="red">
            Всего забанено: {filteredData.length}
          </Tag>
          <Tag color="blue">
            Экспертов: {filteredData.filter(u => u.role === 'expert').length}
          </Tag>
          <Tag color="green">
            Клиентов: {filteredData.filter(u => u.role === 'client').length}
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
          locale={{ emptyText: 'Забаненные пользователи не найдены' }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Модальное окно деталей */}
      <Modal
        title={`Детали пользователя: ${selectedUser?.username}`}
        open={detailsModalVisible}
        onCancel={() => {
          setDetailsModalVisible(false);
          setSelectedUser(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="unban" 
            type="primary" 
            onClick={() => {
              setDetailsModalVisible(false);
              handleUnbanUser(selectedUser!);
            }}
          >
            Разбанить
          </Button>,
        ]}
        width={600}
      >
        {selectedUser && (
          <div style={{ padding: '12px 0' }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text strong>Основная информация:</Text>
                <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                  <div><strong>Username:</strong> {selectedUser.username}</div>
                  <div><strong>Имя:</strong> {selectedUser.first_name} {selectedUser.last_name}</div>
                  <div><strong>Email:</strong> {selectedUser.email || 'Не указан'}</div>
                  <div><strong>Телефон:</strong> {selectedUser.phone || 'Не указан'}</div>
                  <div><strong>Telegram ID:</strong> {selectedUser.telegram_id || 'Не указан'}</div>
                  <div><strong>Роль:</strong> <Tag color={getRoleColor(selectedUser.role)}>{getRoleLabel(selectedUser.role)}</Tag></div>
                </div>
              </div>

              <div>
                <Text strong>Информация о бане:</Text>
                <div style={{ marginTop: 8, padding: 12, background: '#fff2e8', borderRadius: 6 }}>
                  <div><strong>Дата бана:</strong> {selectedUser.contact_ban_date ? dayjs(selectedUser.contact_ban_date).format('DD.MM.YYYY HH:mm') : '-'}</div>
                  <div><strong>Причина:</strong> {selectedUser.contact_ban_reason}</div>
                  <div><strong>Количество нарушений:</strong> <Tag color={selectedUser.contact_violations_count > 3 ? 'red' : 'orange'}>{selectedUser.contact_violations_count}</Tag></div>
                  <div><strong>Забанил:</strong> {selectedUser.banned_by}</div>
                </div>
              </div>
            </Space>
          </div>
        )}
      </Modal>

      {/* Модальное окно разбана */}
      <Modal
        title={`Разбанить пользователя ${selectedUser?.username}`}
        open={unbanModalVisible}
        onOk={handleUnbanConfirm}
        onCancel={() => {
          setUnbanModalVisible(false);
          setSelectedUser(null);
          unbanForm.resetFields();
        }}
        okText="Разбанить"
        cancelText="Отмена"
        okButtonProps={{ type: 'primary' }}
      >
        {selectedUser && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Информация о пользователе:</Text>
              <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                <div><strong>Имя:</strong> {selectedUser.first_name} {selectedUser.last_name}</div>
                <div><strong>Email:</strong> {selectedUser.email || 'Не указан'}</div>
                <div><strong>Причина бана:</strong> {selectedUser.contact_ban_reason}</div>
                <div><strong>Нарушений:</strong> {selectedUser.contact_violations_count}</div>
              </div>
            </div>
            
            <Text type="warning">
              Вы уверены, что хотите разбанить этого пользователя? Он снова сможет отправлять сообщения в чатах.
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContactBannedUsers;
