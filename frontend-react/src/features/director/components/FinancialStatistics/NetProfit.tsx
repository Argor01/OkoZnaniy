import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, DatePicker, Space, Button, Spin, Tooltip as AntTooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined, CreditCardOutlined, RollbackOutlined } from '@ant-design/icons';
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
import { getNetProfit, getFinanceSummary, getIncomeDetail, getExpenseDetail } from '@/features/director/api/directorApi';
import mobileStyles from '@/features/director/components/shared/MobileDatePicker.module.css';
import styles from '@/features/director/DirectorDashboard.module.css';

const { RangePicker } = DatePicker;

const NetProfit: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isMobile, setIsMobile] = useState(false);

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

  const { data: netProfitData, isLoading: profitLoading } = useQuery({
    queryKey: ['net-profit-real', startDate, endDate],
    queryFn: () => getNetProfit(startDate, endDate),
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', startDate, endDate],
    queryFn: () => getFinanceSummary(startDate, endDate),
  });

  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-detail-profit', startDate, endDate],
    queryFn: () => getIncomeDetail(startDate, endDate),
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expense-detail-profit', startDate, endDate],
    queryFn: () => getExpenseDetail(startDate, endDate),
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isLoading = profitLoading || summaryLoading || incomeLoading || expenseLoading;

  const chartData = React.useMemo(() => {
    if (!netProfitData?.daily_data) return [];
    return netProfitData.daily_data.map((d: any) => ({
      date: d.date,
      profit: d.profit,
      income: d.income,
      expense: d.expense,
    }));
  }, [netProfitData]);

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

  if (isLoading) {
    return (
      <div className={styles.netProfitLoading}>
        <Spin size="large" />
      </div>
    );
  }

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
                <Button onClick={() => handleQuickSelect('thisWeek')} className={mobileStyles.quickSelectButton}>Эта неделя</Button>
              </Col>
              <Col span={12}>
                <Button onClick={() => handleQuickSelect('thisMonth')} className={mobileStyles.quickSelectButton}>Этот месяц</Button>
              </Col>
              <Col span={12}>
                <Button onClick={() => handleQuickSelect('lastMonth')} className={mobileStyles.quickSelectButton}>Прошлый месяц</Button>
              </Col>
              <Col span={12}>
                <Button onClick={() => handleQuickSelect('thisYear')} className={mobileStyles.quickSelectButton}>Этот год</Button>
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

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} className={styles.netProfitStatsRow}>
        <Col xs={24} sm={8}>
          <Card className={[isMobile ? 'netProfitStatCardMobile' : ''].filter(Boolean).join(' ')}>
            <Statistic
              title="Комиссия платформы"
              value={netProfitData?.income || 0}
              prefix="₽"
              precision={0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className={[isMobile ? 'netProfitStatCardMobile' : ''].filter(Boolean).join(' ')}>
            <Statistic
              title="Выплаты экспертам"
              value={netProfitData?.expert_payments || 0}
              prefix="₽"
              precision={0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className={[isMobile ? 'netProfitStatCardMobile' : ''].filter(Boolean).join(' ')}>
            <Statistic
              title="Чистая прибыль"
              value={netProfitData?.total || 0}
              prefix="₽"
              precision={0}
              valueStyle={{ color: (netProfitData?.total || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} className={styles.netProfitStatsRow}>
        <Col xs={24} sm={8}>
          <Card className={[isMobile ? 'netProfitStatCardMobile' : ''].filter(Boolean).join(' ')}>
            <Statistic
              title="Пополнения"
              value={summaryData?.topups?.total || 0}
              prefix={<WalletOutlined />}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>({summaryData?.topups?.count || 0})</span>}
              precision={0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className={[isMobile ? 'netProfitStatCardMobile' : ''].filter(Boolean).join(' ')}>
            <Statistic
              title="Выводы средств"
              value={summaryData?.withdrawals?.total || 0}
              prefix={<CreditCardOutlined />}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>({summaryData?.withdrawals?.count || 0})</span>}
              precision={0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className={[isMobile ? 'netProfitStatCardMobile' : ''].filter(Boolean).join(' ')}>
            <Statistic
              title="Возвраты (арбитраж)"
              value={summaryData?.refunds?.total || 0}
              prefix={<RollbackOutlined />}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>({summaryData?.refunds?.count || 0})</span>}
              precision={0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Динамика комиссии и выплат"
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
                <Area type="monotone" dataKey="income" stroke="#52c41a" fill="#52c41a" fillOpacity={0.6} name="Комиссия" />
                <Area type="monotone" dataKey="expense" stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.6} name="Выплаты" />
                <Area type="monotone" dataKey="profit" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} name="Прибыль" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Нет данных за выбранный период</p>
            <p style={{ fontSize: 14 }}>Данные появятся после завершения заказов</p>
          </div>
        )}
      </Card>

      {(incomeData && incomeData.length > 0) || (expenseData && expenseData.length > 0) ? (
        <Card title="Ручные доходы и расходы" style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Statistic
                title="Ручные доходы"
                value={incomeData?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0}
                prefix="₽"
                precision={0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title="Ручные расходы"
                value={expenseData?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0}
                prefix="₽"
                precision={0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>
      ) : null}
    </div>
  );
};

export default NetProfit;
