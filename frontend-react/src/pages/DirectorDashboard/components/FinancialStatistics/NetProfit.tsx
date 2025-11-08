import React, { useState, useMemo } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  DatePicker,
  Button,
  Space,
  Spin,
  message,
  Typography,
  Table,
  Tag,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { getNetProfit, type NetProfit } from '../../api/directorApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const NetProfitComponent: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const { data: profitData, isLoading } = useQuery({
    queryKey: ['director-net-profit', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () =>
      getNetProfit(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      ),
    onError: (error: any) => {
      message.error('Ошибка при загрузке данных прибыли');
    },
  });

  const handleQuickSelect = (type: string) => {
    const today = dayjs();
    let start: Dayjs, end: Dayjs;

    switch (type) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = today.subtract(1, 'day');
        end = today.subtract(1, 'day');
        break;
      case 'thisWeek':
        start = today.startOf('week');
        end = today.endOf('week');
        break;
      case 'thisMonth':
        start = today.startOf('month');
        end = today.endOf('month');
        break;
      case 'lastMonth':
        start = today.subtract(1, 'month').startOf('month');
        end = today.subtract(1, 'month').endOf('month');
        break;
      case 'thisQuarter':
        start = today.startOf('quarter');
        end = today.endOf('quarter');
        break;
      case 'lastQuarter':
        start = today.subtract(1, 'quarter').startOf('quarter');
        end = today.subtract(1, 'quarter').endOf('quarter');
        break;
      case 'thisYear':
        start = today.startOf('year');
        end = today.endOf('year');
        break;
      case 'lastYear':
        start = today.subtract(1, 'year').startOf('year');
        end = today.subtract(1, 'year').endOf('year');
        break;
      default:
        return;
    }
    setDateRange([start, end]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const incomeColumns = [
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Процент',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage: number) => `${percentage.toFixed(2)}%`,
    },
  ];

  const expenseColumns = incomeColumns;

  return (
    <div>
      <Card>
        <Title level={4}>Чистая прибыль</Title>

        {/* Селектор периода */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }} size="large">
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD.MM.YYYY"
            />
          </Space>
          <Space wrap>
            <Button size="small" onClick={() => handleQuickSelect('today')}>
              Сегодня
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('yesterday')}>
              Вчера
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('thisWeek')}>
              Эта неделя
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('thisMonth')}>
              Этот месяц
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('lastMonth')}>
              Прошлый месяц
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('thisQuarter')}>
              Этот квартал
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('lastQuarter')}>
              Прошлый квартал
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('thisYear')}>
              Этот год
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('lastYear')}>
              Прошлый год
            </Button>
          </Space>
        </Space>

        <Spin spinning={isLoading}>
          {profitData && (
            <>
              {/* Карточка с чистой прибылью */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Чистая прибыль"
                      value={profitData.total}
                      prefix="₽"
                      precision={2}
                      valueStyle={{ color: profitData.total >= 0 ? '#3f8600' : '#cf1322' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Доходы"
                      value={profitData.income}
                      prefix="₽"
                      precision={2}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Расходы"
                      value={profitData.expense}
                      prefix="₽"
                      precision={2}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card>
                    <Statistic
                      title="Изменение к предыдущему периоду"
                      value={Math.abs(profitData.changePercent || profitData.change_percent || 0)}
                      prefix={(profitData.change || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      suffix="%"
                      valueStyle={{
                        color: (profitData.change || 0) >= 0 ? '#3f8600' : '#cf1322',
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                      {(profitData.change || 0) >= 0 ? '+' : ''}
                      {formatCurrency(profitData.change || 0)} ({(profitData.changePercent || profitData.change_percent || 0) >= 0 ? '+' : ''}
                      {(profitData.changePercent || profitData.change_percent || 0).toFixed(2)}%)
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Таблицы доходов и расходов */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card title="Доходы по статьям">
                    <Table
                      dataSource={profitData.incomeBreakdown || profitData.income_breakdown || []}
                      columns={incomeColumns}
                      pagination={false}
                      size="small"
                      rowKey="category"
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Расходы по статьям">
                    <Table
                      dataSource={profitData.expenseBreakdown || profitData.expense_breakdown || []}
                      columns={expenseColumns}
                      pagination={false}
                      size="small"
                      rowKey="category"
                    />
                  </Card>
                </Col>
              </Row>

              <div style={{ padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
                <Typography.Text type="secondary">
                  💡 Для отображения графиков установите библиотеку recharts: <code>npm install recharts</code>
                </Typography.Text>
              </div>
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default NetProfitComponent;
