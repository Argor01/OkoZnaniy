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
  Statistic,
  Row,
  Col,
  Alert
} from 'antd';
import { 
  EyeOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  StarOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useWorks, useWorkActions } from '../../hooks/useAdminPanelData';
import { Work } from '@/features/admin/types/admin';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

export const WorksModerationSection: React.FC = () => {
  const { works = [], loading, refetch } = useWorks();
  const { approveWork, rejectWork } = useWorkActions();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const dataSource = works;
  const filteredData = dataSource.filter(work => 
    (work.title || '').toLowerCase().includes(searchText.toLowerCase()) &&
    (statusFilter === 'all' || work.moderation_status === statusFilter)
  );

  const handleApprove = async (workId: number) => {
    try {
      await approveWork(workId);
      message.success('Работа одобрена');
      refetch();
    } catch (error) {
      message.error('Ошибка при одобрении работы');
    }
  };

  const handleReject = async (workId: number) => {
    try {
      await rejectWork(workId);
      message.success('Работа отклонена');
      refetch();
    } catch (error) {
      message.error('Ошибка при отклонении работы');
    }
  };

  const getModerationStatusLabel = (status: string) => {
    const statusLabels = {
      pending: 'На модерации',
      approved: 'Одобрено',
      rejected: 'Отклонено',
    };
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const getModerationStatusColor = (status: string) => {
    const statusColors = {
      pending: 'orange',
      approved: 'green',
      rejected: 'red',
    };
    return statusColors[status as keyof typeof statusColors] || 'default';
  };

  const stats = {
    total: filteredData.length,
    pending: filteredData.filter(w => w.moderation_status === 'pending').length,
    approved: filteredData.filter(w => w.moderation_status === 'approved').length,
    rejected: filteredData.filter(w => w.moderation_status === 'rejected').length,
  };

  const columns = [
    {
      title: 'Работа',
      key: 'work',
      width: 300,
      render: (record: Work) => (
        <div>
          <div className="worksModerationTitle">
            {record.title}
          </div>
          <Text type="secondary" className="worksModerationMetaText">
            {record.subject} • {record.work_type}
          </Text>
          <div className="worksModerationMetaSubtext">
            📄 {record.pages_count} стр. • 📝 {record.words_count.toLocaleString()} слов
          </div>
        </div>
      ),
    },
    {
      title: 'Автор',
      key: 'author',
      width: 180,
      render: (record: Work) => (
        <Space>
          <div>
            <div className="worksModerationAuthorName">
              {record.author.first_name} {record.author.last_name}
            </div>
            <div className="worksModerationAuthorMeta">
              <StarOutlined /> {record.author.rating} • {record.author.works_count} работ
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'moderation_status',
      key: 'moderation_status',
      width: 120,
      render: (status: string) => (
        <Tag color={getModerationStatusColor(status)}>
          {getModerationStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => (
        <Text strong>{price.toLocaleString()} ₽</Text>
      ),
    },
    {
      title: 'Дата подачи',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <div className="worksModerationDate">
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <div className="worksModerationDateTime">{dayjs(date).format('HH:mm')}</div>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (record: Work) => (
        <Space direction="vertical" size={4}>
          <Space size={4}>
            <Tooltip title="Подробно">
              <Button 
                size="small" 
                icon={<EyeOutlined />}
              />
            </Tooltip>
            <Tooltip title="Скачать">
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
              />
            </Tooltip>
          </Space>
          {record.moderation_status === 'pending' && (
            <Space size={4}>
              <Tooltip title="Одобрить">
                <Button 
                  size="small" 
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.id)}
                />
              </Tooltip>
              <Tooltip title="Отклонить">
                <Button 
                  size="small" 
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleReject(record.id)}
                />
              </Tooltip>
            </Space>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="worksModerationSectionHeader">
          <Title level={4}>Модерация работ</Title>
          <Text type="secondary">
            Проверка и одобрение работ для публикации в магазине
          </Text>
        </div>

        <Row gutter={16} className="worksModerationStatsRow">
          <Col span={6}>
            <Statistic title="Всего работ" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="На модерации" 
              value={stats.pending} 
              className="worksModerationStatPending"
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Одобрено" 
              value={stats.approved} 
              className="worksModerationStatApproved"
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Отклонено" 
              value={stats.rejected} 
              className="worksModerationStatRejected"
            />
          </Col>
        </Row>

        {stats.pending > 0 && (
          <Alert
            message="Внимание!"
            description={`Имеется ${stats.pending} работ, ожидающих проверки. Пожалуйста, рассмотрите их как можно скорее.`}
            type="warning"
            showIcon
            className="worksModerationAlert"
          />
        )}

        <div className="worksModerationFilterRow">
          <Search
            placeholder="Поиск по названию..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            className="worksModerationSearch"
          />
          <Select
            defaultValue="pending"
            onChange={(value) => setStatusFilter(value)}
            className="worksModerationSelect"
          >
            <Option value="all">Все статусы</Option>
            <Option value="pending">На модерации</Option>
            <Option value="approved">Одобренные</Option>
            <Option value="rejected">Отклоненные</Option>
          </Select>
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
              `${range[0]}-${range[1]} из ${total} работ`
          }}
          locale={{ emptyText: 'Работы не найдены' }}
          size="small"
        />
      </Card>
    </div>
  );
};
