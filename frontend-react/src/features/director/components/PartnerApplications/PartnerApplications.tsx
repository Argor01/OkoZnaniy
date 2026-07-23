import React, { useMemo, useState } from 'react';
import { Table, Tag, Select, Segmented, Typography, Space, Tooltip, Empty, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApplicationsApi, type PartnerApplication } from '@/features/partner/api/partnerApplications';
import styles from './PartnerApplications.module.css';

const { Title, Text, Paragraph } = Typography;

const STATUS_META: Record<string, { color: string; label: string }> = {
  new: { color: 'blue', label: 'Новая' },
  contacted: { color: 'gold', label: 'Связались' },
  approved: { color: 'green', label: 'Одобрена' },
  rejected: { color: 'red', label: 'Отклонена' },
};

const PartnerApplications: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['partner-applications', filter],
    queryFn: () => partnerApplicationsApi.list(filter === 'all' ? undefined : filter),
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      partnerApplicationsApi.update(id, { status: status as PartnerApplication['status'] }),
    onSuccess: () => {
      message.success('Статус заявки обновлён');
      queryClient.invalidateQueries({ queryKey: ['partner-applications'] });
    },
    onError: () => message.error('Не удалось обновить статус'),
  });

  const newCount = useMemo(
    () => applications.filter((a) => a.status === 'new').length,
    [applications]
  );

  const columns = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Контакты',
      key: 'contacts',
      render: (_: unknown, r: PartnerApplication) => (
        <Space direction="vertical" size={2}>
          <a href={`mailto:${r.email}`}>{r.email}</a>
          {r.telegram && (
            <a
              href={`https://t.me/${r.telegram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {r.telegram}
            </a>
          )}
          {r.phone && <a href={`tel:${r.phone}`}>{r.phone}</a>}
        </Space>
      ),
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      render: (v: string) =>
        v ? (
          <Tooltip title={v}>
            <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, maxWidth: 240 }}>
              {v}
            </Paragraph>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleString('ru-RU'),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: unknown, r: PartnerApplication) => (
        <Select
          value={r.status}
          style={{ width: 150 }}
          loading={updateMutation.isPending}
          onChange={(status) => updateMutation.mutate({ id: r.id, status })}
          options={Object.entries(STATUS_META).map(([value, meta]) => ({
            value,
            label: <Tag color={meta.color}>{meta.label}</Tag>,
          }))}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 4 }}>
      <div className={styles.filters}>
        <Title level={4} className={styles.title}>
          Заявки на партнёрство{newCount > 0 ? ` · ${newCount} новых` : ''}
        </Title>
        <div className={styles.segmentedWrap}>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(String(v))}
            options={[
              { label: 'Все', value: 'all' },
              { label: 'Новые', value: 'new' },
              { label: 'Связались', value: 'contacted' },
              { label: 'Одобрены', value: 'approved' },
              { label: 'Отклонены', value: 'rejected' },
            ]}
          />
        </div>
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={applications}
        columns={columns}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: <Empty description="Заявок пока нет" /> }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default PartnerApplications;
