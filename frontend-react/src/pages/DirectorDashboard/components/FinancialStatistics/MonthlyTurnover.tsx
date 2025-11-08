import React, { useState, useMemo } from 'react';
import { Card, Statistic, Row, Col, Select, Button, Space, Spin, message, Typography, Table } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getMonthlyTurnover, type MonthlyTurnover } from '../../api/directorApi';

const { Title } = Typography;
const { Option } = Select;

const MonthlyTurnover: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const { data: turnoverData, isLoading } = useQuery({
    queryKey: ['director-monthly-turnover', selectedMonth],
    queryFn: () => getMonthlyTurnover(selectedMonth),
    onError: (error: any) => {
      message.error('Ошибка при загрузке данных оборота');
    },
  });

  const chartData = useMemo(() => {
    const dailyData = turnoverData?.dailyData || turnoverData?.daily_data || [];
    if (dailyData.length === 0) return [];
    
    if (viewMode === 'weekly') {
      // Группируем данные по неделям
      const weeklyData: Record<string, number> = {};
      dailyData.forEach((item) => {
        const week = dayjs(item.date).format('YYYY-[W]WW');
        weeklyData[week] = (weeklyData[week] || 0) + item.amount;
      });
      return Object.entries(weeklyData).map(([week, amount]) => ({
        period: week,
        amount: Math.round(amount),
      }));
    }
    
    return dailyData.map((item) => ({
      period: dayjs(item.date).format('DD.MM'),
      amount: item.amount,
    }));
  }, [turnoverData, viewMode]);

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

  const columns = [
    {
      title: 'Период',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
    },
  ];

  return (
    <div>
      <Card>
        <Title level={4}>Общий оборот за месяц</Title>
        
        {/* Селектор месяца и быстрый выбор */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }} size="large">
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

        <Spin spinning={isLoading}>
          {turnoverData && (
            <>
              {/* Карточка с общей суммой оборота */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card>
                    <Statistic
                      title="Оборот за период"
                      value={turnoverData.total}
                      prefix="₽"
                      precision={2}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card>
                    <Statistic
                      title="Изменение к предыдущему периоду"
                      value={Math.abs(turnoverData.changePercent || turnoverData.change_percent || 0)}
                      prefix={(turnoverData.change || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      suffix="%"
                      valueStyle={{
                        color: (turnoverData.change || 0) >= 0 ? '#3f8600' : '#cf1322',
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                      {(turnoverData.change || 0) >= 0 ? '+' : ''}
                      {formatCurrency(turnoverData.change || 0)} ({(turnoverData.changePercent || turnoverData.change_percent || 0) >= 0 ? '+' : ''}
                      {(turnoverData.changePercent || turnoverData.change_percent || 0).toFixed(2)}%)
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Таблица вместо графика */}
              <Card title="Данные оборота" extra={
                <Space>
                  <Button
                    type={viewMode === 'daily' ? 'primary' : 'default'}
                    onClick={() => setViewMode('daily')}
                    size="small"
                  >
                    По дням
                  </Button>
                  <Button
                    type={viewMode === 'weekly' ? 'primary' : 'default'}
                    onClick={() => setViewMode('weekly')}
                    size="small"
                  >
                    По неделям
                  </Button>
                </Space>
              }>
                <Table
                  columns={columns}
                  dataSource={chartData}
                  rowKey="period"
                  pagination={{ pageSize: 10 }}
                  summary={(pageData) => {
                    const total = pageData.reduce((sum, record) => sum + record.amount, 0);
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <strong>Итого:</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>
                            <strong>{formatCurrency(total)}</strong>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
                <div style={{ marginTop: 16, padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
                  <Typography.Text type="secondary">
                    💡 Для отображения графиков установите библиотеку recharts: <code>npm install recharts</code>
                  </Typography.Text>
                </div>
              </Card>
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default MonthlyTurnover;
