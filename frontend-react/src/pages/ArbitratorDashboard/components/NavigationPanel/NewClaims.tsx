import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Spin,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim, GetClaimsParams } from '../../api/types';
import ClaimDetails from '../ClaimsProcessing/ClaimDetails';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const NewClaims: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
  const params: GetClaimsParams = {
    status: 'new',
    type: typeFilter as 'refund' | 'dispute' | 'conflict' | undefined,
    page: currentPage,
    page_size: pageSize,
    search: searchText || undefined,
    date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  
  const { data: claimsData, isLoading, refetch } = useQuery({
    queryKey: ['arbitrator-claims', 'new', params],
    queryFn: () => arbitratorApi.getClaims(params),
    retry: false,
    retryOnMount: false,
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
  });

  
  const takeClaimMutation = useMutation({
    mutationFn: (id: number) => arbitratorApi.takeClaim(id),
    onMutate: async (claimId) => {
      
      await queryClient.cancelQueries({ queryKey: ['arbitrator-claims'] });

      
      const previousClaimsData = queryClient.getQueryData(['arbitrator-claims', 'new', params]);
      const previousCount = queryClient.getQueryData(['arbitrator-claims', 'new', 'count']);

      
      queryClient.setQueryData(['arbitrator-claims', 'new', params], (old: any) => {
        if (!old?.results) return old;
        return {
          ...old,
          count: Math.max(0, old.count - 1),
          results: old.results.filter((claim: Claim) => claim.id !== claimId),
        };
      });

      
      queryClient.setQueryData(['arbitrator-claims', 'new', 'count'], (old: number | undefined) => {
        return Math.max(0, (old || 0) - 1);
      });

      return { previousClaimsData, previousCount };
    },
    onSuccess: () => {
      message.success('Обращение взято в работу');
      
      
      queryClient.invalidateQueries({ queryKey: ['arbitrator-claims', 'in_progress'] });
    },
    onError: (error: any, claimId, context) => {
      
      if (context?.previousClaimsData) {
        queryClient.setQueryData(['arbitrator-claims', 'new', params], context.previousClaimsData);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['arbitrator-claims', 'new', 'count'], context.previousCount);
      }
      message.error(error?.response?.data?.detail || error?.message || 'Ошибка при взятии обращения в работу');
    },
  });

  const claims = claimsData?.results || [];
  const total = claimsData?.count || 0;

  
  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setTypeFilter(undefined);
    setPriorityFilter(undefined);
    setDateRange(null);
    setCurrentPage(1);
  };

  const handleViewDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsVisible(true);
  };

  const handleTakeClaim = (claim: Claim) => {
    takeClaimMutation.mutate(claim.id);
  };

  const handleDetailsClose = () => {
    setDetailsVisible(false);
    setSelectedClaim(null);
  };

  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'refund':
        return 'blue';
      case 'dispute':
        return 'orange';
      case 'conflict':
        return 'red';
      default:
        return 'default';
    }
  };

  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  
  const getTypeText = (type: string) => {
    switch (type) {
      case 'refund':
        return 'Возврат средств';
      case 'dispute':
        return 'Арбитраж';
      case 'conflict':
        return 'Конфликт';
      default:
        return type;
    }
  };

  
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return priority;
    }
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
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: string) => (
        <Tag color={getTypeColor(type)} className="arbitratorTagNoMargin">
          {getTypeText(type)}
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
      title: 'Сумма',
      key: 'amount',
      width: 100,
      align: 'right' as const,
      render: (record: Claim) => (
        <Text strong>{record.order.amount.toLocaleString()} ₽</Text>
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
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)} className="arbitratorTagNoMargin">
          {getPriorityText(priority)}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      render: (record: Claim) => (
        <Space size="small">
          <Tooltip title="Просмотр">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Взять в работу">
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleTakeClaim(record)}
              loading={takeClaimMutation.isPending}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card className="arbitratorCard">
        <Title level={4} className="arbitratorSectionTitle">Новые обращения</Title>
        <Text type="secondary" className="arbitratorSectionSubtitle">
          Список новых обращений, требующих обработки
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
              placeholder="Тип обращения"
              className="arbitratorSelectFull"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
            >
              <Option value="refund">Возврат средств</Option>
              <Option value="dispute">Арбитраж</Option>
              <Option value="conflict">Конфликт</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Select
              placeholder="Приоритет"
              className="arbitratorSelectFull"
              value={priorityFilter}
              onChange={setPriorityFilter}
              allowClear
            >
              <Option value="high">Высокий</Option>
              <Option value="medium">Средний</Option>
              <Option value="low">Низкий</Option>
            </Select>
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
                  description="Новые обращения не найдены"
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
          onTakeClaim={() => {
            handleTakeClaim(selectedClaim);
            handleDetailsClose();
          }}
        />
      )}
    </div>
  );
};

export default NewClaims;
