import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, DatePicker, Space, Button, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyTurnover } from '@/features/director/api/directorApi';
import mobileStyles from '@/features/director/components/shared/MobileDatePicker.module.css';

const { RangePicker } = DatePicker;

const MonthlyTurnover: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isMobile, setIsMobile] = useState(false);

  
  const { data: turnoverData, isLoading } = useQuery({
    queryKey: ['monthly-turnover', dateRange[0].format('YYYY-MM')],
    queryFn: () => getMonthlyTurnover(dateRange[0].format('YYYY-MM')),
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalTurnover = turnoverData?.total_turnover || 0;
  const changePercent = turnoverData?.change_percent || 0;
  const chartData = turnoverData?.daily_data || [];

  if (isLoading) {
    return (
      <div className="monthlyTurnoverLoading">
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
          'monthlyTurnoverFiltersCard',
          isMobile ? 'monthlyTurnoverFiltersCardMobile' : '',
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

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} className="monthlyTurnoverStatsRow">
        <Col xs={24} sm={12}>
          <Card
            className={[
              'monthlyTurnoverStatCard',
              isMobile ? 'monthlyTurnoverStatCardMobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Оборот за период"
              value={totalTurnover}
              prefix="₽"
              precision={0}
              className={[
                'monthlyTurnoverStatistic',
                isMobile ? 'monthlyTurnoverStatisticMobile' : '',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            className={[
              'monthlyTurnoverStatCard',
              'monthlyTurnoverChangeCard',
              isMobile ? 'monthlyTurnoverStatCardMobile' : '',
              isMobile && changePercent >= 0 ? 'monthlyTurnoverChangeCardPositive' : '',
              isMobile && changePercent < 0 ? 'monthlyTurnoverChangeCardNegative' : '',
            ].filter(Boolean).join(' ')}
          >
            <Statistic
              title="Изменение к предыдущему периоду"
              value={Math.abs(changePercent)}
              prefix={changePercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="%"
              className={[
                'monthlyTurnoverChangeStatistic',
                isMobile ? 'monthlyTurnoverChangeStatisticMobile' : '',
                changePercent >= 0 ? 'monthlyTurnoverChangePositive' : 'monthlyTurnoverChangeNegative',
              ].filter(Boolean).join(' ')}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Динамика оборота"
        className={[
          'monthlyTurnoverChartCard',
          isMobile ? 'monthlyTurnoverChartCardMobile' : '',
        ].filter(Boolean).join(' ')}
      >
        {chartData.length > 0 ? (
          <div
            className={[
              'monthlyTurnoverChartContainer',
              isMobile ? 'monthlyTurnoverChartContainerMobile' : '',
            ].filter(Boolean).join(' ')}
            style={{ minHeight: 300 }}
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <LineChart 
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
                <Line type="monotone" dataKey="amount" stroke="#1890ff" name="Оборот" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>📊 Нет данных за выбранный период</p>
            <p style={{ fontSize: 14 }}>Оборот рассчитывается на основе завершенных заказов</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MonthlyTurnover;
