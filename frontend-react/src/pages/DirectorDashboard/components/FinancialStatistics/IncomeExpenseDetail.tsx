import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Button, Spin, message, Table, Tabs } from 'antd';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import mobileStyles from '../shared/MobileDatePicker.module.css';
import { getNetProfit, getIncomeDetail, getExpenseDetail } from '../../api/directorApi';
import type { NetProfit, IncomeDetail, ExpenseDetail } from '../../api/types';

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
  const [loading, setLoading] = useState(false);
  const [profitData, setProfitData] = useState<NetProfit | null>(null);
  const [incomeDetails, setIncomeDetails] = useState<IncomeDetail[]>([]);
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([]);

  const isMobile = window.innerWidth <= 840;

  // Загружаем данные при изменении периода
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const [profit, income, expense] = await Promise.all([
        getNetProfit(startDate, endDate),
        getIncomeDetail(startDate, endDate),
        getExpenseDetail(startDate, endDate)
      ]);
      
      setProfitData(profit);
      setIncomeDetails(income);
      setExpenseDetails(expense);
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = profitData?.income || 0;
  const totalExpense = profitData?.expense || 0;
  const netProfit = profitData?.total || 0;

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
    <Spin spinning={loading}>
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

      <Row gutter={[16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Общий доход"
              value={totalIncome}
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
        <Col xs={24} sm={12} md={8}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Общие расходы"
              value={totalExpense}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#ff4d4f',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center',
            background: isMobile ? '#f0f9ff' : '#fff',
            border: isMobile ? '2px solid #1890ff' : '1px solid #d9d9d9'
          }}>
            <Statistic
              title="Чистая прибыль"
              value={netProfit}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#1890ff',
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

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="Разбивка доходов"
            style={{ borderRadius: isMobile ? 8 : 12 }}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profitData?.income_breakdown || profitData?.incomeBreakdown || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {(profitData?.income_breakdown || profitData?.incomeBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#1890ff', '#52c41a', '#722ed1', '#fa8c16'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Разбивка расходов"
            style={{ borderRadius: isMobile ? 8 : 12 }}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profitData?.expense_breakdown || profitData?.expenseBreakdown || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {(profitData?.expense_breakdown || profitData?.expenseBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ff4d4f', '#fa8c16', '#722ed1', '#13c2c2'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card 
        title="Детализация операций"
        style={{ borderRadius: isMobile ? 8 : 12 }}
      >
        <Tabs
          items={[
            {
              key: 'income',
              label: 'Доходы',
              children: (
                <Table
                  dataSource={incomeDetails}
                  rowKey="order_id"
                  size="small"
                  scroll={{ x: 800 }}
                  columns={[
                    {
                      title: 'Дата',
                      dataIndex: 'date',
                      key: 'date',
                      width: 100,
                    },
                    {
                      title: 'Категория',
                      dataIndex: 'category',
                      key: 'category',
                      width: 150,
                    },
                    {
                      title: 'Описание',
                      dataIndex: 'description',
                      key: 'description',
                      ellipsis: true,
                    },
                    {
                      title: 'Клиент',
                      dataIndex: 'client_name',
                      key: 'client_name',
                      width: 120,
                    },
                    {
                      title: 'Сумма',
                      dataIndex: 'amount',
                      key: 'amount',
                      width: 120,
                      render: (value: number) => `${value.toLocaleString('ru-RU')} ₽`,
                      align: 'right',
                    },
                  ]}
                />
              ),
            },
            {
              key: 'expense',
              label: 'Расходы',
              children: (
                <Table
                  dataSource={expenseDetails}
                  rowKey={(record, index) => `${record.date}-${index}`}
                  size="small"
                  scroll={{ x: 800 }}
                  columns={[
                    {
                      title: 'Дата',
                      dataIndex: 'date',
                      key: 'date',
                      width: 100,
                    },
                    {
                      title: 'Категория',
                      dataIndex: 'category',
                      key: 'category',
                      width: 150,
                    },
                    {
                      title: 'Описание',
                      dataIndex: 'description',
                      key: 'description',
                      ellipsis: true,
                    },
                    {
                      title: 'Получатель',
                      dataIndex: 'recipient_name',
                      key: 'recipient_name',
                      width: 120,
                    },
                    {
                      title: 'Сумма',
                      dataIndex: 'amount',
                      key: 'amount',
                      width: 120,
                      render: (value: number) => `${value.toLocaleString('ru-RU')} ₽`,
                      align: 'right',
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
    </Spin>
  );
};

export default IncomeExpenseDetail;
