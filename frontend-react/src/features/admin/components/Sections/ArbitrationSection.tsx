import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Space, Input, Select, Card, Row, Col,
  Statistic, Badge, Tooltip, message, Modal, Typography
} from 'antd';
import {
  SearchOutlined, FilterOutlined, EyeOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  DollarOutlined, UserOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import './ArbitrationSection.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface ArbitrationCase {
  id: number;
  case_number: string;
  plaintiff: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  defendant?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  reason: string;
  reason_display: string;
  assigned_admin?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  messages_count: number;
  unread_count: number;
}

interface ArbitrationSectionProps {
  cases: ArbitrationCase[];
  loading: boolean;
  onRefresh: () => void;
  stats?: {
    total_cases: number;
    new_cases: number;
    in_progress: number;
    awaiting_decision: number;
    closed_cases: number;
    urgent_cases: number;
  };
}

export const ArbitrationSection: React.FC<ArbitrationSectionProps> = ({
  cases,
  loading,
  onRefresh,
  stats
}) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [filteredCases, setFilteredCases] = useState<ArbitrationCase[]>(cases);

  useEffect(() => {
    let filtered = cases;

    if (searchText) {
      filtered = filtered.filter(c =>
        c.case_number.toLowerCase().includes(searchText.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchText.toLowerCase()) ||
        c.plaintiff.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.plaintiff.last_name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(c => c.priority === priorityFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchText, statusFilter, priorityFilter]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'default', icon: <FileTextOutlined /> },
      submitted: { color: 'blue', icon: <ExclamationCircleOutlined /> },
      under_review: { color: 'processing', icon: <ClockCircleOutlined /> },
      awaiting_response: { color: 'warning', icon: <ClockCircleOutlined /> },
      in_arbitration: { color: 'orange', icon: <ExclamationCircleOutlined /> },
      decision_made: { color: 'success', icon: <CheckCircleOutlined /> },
      closed: { color: 'default', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    return configs[status] || { color: 'default', icon: <FileTextOutlined /> };
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'default';
  };

  const columns: ColumnsType<ArbitrationCase> = [
    {
      title: 'Номер дела',
      dataIndex: 'case_number',
      key: 'case_number',
      width: 150,
      fixed: 'left',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff', cursor: 'pointer' }}
                onClick={() => navigate(`/admin/arbitration/case/${record.case_number}`)}>
            {text}
          </Text>
          {record.unread_count > 0 && (
            <Badge count={record.unread_count} size="small" />
          )}
        </Space>
      ),
    },
    {
      title: 'Истец',
      key: 'plaintiff',
      width: 200,
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <Space direction="vertical" size={0}>
            <Text strong>
              {record.plaintiff.first_name} {record.plaintiff.last_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.plaintiff.email}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Ответчик',
      key: 'defendant',
      width: 200,
      render: (_, record) => (
        record.defendant ? (
          <Space>
            <UserOutlined style={{ color: '#fa8c16' }} />
            <Space direction="vertical" size={0}>
              <Text strong>
                {record.defendant.first_name} {record.defendant.last_name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.defendant.email}
              </Text>
            </Space>
          </Space>
        ) : (
          <Text type="secondary">Не указан</Text>
        )
      ),
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <Space direction="vertical" size={0}>
            <Text>{text}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.reason_display}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 180,
      filters: [
        { text: 'Подано', value: 'submitted' },
        { text: 'На рассмотрении', value: 'under_review' },
        { text: 'В арбитраже', value: 'in_arbitration' },
        { text: 'Решение принято', value: 'decision_made' },
        { text: 'Закрыто', value: 'closed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (_, record) => {
        const config = getStatusConfig(record.status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {record.status_display}
          </Tag>
        );
      },
    },
    {
      title: 'Приоритет',
      key: 'priority',
      width: 120,
      filters: [
        { text: 'Низкий', value: 'low' },
        { text: 'Средний', value: 'medium' },
        { text: 'Высокий', value: 'high' },
        { text: 'Срочный', value: 'urgent' },
      ],
      onFilter: (value, record) => record.priority === value,
      render: (_, record) => (
        <Tag color={getPriorityColor(record.priority)}>
          {record.priority_display}
        </Tag>
      ),
    },
    {
      title: 'Ответственный',
      key: 'assigned_admin',
      width: 150,
      render: (_, record) => (
        record.assigned_admin ? (
          <Text>
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </Text>
        ) : (
          <Text type="secondary">Не назначен</Text>
        )
      ),
    },
    {
      title: 'Создано',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (text) => new Date(text).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/arbitration/case/${record.case_number}`)}
        >
          Открыть
        </Button>
      ),
    },
  ];

  return (
    <div className="arbitration-section">
      {/* Статистика */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Всего дел"
                value={stats.total_cases}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Новые"
                value={stats.new_cases}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="В работе"
                value={stats.in_progress}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Ожидают решения"
                value={stats.awaiting_decision}
                valueStyle={{ color: '#722ed1' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Закрыто"
                value={stats.closed_cases}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Срочные"
                value={stats.urgent_cases}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Фильтры */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Поиск по номеру, теме, истцу..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Статус"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 200 }}
            allowClear
          >
            <Option value="submitted">Подано</Option>
            <Option value="under_review">На рассмотрении</Option>
            <Option value="in_arbitration">В арбитраже</Option>
            <Option value="decision_made">Решение принято</Option>
            <Option value="closed">Закрыто</Option>
          </Select>
          <Select
            placeholder="Приоритет"
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="low">Низкий</Option>
            <Option value="medium">Средний</Option>
            <Option value="high">Высокий</Option>
            <Option value="urgent">Срочный</Option>
          </Select>
          <Button
            icon={<FilterOutlined />}
            onClick={() => {
              setSearchText('');
              setStatusFilter(undefined);
              setPriorityFilter(undefined);
            }}
          >
            Сбросить фильтры
          </Button>
          <Button type="primary" onClick={onRefresh}>
            Обновить
          </Button>
        </Space>
      </Card>

      {/* Таблица */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCases}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total} дел`,
          }}
        />
      </Card>
    </div>
  );
};
