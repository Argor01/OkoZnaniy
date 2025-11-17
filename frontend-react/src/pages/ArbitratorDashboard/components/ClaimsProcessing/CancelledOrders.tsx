import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  message,
  DatePicker,
  Row,
  Col,
  Empty,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim, GetClaimsParams } from '../../api/types';
import ClaimDetails from './ClaimDetails';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CancelledOrders: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [conflictTypeFilter, setConflictTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Параметры запроса
  const params: GetClaimsParams = {
    type: 'conflict',
    page: currentPage,
    page_size: pageSize,
    search: searchText || undefined,
    date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  // Получение списка отменённых заказов
  const { data: claimsData, isLoading, refetch } = useQuery({
    queryKey: ['arbitrator-claims', 'conflict', params],
    queryFn: () => arbitratorApi.getClaims(params),
    retry: false,
    retryOnMount: false,
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
  });

  let claims = claimsData?.results || [];

  // Фильтрация по типу конфликта на клиенте
  if (conflictTypeFilter) {
    claims = claims.filter((claim) => {
      if ('conflict_type' in claim) {
        return (claim as any).conflict_type === conflictTypeFilter;
      }
      return false;
    });
  }

  // Фильтрация по статусу на клиенте
  if (statusFilter) {
    claims = claims.filter((claim) => claim.status === statusFilter);
  }

  const total = (conflictTypeFilter || statusFilter)
    ? claims.length
    : (claimsData?.count || 0);

  // Обработчики
  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setConflictTypeFilter(undefined);
    setStatusFilter(undefined);
    setDateRange(null);
    setCurrentPage(1);
  };

  const handleViewDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsVisible(true);
  };

  const handleDetailsClose = () => {
    setDetailsVisible(false);
    setSelectedClaim(null);
  };

  // Получение цвета тега типа конфликта
  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case 'quality':
        return 'red';
      case 'deadline':
        return 'orange';
      case 'other':
        return 'default';
      default:
        return 'default';
    }
  };

  // Получение текста типа конфликта
  const getConflictTypeText = (type: string) => {
    switch (type) {
      case 'quality':
        return 'Качество работы';
      case 'deadline':
        return 'Нарушение сроков';
      case 'other':
        return 'Другие';
      default:
        return type;
    }
  };

  // Получение цвета тега статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      default:
        return 'default';
    }
  };

  // Получение текста статуса
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Новая';
      case 'in_progress':
        return 'В рассмотрении';
      case 'completed':
        return 'Решена';
      default:
        return status;
    }
  };

  // Колонки таблицы
  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: 'Тип конфликта',
      key: 'conflict_type',
      width: 130,
      render: (record: Claim) => {
        if ('conflict_type' in record) {
          const conflictType = (record as any).conflict_type;
          return (
            <Tag color={getConflictTypeColor(conflictType)} style={{ margin: 0 }}>
              {getConflictTypeText(conflictType)}
            </Tag>
          );
        }
        return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ margin: 0 }}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Клиент',
      key: 'client',
      width: 140,
      ellipsis: true,
      render: (record: Claim) => (
        <Tooltip title={`${record.client.username}\n${record.client.email}`}>
          <div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.client.username}
            </div>
            <Text type="secondary" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {record.client.email}
            </Text>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Эксперт',
      key: 'expert',
      width: 140,
      ellipsis: true,
      render: (record: Claim) =>
        record.expert ? (
          <Tooltip title={`${record.expert.username}\n${record.expert.email}`}>
            <div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.expert.username}
              </div>
              <Text type="secondary" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {record.expert.email}
              </Text>
            </div>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>Не назначен</Text>
        ),
    },
    {
      title: 'Сумма заказа',
      key: 'order_amount',
      width: 100,
      align: 'right' as const,
      render: (record: Claim) => (
        <Text style={{ fontSize: '12px' }}>{record.order.amount.toLocaleString()} ₽</Text>
      ),
    },
    {
      title: 'Дата отмены',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>
          <span style={{ fontSize: '12px' }}>
            {dayjs(date).format('DD.MM.YYYY')}
          </span>
        </Tooltip>
      ),
      sorter: true,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 60,
      fixed: 'right' as const,
      render: (record: Claim) => (
        <Tooltip title="Просмотр">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Card bodyStyle={{ padding: '16px' }}>
        <Title level={4} style={{ marginBottom: '8px' }}>
          <CloseCircleOutlined /> Отменённые обращения
        </Title>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          Список отменённых заказов, требующих арбитража
        </Text>

        {/* Фильтры и поиск */}
        <Row gutter={[12, 12]} style={{ marginTop: 16, marginBottom: 12 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="Поиск по номеру, клиенту, эксперту..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Select
              placeholder="Тип конфликта"
              style={{ width: '100%' }}
              value={conflictTypeFilter}
              onChange={setConflictTypeFilter}
              allowClear
            >
              <Option value="quality">Качество работы</Option>
              <Option value="deadline">Нарушение сроков</Option>
              <Option value="other">Другие</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Select
              placeholder="Статус"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="new">Новая</Option>
              <Option value="in_progress">В рассмотрении</Option>
              <Option value="completed">Решена</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              format="DD.MM.YYYY"
              placeholder={['Дата от', 'Дата до']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Space>
              <Tooltip title="Поиск">
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} />
              </Tooltip>
              <Tooltip title="Сбросить фильтры">
                <Button icon={<ReloadOutlined />} onClick={handleResetFilters} />
              </Tooltip>
            </Space>
          </Col>
        </Row>

        {/* Таблица */}
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            dataSource={claims}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `Всего ${total} обращений`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Отменённые обращения не найдены"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Card>

      {/* Модальное окно детального просмотра */}
      {selectedClaim && (
        <ClaimDetails
          claim={selectedClaim}
          visible={detailsVisible}
          onClose={handleDetailsClose}
          showDecisionForm={true}
        />
      )}
    </div>
  );
};

export default CancelledOrders;

