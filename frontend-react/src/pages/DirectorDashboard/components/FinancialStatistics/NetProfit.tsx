import React, { useState } from 'react';
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
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
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
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="Чистая прибыль за период"
              value={totalProfit}
              prefix="₽"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Изменение к предыдущему периоду"
              value={18.7}
              prefix={<ArrowUpOutlined />}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Динамика прибыли и расходов">
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
              <Legend />
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
