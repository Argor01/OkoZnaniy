import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Space,
  Tag,
  Input,
  message,
  Typography,
  Descriptions,
  Spin,
  Tooltip,
} from 'antd';
import {
  UndoOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getArchivedEmployees,
  restoreEmployee,
  deleteEmployee,
} from '../../api/directorApi';
import { type Employee } from '../../api/types';

const { Title } = Typography;
const { Search } = Input;

const EmployeeArchive: React.FC = () => {
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchText, setSearchText] = useState('');
  const queryClient = useQueryClient();

  const { data: archivedEmployees, isLoading } = useQuery({
    queryKey: ['director-personnel-archive'],
    queryFn: getArchivedEmployees,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreEmployee(id),
    onSuccess: () => {
      message.success('Сотрудник восстановлен');
      queryClient.invalidateQueries({ queryKey: ['director-personnel-archive'] });
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при восстановлении сотрудника';
      message.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => {
      message.success('Сотрудник удалён навсегда');
      queryClient.invalidateQueries({ queryKey: ['director-personnel-archive'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при удалении сотрудника';
      message.error(errorMessage);
    },
  });

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailModalVisible(true);
  };

  const handleRestore = (employee: Employee) => {
    Modal.confirm({
      title: 'Восстановить сотрудника',
      content: `Вы уверены, что хотите восстановить ${employee.first_name} ${employee.last_name}?`,
      okText: 'Восстановить',
      cancelText: 'Отмена',
      onOk: () => {
        restoreMutation.mutate(employee.id);
      },
    });
  };

  const handleDelete = (employee: Employee) => {
    Modal.confirm({
      title: 'Удалить навсегда',
      content: (
        <div>
          <p>Вы уверены, что хотите удалить {employee.first_name} {employee.last_name} навсегда?</p>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            Это действие нельзя отменить!
          </p>
        </div>
      ),
      okText: 'Удалить навсегда',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteMutation.mutate(employee.id);
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

  const filteredEmployees = archivedEmployees?.filter((employee) => {
    const matchesSearch =
      employee.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.last_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
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
      title: 'Дата архивации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: any, record: Employee) => (
        <Space>
          <Tooltip title="Просмотр">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Восстановить">
            <Button
              type="text"
              icon={<UndoOutlined />}
              onClick={() => handleRestore(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Удалить навсегда">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Title level={4}>Архив сотрудников</Title>
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="large">
          <Search
            placeholder="Поиск по имени, фамилии или email"
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={filteredEmployees}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
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
        width={600}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
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

export default EmployeeArchive;
