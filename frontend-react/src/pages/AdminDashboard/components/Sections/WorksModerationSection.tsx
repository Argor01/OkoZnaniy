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

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Work {
  id: number;
  title: string;
  description: string;
  subject: string;
  work_type: string;
  price: number;
  status: string;
  moderation_status: string;
  created_at: string;
  author: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    rating: number;
    works_count: number;
  };
  pages_count: number;
  words_count: number;
}

interface WorksModerationSectionProps {
  works?: Work[];
  loading?: boolean;
  onApproveWork?: (workId: number) => void;
  onRejectWork?: (workId: number) => void;
}

export const WorksModerationSection: React.FC<WorksModerationSectionProps> = ({
  works = [],
  loading = false,
  onApproveWork,
  onRejectWork,
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const mockWorks: Work[] = [
    {
      id: 1,
      title: 'Курсовая работа по математическому анализу',
      description: 'Полная курсовая работа по теме "Дифференциальные уравнения"',
      subject: 'Математика',
      work_type: 'Курсовая работа',
      price: 2500,
      status: 'active',
      moderation_status: 'pending',
      created_at: '2024-01-20T10:30:00Z',
      author: {
        id: 1,
        username: 'math_expert',
        first_name: 'Алексей',
        last_name: 'Математиков',
        rating: 4.8,
        works_count: 25,
      },
      pages_count: 45,
      words_count: 8500,
    },
    {
      id: 2,
      title: 'Дипломная работа по программированию',
      description: 'Веб-приложение на React с backend на Node.js',
      subject: 'Информатика',
      work_type: 'Дипломная работа',
      price: 8000,
      status: 'active',
      moderation_status: 'rejected',
      created_at: '2024-01-15T09:15:00Z',
      author: {
        id: 2,
        username: 'dev_student',
        first_name: 'Мария',
        last_name: 'Программистова',
        rating: 4.2,
        works_count: 12,
      },
      pages_count: 80,
      words_count: 15000,
    },
  ];

  const dataSource = works.length > 0 ? works : mockWorks;
  const filteredData = dataSource.filter(work => 
    work.title.toLowerCase().includes(searchText.toLowerCase()) &&
    (statusFilter === 'all' || work.moderation_status === statusFilter)
  );

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
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {record.title}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.subject} • {record.work_type}
          </Text>
          <div style={{ fontSize: '11px', color: '#666' }}>
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
            <div style={{ fontSize: '13px', fontWeight: 500 }}>
              {record.author.first_name} {record.author.last_name}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
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
        <div style={{ fontSize: '12px' }}>
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <div style={{ color: '#666' }}>{dayjs(date).format('HH:mm')}</div>
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
                  onClick={() => onApproveWork?.(record.id)}
                />
              </Tooltip>
              <Tooltip title="Отклонить">
                <Button 
                  size="small" 
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => onRejectWork?.(record.id)}
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
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Модерация работ</Title>
          <Text type="secondary">
            Проверка и одобрение работ для публикации в магазине
          </Text>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic title="Всего работ" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="На модерации" 
              value={stats.pending} 
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Одобрено" 
              value={stats.approved} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Отклонено" 
              value={stats.rejected} 
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>

        {stats.pending > 0 && (
          <Alert
            message="Внимание!"
            description={`У вас есть ${stats.pending} работ, ожидающих модерации.`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="Поиск по названию или автору"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Статус модерации"
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">Все статусы</Option>
            <Option value="pending">На модерации</Option>
            <Option value="approved">Одобрено</Option>
            <Option value="rejected">Отклонено</Option>
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
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} работ`
          }}
          locale={{ emptyText: 'Работы не найдены' }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  );
};