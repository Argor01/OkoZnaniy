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
  InputNumber,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim, GetClaimsParams } from '../../api/types';
import ClaimDetails from './ClaimDetails';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const RefundRequests: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [minAmount, setMinAmount] = useState<number | undefined>(undefined);
  const [maxAmount, setMaxAmount] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
  const params: GetClaimsParams = {
    type: 'refund',
    page: currentPage,
    page_size: pageSize,
    search: searchText || undefined,
    date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  
  const { data: claimsData, isLoading, refetch } = useQuery({
    queryKey: ['arbitrator-claims', 'refund', params],
    queryFn: () => arbitratorApi.getClaims(params),
    retry: false,
    retryOnMount: false,
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
  });

  let claims = claimsData?.results || [];

  
  if (statusFilter) {
    claims = claims.filter((claim) => claim.status === statusFilter);
  }

  
  if (minAmount !== undefined || maxAmount !== undefined) {
    claims = claims.filter((claim) => {
      const amount = claim.order.amount;
      if (minAmount !== undefined && amount < minAmount) return false;
      if (maxAmount !== undefined && amount > maxAmount) return false;
      return true;
    });
  }

  const total = (statusFilter || minAmount !== undefined || maxAmount !== undefined)
    ? claims.length
    : (claimsData?.count || 0);

  
  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setMinAmount(undefined);
    setMaxAmount(undefined);
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

  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'pending_approval':
        return 'purple';
      default:
        return 'default';
    }
  };

  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Новая';
      case 'in_progress':
        return 'В рассмотрении';
      case 'completed':
        return 'Завершена';
      case 'pending_approval':
        return 'Ожидает согласования';
      default:
        return status;
    }
  };

  
  const getRequestedAmount = (claim: Claim) => {
    if ('requested_amount' in claim) {
      return (claim as any).requested_amount;
    }
    return claim.order.amount;
  };

  
  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} className="arbitratorTagNoMargin">
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
            <div className="arbitratorTextEllipsis">
              {record.client.username}
            </div>
            <Text type="secondary" className="arbitratorTextEllipsisSmall">
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
              <div className="arbitratorTextEllipsis">
                {record.expert.username}
              </div>
              <Text type="secondary" className="arbitratorTextEllipsisSmall">
                {record.expert.email}
              </Text>
            </div>
          </Tooltip>
        ) : (
          <Text type="secondary" className="arbitratorTextXs">Не назначен</Text>
        ),
    },
    {
      title: 'Сумма заказа',
      key: 'order_amount',
      width: 100,
      align: 'right' as const,
      render: (record: Claim) => (
        <Text className="arbitratorAmountText">{record.order.amount.toLocaleString()} ₽</Text>
      ),
    },
    {
      title: 'Запрошено',
      key: 'requested_amount',
      width: 100,
      align: 'right' as const,
      render: (record: Claim) => (
        <Text strong className="arbitratorAmountHighlight">
          {getRequestedAmount(record).toLocaleString()} ₽
        </Text>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>
          <span className="arbitratorTextXs">
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
      <Card className="arbitratorCard">
        <Title level={4} className="arbitratorSectionTitle">
          <DollarOutlined /> Заявки на возврат средств
        </Title>
        <Text type="secondary" className="arbitratorSectionSubtitle">
          Список заявок на возврат средств от клиентов
        </Text>

        <Row gutter={[12, 12]} className="arbitratorFiltersRow">
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
              placeholder="Статус"
              className="arbitratorSelectFull"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="new">Новая</Option>
              <Option value="in_progress">В рассмотрении</Option>
              <Option value="completed">Завершена</Option>
              <Option value="pending_approval">Ожидает согласования</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={3}>
            <InputNumber
              placeholder="Сумма от"
              className="arbitratorSelectFull"
              value={minAmount}
              onChange={(value) => setMinAmount(value || undefined)}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={(value) => Number((value ?? '').replace(/\s?/g, ''))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={3}>
            <InputNumber
              placeholder="Сумма до"
              className="arbitratorSelectFull"
              value={maxAmount}
              onChange={(value) => setMaxAmount(value || undefined)}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={(value) => Number((value ?? '').replace(/\s?/g, ''))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              className="arbitratorSelectFull"
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              format="DD.MM.YYYY"
              placeholder={['Дата от', 'Дата до']}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={2}>
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

        <div className="arbitratorTableScroll">
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
              showTotal: (total) => `Всего ${total} заявок`,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Заявки на возврат средств не найдены"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Card>

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

export default RefundRequests;

