import React, { useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Button, Spin } from 'antd';
import {
  BarChart,
  Bar,
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

const IncomeExpenseDetail: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const isMobile = window.innerWidth <= 840;

  
  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-detail', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getIncomeDetail(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expense-detail', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getExpenseDetail(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
    refetchOnMount: true,
    staleTime: 0,
  });

  const isLoading = incomeLoading || expenseLoading;

  
  const chartData = React.useMemo(() => {
    if (!incomeData || !expenseData) return [];
    
    const dataByDate: Record<string, { date: string; income: number; expense: number }> = {};
    
    incomeData.forEach(item => {
      const date = dayjs(item.date).format('DD.MM');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, income: 0, expense: 0 };
      }
      dataByDate[date].income += item.amount;
    });
    
    expenseData.forEach(item => {
      const date = dayjs(item.date).format('DD.MM');
      if (!dataByDate[date]) {
        dataByDate[date] = { date, income: 0, expense: 0 };
      }
      dataByDate[date].expense += item.amount;
    });
    
    return Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [incomeData, expenseData]);

  const totalIncome = incomeData?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalExpense = expenseData?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const netProfit = totalIncome - totalExpense;

  if (isLoading) {
    return (
      <div className="incomeExpenseLoading">
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
          'incomeExpenseFiltersCard',
          isMobile ? 'incomeExpenseFiltersCardMobile' : '',
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

      <Row gutter={[16, isMobile ? 12 : 16]} className="incomeExpenseStatsRow">
        <Col xs={24} sm={12} md={8}>
          <Card
            className={[
              'incomeExpenseStatCard',
              isMobile ? 'incomeExpenseStatCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Общий доход"
              value={totalIncome}
              prefix="₽"
              precision={0}
              className={[
                'incomeExpenseIncomeStatistic',
                isMobile ? 'incomeExpenseIncomeStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            className={[
              'incomeExpenseStatCard',
              isMobile ? 'incomeExpenseStatCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Общие расходы"
              value={totalExpense}
              prefix="₽"
              precision={0}
              className={[
                'incomeExpenseExpenseStatistic',
                isMobile ? 'incomeExpenseExpenseStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card
            className={[
              'incomeExpenseStatCard',
              'incomeExpenseHighlightCard',
              isMobile ? 'incomeExpenseStatCardMobile' : '',
              isMobile ? 'incomeExpenseHighlightCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Чистая прибыль"
              value={netProfit}
              prefix="₽"
              precision={0}
              className={[
                'incomeExpenseNetStatistic',
                isMobile ? 'incomeExpenseNetStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Доходы и расходы"
        className={[
          'incomeExpenseChartCard',
          isMobile ? 'incomeExpenseChartCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        {chartData.length > 0 ? (
          <div
            className={[
              'incomeExpenseChartContainer',
              isMobile ? 'incomeExpenseChartContainerMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <ResponsiveContainer width="100%" height="100%" key={`${dateRange[0].format('YYYY-MM-DD')}-${dateRange[1].format('YYYY-MM-DD')}`}>
              <BarChart 
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
              <Bar dataKey="income" fill="#52c41a" name="Доход" />
              <Bar dataKey="expense" fill="#ff4d4f" name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>📊 Нет данных за выбранный период</p>
            <p style={{ fontSize: 14 }}>Выберите другой период или дождитесь появления транзакций</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IncomeExpenseDetail;
