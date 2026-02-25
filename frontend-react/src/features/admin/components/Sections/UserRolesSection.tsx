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
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AdminUser, AdminRole, AdminPermission } from '@/features/admin/types/admin';
import { useUsers, useRoles, usePermissions, useUserActions, useRoleActions } from '@/features/admin/hooks/useAdminUsers';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface UserRolesSectionProps {
  users?: AdminUser[];
  roles?: AdminRole[];
  permissions?: AdminPermission[];
  loading?: boolean;
  onChangeUserRole?: (userId: number, newRole: string) => void;
  onUpdateRolePermissions?: (roleId: string, permissions: string[]) => void;
  onCreateRole?: (roleData: Partial<AdminRole>) => void;
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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [createRoleModalVisible, setCreateRoleModalVisible] = useState(false);
  const [roleForm] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [createRoleForm] = Form.useForm();

  const dataSource = users;
  const rolesData = roles;
  const permissionsData = permissions;

  // Filter users
  const filteredUsers = dataSource.filter(user => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = 
      (user.username || '').toLowerCase().includes(searchLower) ||
      (user.email || '').toLowerCase().includes(searchLower) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleChangeUserRole = (user: AdminUser) => {
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

  const handleEditRolePermissions = (role: AdminRole) => {
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

  const handleDeleteRole = (role: AdminRole) => {
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

  const getPermissionsByCategory = (permissions: AdminPermission[]) => {
    const categories: { [key: string]: AdminPermission[] } = {};
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
      render: (record: AdminUser) => (
        <Space>
          <Avatar size={40} src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div><strong>{record.username}</strong></div>
            <Text type="secondary" className="userRolesMetaText">
              {record.first_name} {record.last_name}
            </Text>
            <br />
            <Text type="secondary" className="userRolesMetaText">
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
      render: (record: AdminUser) => (
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
      render: (record: AdminRole) => (
        <div>
          <div>
            <strong>{record.display_name}</strong>
            {record.is_system && <Tag color="blue" className="userRolesSystemTag">Системная</Tag>}
          </div>
            <Text type="secondary" className="userRolesMetaText">
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
      render: (record: AdminRole) => (
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
        <div className="userRolesSectionHeader">
          <Title level={4}>Роли и права пользователей</Title>
          <Text type="secondary">
            Управление ролями пользователей и их правами доступа
          </Text>
        </div>

        <Tabs defaultActiveKey="users">
          <TabPane tab="Пользователи" key="users">
            
            <div className="userRolesFiltersRow">
              <Search
                placeholder="Поиск по имени, email или username"
                allowClear
                className="userRolesSearch"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
              />
              
              <Select
                placeholder="Роль"
                className="userRolesRoleSelect"
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

          <TabPane tab="Роли и права" key="roles">
            <div className="userRolesActionsRow">
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setCreateRoleModalVisible(true)}
                style={{ marginBottom: 16 }}
              >
                Создать новую роль
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
          <div className="userRolesModalUserSummary">
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
              className="userRolesPermissionsAlert"
            />
          ) : (
            <Form.Item
              name="permissions"
              label="Права доступа"
            >
              <div>
                {Object.entries(getPermissionsByCategory(permissionsData)).map(([category, categoryPermissions]) => (
                  <div key={category} className="userRolesCategoryGroup">
                    <Title level={5}>{getCategoryLabel(category)}</Title>
                    <Checkbox.Group className="userRolesPermissionList">
                      {categoryPermissions.map(permission => (
                        <div key={permission.id} className="userRolesPermissionItem">
                          <Checkbox value={permission.id}>
                            <strong>{permission.display_name}</strong>
                            <br />
                            <Text type="secondary" className="userRolesMetaText">
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
            <Checkbox.Group className="userRolesPermissionList">
              {Object.entries(getPermissionsByCategory(permissionsData)).map(([category, categoryPermissions]) => (
                <div key={category} className="userRolesCategoryGroup">
                  <Title level={5}>{getCategoryLabel(category)}</Title>
                  {categoryPermissions.map(permission => (
                    <div key={permission.id} className="userRolesPermissionItem">
                      <Checkbox value={permission.id}>
                        <strong>{permission.display_name}</strong>
                        <br />
                        <Text type="secondary" className="userRolesMetaText">
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

export const UsersManagementSection: React.FC = () => {
  const { users, loading: usersLoading } = useUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { changeRole } = useUserActions();
  const { createRole, deleteRole, updateRolePermissions } = useRoleActions();

  return (
    <UserRolesSection
      users={users}
      roles={roles}
      permissions={permissions}
      loading={usersLoading || rolesLoading || permissionsLoading}
      onChangeUserRole={(userId, role) => changeRole({ userId, role })}
      onCreateRole={createRole}
      onDeleteRole={deleteRole}
      onUpdateRolePermissions={(roleId, permissions) => updateRolePermissions({ roleId, permissions })}
    />
  );
};

export const RolesManagementSection: React.FC = () => {
  const { users, loading: usersLoading } = useUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { changeRole } = useUserActions();
  const { createRole, deleteRole, updateRolePermissions } = useRoleActions();

  return (
    <UserRolesSection
      users={users}
      roles={roles}
      permissions={permissions}
      loading={usersLoading || rolesLoading || permissionsLoading}
      onChangeUserRole={(userId, role) => changeRole({ userId, role })}
      onCreateRole={createRole}
      onDeleteRole={deleteRole}
      onUpdateRolePermissions={(roleId, permissions) => updateRolePermissions({ roleId, permissions })}
    />
  );
};
