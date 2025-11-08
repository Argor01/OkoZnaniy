import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Button,
  Space,
  Spin,
  message,
  Typography,
  Table,
  Select,
  Alert,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  TeamOutlined,
  UserAddOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { getKPI, getStatisticsSummary, exportStatisticsReport, type KPI, type StatisticsSummary } from '../../api/directorApi';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const GeneralStatistics: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['director-kpi', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () =>
      getKPI(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      ),
    onError: (error: any) => {
      message.error('Ошибка при загрузке KPI');
    },
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['director-summary', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () =>
      getStatisticsSummary(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      ),
    onError: (error: any) => {
      message.error('Ошибка при загрузке сводной статистики');
    },
  });

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
      case 'thisQuarter':
        start = today.startOf('quarter');
        end = today.endOf('quarter');
        break;
      case 'lastQuarter':
        start = today.subtract(1, 'quarter').startOf('quarter');
        end = today.subtract(1, 'quarter').endOf('quarter');
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
    if (!statisticsData) {
      message.warning('Данные для экспорта ещё не загружены');
      return;
    }
    setExportLoading(true);
    try {
      await exportStatisticsReport(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD'),
        format,
        statisticsData
      );
      message.success(`Отчёт в формате ${format.toUpperCase()} успешно экспортирован`);
    } catch (error) {
      message.error('Ошибка при экспорте отчёта');
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const comparisonColumns: ColumnsType<any> = [
    {
      title: 'Показатель',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: 'Текущий период',
      dataIndex: 'current',
      key: 'current',
      render: (value, record) => {
        if (record.isCurrency) {
          return formatCurrency(value);
        }
        return value;
      },
    },
    {
      title: 'Предыдущий период',
      dataIndex: 'previous',
      key: 'previous',
      render: (value, record) => {
        if (record.isCurrency) {
          return formatCurrency(value);
        }
        return value;
      },
    },
    {
      title: 'Изменение',
      dataIndex: 'change',
      key: 'change',
      render: (change, record) => {
        const isPositive = change >= 0;
        const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
        const color = isPositive ? '#3f8600' : '#cf1322';
        return (
          <Space>
            <Text style={{ color }}>
              {icon} {Math.abs(change).toFixed(2)}%
            </Text>
            {record.isCurrency && (
              <Text type="secondary">
                ({isPositive ? '+' : ''}{formatCurrency(record.absoluteChange || 0)})
              </Text>
            )}
          </Space>
        );
      },
    },
  ];

  const comparisonData = React.useMemo(() => {
    if (!summaryData) return [];
    
    return [
      {
        key: 'turnover',
        metric: 'Общий оборот',
        current: summaryData.currentPeriod?.turnover || summaryData.current_period?.turnover || 0,
        previous: summaryData.previousPeriod?.turnover || summaryData.previous_period?.turnover || 0,
        change: summaryData.turnoverChange || summaryData.turnover_change || 0,
        absoluteChange: (summaryData.currentPeriod?.turnover || summaryData.current_period?.turnover || 0) - (summaryData.previousPeriod?.turnover || summaryData.previous_period?.turnover || 0),
        isCurrency: true,
      },
      {
        key: 'profit',
        metric: 'Чистая прибыль',
        current: summaryData.currentPeriod?.profit || summaryData.current_period?.profit || 0,
        previous: summaryData.previousPeriod?.profit || summaryData.previous_period?.profit || 0,
        change: summaryData.profitChange || summaryData.profit_change || 0,
        absoluteChange: (summaryData.currentPeriod?.profit || summaryData.current_period?.profit || 0) - (summaryData.previousPeriod?.profit || summaryData.previous_period?.profit || 0),
        isCurrency: true,
      },
      {
        key: 'orders',
        metric: 'Количество заказов',
        current: summaryData.currentPeriod?.orders || summaryData.current_period?.orders || 0,
        previous: summaryData.previousPeriod?.orders || summaryData.previous_period?.orders || 0,
        change: summaryData.ordersChange || summaryData.orders_change || 0,
        isCurrency: false,
      },
      {
        key: 'averageCheck',
        metric: 'Средний чек',
        current: summaryData.currentPeriod?.averageCheck || summaryData.current_period?.average_check || 0,
        previous: summaryData.previousPeriod?.averageCheck || summaryData.previous_period?.average_check || 0,
        change: summaryData.averageCheckChange || summaryData.average_check_change || 0,
        absoluteChange: (summaryData.currentPeriod?.averageCheck || summaryData.current_period?.average_check || 0) - (summaryData.previousPeriod?.averageCheck || summaryData.previous_period?.average_check || 0),
        isCurrency: true,
      },
    ];
  }, [summaryData]);

  const isLoading = kpiLoading || summaryLoading;

  return (
    <div>
      <Title level={3}>Общая статистика</Title>
      <Alert
        message="Режим тестовых данных"
        description="В данный момент используется режим тестовых данных. Все показатели KPI генерируются динамически для демонстрации функционала."
        type="info"
        icon={<ExperimentOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
        closable
      />

      {/* Селектор периода */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
              loading={exportLoading}
            >
              Экспорт в Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => handleExport('pdf')}
              loading={exportLoading}
            >
              Экспорт в PDF
            </Button>
          </Space>
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
            <Button size="small" onClick={() => handleQuickSelect('thisQuarter')}>
              Этот квартал
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('lastQuarter')}>
              Прошлый квартал
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('thisYear')}>
              Этот год
            </Button>
            <Button size="small" onClick={() => handleQuickSelect('lastYear')}>
              Прошлый год
            </Button>
          </Space>
        </Space>
      </Card>

      <Spin spinning={isLoading}>
        {kpiData && (
          <>
            {/* KPI карточки */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Общий оборот"
                    value={kpiData.totalTurnover || kpiData.total_turnover || 0}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ color: '#1890ff' }}
                    suffix={
                      <Space>
                        {(kpiData.turnoverChange || kpiData.turnover_change || 0) >= 0 ? (
                          <ArrowUpOutlined style={{ fontSize: 14, color: '#3f8600' }} />
                        ) : (
                          <ArrowDownOutlined style={{ fontSize: 14, color: '#cf1322' }} />
                        )}
                        <Text
                          style={{
                            fontSize: 14,
                            color: (kpiData.turnoverChange || kpiData.turnover_change || 0) >= 0 ? '#3f8600' : '#cf1322',
                          }}
                        >
                          {Math.abs(kpiData.turnoverChange || kpiData.turnover_change || 0).toFixed(2)}%
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Чистая прибыль"
                    value={kpiData.netProfit || kpiData.net_profit || 0}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ color: (kpiData.netProfit || kpiData.net_profit || 0) >= 0 ? '#3f8600' : '#cf1322' }}
                    suffix={
                      <Space>
                        {(kpiData.profitChange || kpiData.profit_change || 0) >= 0 ? (
                          <ArrowUpOutlined style={{ fontSize: 14, color: '#3f8600' }} />
                        ) : (
                          <ArrowDownOutlined style={{ fontSize: 14, color: '#cf1322' }} />
                        )}
                        <Text
                          style={{
                            fontSize: 14,
                            color: (kpiData.profitChange || kpiData.profit_change || 0) >= 0 ? '#3f8600' : '#cf1322',
                          }}
                        >
                          {Math.abs(kpiData.profitChange || kpiData.profit_change || 0).toFixed(2)}%
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Активные заказы"
                    value={kpiData.activeOrders || kpiData.active_orders || 0}
                    prefix={<ShoppingOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                    suffix={
                      <Space>
                        {(kpiData.ordersChange || kpiData.orders_change || 0) >= 0 ? (
                          <ArrowUpOutlined style={{ fontSize: 14, color: '#3f8600' }} />
                        ) : (
                          <ArrowDownOutlined style={{ fontSize: 14, color: '#cf1322' }} />
                        )}
                        <Text
                          style={{
                            fontSize: 14,
                            color: (kpiData.ordersChange || kpiData.orders_change || 0) >= 0 ? '#3f8600' : '#cf1322',
                          }}
                        >
                          {Math.abs(kpiData.ordersChange || kpiData.orders_change || 0).toFixed(2)}%
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Средний чек"
                    value={kpiData.averageCheck || kpiData.average_check || 0}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ color: '#13c2c2' }}
                    suffix={
                      <Space>
                        {(kpiData.averageCheckChange || kpiData.average_check_change || 0) >= 0 ? (
                          <ArrowUpOutlined style={{ fontSize: 14, color: '#3f8600' }} />
                        ) : (
                          <ArrowDownOutlined style={{ fontSize: 14, color: '#cf1322' }} />
                        )}
                        <Text
                          style={{
                            fontSize: 14,
                            color: (kpiData.averageCheckChange || kpiData.average_check_change || 0) >= 0 ? '#3f8600' : '#cf1322',
                          }}
                        >
                          {Math.abs(kpiData.averageCheckChange || kpiData.average_check_change || 0).toFixed(2)}%
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={8}>
                <Card>
                  <Statistic
                    title="Клиентов"
                    value={kpiData.totalClients || kpiData.total_clients || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Card>
                  <Statistic
                    title="Экспертов"
                    value={kpiData.totalExperts || kpiData.total_experts || 0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Card>
                  <Statistic
                    title="Партнёров"
                    value={kpiData.totalPartners || kpiData.total_partners || 0}
                    prefix={<UserAddOutlined />}
                    valueStyle={{ color: '#eb2f96' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Сравнительная таблица */}
            <Card title="Сравнение с предыдущим периодом" style={{ marginBottom: 16 }}>
              <Table
                columns={comparisonColumns}
                dataSource={comparisonData}
                pagination={false}
                size="small"
              />
            </Card>

            {/* Информационное сообщение */}
            <div style={{ padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
              <Typography.Text type="secondary">
                💡 Для отображения графиков установите библиотеку recharts: <code>npm install recharts</code>
              </Typography.Text>
            </div>
          </>
        )}
      </Spin>
    </div>
  );
};

export default GeneralStatistics;
