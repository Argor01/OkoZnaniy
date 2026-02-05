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
  Form,
  Checkbox,
  Divider,
  Alert,
  Tabs
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined,
  SafetyOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

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
  permissions: string[];
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  users_count: number;
  is_system: boolean;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string;
}

interface UserRolesSectionProps {
  users?: User[];
  roles?: Role[];
  permissions?: Permission[];
  loading?: boolean;
  onChangeUserRole?: (userId: number, newRole: string) => void;
  onUpdateRolePermissions?: (roleId: string, permissions: string[]) => void;
  onCreateRole?: (roleData: Partial<Role>) => void;
  onDeleteRole?: (roleId: string) => void;
}

export const UserRolesSection: React.FC<UserRolesSectionProps> = ({
  users = [],
  roles = [],
  permissions = [],
  loading = false,
  onChangeUserRole,
  onUpdateRolePermissions,
  onCreateRole,
  onDeleteRole,
}) => {
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [createRoleModalVisible, setCreateRoleModalVisible] = useState(false);
  const [roleForm] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [createRoleForm] = Form.useForm();

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
      permissions: ['view_orders', 'create_orders'],
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
      permissions: ['view_orders', 'accept_orders', 'upload_works'],
    },
    {
      id: 3,
      username: 'partner_alex',
      email: 'alex@example.com',
      first_name: 'Алексей',
      last_name: 'Партнеров',
      role: 'partner',
      is_active: true,
      date_joined: '2024-01-05T12:00:00Z',
      last_login: '2024-02-01T10:30:00Z',
      permissions: ['view_referrals', 'view_earnings'],
    },
  ];

  const mockRoles: Role[] = [
    {
      id: 'admin',
      name: 'admin',
      display_name: 'Администратор',
      description: 'Полный доступ ко всем функциям системы',
      permissions: ['*'],
      users_count: 2,
      is_system: true,
    },
    {
      id: 'expert',
      name: 'expert',
      display_name: 'Эксперт',
      description: 'Может принимать заказы и загружать работы',
      permissions: ['view_orders', 'accept_orders', 'upload_works', 'view_profile'],
      users_count: 15,
      is_system: true,
    },
    {
      id: 'client',
      name: 'client',
      display_name: 'Клиент',
      description: 'Может создавать заказы и покупать работы',
      permissions: ['view_orders', 'create_orders', 'buy_works', 'view_profile'],
      users_count: 150,
      is_system: true,
    },
    {
      id: 'partner',
      name: 'partner',
      display_name: 'Партнер',
      description: 'Может просматривать рефералов и доходы',
      permissions: ['view_referrals', 'view_earnings', 'view_profile'],
      users_count: 8,
      is_system: true,
    },
  ];

  const mockPermissions: Permission[] = [
    // Заказы
    { id: 'view_orders', name: 'view_orders', display_name: 'Просмотр заказов', category: 'orders', description: 'Может просматривать заказы' },
    { id: 'create_orders', name: 'create_orders', display_name: 'Создание заказов', category: 'orders', description: 'Может создавать новые заказы' },
    { id: 'accept_orders', name: 'accept_orders', display_name: 'Принятие заказов', category: 'orders', description: 'Может принимать заказы в работу' },
    { id: 'cancel_orders', name: 'cancel_orders', display_name: 'Отмена заказов', category: 'orders', description: 'Может отменять заказы' },
    
    // Работы
    { id: 'upload_works', name: 'upload_works', display_name: 'Загрузка работ', category: 'works', description: 'Может загружать работы в магазин' },
    { id: 'buy_works', name: 'buy_works', display_name: 'Покупка работ', category: 'works', description: 'Может покупать работы из магазина' },
    { id: 'moderate_works', name: 'moderate_works', display_name: 'Модерация работ', category: 'works', description: 'Может модерировать работы' },
    
    // Партнерство
    { id: 'view_referrals', name: 'view_referrals', display_name: 'Просмотр рефералов', category: 'partnership', description: 'Может просматривать своих рефералов' },
    { id: 'view_earnings', name: 'view_earnings', display_name: 'Просмотр доходов', category: 'partnership', description: 'Может просматривать свои доходы' },
    
    // Профиль
    { id: 'view_profile', name: 'view_profile', display_name: 'Просмотр профиля', category: 'profile', description: 'Может просматривать свой профиль' },
    { id: 'edit_profile', name: 'edit_profile', display_name: 'Редактирование профиля', category: 'profile', description: 'Может редактировать свой профиль' },
    
    // Администрирование
    { id: 'manage_users', name: 'manage_users', display_name: 'Управление пользователями', category: 'admin', description: 'Может управлять пользователями' },
    { id: 'manage_roles', name: 'manage_roles', display_name: 'Управление ролями', category: 'admin', description: 'Может управлять ролями и правами' },
    { id: 'view_analytics', name: 'view_analytics', display_name: 'Просмотр аналитики', category: 'admin', description: 'Может просматривать аналитику' },
  ];

  const dataSource = users.length > 0 ? users : mockUsers;
  const rolesData = roles.length > 0 ? roles : mockRoles;
  const permissionsData = permissions.length > 0 ? permissions : mockPermissions;

  // Фильтрация пользователей
  const filteredUsers = dataSource.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleChangeUserRole = (user: User) => {
    setSelectedUser(user);
    roleForm.setFieldsValue({ role: user.role });
    setRoleModalVisible(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    try {
      const values = await roleForm.validateFields();
      onChangeUserRole?.(selectedUser.id, values.role);
      message.success(`Роль пользователя ${selectedUser.username} изменена на ${getRoleLabel(values.role)}`);
      setRoleModalVisible(false);
      setSelectedUser(null);
      roleForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEditRolePermissions = (role: Role) => {
    setSelectedRole(role);
    permissionForm.setFieldsValue({ permissions: role.permissions });
    setPermissionModalVisible(true);
  };

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      const values = await permissionForm.validateFields();
      onUpdateRolePermissions?.(selectedRole.id, values.permissions);
      message.success(`Права роли ${selectedRole.display_name} обновлены`);
      setPermissionModalVisible(false);
      setSelectedRole(null);
      permissionForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      const values = await createRoleForm.validateFields();
      onCreateRole?.(values);
      message.success(`Роль ${values.display_name} создана`);
      setCreateRoleModalVisible(false);
      createRoleForm.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDeleteRole = (role: Role) => {
    if (role.is_system) {
      message.error('Системные роли нельзя удалять');
      return;
    }

    Modal.confirm({
      title: 'Удалить роль?',
      content: `Вы уверены, что хотите удалить роль "${role.display_name}"? Пользователи с этой ролью потеряют свои права.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => {
        onDeleteRole?.(role.id);
        message.success(`Роль ${role.display_name} удалена`);
      },
    });
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

  const getPermissionsByCategory = (permissions: Permission[]) => {
    const categories: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    return categories;
  };

  const getCategoryLabel = (category: string) => {
    const categoryLabels = {
      orders: 'Заказы',
      works: 'Работы',
      partnership: 'Партнерство',
      profile: 'Профиль',
      admin: 'Администрирование',
    };
    return categoryLabels[category as keyof typeof categoryLabels] || category;
  };

  const userColumns = [
    {
      title: 'Пользователь',
      key: 'user',
      width: 250,
      render: (record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
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
      width: 120,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleLabel(role)}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag 
          color={isActive ? 'green' : 'red'} 
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {isActive ? 'Активен' : 'Неактивен'}
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
      title: 'Последний вход',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 120,
      render: (date?: string) => 
        date ? dayjs(date).format('DD.MM.YYYY') : 'Никогда',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (record: User) => (
        <Tooltip title="Изменить роль">
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleChangeUserRole(record)}
          />
        </Tooltip>
      ),
    },
  ];

  const roleColumns = [
    {
      title: 'Роль',
      key: 'role',
      render: (record: Role) => (
        <div>
          <div>
            <strong>{record.display_name}</strong>
            {record.is_system && <Tag color="blue" style={{ marginLeft: 8 }}>Системная</Tag>}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Пользователей',
      dataIndex: 'users_count',
      key: 'users_count',
      width: 120,
      render: (count: number) => (
        <Tag color="blue">{count}</Tag>
      ),
    },
    {
      title: 'Права',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 200,
      render: (permissions: string[]) => (
        <div>
          {permissions.includes('*') ? (
            <Tag color="red">Все права</Tag>
          ) : (
            <Text type="secondary">{permissions.length} прав</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (record: Role) => (
        <Space>
          <Tooltip title="Редактировать права">
            <Button 
              size="small" 
              icon={<SafetyOutlined />}
              onClick={() => handleEditRolePermissions(record)}
            />
          </Tooltip>
          {!record.is_system && (
            <Tooltip title="Удалить роль">
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteRole(record)}
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
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Роли и права пользователей</Title>
          <Text type="secondary">
            Управление ролями пользователей и их правами доступа
          </Text>
        </div>

        <Tabs defaultActiveKey="users">
          <TabPane tab="Пользователи" key="users">
            {/* Фильтры для пользователей */}
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
                <Option value="admin">Администраторы</Option>
                <Option value="expert">Эксперты</Option>
                <Option value="client">Клиенты</Option>
                <Option value="partner">Партнеры</Option>
              </Select>
            </div>

            <Table
              columns={userColumns}
              dataSource={filteredUsers}
              rowKey="id"
              loading={loading}
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} пользователей`
              }}
              locale={{ emptyText: 'Пользователи не найдены' }}
            />
          </TabPane>

          <TabPane tab="Роли" key="roles">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreateRoleModalVisible(true)}
              >
                Создать роль
              </Button>
            </div>

            <Table
              columns={roleColumns}
              dataSource={rolesData}
              rowKey="id"
              loading={loading}
              pagination={false}
              locale={{ emptyText: 'Роли не найдены' }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Модальное окно изменения роли */}
      <Modal
        title={`Изменить роль пользователя ${selectedUser?.username}`}
        open={roleModalVisible}
        onOk={handleRoleChange}
        onCancel={() => {
          setRoleModalVisible(false);
          setSelectedUser(null);
          roleForm.resetFields();
        }}
        okText="Изменить"
        cancelText="Отмена"
      >
        <Form form={roleForm} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <Text strong>Пользователь:</Text> {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.email})
          </div>
          
          <Form.Item
            name="role"
            label="Новая роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select placeholder="Выберите роль">
              <Option value="admin">Администратор</Option>
              <Option value="expert">Эксперт</Option>
              <Option value="client">Клиент</Option>
              <Option value="partner">Партнер</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно редактирования прав роли */}
      <Modal
        title={`Права роли: ${selectedRole?.display_name}`}
        open={permissionModalVisible}
        onOk={handleUpdatePermissions}
        onCancel={() => {
          setPermissionModalVisible(false);
          setSelectedRole(null);
          permissionForm.resetFields();
        }}
        okText="Сохранить"
        cancelText="Отмена"
        width={800}
      >
        <Form form={permissionForm} layout="vertical">
          {selectedRole?.permissions.includes('*') ? (
            <Alert
              message="Полные права"
              description="Эта роль имеет все права в системе"
              type="info"
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Form.Item
              name="permissions"
              label="Права доступа"
            >
              <div>
                {Object.entries(getPermissionsByCategory(permissionsData)).map(([category, categoryPermissions]) => (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <Title level={5}>{getCategoryLabel(category)}</Title>
                    <Checkbox.Group style={{ width: '100%' }}>
                      {categoryPermissions.map(permission => (
                        <div key={permission.id} style={{ marginBottom: 8 }}>
                          <Checkbox value={permission.id}>
                            <strong>{permission.display_name}</strong>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {permission.description}
                            </Text>
                          </Checkbox>
                        </div>
                      ))}
                    </Checkbox.Group>
                    <Divider />
                  </div>
                ))}
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Модальное окно создания роли */}
      <Modal
        title="Создать новую роль"
        open={createRoleModalVisible}
        onOk={handleCreateRole}
        onCancel={() => {
          setCreateRoleModalVisible(false);
          createRoleForm.resetFields();
        }}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Form form={createRoleForm} layout="vertical">
          <Form.Item
            name="name"
            label="Системное имя роли"
            rules={[
              { required: true, message: 'Введите системное имя роли' },
              { pattern: /^[a-z_]+$/, message: 'Только строчные буквы и подчеркивания' }
            ]}
          >
            <Input placeholder="например: moderator" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Отображаемое имя"
            rules={[{ required: true, message: 'Введите отображаемое имя роли' }]}
          >
            <Input placeholder="например: Модератор" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание роли' }]}
          >
            <Input.TextArea rows={3} placeholder="Описание роли и её назначения" />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Права доступа"
            rules={[{ required: true, message: 'Выберите права для роли' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              {Object.entries(getPermissionsByCategory(permissionsData)).map(([category, categoryPermissions]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <Title level={5}>{getCategoryLabel(category)}</Title>
                  {categoryPermissions.map(permission => (
                    <div key={permission.id} style={{ marginBottom: 8 }}>
                      <Checkbox value={permission.id}>
                        <strong>{permission.display_name}</strong>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {permission.description}
                        </Text>
                      </Checkbox>
                    </div>
                  ))}
                  <Divider />
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};