import React from 'react';
import { Card, Table, Input, Select, DatePicker, Switch, Space, Typography, Row, Col, Statistic, Button, Tooltip } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { AdminSectionProps, FilterConfig, StatConfig } from './types';
import { useAdminFilters } from './useAdminFilters';

const { Title } = Typography;
const { RangePicker } = DatePicker;

function AdminSectionLayout<T extends Record<string, any>>({
  title,
  data,
  loading = false,
  columns,
  filters = [],
  stats = [],
  rowKey = 'id',
  searchFields = [],
  pagination = true,
  pageSize = 20,
  className,
  extra,
}: AdminSectionProps<T>) {
  const {
    searchText,
    setSearchText,
    filterValues,
    setFilter,
    dateRange,
    setDateRange,
    resetFilters,
    filteredData,
  } = useAdminFilters(data, filters, searchFields);

  const hasSearchFilter = filters.some((f) => f.type === 'search') || searchFields.length > 0;
  const selectFilters = filters.filter((f) => f.type === 'select');
  const toggleFilters = filters.filter((f) => f.type === 'toggle');
  const hasDateRange = filters.some((f) => f.type === 'dateRange');

  return (
    <Card className={className}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
          <Space>
            {extra}
            <Tooltip title="Сбросить фильтры">
              <Button icon={<ReloadOutlined />} onClick={resetFilters} size="small" />
            </Tooltip>
          </Space>
        </div>

        {stats.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {stats.map((stat) => (
              <Col key={stat.key} span={Math.floor(24 / Math.min(stats.length, 6))}>
                <Card size="small">
                  <Statistic
                    title={stat.title}
                    value={stat.getValue(filteredData)}
                    suffix={stat.suffix}
                    precision={stat.precision}
                    valueStyle={stat.color ? { color: stat.color } : undefined}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <Space wrap style={{ marginBottom: 16 }}>
          {hasSearchFilter && (
            <Input.Search
              placeholder="Поиск..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              allowClear
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
            />
          )}

          {selectFilters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] as string || 'all'}
              onChange={(v) => setFilter(f.key, v)}
              style={{ minWidth: 150 }}
              placeholder={f.placeholder || f.label}
            >
              <Select.Option value="all">Все</Select.Option>
              {f.options?.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          ))}

          {hasDateRange && (
            <RangePicker
              value={dateRange}
              onChange={(values) => setDateRange(values as [Dayjs, Dayjs] | null)}
              placeholder={['Начало', 'Конец']}
            />
          )}

          {toggleFilters.map((f) => (
            <Space key={f.key}>
              <Switch
                checked={!!filterValues[f.key]}
                onChange={(v) => setFilter(f.key, v)}
                size="small"
              />
              <span>{f.label}</span>
            </Space>
          ))}
        </Space>
      </div>

      <Table<T>
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey={rowKey}
        pagination={
          pagination
            ? {
                pageSize,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
              }
            : false
        }
        scroll={{ x: 'max-content' }}
        size="middle"
      />
    </Card>
  );
}

export default AdminSectionLayout;
