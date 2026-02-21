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
  Modal,
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
import ClaimDetails from '../ClaimsProcessing/ClaimDetails';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PendingApproval: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
  const params: GetClaimsParams = {
    status: 'pending_approval',
    type: typeFilter as 'refund' | 'dispute' | 'conflict' | undefined,
    page: currentPage,
    page_size: pageSize,
    search: searchText || undefined,
    date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  
  const { data: claimsData, isLoading, refetch } = useQuery({
    queryKey: ['arbitrator-claims', 'pending_approval', params],
    queryFn: () => arbitratorApi.getClaims(params),
    retry: false,
    retryOnMount: false,
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
  });

  
  const cancelApprovalMutation = useMutation({
    mutationFn: (id: number) => {
      
      return Promise.resolve();
    },
    onSuccess: () => {
      message.success('Запрос на согласование отменён');
      queryClient.invalidateQueries({ queryKey: ['arbitrator-claims'] });
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || 'Ошибка при отмене запроса');
    },
  });

  let claims = claimsData?.results || [];
  
  
  if (approvalStatusFilter) {
    claims = claims.filter((claim) => 
      claim.decision?.approval_status === approvalStatusFilter
    );
  }
  
  const total = approvalStatusFilter ? claims.length : (claimsData?.count || 0);

  
  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setTypeFilter(undefined);
    setApprovalStatusFilter(undefined);
    setDateRange(null);
    setCurrentPage(1);
  };

  const handleViewDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsVisible(true);
  };

  const handleCancelApproval = (claim: Claim) => {
    Modal.confirm({
      title: 'Отменить запрос на согласование?',
      content: 'Вы уверены, что хотите отменить запрос на согласование этого обращения?',
      okText: 'Отменить запрос',
      cancelText: 'Закрыть',
      maskStyle: {
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      },
      onOk: () => {
        cancelApprovalMutation.mutate(claim.id);
      },
    });
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

  
  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      default:
        return 'default';
    }
  };

  
  const getApprovalStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает решения';
      case 'approved':
        return 'Согласовано';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
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
      title: 'Дата отправки',
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
    },
    {
      title: 'Статус',
      key: 'approval_status',
      width: 130,
      render: (record: Claim) =>
        record.decision?.approval_status ? (
          <Tag color={getApprovalStatusColor(record.decision.approval_status)} style={{ margin: 0 }}>
            {getApprovalStatusText(record.decision.approval_status)}
          </Tag>
        ) : (
          <Tag color="orange" style={{ margin: 0 }}>Ожидает решения</Tag>
        ),
    },
    {
      title: 'Комментарий',
      key: 'approval_comment',
      width: 150,
      ellipsis: true,
      render: (record: Claim) => (
        <Tooltip title={record.decision?.approval_comment || '-'}>
          <Text style={{ fontSize: '12px' }}>
            {record.decision?.approval_comment || '-'}
          </Text>
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
          {record.decision?.approval_status === 'pending' && (
            <Tooltip title="Отменить запрос">
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancelApproval(record)}
                loading={cancelApprovalMutation.isPending}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card bodyStyle={{ padding: '16px' }}>
        <Title level={4} style={{ marginBottom: '8px' }}>Ожидают решения</Title>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          Обращения, отправленные на согласование дирекции
        </Text>

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
            <Select
              placeholder="Статус согласования"
              style={{ width: '100%' }}
              value={approvalStatusFilter}
              onChange={setApprovalStatusFilter}
              allowClear
            >
              <Option value="pending">Ожидает решения</Option>
              <Option value="approved">Согласовано</Option>
              <Option value="rejected">Отклонено</Option>
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
                  description="Обращения, ожидающие решения, не найдены"
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

export default PendingApproval;