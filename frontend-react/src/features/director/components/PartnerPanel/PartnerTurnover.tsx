import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Spin,
  Typography,
  Tag,
  Row,
  Col,
  Statistic,
  DatePicker,
} from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { getPartnerTurnover, getAllPartnersTurnover } from '@/features/director/api/directorApi';
import type { ColumnsType } from 'antd/es/table';
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
import styles from './PartnerTurnover.module.css';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PartnerTurnover: React.FC = () => {
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

  const { data: turnoverData, isLoading } = useQuery({
    queryKey: ['director-partner-turnover', dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => getAllPartnersTurnover([dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')]),
  });

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
      case 'lastYear':
        start = today.subtract(1, 'year').startOf('year');
        end = today.subtract(1, 'year').endOf('year');
        break;
      default:
        return;
    }
    setDateRange([start, end]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalTurnover = useMemo(() => {
    if (!turnoverData?.partners) return 0;
    return turnoverData.partners.reduce((sum: number, p: any) => sum + (p.turnover || 0), 0);
  }, [turnoverData]);

  const topPartners = useMemo(() => {
    if (!turnoverData?.partners) return [];
    return [...turnoverData.partners]
      .sort((a: any, b: any) => (b.turnover || 0) - (a.turnover || 0))
      .slice(0, 5);
  }, [turnoverData]);

  const columns: ColumnsType<any> = [
    {
      title: 'Место',
      key: 'rank',
      width: 80,
      render: (_, __, index) => (
        <Tag color={index < 3 ? 'gold' : 'default'}>
          {index + 1}
        </Tag>
      ),
    },
    {
      title: 'Имя партнёра',
      key: 'name',
      render: (_, record) => `${record.firstName || record.first_name || ''} ${record.lastName || record.last_name || ''}`,
      sorter: (a, b) =>
        (a.firstName || a.first_name || '').localeCompare(b.firstName || b.first_name || ''),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, record) => record.email || record.partnerEmail || '',
    },
    {
      title: 'Количество рефералов',
      key: 'referralsCount',
      render: (_, record) => record.referralsCount || record.referrals_count || 0,
      sorter: (a, b) =>
        (a.referralsCount || a.referrals_count || 0) - (b.referralsCount || b.referrals_count || 0),
    },
    {
      title: 'Оборот за период',
      key: 'turnover',
      render: (_, record) => formatCurrency(record.turnover || 0),
      sorter: (a, b) => (a.turnover || 0) - (b.turnover || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Комиссия партнёра',
      key: 'commission',
      render: (_, record) => formatCurrency(record.commission || 0),
      sorter: (a, b) => (a.commission || 0) - (b.commission || 0),
    },
    {
      title: 'Процент от общего оборота',
      key: 'percentage',
      render: (_, record) => {
        const percentage = totalTurnover > 0 ? ((record.turnover || 0) / totalTurnover) * 100 : 0;
        return `${percentage.toFixed(2)}%`;
      },
      sorter: (a, b) => (a.turnover || 0) - (b.turnover || 0),
    },
  ];

  return (
    <div>
      <Card
        className={[
          styles.filterCard,
          isMobile ? styles.filterCardMobile : '',
        ].filter(Boolean).join(' ')}
      >
        <div
          className={[
            styles.datePickerWrapper,
            isMobile ? styles.datePickerContainer : '',
          ].filter(Boolean).join(' ')}
        >
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            format="DD.MM.YYYY"
            className={isMobile ? styles.mobileRangePicker : ''}
            size={isMobile ? 'large' : 'middle'}
            placeholder={['Дата начала', 'Дата окончания']}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            presets={isMobile ? undefined : [
              {
                label: 'Эта неделя',
                value: [dayjs().startOf('week'), dayjs().endOf('week')],
              },
              {
                label: 'Этот месяц',
                value: [dayjs().startOf('month'), dayjs().endOf('month')],
              },
              {
                label: 'Прошлый месяц',
                value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')],
              },
              {
                label: 'Этот год',
                value: [dayjs().startOf('year'), dayjs().endOf('year')],
              },
            ]}
          />
          {isMobile ? (
            <Row gutter={[8, 8]} className={styles.quickSelectButtons}>
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
            <Space wrap size="middle" className={styles.quickSelectDesktop}>
              <Button onClick={() => handleQuickSelect('thisWeek')}>Эта неделя</Button>
              <Button onClick={() => handleQuickSelect('thisMonth')}>Этот месяц</Button>
              <Button onClick={() => handleQuickSelect('lastMonth')}>Прошлый месяц</Button>
              <Button onClick={() => handleQuickSelect('thisYear')}>Этот год</Button>
              <Button onClick={() => handleQuickSelect('lastYear')}>Прошлый год</Button>
            </Space>
          )}
        </div>
      </Card>

      <Spin spinning={isLoading}>
        {turnoverData && (
          <>
            
            <Row gutter={[16, isMobile ? 12 : 16]} className={styles.statsRow}>
              <Col xs={24} sm={12} md={8}>
                <Card
                  className={[
                    styles.statCard,
                    isMobile ? styles.statCardMobile : '',
                  ].filter(Boolean).join(' ')}
                >
                  <Statistic
                    title="Общий оборот партнёров"
                    value={totalTurnover}
                    prefix="₽"
                    precision={2}
                    className={[
                      styles.statisticTurnover,
                      isMobile ? styles.statisticTurnoverMobile : '',
                    ].filter(Boolean).join(' ')}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card
                  className={[
                    styles.statCard,
                    isMobile ? styles.statCardMobile : '',
                  ].filter(Boolean).join(' ')}
                >
                  <Statistic
                    title="Общая комиссия"
                    value={turnoverData.partners?.reduce((sum: number, p: any) => sum + (p.commission || 0), 0) || 0}
                    prefix="₽"
                    precision={2}
                    className={[
                      styles.statisticCommission,
                      isMobile ? styles.statisticCommissionMobile : '',
                    ].filter(Boolean).join(' ')}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Card
                  className={[
                    styles.statCard,
                    isMobile ? styles.statCardMobile : '',
                    isMobile ? styles.statCardHighlightMobile : '',
                  ].filter(Boolean).join(' ')}
                >
                  <Statistic
                    title="Активных партнёров"
                    value={turnoverData.partners?.length || 0}
                    className={[
                      styles.statisticActive,
                      isMobile ? styles.statisticActiveMobile : '',
                    ].filter(Boolean).join(' ')}
                  />
                </Card>
              </Col>
            </Row>

            
            {topPartners.length > 0 && totalTurnover > 0 ? (
              <Row gutter={[16, isMobile ? 12 : 16]} className={styles.topPartnersRow}>
                <Col xs={24} lg={12}>
                  <Card 
                    title="Топ-5 партнёров по обороту"
                    className={[
                      styles.chartCard,
                      isMobile ? styles.chartCardMobile : '',
                      isMobile ? styles.chartCardHeadMobile : styles.chartCardHead,
                    ].filter(Boolean).join(' ')}
                  >
                    <div
                      className={[
                        styles.chartContainer,
                        isMobile ? styles.chartContainerMobile : '',
                        isMobile ? styles.chartContainerScrollableMobile : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={topPartners.map((p) => ({
                            name: `${p.firstName || p.first_name || ''} ${(p.lastName || p.last_name || '').charAt(0)}.`,
                            turnover: p.turnover || 0,
                            commission: p.commission || 0,
                          }))}
                          margin={{
                            top: 20,
                            right: isMobile ? 10 : 30,
                            left: isMobile ? 10 : 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            interval={0}
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                          />
                          <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                          <Bar dataKey="turnover" fill="#2b9fe6" name="Оборот" />
                          <Bar dataKey="commission" fill="#52c41a" name="Комиссия" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card 
                    title="Распределение оборота"
                    className={[
                      styles.chartCard,
                      isMobile ? styles.chartCardMobile : '',
                      isMobile ? styles.chartCardHeadMobile : styles.chartCardHead,
                    ].filter(Boolean).join(' ')}
                  >
                    <div
                      className={[
                        styles.chartContainerPie,
                        isMobile ? styles.chartContainerPieMobile : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topPartners.map((p) => ({
                              name: `${p.firstName || p.first_name || ''} ${(p.lastName || p.last_name || '').charAt(0)}.`,
                              value: p.turnover || 0,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={isMobile ? false : ({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                            outerRadius={isMobile ? 80 : 100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {topPartners.map((_: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={['#2b9fe6', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'][idx]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
              </Row>
            ) : topPartners.length > 0 && totalTurnover === 0 ? (
              <Card style={{ marginBottom: 16, textAlign: 'center', padding: '40px 20px' }}>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  📊 У партнеров пока нет оборота за выбранный период
                </Text>
              </Card>
            ) : null}

            {topPartners.length > 0 && totalTurnover > 0 && (
              <Card 
                title="Детали топ-5 партнёров" 
                className={[
                  styles.topPartnersDetailsCard,
                  isMobile ? styles.topPartnersDetailsCardMobile : '',
                  isMobile ? styles.topPartnersDetailsHeadMobile : styles.topPartnersDetailsHead,
                ].filter(Boolean).join(' ')}
              >
                <Space direction="vertical" className={styles.fullWidthSpace}>
                  {topPartners.map((partner, index) => {
                    const percentage = totalTurnover > 0 ? ((partner.turnover || 0) / totalTurnover) * 100 : 0;
                    return (
                      <Card 
                        key={partner.id} 
                        size="small"
                        className={[
                          styles.topPartnerCard,
                          isMobile ? styles.topPartnerCardMobile : '',
                          index === 0
                            ? styles.topPartnerCardTop1
                            : index === 1
                            ? styles.topPartnerCardTop2
                            : index === 2
                            ? styles.topPartnerCardTop3
                            : styles.topPartnerCardDefault,
                        ].filter(Boolean).join(' ')}
                      >
                        {isMobile ? (
                          
                          <div>
                            <div className={styles.topPartnerHeader}>
                              <div className={styles.topPartnerHeaderLeft}>
                                <Tag 
                                  color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'default'}
                                  className={styles.topPartnerRankTag}
                                >
                                  {index + 1}
                                </Tag>
                                <Text strong className={styles.topPartnerName}>
                                  {partner.firstName || partner.first_name} {partner.lastName || partner.last_name}
                                </Text>
                              </div>
                              <Tag color="blue" className={styles.topPartnerPercentTag}>
                                {percentage.toFixed(1)}%
                              </Tag>
                            </div>
                            
                            <div className={styles.topPartnerEmail}>
                              <Text type="secondary" className={styles.topPartnerEmailText}>
                                {partner.email || partner.partnerEmail || ''}
                              </Text>
                            </div>
                            
                            <Row gutter={[8, 8]}>
                              <Col span={12}>
                                <div className={[styles.topPartnerStatBox, styles.topPartnerTurnoverBox].join(' ')}>
                                  <Text className={styles.topPartnerStatLabel}>Оборот</Text>
                                  <br />
                                  <Text strong className={styles.topPartnerTurnoverValue}>
                                    {formatCurrency(partner.turnover || 0)}
                                  </Text>
                                </div>
                              </Col>
                              <Col span={12}>
                                <div className={[styles.topPartnerStatBox, styles.topPartnerCommissionBox].join(' ')}>
                                  <Text className={styles.topPartnerStatLabel}>Комиссия</Text>
                                  <br />
                                  <Text strong className={styles.topPartnerCommissionValue}>
                                    {formatCurrency(partner.commission || 0)}
                                  </Text>
                                </div>
                              </Col>
                            </Row>
                            
                            <div className={styles.topPartnerReferralBox}>
                              <Text className={styles.topPartnerReferralLabel}>Рефералов: </Text>
                              <Text strong className={styles.topPartnerReferralValue}>
                                {partner.referralsCount || partner.referrals_count || 0}
                              </Text>
                            </div>
                          </div>
                        ) : (
                          
                          <Row align="middle">
                            <Col span={1}>
                              <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'default'}>
                                {index + 1}
                              </Tag>
                            </Col>
                            <Col span={6}>
                              <Text strong>
                                {partner.firstName || partner.first_name} {partner.lastName || partner.last_name}
                              </Text>
                              <br />
                              <Text type="secondary">{partner.email || partner.partnerEmail || ''}</Text>
                            </Col>
                            <Col span={5}>
                              <Text>Оборот: {formatCurrency(partner.turnover || 0)}</Text>
                            </Col>
                            <Col span={5}>
                              <Text>Комиссия: {formatCurrency(partner.commission || 0)}</Text>
                            </Col>
                            <Col span={4}>
                              <Text>Рефералов: {partner.referralsCount || partner.referrals_count || 0}</Text>
                            </Col>
                            <Col span={3}>
                              <Tag color="blue">{percentage.toFixed(2)}%</Tag>
                            </Col>
                          </Row>
                        )}
                      </Card>
                    );
                  })}
                </Space>
              </Card>
            )}

            <Card 
              title="Оборот по всем партнёрам"
              className={[
                styles.allPartnersCard,
                isMobile ? styles.allPartnersCardMobile : '',
                isMobile ? styles.allPartnersHeadMobile : styles.allPartnersHead,
              ].filter(Boolean).join(' ')}
            >
              {isMobile ? (
                
                <div>
                  <Space direction="vertical" className={styles.fullWidthSpace} size="middle">
                    {(turnoverData.partners || []).map((partner: any, index: number) => {
                      const percentage = totalTurnover > 0 ? ((partner.turnover || 0) / totalTurnover) * 100 : 0;
                      return (
                        <Card 
                          key={partner.id} 
                          size="small"
                          className={styles.allPartnerCard}
                        >
                          <div>
                            <div className={styles.allPartnerHeader}>
                              <div className={styles.allPartnerHeaderLeft}>
                                <Tag color={index < 3 ? 'gold' : 'default'} className={styles.allPartnerRankTag}>
                                  #{index + 1}
                                </Tag>
                                <Text strong className={styles.allPartnerName}>
                                  {partner.firstName || partner.first_name || ''} {partner.lastName || partner.last_name || ''}
                                </Text>
                              </div>
                              <Tag color="blue" className={styles.allPartnerPercentTag}>
                                {percentage.toFixed(1)}%
                              </Tag>
                            </div>
                            
                            <div className={styles.allPartnerEmail}>
                              <Text type="secondary" className={styles.allPartnerEmailText}>
                                📧 {partner.email || partner.partnerEmail || 'Не указан'}
                              </Text>
                            </div>
                            
                            <Row gutter={[6, 6]}>
                              <Col span={8}>
                                <div className={[styles.allPartnerStatBox, styles.allPartnerTurnoverBox].join(' ')}>
                                  <Text className={styles.allPartnerStatLabel}>Оборот</Text>
                                  <br />
                                  <Text strong className={styles.allPartnerTurnoverValue}>
                                    {formatCurrency(partner.turnover || 0)}
                                  </Text>
                                </div>
                              </Col>
                              <Col span={8}>
                                <div className={[styles.allPartnerStatBox, styles.allPartnerCommissionBox].join(' ')}>
                                  <Text className={styles.allPartnerStatLabel}>Комиссия</Text>
                                  <br />
                                  <Text strong className={styles.allPartnerCommissionValue}>
                                    {formatCurrency(partner.commission || 0)}
                                  </Text>
                                </div>
                              </Col>
                              <Col span={8}>
                                <div className={[styles.allPartnerStatBox, styles.allPartnerReferralsBox].join(' ')}>
                                  <Text className={styles.allPartnerStatLabel}>Рефералов</Text>
                                  <br />
                                  <Text strong className={styles.allPartnerReferralsValue}>
                                    {partner.referralsCount || partner.referrals_count || 0}
                                  </Text>
                                </div>
                              </Col>
                            </Row>
                          </div>
                        </Card>
                      );
                    })}
                  </Space>
                  
                  
                  {(turnoverData.partners || []).length > 0 && (
                    <Card 
                      className={styles.allPartnersSummaryCard}
                    >
                      <Text strong className={styles.allPartnersSummaryTitle}>
                        📊 Общие итоги:
                      </Text>
                      <Row gutter={[8, 8]} className={styles.allPartnersSummaryRow}>
                        <Col span={12}>
                          <div className={styles.allPartnersSummaryCell}>
                            <Text className={styles.allPartnersSummaryLabel}>Общий оборот</Text>
                            <br />
                            <Text strong className={styles.allPartnersSummaryValueBlue}>
                              {formatCurrency(totalTurnover)}
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div className={styles.allPartnersSummaryCell}>
                            <Text className={styles.allPartnersSummaryLabel}>Общая комиссия</Text>
                            <br />
                            <Text strong className={styles.allPartnersSummaryValueGreen}>
                              {formatCurrency((turnoverData.partners || []).reduce((sum: number, p: any) => sum + (p.commission || 0), 0))}
                            </Text>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}
                </div>
              ) : (
                
                <Table
                  columns={columns}
                  dataSource={turnoverData.partners || []}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Всего: ${total}`,
                  }}
                  summary={(pageData) => {
                    const pageTurnover = pageData.reduce((sum, record) => sum + (record.turnover || 0), 0);
                    const pageCommission = pageData.reduce((sum, record) => sum + (record.commission || 0), 0);
                    return (
                      <>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={4}>
                            <Text strong>Итого:</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4}>
                            <Text strong>{formatCurrency(pageTurnover)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5}>
                            <Text strong>{formatCurrency(pageCommission)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} />
                        </Table.Summary.Row>
                      </>
                    );
                  }}
                />
              )}
            </Card>


          </>
        )}
      </Spin>
    </div>
  );
};

export default PartnerTurnover;
