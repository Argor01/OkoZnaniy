import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, DatePicker, Space, Button, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { getIncomeDetail, getExpenseDetail } from '@/features/director/api/directorApi';
import mobileStyles from '@/features/director/components/shared/MobileDatePicker.module.css';

const { RangePicker } = DatePicker;

const NetProfit: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isMobile, setIsMobile] = useState(false);

  
  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-detail-profit', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getIncomeDetail(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expense-detail-profit', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getExpenseDetail(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isLoading = incomeLoading || expenseLoading;

  const totalIncome = incomeData?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalExpense = expenseData?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalProfitValue = totalIncome - totalExpense;
  
  // Вычисляем данные по дням для графика
  const chartData = React.useMemo(() => {
    if (!incomeData || !expenseData) return [];
    
    const dataByDate: Record<string, { date: string; profit: number; income: number; expense: number }> = {};
    
    incomeData.forEach(item => {
      const date = dayjs(item.date).format('DD.MM');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, profit: 0, income: 0, expense: 0 };
      }
      dataByDate[date].income += item.amount;
      dataByDate[date].profit += item.amount;
    });
    
    expenseData.forEach(item => {
      const date = dayjs(item.date).format('DD.MM');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, profit: 0, income: 0, expense: 0 };
      }
      dataByDate[date].expense += item.amount;
      dataByDate[date].profit -= item.amount;
    });
    
    return Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [incomeData, expenseData]);

  const changePercent = 0; // Можно вычислить сравнивая с предыдущим периодом

  if (isLoading) {
    return (
      <div className="netProfitLoading">
        <Spin size="large" />
      </div>
    );
  }

  const handleQuickSelect = (type: string) => {
    const today = dayjs();
    let start: Dayjs, end: Dayjs;

    switch (type) {
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
      case 'thisYear':
        start = today.startOf('year');
        end = today.endOf('year');
        break;
      default:
        return;
    }
    setDateRange([start, end]);
  };

  return (
    <div>
      <Card
        className={[
          'netProfitFiltersCard',
          isMobile ? 'netProfitFiltersCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        {isMobile ? (
          <div className={mobileStyles.datePickerContainer}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD.MM.YYYY"
              className={mobileStyles.mobileRangePicker}
              size="large"
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
            <Row gutter={[8, 8]} className={mobileStyles.quickSelectButtons}>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisWeek')}
                  className={mobileStyles.quickSelectButton}
                >
                  Эта неделя
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisMonth')}
                  className={mobileStyles.quickSelectButton}
                >
                  Этот месяц
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('lastMonth')}
                  className={mobileStyles.quickSelectButton}
                >
                  Прошлый месяц
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisYear')}
                  className={mobileStyles.quickSelectButton}
                >
                  Этот год
                </Button>
              </Col>
            </Row>
          </div>
        ) : (
          <Space wrap size="middle">
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD.MM.YYYY"
            />
            <Button onClick={() => handleQuickSelect('thisWeek')}>Эта неделя</Button>
            <Button onClick={() => handleQuickSelect('thisMonth')}>Этот месяц</Button>
            <Button onClick={() => handleQuickSelect('lastMonth')}>Прошлый месяц</Button>
            <Button onClick={() => handleQuickSelect('thisYear')}>Этот год</Button>
          </Space>
        )}
      </Card>

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} className="netProfitStatsRow">
        <Col xs={24} sm={12}>
          <Card
            className={[
              'netProfitStatCard',
              isMobile ? 'netProfitStatCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Чистая прибыль за период"
              value={totalProfitValue}
              prefix="₽"
              precision={0}
              className={[
                'netProfitStatistic',
                isMobile ? 'netProfitStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            className={[
              'netProfitStatCard',
              'netProfitChangeCard',
              isMobile ? 'netProfitStatCardMobile' : '',
              isMobile && changePercent >= 0 ? 'netProfitChangeCardPositive' : '',
              isMobile && changePercent < 0 ? 'netProfitChangeCardNegative' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Изменение к предыдущему периоду"
              value={Math.abs(changePercent)}
              prefix={changePercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="%"
              className={[
                'netProfitChangeStatistic',
                isMobile ? 'netProfitChangeStatisticMobile' : '',
                changePercent >= 0 ? 'netProfitChangePositive' : 'netProfitChangeNegative',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Динамика прибыли и расходов"
        className={[
          'netProfitChartCard',
          isMobile ? 'netProfitChartCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        {chartData.length > 0 ? (
          <div
            className={[
              'netProfitChartContainer',
              isMobile ? 'netProfitChartContainerMobile' : '',
            ].filter(Boolean).join(' ')}
            style={{ minHeight: 300 }}
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart 
                data={chartData}
                margin={{
                  top: 20,
                  right: isMobile ? 10 : 30,
                  left: isMobile ? 10 : 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={isMobile ? 10 : 12}
                  interval={isMobile ? 1 : 0}
                />
                <YAxis 
                  fontSize={isMobile ? 10 : 12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
                />
                <Legend />
                <Area type="monotone" dataKey="profit" stroke="#52c41a" fill="#52c41a" fillOpacity={0.6} name="Прибыль" />
                <Area type="monotone" dataKey="expense" stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.6} name="Расходы" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>📊 Нет данных за выбранный период</p>
            <p style={{ fontSize: 14 }}>Добавьте доходы и расходы для отображения графика</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NetProfit;
