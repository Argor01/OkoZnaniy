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
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim, GetClaimsParams } from '../../api/types';
import ClaimDetails from '../ClaimsProcessing/ClaimDetails';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const InProgress: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
  const params: GetClaimsParams = {
    status: 'in_progress',
    type: typeFilter as 'refund' | 'dispute' | 'conflict' | undefined,
    page: currentPage,
    page_size: pageSize,
    search: searchText || undefined,
  };

  
  const { data: claimsData, isLoading, refetch } = useQuery({
    queryKey: ['arbitrator-claims', 'in_progress', params],
    queryFn: () => arbitratorApi.getClaims(params),
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
  });

  
  const sendForApprovalMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      arbitratorApi.sendForApproval(id, { message }),
    onMutate: async (variables) => {
      const { id: claimId } = variables;
      
      await queryClient.cancelQueries({ queryKey: ['arbitrator-claims'] });

      
      const previousInProgressData = queryClient.getQueryData(['arbitrator-claims', 'in_progress', params]);
      const previousPendingApprovalData = queryClient.getQueryData(['arbitrator-claims', 'pending_approval']);

      
      queryClient.setQueryData(['arbitrator-claims', 'in_progress', params], (old: any) => {
        if (!old?.results) return old;
        return {
          ...old,
          count: Math.max(0, old.count - 1),
          results: old.results.filter((claim: Claim) => claim.id !== claimId),
        };
      });

      return { previousInProgressData, previousPendingApprovalData };
    },
    onSuccess: () => {
      message.success('Обращение отправлено на согласование');
      
      queryClient.invalidateQueries({ queryKey: ['arbitrator-claims', 'pending_approval'] });
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['arbitrator-claims'] });
      }, 500);
    },
    onError: (error: any, variables, context) => {
      
      if (context?.previousInProgressData) {
        queryClient.setQueryData(['arbitrator-claims', 'in_progress', params], context.previousInProgressData);
      }
      message.error(error?.response?.data?.detail || error?.message || 'Ошибка при отправке на согласование');
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
    setCurrentPage(1);
  };

  const handleViewDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsVisible(true);
  };

  const handleSendForApproval = (claim: Claim) => {
    
    sendForApprovalMutation.mutate({
      id: claim.id,
      message: 'Отправлено на согласование дирекции',
    });
  };

  const handleDetailsClose = () => {
    setDetailsVisible(false);
    setSelectedClaim(null);
  };

  
  const getTimeInWork = (claim: Claim) => {
    if (!claim.taken_at) return 'Не указано';
    const now = dayjs();
    const taken = dayjs(claim.taken_at);
    const diff = now.diff(taken, 'hour');
    if (diff < 24) {
      return `${diff} ч.`;
    }
    const days = Math.floor(diff / 24);
    const hours = diff % 24;
    return `${days} дн. ${hours} ч.`;
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
        <Tag color={getTypeColor(type)} style={{ margin: 0 }}>
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
      title: 'Время в работе',
      key: 'time_in_work',
      width: 110,
      render: (record: Claim) => <Text style={{ fontSize: '12px' }}>{getTimeInWork(record)}</Text>,
    },
    {
      title: 'Последнее действие',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 110,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>
          <span style={{ fontSize: '12px' }}>
            {dayjs(date).format('DD.MM.YYYY')}
          </span>
        </Tooltip>
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
          <Tooltip title="На согласование">
            <Button
              size="small"
              icon={<SendOutlined />}
              onClick={() => handleSendForApproval(record)}
              loading={sendForApprovalMutation.isPending}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card bodyStyle={{ padding: '16px' }}>
        <Title level={4} style={{ marginBottom: '8px' }}>В работе</Title>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          Список обращений, находящихся в обработке
        </Text>

        <Row gutter={[12, 12]} style={{ marginTop: 16, marginBottom: 12 }}>
          <Col xs={24} sm={12} md={8} lg={8}>
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
              style={{ width: '100%' }}
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
                  description="Обращения в работе не найдены"
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
        />
      )}
    </div>
  );
};

export default InProgress;