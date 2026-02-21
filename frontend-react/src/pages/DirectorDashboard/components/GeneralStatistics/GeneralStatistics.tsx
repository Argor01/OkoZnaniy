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
    try {
      message.loading({ content: 'Подготовка данных для экспорта...', key: 'export' });

      if (format === 'excel') {
        
        const XLSX = await import('xlsx');

        
        const exportData = [
          {
            'Показатель': 'Общий оборот',
            'Значение': `${totalTurnover.toLocaleString('ru-RU')} ₽`,
            'Изменение': `${turnoverChange >= 0 ? '+' : ''}${turnoverChange.toFixed(2)}%`,
          },
          {
            'Показатель': 'Чистая прибыль',
            'Значение': `${netProfit.toLocaleString('ru-RU')} ₽`,
            'Изменение': `${profitChange >= 0 ? '+' : ''}${profitChange.toFixed(2)}%`,
          },
          {
            'Показатель': 'Активные заказы',
            'Значение': activeOrders,
            'Изменение': `${ordersChange >= 0 ? '+' : ''}${ordersChange.toFixed(2)}%`,
          },
          {
            'Показатель': 'Средний чек',
            'Значение': `${averageCheck.toLocaleString('ru-RU')} ₽`,
            'Изменение': `${averageCheckChange >= 0 ? '+' : ''}${averageCheckChange.toFixed(2)}%`,
          },
          {},
          {
            'Показатель': 'Всего клиентов',
            'Значение': totalClients,
            'Изменение': '',
          },
          {
            'Показатель': 'Всего экспертов',
            'Значение': totalExperts,
            'Изменение': '',
          },
          {
            'Показатель': 'Всего партнеров',
            'Значение': totalPartners,
            'Изменение': '',
          },
        ];
        const wb = XLSX.utils.book_new();
        
        
        const ws = XLSX.utils.json_to_sheet(exportData);

        
        ws['!cols'] = [
          { wch: 25 }, 
          { wch: 20 }, 
          { wch: 15 }, 
        ];

        
        XLSX.utils.book_append_sheet(wb, ws, 'Статистика');

        
        const fileName = `Статистика_${dateRange[0].format('DD.MM.YYYY')}-${dateRange[1].format('DD.MM.YYYY')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        message.success({ content: 'Данные успешно экспортированы!', key: 'export', duration: 2 });
      } else if (format === 'pdf') {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
        
        const pdfMake = pdfMakeModule.default || pdfMakeModule;
        if (pdfFontsModule.default && pdfFontsModule.default.pdfMake) {
          pdfMake.vfs = pdfFontsModule.default.pdfMake.vfs;
        } else if (pdfFontsModule.pdfMake) {
          pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
        } else if (pdfFontsModule.default) {
          pdfMake.vfs = pdfFontsModule.default;
        } else {
          pdfMake.vfs = pdfFontsModule;
        }
        const tableBody = [
          [
            { text: 'Показатель', style: 'tableHeader' },
            { text: 'Значение', style: 'tableHeader' },
            { text: 'Изменение', style: 'tableHeader' }
          ],
          [
            'Общий оборот',
            `${totalTurnover.toLocaleString('ru-RU')} ₽`,
            `${turnoverChange >= 0 ? '+' : ''}${turnoverChange.toFixed(2)}%`
          ],
          [
            'Чистая прибыль',
            `${netProfit.toLocaleString('ru-RU')} ₽`,
            `${profitChange >= 0 ? '+' : ''}${profitChange.toFixed(2)}%`
          ],
          [
            'Активные заказы',
            activeOrders.toString(),
            `${ordersChange >= 0 ? '+' : ''}${ordersChange.toFixed(2)}%`
          ],
          [
            'Средний чек',
            `${averageCheck.toLocaleString('ru-RU')} ₽`,
            `${averageCheckChange >= 0 ? '+' : ''}${averageCheckChange.toFixed(2)}%`
          ]
        ];

        const additionalTableBody = [
          [
            { text: 'Показатель', style: 'tableHeader' },
            { text: 'Значение', style: 'tableHeader' }
          ],
          ['Всего клиентов', totalClients.toString()],
          ['Всего экспертов', totalExperts.toString()],
          ['Всего партнеров', totalPartners.toString()]
        ];
        const docDefinition: any = {
          content: [
            { text: 'Общая статистика', style: 'header' },
            { text: `Период: ${dateRange[0].format('DD.MM.YYYY')} - ${dateRange[1].format('DD.MM.YYYY')}`, style: 'subheader' },
            { text: '\n' },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto'],
                body: tableBody
              },
              layout: {
                fillColor: function (rowIndex: number) {
                  return rowIndex === 0 ? '#1890ff' : null;
                }
              }
            },
            { text: '\n' },
            { text: 'Дополнительная информация', style: 'subheader' },
            { text: '\n' },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto'],
                body: additionalTableBody
              },
              layout: {
                fillColor: function (rowIndex: number) {
                  return rowIndex === 0 ? '#1890ff' : null;
                }
              }
            }
          ],
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              margin: [0, 0, 0, 10]
            },
            subheader: {
              fontSize: 14,
              bold: true,
              margin: [0, 10, 0, 5]
            },
            tableHeader: {
              bold: true,
              fontSize: 11,
              color: 'white'
            }
          },
          defaultStyle: {
            font: 'Roboto'
          },
          footer: function(currentPage: number, pageCount: number) {
            return {
              columns: [
                { text: `Сгенерировано: ${dayjs().format('DD.MM.YYYY HH:mm')}`, fontSize: 9, margin: [40, 0] },
                { text: `Страница ${currentPage} из ${pageCount}`, alignment: 'right', fontSize: 9, margin: [0, 0, 40, 0] }
              ]
            };
          }
        };
        pdfMake.createPdf(docDefinition).download(
          `Статистика_${dateRange[0].format('DD.MM.YYYY')}-${dateRange[1].format('DD.MM.YYYY')}.pdf`
        );

        message.success({ content: 'PDF успешно сгенерирован!', key: 'export', duration: 2 });
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      message.error({ content: 'Ошибка при экспорте данных', key: 'export', duration: 2 });
    }
  };

  return (
    <div>

      
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

      
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginTop: 24 }}>
      </Row>
    </div>
  );
};

export default GeneralStatistics;
