import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, DatePicker, Space, Button } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
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
import mobileStyles from '../shared/MobileDatePicker.module.css';

const { RangePicker } = DatePicker;

// Тестовые данные
const profitData = [
  { date: '01.11', profit: 45000, expenses: 80000 },
  { date: '02.11', profit: 52000, expenses: 90000 },
  { date: '03.11', profit: 48000, expenses: 90000 },
  { date: '04.11', profit: 61000, expenses: 104000 },
  { date: '05.11', profit: 55000, expenses: 100000 },
  { date: '06.11', profit: 67000, expenses: 111000 },
  { date: '07.11', profit: 58000, expenses: 104000 },
  { date: '08.11', profit: 72000, expenses: 123000 },
  { date: '09.11', profit: 69000, expenses: 119000 },
  { date: '10.11', profit: 75000, expenses: 130000 },
  { date: '11.11', profit: 82000, expenses: 143000 },
  { date: '12.11', profit: 78000, expenses: 137000 },
  { date: '13.11', profit: 85000, expenses: 150000 },
  { date: '14.11', profit: 91000, expenses: 157000 },
  { date: '15.11', profit: 88000, expenses: 154000 },
];

const NetProfit: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalProfit = profitData.reduce((sum, item) => sum + item.profit, 0);

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
      <Card style={{ 
        marginBottom: 16,
        borderRadius: isMobile ? 8 : 12
      }}>
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

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Чистая прибыль за период"
              value={totalProfit}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#52c41a',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center',
            background: isMobile ? '#f6ffed' : '#fff',
            border: isMobile ? '2px solid #52c41a' : '1px solid #d9d9d9'
          }}>
            <Statistic
              title="Изменение к предыдущему периоду"
              value={18.7}
              prefix={<ArrowUpOutlined />}
              suffix="%"
              valueStyle={{ 
                color: '#3f8600',
                fontSize: isMobile ? 22 : 24,
                fontWeight: 700
              }}
              style={{
                padding: isMobile ? '12px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Динамика прибыли и расходов"
        style={{ 
          borderRadius: isMobile ? 8 : 12
        }}
        headStyle={{
          fontSize: isMobile ? 16 : 18,
          fontWeight: 600
        }}
      >
        <div style={{ 
          width: '100%', 
          height: isMobile ? 300 : 400,
          overflowX: isMobile ? 'auto' : 'visible'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={profitData}
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
                contentStyle={{
                  fontSize: isMobile ? 12 : 14,
                  borderRadius: 8
                }}
              />
              <Legend 
                wrapperStyle={{
                  fontSize: isMobile ? 12 : 14
                }}
              />
              <Area type="monotone" dataKey="profit" stroke="#52c41a" fill="#52c41a" fillOpacity={0.6} name="Прибыль" />
              <Area type="monotone" dataKey="expenses" stroke="#ff4d4f" fill="#ff4d4f" fillOpacity={0.6} name="Расходы" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default NetProfit;
