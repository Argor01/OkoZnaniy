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
  DownloadOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
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
  const totalTurnover = kpiData?.total_turnover ?? kpiData?.totalTurnover ?? 0;
  const turnoverChange = kpiData?.turnover_change ?? kpiData?.turnoverChange ?? 0;
  const netProfit = kpiData?.net_profit ?? kpiData?.netProfit ?? 0;
  const profitChange = kpiData?.profit_change ?? kpiData?.profitChange ?? 0;
  const activeOrders = kpiData?.active_orders ?? kpiData?.activeOrders ?? 0;
  const ordersChange = kpiData?.orders_change ?? kpiData?.ordersChange ?? 0;
  const averageCheck = kpiData?.average_check ?? kpiData?.averageCheck ?? kpiData?.averageOrderValue ?? 0;
  const averageCheckChange = kpiData?.average_check_change ?? kpiData?.averageCheckChange ?? 0;
  const totalClients = kpiData?.total_clients ?? kpiData?.totalClients ?? 0;
  const totalExperts = kpiData?.total_experts ?? kpiData?.totalExperts ?? 0;
  const totalPartners = kpiData?.total_partners ?? kpiData?.totalPartners ?? 0;

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
              value={totalTurnover}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#1890ff',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  {turnoverChange >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#cf1322' }} />
                  )}
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: turnoverChange >= 0 ? '#3f8600' : '#cf1322' }}>
                    {Math.abs(turnoverChange).toFixed(2)}%
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
              value={netProfit}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#3f8600',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  {profitChange >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#cf1322' }} />
                  )}
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: profitChange >= 0 ? '#3f8600' : '#cf1322' }}>
                    {Math.abs(profitChange).toFixed(2)}%
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
              value={activeOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ 
                color: '#722ed1',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              suffix={
                <Space>
                  {ordersChange >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#cf1322' }} />
                  )}
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: ordersChange >= 0 ? '#3f8600' : '#cf1322' }}>
                    {Math.abs(ordersChange).toFixed(2)}%
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
              value={averageCheck}
              prefix="₽"
              precision={0}
              valueStyle={{ 
                color: '#13c2c2',
                fontSize: isMobile ? 22 : 24,
                fontWeight: 700
              }}
              suffix={
                <Space>
                  {averageCheckChange >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#3f8600' }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: isMobile ? 12 : 14, color: '#cf1322' }} />
                  )}
                  <Text style={{ fontSize: isMobile ? 12 : 14, color: averageCheckChange >= 0 ? '#3f8600' : '#cf1322' }}>
                    {Math.abs(averageCheckChange).toFixed(2)}%
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

      {/* Графики */}
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginTop: 24 }}>
      </Row>
    </div>
  );
};

export default GeneralStatistics;
