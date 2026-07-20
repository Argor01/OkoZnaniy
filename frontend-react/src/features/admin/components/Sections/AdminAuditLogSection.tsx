import React, { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import styles from './AdminAuditLogSection.module.css';

const { Search } = Input;
const { Text, Title } = Typography;

interface AuditUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface AuditLogItem {
  id: number;
  actor: AuditUser | null;
  target_user: AuditUser | null;
  action: string;
  object_type: string;
  object_id: string;
  description: string;
  meta: Record<string, unknown>;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  user_blocked: 'Блокировка',
  user_unblocked: 'Разблокировка',
  user_role_changed: 'Смена роли',
  ready_work_approved: 'Работа одобрена',
  ready_work_rejected: 'Работа отклонена',
  claim_refund_processed: 'Возврат по обращению',
  arbitration_refund_processed: 'Возврат по арбитражу',
};

const actionColors: Record<string, string> = {
  user_blocked: 'red',
  user_unblocked: 'green',
  user_role_changed: 'blue',
  ready_work_approved: 'green',
  ready_work_rejected: 'orange',
  claim_refund_processed: 'purple',
  arbitration_refund_processed: 'purple',
};

const getUserName = (user: AuditUser | null) => {
  if (!user) return 'Система';
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return fullName || user.username || user.email || `ID ${user.id}`;
};

export const AdminAuditLogSection: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<string | undefined>();

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin-panel/audit-log/', {
        params: {
          search: search || undefined,
          action,
        },
      });
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error('Не удалось загрузить аудит действий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [action]);

  const actionOptions = useMemo(
    () => [
      { label: 'Все действия', value: '' },
      ...Object.entries(actionLabels).map(([value, label]) => ({ value, label })),
    ],
    []
  );

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: 'Дата',
      dataIndex: 'created_at',
      width: 160,
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      width: 210,
      render: (value: string) => (
        <Tag color={actionColors[value] || 'default'}>{actionLabels[value] || value}</Tag>
      ),
    },
    {
      title: 'Администратор',
      dataIndex: 'actor',
      width: 220,
      render: (user: AuditUser | null) => (
        <Space direction="vertical" size={0}>
          <Text strong>{getUserName(user)}</Text>
          {user?.email && <Text type="secondary">{user.email}</Text>}
        </Space>
      ),
    },
    {
      title: 'Пользователь',
      dataIndex: 'target_user',
      width: 220,
      render: (user: AuditUser | null) => (
        <Space direction="vertical" size={0}>
          <Text>{getUserName(user)}</Text>
          {user?.email && <Text type="secondary">{user.email}</Text>}
        </Space>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text>{value || 'Без описания'}</Text>
          {record.object_type && (
            <Text type="secondary">
              {record.object_type} {record.object_id ? `#${record.object_id}` : ''}
            </Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card className={styles.auditCard}>
      <Space className={styles.auditStack} direction="vertical" size={18}>
        <div className={styles.auditHeader}>
          <Title level={4} style={{ marginBottom: 4 }}>
            Аудит действий
          </Title>
          <Text type="secondary">
            Журнал показывает ключевые админские действия: блокировки, возвраты и модерацию готовых работ.
          </Text>
        </div>

        <Space className={styles.auditFilters} wrap>
          <Search
            className={styles.auditSearch}
            allowClear
            placeholder="Поиск по описанию, пользователю или объекту"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onSearch={loadLogs}
          />
          <Select
            className={styles.auditSelect}
            value={action || ''}
            options={actionOptions}
            onChange={(value) => setAction(value || undefined)}
          />
        </Space>

        <Table
          className={styles.auditTable}
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="Действий пока нет" /> }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 980 }}
        />
      </Space>
    </Card>
  );
};
