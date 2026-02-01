import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Button,
  Space,
  message,
  Typography,
} from 'antd';
import {
  ArrowUpOutlined,
  ShoppingOutlined,
  UserOutlined,
  TeamOutlined,
  DownloadOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
import styles from './GeneralStatistics.module.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// Тестовые данные для графиков
const ordersChartData = [
  { date: '01.11', orders: 45, completed: 38, cancelled: 7 },
  { date: '02.11', orders: 52, completed: 45, cancelled: 7 },
  { date: '03.11', orders: 48, completed: 42, cancelled: 6 },
  { date: '04.11', orders: 61, completed: 54, cancelled: 7 },
  { date: '05.11', orders: 55, completed: 48, cancelled: 7 },
  { date: '06.11', orders: 67, completed: 59, cancelled: 8 },
  { date: '07.11', orders: 58, completed: 51, cancelled: 7 },
  { date: '08.11', orders: 72, completed: 65, cancelled: 7 },
  { date: '09.11', orders: 69, completed: 62, cancelled: 7 },
  { date: '10.11', orders: 75, completed: 68, cancelled: 7 },
  { date: '11.11', orders: 82, completed: 74, cancelled: 8 },
  { date: '12.11', orders: 78, completed: 71, cancelled: 7 },
  { date: '13.11', orders: 85, completed: 77, cancelled: 8 },
  { date: '14.11', orders: 91, completed: 83, cancelled: 8 },
  { date: '15.11', orders: 88, completed: 80, cancelled: 8 },
];

const revenueChartData = [
  { date: '01.11', revenue: 125000, profit: 45000 },
  { date: '02.11', revenue: 142000, profit: 52000 },
  { date: '03.11', revenue: 138000, profit: 48000 },
  { date: '04.11', revenue: 165000, profit: 61000 },
  { date: '05.11', revenue: 155000, profit: 55000 },
  { date: '06.11', revenue: 178000, profit: 67000 },
  { date: '07.11', revenue: 162000, profit: 58000 },
  { date: '08.11', revenue: 195000, profit: 72000 },
  { date: '09.11', revenue: 188000, profit: 69000 },
  { date: '10.11', revenue: 205000, profit: 75000 },
  { date: '11.11', revenue: 225000, profit: 82000 },
  { date: '12.11', revenue: 215000, profit: 78000 },
  { date: '13.11', revenue: 235000, profit: 85000 },
  { date: '14.11', revenue: 248000, profit: 91000 },
  { date: '15.11', revenue: 242000, profit: 88000 },
];

const categoryData = [
  { name: 'Математика', value: 450, color: '#1890ff' },
  { name: 'Физика', value: 320, color: '#52c41a' },
  { name: 'Программирование', value: 280, color: '#722ed1' },
  { name: 'Химия', value: 180, color: '#fa8c16' },
  { name: 'История', value: 150, color: '#eb2f96' },
  { name: 'Другое', value: 220, color: '#13c2c2' },
];

const usersOnlineData = [
  { time: '00:00', users: 12 },
  { time: '03:00', users: 8 },
  { time: '06:00', users: 15 },
  { time: '09:00', users: 35 },
  { time: '12:00', users: 52 },
  { time: '15:00', users: 47 },
  { time: '18:00', users: 38 },
  { time: '21:00', users: 28 },
  { time: '24:00', users: 18 },
];

const GeneralStatistics: React.FC = () => {
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

  // Тестовые данные KPI
  const kpiData = {
    totalTurnover: 3250000,
    turnoverChange: 15.3,
    netProfit: 1180000,
    profitChange: 18.7,
    activeOrders: 156,
    ordersChange: 12.5,
    averageCheck: 20833,
    averageCheckChange: 8.2,
    totalClients: 1247,
    totalExperts: 89,
    totalPartners: 23,
  };

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

  const handleExport = async (format: 'excel' | 'pdf') => {
    message.info(`Экспорт в ${format.toUpperCase()} в разработке`);
  };

  return (
    <div>

      {/* Селектор периода */}
      <Card style={{ 
        marginBottom: 16,
        borderRadius: isMobile ? 8 : 12
      }}>
        <Space 
          direction="vertical" 
          style={{ width: '100%' }} 
          size={isMobile ? 'middle' : 'small'}
        >
          {isMobile ? (
            <div className={styles.datePickerContainer}>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD.MM.YYYY"
                className={styles.mobileRangePicker}
                size="large"
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
              <Row gutter={[8, 8]} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('excel')}
                    className={styles.quickSelectButton}
                  >
                    Excel
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={() => handleExport('pdf')}
                    className={styles.quickSelectButton}
                  >
                    PDF
                  </Button>
                </Col>
              </Row>
            </div>
          ) : (
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
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleExport('excel')}
              >
                Экспорт в Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handleExport('pdf')}
              >
                Экспорт в PDF
              </Button>
            </Space>
          )}
          
          {isMobile ? (
            <Row gutter={[8, 8]} className={styles.quickSelectButtons}>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('today')}
                  className={styles.quickSelectButton}
                >
                  Сегодня
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('yesterday')}
                  className={styles.quickSelectButton}
                >
                  Вчера
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisWeek')}
                  className={styles.quickSelectButton}
                >
                  Эта неделя
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisMonth')}
                  className={styles.quickSelectButton}
                >
                  Этот месяц
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('lastMonth')}
                  className={styles.quickSelectButton}
                >
                  Прошлый месяц
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  onClick={() => handleQuickSelect('thisYear')}
                  className={styles.quickSelectButton}
                >
                  Этот год
                </Button>
              </Col>
            </Row>
          ) : (
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
              <Button size="small" onClick={() => handleQuickSelect('thisYear')}>
                Этот год
              </Button>
              <Button size="small" onClick={() => handleQuickSelect('lastYear')}>
                Прошлый год
              </Button>
            </Space>
          )}
        </Space>
      </Card>

      {/* KPI карточки */}
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Общий оборот"
              value={kpiData.totalTurnover}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#1890ff',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }}>
                    {kpiData.turnoverChange.toFixed(2)}%
                  </Text>
                </Space>
              }
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Чистая прибыль"
              value={kpiData.netProfit}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#3f8600',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }}>
                    {kpiData.profitChange.toFixed(2)}%
                  </Text>
                </Space>
              }
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Активные заказы"
              value={kpiData.activeOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ 
                color: '#722ed1',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }}>
                    {kpiData.ordersChange.toFixed(2)}%
                  </Text>
                </Space>
              }
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center',
            background: isMobile ? '#f0f9ff' : '#fff',
            border: isMobile ? '2px solid #1890ff' : '1px solid #d9d9d9'
          }}>
            <Statistic
              title="Средний чек"
              value={kpiData.averageCheck}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#13c2c2',
                fontSize: isMobile ? 22 : 24,
                fontWeight: 700
              }}
              suffix={
                <Space>
                  <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }}>
                    {kpiData.averageCheckChange.toFixed(2)}%
                  </Text>
                </Space>
              }
              style={{
                padding: isMobile ? '12px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Пользователей онлайн"
              value={47}
              prefix={<TeamOutlined />}
              valueStyle={{ 
                color: '#52c41a',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Text style={{ fontSize: isMobile ? 11 : 12, color: '#8c8c8c' }}>
                  сейчас на сайте
                </Text>
              }
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Заказов в сутки"
              value={156}
              prefix={<ShoppingOutlined />}
              valueStyle={{ 
                color: '#1890ff',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }}>
                    12.5%
                  </Text>
                </Space>
              }
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Клиентов"
              value={kpiData.totalClients}
              prefix={<UserOutlined />}
              valueStyle={{ 
                color: '#fa8c16',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center',
            background: isMobile ? '#f6ffed' : '#fff',
            border: isMobile ? '2px solid #52c41a' : '1px solid #d9d9d9'
          }}>
            <Statistic
              title="Экспертов"
              value={kpiData.totalExperts}
              prefix={<TeamOutlined />}
              valueStyle={{ 
                color: '#52c41a',
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

      {/* Графики */}
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginTop: 24 }}>
        {/* График заказов */}
        <Col xs={24} lg={12}>
          <Card 
            title="Динамика заказов"
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
              height: isMobile ? 250 : 300,
              overflowX: isMobile ? 'auto' : 'visible'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={ordersChartData}
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
                  />
                  <Tooltip 
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
                  <Line type="monotone" dataKey="orders" stroke="#1890ff" name="Всего заказов" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#52c41a" name="Завершено" strokeWidth={2} />
                  <Line type="monotone" dataKey="cancelled" stroke="#ff4d4f" name="Отменено" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* График выручки */}
        <Col xs={24} lg={12}>
          <Card 
            title="Выручка и прибыль"
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
              height: isMobile ? 250 : 300,
              overflowX: isMobile ? 'auto' : 'visible'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={revenueChartData}
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
                  <Area type="monotone" dataKey="revenue" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} name="Выручка" />
                  <Area type="monotone" dataKey="profit" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} name="Прибыль" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* График по категориям */}
        <Col xs={24} lg={12}>
          <Card 
            title="Распределение заказов по предметам"
            style={{ 
              borderRadius: isMobile ? 8 : 12
            }}
            headStyle={{
              fontSize: isMobile ? 14 : 16
            }}
          >
            <div style={{ 
              width: '100%', 
              height: isMobile ? 250 : 300
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={isMobile ? false : ({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 80 : 100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      fontSize: isMobile ? 12 : 14,
                      borderRadius: 8
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: isMobile ? 11 : 14
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* График пользователей онлайн */}
        <Col xs={24} lg={12}>
          <Card 
            title="Пользователи онлайн (24 часа)"
            style={{ 
              borderRadius: isMobile ? 8 : 12
            }}
            headStyle={{
              fontSize: isMobile ? 14 : 16
            }}
          >
            <div style={{ 
              width: '100%', 
              height: isMobile ? 250 : 300,
              overflowX: isMobile ? 'auto' : 'visible'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={usersOnlineData}
                  margin={{
                    top: 20,
                    right: isMobile ? 10 : 30,
                    left: isMobile ? 10 : 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis 
                    fontSize={isMobile ? 10 : 12}
                  />
                  <Tooltip 
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
                  <Bar dataKey="users" fill="#52c41a" name="Пользователей" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GeneralStatistics;
