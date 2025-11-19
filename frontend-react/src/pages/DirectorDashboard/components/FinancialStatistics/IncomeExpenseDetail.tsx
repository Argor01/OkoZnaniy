import React, { useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Button } from 'antd';
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

const { RangePicker } = DatePicker;

// Тестовые данные
const incomeExpenseData = [
  { date: '01.11', income: 125000, expense: 80000 },
  { date: '02.11', income: 142000, expense: 90000 },
  { date: '03.11', income: 138000, expense: 90000 },
  { date: '04.11', income: 165000, expense: 104000 },
  { date: '05.11', income: 155000, expense: 100000 },
  { date: '06.11', income: 178000, expense: 111000 },
  { date: '07.11', income: 162000, expense: 104000 },
  { date: '08.11', income: 195000, expense: 123000 },
  { date: '09.11', income: 188000, expense: 119000 },
  { date: '10.11', income: 205000, expense: 130000 },
  { date: '11.11', income: 225000, expense: 143000 },
  { date: '12.11', income: 215000, expense: 137000 },
  { date: '13.11', income: 235000, expense: 150000 },
  { date: '14.11', income: 248000, expense: 157000 },
  { date: '15.11', income: 242000, expense: 154000 },
];

const IncomeExpenseDetail: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const totalIncome = incomeExpenseData.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = incomeExpenseData.reduce((sum, item) => sum + item.expense, 0);
  const netProfit = totalIncome - totalExpense;

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
        <Col span={8}>
          <Card>
            <Statistic
              title="Общий доход"
              value={totalIncome}
              prefix="₽"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Общие расходы"
              value={totalExpense}
              prefix="₽"
              precision={0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Чистая прибыль"
              value={netProfit}
              prefix="₽"
              precision={0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Доходы и расходы">
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
              <Legend />
              <Bar dataKey="income" fill="#52c41a" name="Доход" />
              <Bar dataKey="expense" fill="#ff4d4f" name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default IncomeExpenseDetail;
