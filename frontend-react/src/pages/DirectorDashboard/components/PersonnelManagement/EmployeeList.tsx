import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Space,
  Tag,
  Input,
  Select,
  message,
  Typography,
  Descriptions,
  Spin,
  Tooltip,
} from 'antd';
import {
  StopOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPersonnel,
  deactivateEmployee,
  activateEmployee,
  archiveEmployee,
} from '../../api/directorApi';
import { type Employee } from '../../api/types';
import styles from './EmployeeList.module.css';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const EmployeeList: React.FC = () => {
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['director-personnel'],
    queryFn: getPersonnel,
  });

  const deactivateMutation = useMutation({
    mutationFn: (payload: { id: number; employee: Employee }) => deactivateEmployee(payload.id, payload.employee),
    onSuccess: (updated: Employee) => {
      message.success('Сотрудник деактивирован');
      queryClient.setQueryData(['director-personnel'], (prev: Employee[] | undefined) => {
        if (!prev) return prev;
        return prev.map((e) => (e.id === updated.id ? { ...e, is_active: false } : e));
      });
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
      queryClient.invalidateQueries({ queryKey: ['director-expert-applications'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при деактивации сотрудника';
      message.error(errorMessage);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => activateEmployee(id),
    onSuccess: (updated: Employee) => {
      message.success('Сотрудник активирован');
      queryClient.setQueryData(['director-personnel'], (prev: Employee[] | undefined) => {
        if (!prev) return prev;
        return prev.map((e) => (e.id === updated.id ? { ...e, is_active: true } : e));
      });
      try {
        const raw = localStorage.getItem('director_deactivated_employees');
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) {
          const next = arr.filter((x: number) => x !== updated.id);
          localStorage.setItem('director_deactivated_employees', JSON.stringify(next));
        }
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
    },
    onError: (error: any, id: number) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при активации сотрудника';
      message.error(errorMessage);
      try {
        const raw = localStorage.getItem('director_deactivated_employees');
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) {
          const next = arr.filter((x: number) => x !== id);
          localStorage.setItem('director_deactivated_employees', JSON.stringify(next));
        }
      } catch {}
      queryClient.setQueryData(['director-personnel'], (prev: Employee[] | undefined) => {
        if (!prev) return prev;
        return prev.map((e) => (e.id === id ? { ...e, is_active: true } : e));
      });
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveEmployee(id),
    onSuccess: () => {
      message.success('Сотрудник заархивирован');
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
      queryClient.invalidateQueries({ queryKey: ['director-personnel-archive'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при архивации сотрудника';
      message.error(errorMessage);
    },
  });

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailModalVisible(true);
  };

  const handleDeactivate = (employee: Employee) => {
    Modal.confirm({
      title: 'Деактивировать сотрудника',
      content: `Вы уверены, что хотите деактивировать ${employee.first_name} ${employee.last_name}?`,
      okText: 'Деактивировать',
      cancelText: 'Отмена',
      onOk: () => {
        deactivateMutation.mutate({ id: employee.id, employee });
      },
    });
  };

  const handleActivate = (employee: Employee) => {
    Modal.confirm({
      title: 'Активировать сотрудника',
      content: `Вы уверены, что хотите активировать ${employee.first_name} ${employee.last_name}?`,
      okText: 'Активировать',
      cancelText: 'Отмена',
      onOk: () => {
        activateMutation.mutate(employee.id);
      },
    });
  };

  const handleArchive = (employee: Employee) => {
    Modal.confirm({
      title: 'Архивировать сотрудника',
      content: `Вы уверены, что хотите заархивировать ${employee.first_name} ${employee.last_name}?`,
      okText: 'Архивировать',
      cancelText: 'Отмена',
      onOk: () => {
        archiveMutation.mutate(employee.id);
      },
    });
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: 'Администратор',
      arbitrator: 'Арбитр',
      partner: 'Партнёр',
      expert: 'Эксперт',
      client: 'Клиент',
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'red',
      arbitrator: 'orange',
      partner: 'blue',
      expert: 'green',
      client: 'default',
    };
    return roleColors[role] || 'default';
  };

  const filteredEmployees = employees?.filter((employee) => {
    const matchesSearch =
      employee.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.last_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    const isActive = employee.is_active !== false; // По умолчанию считаем активным, если поле не указано
    const isDeactivatedExpert = employee.role === 'client' && employee.application_approved === false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive && !isDeactivatedExpert) ||
      (statusFilter === 'inactive' && (!isActive || isDeactivatedExpert));
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  const columns = [
    {
      title: 'Имя',
      dataIndex: 'first_name',
      key: 'first_name',
    },
    {
      title: 'Фамилия',
      dataIndex: 'last_name',
      key: 'last_name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean | undefined, record: Employee) => {
        // Деактивированный эксперт - это клиент с application_approved = false
        const isDeactivatedExpert = record.role === 'client' && record.application_approved === false;
        const active = isActive !== false; // По умолчанию активен
        
        if (!active) {
          // Заархивированный
          return <Tag color="red">Неактивен</Tag>;
        }
        
        if (isDeactivatedExpert) {
          // Деактивированный эксперт
          return <Tag color="orange">Неактивен (эксперт)</Tag>;
        }
        
        return <Tag color="green">Активен</Tag>;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: any, record: Employee) => {
        const isActive = record.is_active !== false;
        // Деактивированный эксперт - это клиент с application_approved = false
        const isDeactivatedExpert = record.role === 'client' && record.application_approved === false;
        
        return (
          <Space>
            <Tooltip title="Просмотр">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            {!isActive ? (
              // Заархивированный сотрудник
              <Tooltip title="Активировать">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleActivate(record)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
            ) : isDeactivatedExpert ? (
              // Деактивированный эксперт (можно активировать обратно)
              <Tooltip title="Активировать как эксперта">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleActivate(record)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
            ) : (
              // Активный сотрудник
              <>
                <Tooltip title="Деактивировать">
                  <Button
                    type="text"
                    icon={<StopOutlined />}
                    onClick={() => handleDeactivate(record)}
                    danger
                  />
                </Tooltip>
                <Tooltip title="Архивировать">
                  <Button
                    type="text"
                    icon={<InboxOutlined />}
                    onClick={() => handleArchive(record)}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const isMobile = window.innerWidth <= 840;

  return (
    <div>
      <Card
        style={{
          borderRadius: isMobile ? 8 : 12,
          border: 'none',
          background: '#fafafa',
        }}
      >
        <Title 
          level={4} 
          style={{
            marginBottom: isMobile ? 16 : 24,
            fontSize: isMobile ? 18 : 20,
            color: '#1f2937',
          }}
        >
          Сотрудники
        </Title>
        <div
          className={isMobile ? styles.mobileFiltersContainer : ''}
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 0 : 16,
            marginBottom: isMobile ? 16 : 24,
            padding: isMobile ? 12 : 16,
            background: '#fff',
            borderRadius: isMobile ? 8 : 12,
            border: '1px solid #e5e7eb',
          }}
        >
          {isMobile ? (
            <div 
              className={styles.customSearchContainer}
              style={{ 
                width: '100%',
                marginBottom: 12,
              }}
            >
              <input
                className={styles.customSearchInput}
                placeholder="Поиск..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setSearchText(e.currentTarget.value);
                  }
                }}
              />
              <button
                className={styles.customSearchButton}
                onClick={() => setSearchText(searchText)}
                type="button"
              >
                <SearchOutlined />
              </button>
            </div>
          ) : (
            <Search
              placeholder="Поиск по имени, фамилии или email"
              allowClear
              size="large"
              style={{ 
                width: 300,
              }}
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          )}
          <Select
            placeholder="Фильтр по роли"
            size={isMobile ? 'middle' : 'large'}
            style={{ 
              width: isMobile ? '100%' : 200,
              marginBottom: isMobile ? 12 : 0,
            }}
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="all">Все роли</Option>
            <Option value="admin">Администратор</Option>
            <Option value="arbitrator">Арбитр</Option>
            <Option value="partner">Партнёр</Option>
            <Option value="expert">Эксперт</Option>
          </Select>
          <Select
            placeholder="Фильтр по статусу"
            size={isMobile ? 'middle' : 'large'}
            style={{ 
              width: isMobile ? '100%' : 200,
              marginBottom: isMobile ? 8 : 0,
            }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">Все статусы</Option>
            <Option value="active">Активные</Option>
            <Option value="inactive">Неактивные</Option>
          </Select>
        </div>
        <Spin spinning={isLoading}>
          <div 
            style={{ 
              overflowX: 'auto', 
              width: '100%',
              background: '#fff',
              borderRadius: isMobile ? 8 : 12,
              border: '1px solid #e5e7eb',
            }}
          >
            <Table
              columns={columns}
              dataSource={filteredEmployees}
              rowKey="id"
              scroll={{ x: isMobile ? 800 : undefined }}
              pagination={{
                pageSize: 10,
                showSizeChanger: !isMobile,
                showTotal: (total) => `Всего: ${total}`,
                simple: isMobile,
                style: {
                  padding: isMobile ? '12px' : '16px',
                }
              }}
              style={{
                borderRadius: isMobile ? 8 : 12,
              }}
            />
          </div>
        </Spin>
      </Card>

      {/* Модальное окно с деталями сотрудника */}
      <Modal
        title="Детали сотрудника"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedEmployee(null);
        }}
        footer={null}
        width={isMobile ? '100%' : 600}
        style={isMobile ? {
          top: 0,
          padding: 0,
          maxWidth: '100%',
          margin: 0
        } : {}}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          content: isMobile ? {
            borderRadius: 0,
            height: '100vh'
          } : {},
          body: isMobile ? {
            maxHeight: 'calc(100vh - 55px)',
            overflowY: 'auto'
          } : {}
        }}
      >
        {selectedEmployee && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Имя">
              {selectedEmployee.first_name}
            </Descriptions.Item>
            <Descriptions.Item label="Фамилия">
              {selectedEmployee.last_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedEmployee.email}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон">
              {selectedEmployee.phone || 'Не указан'}
            </Descriptions.Item>
            <Descriptions.Item label="Роль">
              <Tag color={getRoleColor(selectedEmployee.role)}>
                {getRoleLabel(selectedEmployee.role)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={selectedEmployee.is_active !== false ? 'green' : 'red'}>
                {selectedEmployee.is_active !== false ? 'Активен' : 'Неактивен'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Дата регистрации">
              {dayjs(selectedEmployee.date_joined).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Последний вход">
              {selectedEmployee.last_login
                ? dayjs(selectedEmployee.last_login).format('DD.MM.YYYY HH:mm')
                : 'Никогда'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeList;
