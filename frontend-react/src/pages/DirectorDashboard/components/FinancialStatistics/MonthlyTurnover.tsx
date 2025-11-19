import React, { useState } from 'react';
import { Card, Statistic, Row, Col, DatePicker, Space, Button } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
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

const { RangePicker } = DatePicker;

// Тестовые данные
const turnoverData = [
  { date: '01.11', amount: 125000 },
  { date: '02.11', amount: 142000 },
  { date: '03.11', amount: 138000 },
  { date: '04.11', amount: 165000 },
  { date: '05.11', amount: 155000 },
  { date: '06.11', amount: 178000 },
  { date: '07.11', amount: 162000 },
  { date: '08.11', amount: 195000 },
  { date: '09.11', amount: 188000 },
  { date: '10.11', amount: 205000 },
  { date: '11.11', amount: 225000 },
  { date: '12.11', amount: 215000 },
  { date: '13.11', amount: 235000 },
  { date: '14.11', amount: 248000 },
  { date: '15.11', amount: 242000 },
];

const MonthlyTurnover: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const totalTurnover = turnoverData.reduce((sum, item) => sum + item.amount, 0);

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
              title="Оборот за период"
              value={totalTurnover}
              prefix="₽"
              precision={0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Изменение к предыдущему периоду"
              value={15.3}
              prefix={<ArrowUpOutlined />}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Динамика оборота">
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={turnoverData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#1890ff" name="Оборот" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default MonthlyTurnover;
