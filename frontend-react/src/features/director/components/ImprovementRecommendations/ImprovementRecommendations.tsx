import React from 'react';
import { Card, Table, Tag, Typography, Alert, Avatar, Button, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { DownloadOutlined, EyeOutlined, PaperClipOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { improvementApi, ImprovementSuggestion } from '@/features/improvements/api/improvements';
import { getMediaUrl } from '@/config/api';
import { getDisplayUsername } from '@/utils/formatters';

const roleLabelMap: Record<string, string> = {
  client: 'Клиент',
  expert: 'Эксперт',
  director: 'Директор',
  admin: 'Админ',
  partner: 'Партнер',
};

const ImprovementRecommendations: React.FC = () => {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['director-improvement-suggestions'],
    queryFn: improvementApi.getSuggestions,
    refetchOnMount: 'always',
  });

  const columns = [
    {
      title: 'Пользователь',
      key: 'user',
      render: (_: unknown, record: ImprovementSuggestion) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar src={getMediaUrl(record.avatar) || undefined}>{getDisplayUsername(record)[0]?.toUpperCase()}</Avatar>
          <div>
            <div>{getDisplayUsername(record)}</div>
            <Tag>{roleLabelMap[record.role] || record.role}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Область улучшения',
      dataIndex: 'area_display',
      key: 'area_display',
      width: 220,
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
    },
    {
      title: 'Вложение',
      key: 'attachment',
      width: 260,
      render: (_: unknown, record: ImprovementSuggestion) => {
        const attachmentUrl = getMediaUrl(record.attachment_url || record.attachment);
        if (!attachmentUrl) {
          return <Typography.Text type="secondary">Без вложения</Typography.Text>;
        }

        return (
          <Space direction="vertical" size={6}>
            <Space size={6}>
              <PaperClipOutlined />
              <Typography.Text>{record.attachment_name || 'Файл'}</Typography.Text>
            </Space>
            <Space wrap>
              <Button size="small" icon={<EyeOutlined />} href={attachmentUrl} target="_blank" rel="noreferrer">
                Открыть
              </Button>
              <Button size="small" icon={<DownloadOutlined />} href={attachmentUrl} target="_blank" rel="noreferrer">
                Скачать
              </Button>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Информация об отправителе',
      key: 'author_info',
      width: 260,
      render: (_: unknown, record: ImprovementSuggestion) => (
        <div>
          <div>ID: {record.user_id}</div>
          <div>Email: {record.email || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Дата',
      key: 'created_at',
      width: 170,
      render: (_: unknown, record: ImprovementSuggestion) => dayjs(record.created_at).format('DD.MM.YYYY HH:mm'),
    },
  ];

  return (
    <Card>
      <Typography.Title level={4}>Рекомендации по улучшению</Typography.Title>
      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить рекомендации"
          style={{ marginBottom: 12 }}
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1450 }}
      />
    </Card>
  );
};

export default ImprovementRecommendations;