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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import styles from './ContactBannedUsers.module.css';

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
  const queryClient = useQueryClient();
  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug_api') === '1';
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<ContactBannedUser | null>(null);
  const [unbanModalVisible, setUnbanModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [unbanForm] = Form.useForm();

  // Используем React Query для загрузки данных
  const { data: users = [], isLoading: loading } = useQuery<ContactBannedUser[]>({
    queryKey: ['contact-banned-users'],
    queryFn: async () => {
      const response = await apiClient.get('/users/contact_banned_users/');
      return response.data;
    },
    refetchInterval: 30000, // Автообновление каждые 30 секунд
    refetchOnWindowFocus: true, // Обновление при фокусе окна
  });

  // Мутация для разбана пользователя
  const unbanMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.patch(`/users/${userId}/unban_for_contacts/`);
    },
    onSuccess: (_, userId) => {
      const user = users.find(u => u.id === userId);
      message.success(`Пользователь ${user?.username} разбанен`);
      setUnbanModalVisible(false);
      setSelectedUser(null);
      unbanForm.resetFields();
      // Инвалидируем кэш для обновления данных
      queryClient.invalidateQueries({ queryKey: ['contact-banned-users'] });
    },
    onError: (error) => {
      if (debugEnabled) console.error('Ошибка разбана:', error);
      message.error('Не удалось разбанить пользователя');
    },
  });

  const handleUnbanUser = (user: ContactBannedUser) => {
    setSelectedUser(user);
    setUnbanModalVisible(true);
  };

  const handleUnbanConfirm = async () => {
    if (!selectedUser) return;
    unbanMutation.mutate(selectedUser.id);
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
      director: 'Директор',
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
          <Text type="secondary" className={styles.userSecondaryText}>
            {record.first_name} {record.last_name}
          </Text>
          {record.email && (
            <Text type="secondary" className={styles.userSecondaryText}>
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
          <Text ellipsis className={styles.reasonText}>
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
        <div className={styles.filtersRow}>
          <Search
            placeholder="Поиск по имени, email или username"
            allowClear
            className={styles.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Роль"
            className={styles.roleSelect}
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="all">Все роли</Option>
            <Option value="client">Клиенты</Option>
            <Option value="expert">Эксперты</Option>
            <Option value="partner">Партнеры</Option>
          </Select>
        </div>

        <div className={styles.statsRow}>
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
          <div className={styles.detailsBody}>
            <Space direction="vertical" size={16} className={styles.detailsSpace}>
              <div>
                <Text strong>Основная информация:</Text>
                <div className={styles.infoBlock}>
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
                <div className={styles.banInfoBlock}>
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
        okButtonProps={{ type: 'primary', loading: unbanMutation.isPending }}
        confirmLoading={unbanMutation.isPending}
      >
        {selectedUser && (
          <div>
            <div className={styles.unbanSection}>
              <Text strong>Информация о пользователе:</Text>
              <div className={styles.infoBlock}>
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
