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
  Spin,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
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
import { useQuery } from '@tanstack/react-query';
import { getKPI, exportFinancialData } from '../../api/directorApi';
import styles from './GeneralStatistics.module.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const GeneralStatistics: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isMobile, setIsMobile] = useState(false);

  // Получаем данные из API
  const { data: kpiData, isLoading } = useQuery({
    queryKey: ['kpi', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getKPI(dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')),
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Извлекаем данные из API
  const totalTurnover = kpiData?.kpi?.total_turnover || 0;
  const turnoverChange = kpiData?.changes?.turnover_change || 0;
  const netProfit = kpiData?.kpi?.net_profit || 0;
  const profitChange = kpiData?.changes?.profit_change || 0;
  const activeOrders = kpiData?.kpi?.active_orders || 0;
  const ordersChange = kpiData?.changes?.orders_change || 0;
  const averageCheck = kpiData?.kpi?.average_check || 0;
  const averageCheckChange = kpiData?.changes?.average_check_change || 0;
  const totalClients = kpiData?.kpi?.total_clients || 0;
  const totalExperts = kpiData?.kpi?.total_experts || 0;
  const totalPartners = kpiData?.kpi?.total_partners || 0;

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
