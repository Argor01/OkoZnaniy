import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Input,
  Select,
  Modal,
  message,
  Radio,
  InputNumber,
  Space,
  Tooltip,
  Switch,
} from 'antd';
import { SearchOutlined, EditOutlined, TeamOutlined, StarFilled } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import styles from './UsersManagement.module.css';

const { Text } = Typography;
const { Option } = Select;

interface PlatformUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  is_verified?: boolean;
  service_fee_percent?: string | null;
  partner_commission_rate?: string | number | null;
  withdrawal_fee_percent?: string | number | null;
  test_payments_allowed?: boolean;
  average_rating?: number | string | null;
  date_joined?: string;
}

interface UsersResponse {
  count?: number;
  results?: PlatformUser[];
}

const ROLE_LABELS: Record<string, string> = {
  client: 'Клиент',
  expert: 'Эксперт',
  partner: 'Партнёр',
  director: 'Директор',
  admin: 'Администратор',
};

const ROLE_COLORS: Record<string, string> = {
  client: 'blue',
  expert: 'green',
  partner: 'purple',
  director: 'gold',
  admin: 'red',
};

const normalizeUsers = (payload: unknown): PlatformUser[] => {
  if (Array.isArray(payload)) return payload as PlatformUser[];
  if (payload && typeof payload === 'object') {
    const obj = payload as UsersResponse;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray((obj as unknown as PlatformUser[]))) return obj as unknown as PlatformUser[];
  }
  return [];
};

const displayPercent = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'Общий';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Общий';
  if (num === 0) return 'Без комиссии';
  return `${num}%`;
};

const displayName = (u: PlatformUser): string =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;

const UsersManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('expert');
  const [search, setSearch] = useState<string>('');
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [feeMode, setFeeMode] = useState<'platform' | 'zero' | 'custom'>('platform');
  // Одна и та же модалка правит два процента: сервисный сбор с клиента и
  // удержание с эксперта при выводе.
  const [editingField, setEditingField] =
    useState<'service_fee_percent' | 'withdrawal_fee_percent'>('service_fee_percent');
  const [customPercent, setCustomPercent] = useState<number>(15);

  const { data, isLoading } = useQuery({
    queryKey: ['director-users', roleFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const response = await apiClient.get(API_ENDPOINTS.users.adminAllUsers, { params });
      return normalizeUsers(response.data);
    },
  });

  // Отдельная мутация: переключатель сохраняется сразу, без модалки.
  const testPayMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: boolean }) => {
      await apiClient.patch(`/users/${id}/admin_update_partner/`, {
        test_payments_allowed: value,
      });
    },
    onSuccess: () => {
      message.success('Доступ к тестовой оплате обновлён');
      queryClient.invalidateQueries({ queryKey: ['director-users'] });
    },
    onError: () => message.error('Не удалось изменить доступ'),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: number | null }) => {
      await apiClient.patch(`/users/${id}/admin_update_partner/`, {
        [editingField]: value,
      });
    },
    onSuccess: () => {
      message.success('Процент обновлён');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['director-users'] });
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data;
      message.error(detail?.error || detail?.detail || 'Не удалось сохранить процент');
    },
  });

  const openEdit = (
    user: PlatformUser,
    field: 'service_fee_percent' | 'withdrawal_fee_percent' = 'service_fee_percent',
  ) => {
    setEditingField(field);
    const raw = field === 'service_fee_percent' ? user.service_fee_percent : user.withdrawal_fee_percent;
    if (raw === null || raw === undefined || raw === '') {
      setFeeMode('platform');
    } else {
      const num = Number(raw);
      if (Number.isFinite(num) && num === 0) {
        setFeeMode('zero');
      } else {
        setFeeMode('custom');
        setCustomPercent(Number.isFinite(num) ? num : 15);
      }
    }
    setEditing(user);
  };

  const handleSave = () => {
    if (!editing) return;
    if (feeMode === 'custom' && (!Number.isFinite(customPercent) || customPercent < 0 || customPercent > 100)) {
      message.error('Свой процент должен быть числом от 0 до 100');
      return;
    }
    const value =
      feeMode === 'platform' ? null : feeMode === 'zero' ? 0 : customPercent;
    saveMutation.mutate({ id: editing.id, value });
  };

  const rows = useMemo(() => data ?? [], [data]);

  const columns = [
    {
      title: 'Пользователь',
      key: 'name',
      fixed: 'left' as const,
      width: 220,
      render: (_: unknown, u: PlatformUser) => (
        <div className={styles.nameCell}>
          <Text strong>{displayName(u)}</Text>
          <Text type="secondary" className={styles.username}>@{u.username}</Text>
        </div>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string, u: PlatformUser) => (
        <Space size={4} direction="vertical">
          <Tag color={ROLE_COLORS[role] || 'default'}>{ROLE_LABELS[role] || role}</Tag>
          {role === 'expert' && u.is_verified && (
            <Tooltip title="Верифицирован администрацией">
              <Tag color="cyan">Верифицирован</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Контакты',
      key: 'contacts',
      width: 220,
      responsive: ['md'] as const,
      render: (_: unknown, u: PlatformUser) => (
        <div className={styles.nameCell}>
          <Text>{u.email || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Рейтинг',
      dataIndex: 'average_rating',
      key: 'average_rating',
      width: 110,
      responsive: ['lg'] as const,
      render: (rating: number | string | null | undefined, u: PlatformUser) =>
        u.role === 'client' ? (
          <Text type="secondary">—</Text>
        ) : Number(rating) > 0 ? (
          <span className={styles.rating}>
            <StarFilled style={{ color: '#faad14' }} /> {Number(rating).toFixed(1)}
          </span>
        ) : (
          <Text type="secondary">нет</Text>
        ),
    },
    {
      title: 'Сервисный сбор',
      key: 'service_fee_percent',
      width: 150,
      render: (_: unknown, u: PlatformUser) => {
        const v = displayPercent(u.service_fee_percent);
        const color = v === 'Без комиссии' ? 'green' : v === 'Общий' ? 'default' : 'blue';
        return (
          <Tag
            color={color}
            style={{ cursor: 'pointer' }}
            onClick={() => openEdit(u, 'service_fee_percent')}
          >
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Тестовая оплата',
      key: 'test_payments_allowed',
      width: 140,
      render: (_: unknown, u: PlatformUser) => (
        <Switch
          size="small"
          checked={!!u.test_payments_allowed}
          loading={testPayMutation.isPending}
          onChange={(checked) => testPayMutation.mutate({ id: u.id, value: checked })}
        />
      ),
    },
    {
      title: 'Удержание при выводе',
      key: 'withdrawal_fee_percent',
      width: 170,
      render: (_: unknown, u: PlatformUser) => {
        const v = displayPercent(u.withdrawal_fee_percent);
        const color = v === 'Без комиссии' ? 'green' : v === 'Общий' ? 'default' : 'blue';
        return (
          <Tag
            color={color}
            style={{ cursor: 'pointer' }}
            onClick={() => openEdit(u, 'withdrawal_fee_percent')}
          >
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right' as const,
      width: 110,
      render: (_: unknown, u: PlatformUser) =>
        u.role === 'admin' || u.role === 'director' ? (
          <Text type="secondary">—</Text>
        ) : (
          <a onClick={() => openEdit(u)}>
            <EditOutlined /> Изменить
          </a>
        ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.toolbar}>
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            className={styles.roleSelect}
            data-testid="role-filter"
          >
            <Option value="expert">Эксперты</Option>
            <Option value="client">Клиенты</Option>
            <Option value="partner">Партнёры</Option>
            <Option value="all">Все роли</Option>
          </Select>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Поиск по имени, email или логину"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <Text type="secondary" className={styles.counter}>
            <TeamOutlined /> {rows.length}
          </Text>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle"
        />
      </Card>

      <Modal
        title={`${editingField === 'service_fee_percent' ? 'Сервисный сбор' : 'Удержание при выводе'} — ${editing ? displayName(editing) : ''}`}
        open={!!editing}
        onOk={handleSave}
        confirmLoading={saveMutation.isPending}
        onCancel={() => setEditing(null)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Radio.Group
          value={feeMode}
          onChange={(e) => setFeeMode(e.target.value)}
          className={styles.feeRadio}
        >
          <Space direction="vertical" size={12}>
            <Radio value="platform">
              Общий процент платформы
              <Text type="secondary" className={styles.hint}>
                {editingField === 'service_fee_percent' ? 'как у всех клиентов' : 'как у всех по роли'}
              </Text>
            </Radio>
            <Radio value="zero">
              Без комиссии (0%)
              <Text type="secondary" className={styles.hint}>
                {editingField === 'service_fee_percent'
                  ? 'клиент платит только работу'
                  : 'автор выводит всю сумму'}
              </Text>
            </Radio>
            <Radio value="custom">
              Свой процент
              <Text type="secondary" className={styles.hint}>льготная ставка</Text>
            </Radio>
          </Space>
        </Radio.Group>
        {feeMode === 'custom' && (
          <InputNumber
            min={0}
            max={100}
            value={customPercent}
            onChange={(v) => setCustomPercent(Number(v) || 0)}
            addonAfter="%"
            className={styles.percentInput}
          />
        )}
      </Modal>
    </div>
  );
};

export default UsersManagement;
