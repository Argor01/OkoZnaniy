import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Spin,
  Typography,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getAllPartnersTurnover } from '../../api/directorApi';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { Text } = Typography;
const { Option } = Select;

const PartnerTurnover: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));

  const { data: turnoverData, isLoading } = useQuery({
    queryKey: ['director-partner-turnover', selectedMonth],
    queryFn: () => getAllPartnersTurnover(selectedMonth),
  });

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleQuickSelect = (type: 'current' | 'previous') => {
    if (type === 'current') {
      setSelectedMonth(dayjs().format('YYYY-MM'));
    } else {
      setSelectedMonth(dayjs().subtract(1, 'month').format('YYYY-MM'));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalTurnover = useMemo(() => {
    if (!turnoverData?.partners) return 0;
    return turnoverData.partners.reduce((sum: number, p: any) => sum + (p.turnover || 0), 0);
  }, [turnoverData]);

  const topPartners = useMemo(() => {
    if (!turnoverData?.partners) return [];
    return [...turnoverData.partners]
      .sort((a: any, b: any) => (b.turnover || 0) - (a.turnover || 0))
      .slice(0, 5);
  }, [turnoverData]);

  const columns: ColumnsType<any> = [
    {
      title: 'Место',
      key: 'rank',
      width: 80,
      render: (_, __, index) => (
        <Tag color={index < 3 ? 'gold' : 'default'}>
          {index + 1}
        </Tag>
      ),
    },
    {
      title: 'Имя партнёра',
      key: 'name',
      render: (_, record) => `${record.firstName || record.first_name || ''} ${record.lastName || record.last_name || ''}`,
      sorter: (a, b) =>
        (a.firstName || a.first_name || '').localeCompare(b.firstName || b.first_name || ''),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, record) => record.email || record.partnerEmail || '',
    },
    {
      title: 'Количество рефералов',
      key: 'referralsCount',
      render: (_, record) => record.referralsCount || record.referrals_count || 0,
      sorter: (a, b) =>
        (a.referralsCount || a.referrals_count || 0) - (b.referralsCount || b.referrals_count || 0),
    },
    {
      title: 'Оборот за период',
      key: 'turnover',
      render: (_, record) => formatCurrency(record.turnover || 0),
      sorter: (a, b) => (a.turnover || 0) - (b.turnover || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Комиссия партнёра',
      key: 'commission',
      render: (_, record) => formatCurrency(record.commission || 0),
      sorter: (a, b) => (a.commission || 0) - (b.commission || 0),
    },
    {
      title: 'Процент от общего оборота',
      key: 'percentage',
      render: (_, record) => {
        const percentage = totalTurnover > 0 ? ((record.turnover || 0) / totalTurnover) * 100 : 0;
        return `${percentage.toFixed(2)}%`;
      },
      sorter: (a, b) => (a.turnover || 0) - (b.turnover || 0),
    },
  ];

  return (
    <div>
      {/* Селектор периода */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space>
            <Select
              style={{ width: 200 }}
              value={selectedMonth}
              onChange={handleMonthChange}
              suffixIcon={<CalendarOutlined />}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = dayjs().subtract(i, 'month');
                return (
                  <Option key={month.format('YYYY-MM')} value={month.format('YYYY-MM')}>
                    {month.format('MMMM YYYY')}
                  </Option>
                );
              })}
            </Select>
            <Button onClick={() => handleQuickSelect('current')}>
              Текущий месяц
            </Button>
            <Button onClick={() => handleQuickSelect('previous')}>
              Прошлый месяц
            </Button>
          </Space>
        </Space>
      </Card>

      <Spin spinning={isLoading}>
        {turnoverData && (
          <>
            {/* Статистика */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Общий оборот партнёров"
                    value={totalTurnover}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Общая комиссия"
                    value={turnoverData.partners?.reduce((sum: number, p: any) => sum + (p.commission || 0), 0) || 0}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Активных партнёров"
                    value={turnoverData.partners?.length || 0}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Графики */}
            {topPartners.length > 0 && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card title="Топ-5 партнёров по обороту">
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topPartners.map((p) => ({
                          name: `${p.firstName || p.first_name || ''} ${(p.lastName || p.last_name || '').charAt(0)}.`,
                          turnover: p.turnover || 0,
                          commission: p.commission || 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="turnover" fill="#1890ff" name="Оборот" />
                          <Bar dataKey="commission" fill="#52c41a" name="Комиссия" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Распределение оборота">
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topPartners.map((p) => ({
                              name: `${p.firstName || p.first_name || ''} ${(p.lastName || p.last_name || '').charAt(0)}.`,
                              value: p.turnover || 0,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {topPartners.map((_: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'][idx]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Топ-5 партнёров */}
            {topPartners.length > 0 && (
              <Card title="Детали топ-5 партнёров" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {topPartners.map((partner, index) => {
                    const percentage = totalTurnover > 0 ? ((partner.turnover || 0) / totalTurnover) * 100 : 0;
                    return (
                      <Card key={partner.id} size="small">
                        <Row align="middle">
                          <Col span={1}>
                            <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'default'}>
                              {index + 1}
                            </Tag>
                          </Col>
                          <Col span={6}>
                            <Text strong>
                              {partner.firstName || partner.first_name} {partner.lastName || partner.last_name}
                            </Text>
                            <br />
                            <Text type="secondary">{partner.email || partner.partnerEmail || ''}</Text>
                          </Col>
                          <Col span={5}>
                            <Text>Оборот: {formatCurrency(partner.turnover || 0)}</Text>
                          </Col>
                          <Col span={5}>
                            <Text>Комиссия: {formatCurrency(partner.commission || 0)}</Text>
                          </Col>
                          <Col span={4}>
                            <Text>Рефералов: {partner.referralsCount || partner.referrals_count || 0}</Text>
                          </Col>
                          <Col span={3}>
                            <Tag color="blue">{percentage.toFixed(2)}%</Tag>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>
              </Card>
            )}

            {/* Таблица с оборотами */}
            <Card title="Оборот по всем партнёрам">
              <Table
                columns={columns}
                dataSource={turnoverData.partners || []}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Всего: ${total}`,
                }}
                summary={(pageData) => {
                  const pageTurnover = pageData.reduce((sum, record) => sum + (record.turnover || 0), 0);
                  const pageCommission = pageData.reduce((sum, record) => sum + (record.commission || 0), 0);
                  return (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}>
                          <Text strong>Итого:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          <Text strong>{formatCurrency(pageTurnover)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>
                          <Text strong>{formatCurrency(pageCommission)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} />
                      </Table.Summary.Row>
                    </>
                  );
                }}
              />
            </Card>


          </>
        )}
      </Spin>
    </div>
  );
};

export default PartnerTurnover;
