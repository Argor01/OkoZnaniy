import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Typography, Modal, Input, Button, Space, Spin, Empty, message as antMessage } from 'antd';
import { UserOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { disputesApi, Dispute } from '@/features/arbitration/api/disputes';
import { useCurrentUser } from '@/hooks/queries';

const { Title, Text } = Typography;

export const MyDisputes: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: userProfile } = useCurrentUser();

  const [resolveDisputeId, setResolveDisputeId] = useState<number | null>(null);
  const [resolveResult, setResolveResult] = useState('');

  const { data: disputes = [], isLoading, refetch } = useQuery<Dispute[]>({
    queryKey: ['my-disputes'],
    queryFn: () => disputesApi.getMyDisputes(),
    enabled: !!userProfile && userProfile.role === 'arbitrator',
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ disputeId, result }: { disputeId: number; result: string }) => {
      return disputesApi.resolveDispute(disputeId, { result });
    },
    onSuccess: () => {
      antMessage.success('Спор отмечен как решённый');
      setResolveDisputeId(null);
      setResolveResult('');
      queryClient.invalidateQueries({ queryKey: ['my-disputes'] });
      refetch();
    },
    onError: (error: any) => {
      antMessage.error(error?.response?.data?.error || 'Не удалось решить спор');
    },
  });

  const handleResolve = () => {
    if (!resolveDisputeId || !resolveResult.trim()) return;
    resolveMutation.mutate({ disputeId: resolveDisputeId, result: resolveResult.trim() });
  };

  const columns = [
    {
      title: 'Заказ',
      dataIndex: ['order', 'title'],
      key: 'title',
      render: (_: unknown, record: Dispute) => (
        <Text strong>#{record.order.id} {record.order.title}</Text>
      ),
    },
    {
      title: 'Клиент',
      dataIndex: ['order', 'client', 'username'],
      key: 'client',
    },
    {
      title: 'Эксперт',
      key: 'expert',
      render: (_: unknown, record: Dispute) =>
        record.order.expert ? <Text>{record.order.expert.username}</Text> : <Text type="secondary">Не назначен</Text>,
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: unknown, record: Dispute) =>
        record.resolved ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Решён</Tag>
        ) : (
          <Tag color="orange" icon={<ClockCircleOutlined />}>В рассмотрении</Tag>
        ),
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: Dispute) =>
        !record.resolved ? (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => setResolveDisputeId(record.id)}
          >
            Решить спор
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <Title level={3}>
        <Space>
          <UserOutlined />
          Мои споры
        </Space>
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Споры по заказам, назначенные вам для рассмотрения.
      </Text>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : disputes.length === 0 ? (
        <Card>
          <Empty description="Назначенных споров пока нет" />
        </Card>
      ) : (
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={disputes}
            pagination={false}
            expandable={{
              expandedRowRender: (record: Dispute) => (
                <div style={{ padding: '8px 0' }}>
                  <Text strong>Причина спора:</Text>
                  <div style={{ marginTop: 8 }}>{record.reason}</div>
                  {record.result && (
                    <div style={{ marginTop: 16 }}>
                      <Text strong>Решение:</Text>
                      <div style={{ marginTop: 8 }}>{record.result}</div>
                    </div>
                  )}
                </div>
              ),
            }}
          />
        </Card>
      )}

      <Modal
        title="Решить спор"
        open={resolveDisputeId !== null}
        onCancel={() => {
          setResolveDisputeId(null);
          setResolveResult('');
        }}
        onOk={handleResolve}
        okText="Подтвердить решение"
        cancelText="Отмена"
        okButtonProps={{ loading: resolveMutation.isPending, disabled: !resolveResult.trim() }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong>Резолюция:</Text>
          <Input.TextArea
            value={resolveResult}
            onChange={(e) => setResolveResult(e.target.value)}
            placeholder="Опишите решение по спору"
            rows={4}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default MyDisputes;