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
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim, GetClaimsParams } from '../../api/types';
import ClaimDetails from '../ClaimsProcessing/ClaimDetails';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Completed: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [decisionTypeFilter, setDecisionTypeFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  
  const params: GetClaimsParams = {
    status: 'completed',
    type: typeFilter as 'refund' | 'dispute' | 'conflict' | undefined,
    page: currentPage,
    page_size: pageSize,
    search: searchText || undefined,
    date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  
  const { data: claimsData, isLoading, refetch } = useQuery({
    queryKey: ['arbitrator-claims', 'completed', params],
    queryFn: () => arbitratorApi.getClaims(params),
    retry: false,
    retryOnMount: false,
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
  });

  let claims = claimsData?.results || [];
  
  
  if (decisionTypeFilter) {
    claims = claims.filter((claim) => 
      claim.decision?.decision_type === decisionTypeFilter
    );
  }
  
  const total = decisionTypeFilter ? claims.length : (claimsData?.count || 0);

  
  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setTypeFilter(undefined);
    setDecisionTypeFilter(undefined);
    setDateRange(null);
    setCurrentPage(1);
  };

  const handleViewDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsVisible(true);
  };

  const handleExport = () => {
    message.info('Функция экспорта будет реализована на этапе 5');
    
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

  
  const getDecisionText = (decisionType: string) => {
    switch (decisionType) {
      case 'full_refund':
        return 'Полный возврат';
      case 'partial_refund':
        return 'Частичный возврат';
      case 'no_refund':
        return 'Отказ в возврате';
      case 'revision':
        return 'Возврат на доработку';
      case 'other':
        return 'Другое';
      default:
        return decisionType;
    }
  };

  
  const getDecisionColor = (decisionType: string) => {
    switch (decisionType) {
      case 'full_refund':
        return 'green';
      case 'partial_refund':
        return 'blue';
      case 'no_refund':
        return 'red';
      case 'revision':
        return 'orange';
      default:
        return 'default';
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
      title: 'Решение',
      key: 'decision',
      width: 130,
      render: (record: Claim) =>
        record.decision ? (
          <Tag color={getDecisionColor(record.decision.decision_type)} className="arbitratorTagNoMargin">
            {getDecisionText(record.decision.decision_type)}
          </Tag>
        ) : (
          <Text type="secondary" className="arbitratorTextXs">Не указано</Text>
        ),
    },
    {
      title: 'Дата завершения',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 110,
      render: (date: string) =>
        date ? (
          <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>
            <span className="arbitratorTextXs">
              {dayjs(date).format('DD.MM.YYYY')}
            </span>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: true,
    },
    {
      title: 'Арбитр',
      key: 'arbitrator',
      width: 110,
      ellipsis: true,
      render: (record: Claim) =>
        record.arbitrator ? (
          <Tooltip title={record.arbitrator.username}>
            <Text className="arbitratorTextEllipsisXs">
              {record.arbitrator.username}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary" className="arbitratorTextXs">Не указан</Text>
        ),
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
        <div className="arbitratorHeaderRow">
          <div>
            <Title level={4} className="arbitratorSectionTitleCompact">Завершённые</Title>
            <Text type="secondary" className="arbitratorSectionSubtitle">
              Архив завершённых обращений
            </Text>
          </div>
          <Tooltip title="Экспорт данных">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            />
          </Tooltip>
        </div>

        <Row gutter={[12, 12]} className="arbitratorFiltersRowCompact">
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
              placeholder="Тип решения"
              className="arbitratorSelectFull"
              value={decisionTypeFilter}
              onChange={setDecisionTypeFilter}
              allowClear
            >
              <Option value="full_refund">Полный возврат</Option>
              <Option value="partial_refund">Частичный возврат</Option>
              <Option value="no_refund">Отказ в возврате</Option>
              <Option value="revision">Возврат на доработку</Option>
              <Option value="other">Другое</Option>
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
                  description="Завершённые обращения не найдены"
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

export default Completed;
