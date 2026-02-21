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
import { getAllPartnersTurnover } from '../../api/directorApi';
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
      <Card style={{ 
        marginBottom: 16,
        borderRadius: isMobile ? 8 : 12
      }}>
        <div className={isMobile ? styles.datePickerContainer : ''} style={{ position: 'relative' }}>
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
            <Space wrap size="middle" style={{ marginTop: 12 }}>
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
            
            <Row gutter={[16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={8}>
                <Card style={{ 
                  borderRadius: isMobile ? 8 : 12,
                  textAlign: 'center'
                }}>
                  <Statistic
                    title="Общий оборот партнёров"
                    value={totalTurnover}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ 
                      color: '#1890ff',
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
                    title="Общая комиссия"
                    value={turnoverData.partners?.reduce((sum: number, p: any) => sum + (p.commission || 0), 0) || 0}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ 
                      color: '#3f8600',
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
                  background: isMobile ? '#f6ffed' : '#fff',
                  border: isMobile ? '2px solid #52c41a' : '1px solid #d9d9d9'
                }}>
                  <Statistic
                    title="Активных партнёров"
                    value={turnoverData.partners?.length || 0}
                    valueStyle={{ 
                      color: '#722ed1',
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

            
            {topPartners.length > 0 && (
              <Row gutter={[16, isMobile ? 12 : 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={12}>
                  <Card 
                    title="Топ-5 партнёров по обороту"
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
                            fontSize={isMobile ? 10 : 12}
                            interval={0}
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                          />
                          <YAxis 
                            fontSize={isMobile ? 10 : 12}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
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
                          <Bar dataKey="turnover" fill="#1890ff" name="Оборот" />
                          <Bar dataKey="commission" fill="#52c41a" name="Комиссия" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card 
                    title="Распределение оборота"
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
                              <Cell key={`cell-${idx}`} fill={['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'][idx]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
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
              </Row>
            )}

            {topPartners.length > 0 && (
              <Card 
                title="Детали топ-5 партнёров" 
                style={{ 
                  marginBottom: 16,
                  borderRadius: isMobile ? 8 : 12
                }}
                headStyle={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 600
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {topPartners.map((partner, index) => {
                    const percentage = totalTurnover > 0 ? ((partner.turnover || 0) / totalTurnover) * 100 : 0;
                    return (
                      <Card 
                        key={partner.id} 
                        size="small"
                        style={{
                          borderRadius: isMobile ? 6 : 8,
                          border: index < 3 ? '2px solid #ffd700' : '1px solid #d9d9d9',
                          background: index === 0 ? '#fff7e6' : index === 1 ? '#f6ffed' : index === 2 ? '#fff2e8' : '#fafafa'
                        }}
                      >
                        {isMobile ? (
                          
                          <div>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: 12
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Tag 
                                  color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'default'}
                                  style={{ fontSize: 14, fontWeight: 'bold' }}
                                >
                                  {index + 1}
                                </Tag>
                                <Text strong style={{ fontSize: 16 }}>
                                  {partner.firstName || partner.first_name} {partner.lastName || partner.last_name}
                                </Text>
                              </div>
                              <Tag color="blue" style={{ fontSize: 12, fontWeight: 'bold' }}>
                                {percentage.toFixed(1)}%
                              </Tag>
                            </div>
                            
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {partner.email || partner.partnerEmail || ''}
                              </Text>
                            </div>
                            
                            <Row gutter={[8, 8]}>
                              <Col span={12}>
                                <div style={{ 
                                  background: '#e6f7ff', 
                                  padding: '8px 12px', 
                                  borderRadius: 6,
                                  textAlign: 'center'
                                }}>
                                  <Text style={{ fontSize: 11, color: '#666' }}>Оборот</Text>
                                  <br />
                                  <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                                    {formatCurrency(partner.turnover || 0)}
                                  </Text>
                                </div>
                              </Col>
                              <Col span={12}>
                                <div style={{ 
                                  background: '#f6ffed', 
                                  padding: '8px 12px', 
                                  borderRadius: 6,
                                  textAlign: 'center'
                                }}>
                                  <Text style={{ fontSize: 11, color: '#666' }}>Комиссия</Text>
                                  <br />
                                  <Text strong style={{ fontSize: 14, color: '#52c41a' }}>
                                    {formatCurrency(partner.commission || 0)}
                                  </Text>
                                </div>
                              </Col>
                            </Row>
                            
                            <div style={{ 
                              marginTop: 8, 
                              textAlign: 'center',
                              background: '#f0f0f0',
                              padding: '6px 12px',
                              borderRadius: 6
                            }}>
                              <Text style={{ fontSize: 12, color: '#666' }}>Рефералов: </Text>
                              <Text strong style={{ fontSize: 13, color: '#722ed1' }}>
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
              style={{ 
                borderRadius: isMobile ? 8 : 12
              }}
              headStyle={{
                fontSize: isMobile ? 16 : 18,
                fontWeight: 600
              }}
            >
              {isMobile ? (
                
                <div>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {(turnoverData.partners || []).map((partner: any, index: number) => {
                      const percentage = totalTurnover > 0 ? ((partner.turnover || 0) / totalTurnover) * 100 : 0;
                      return (
                        <Card 
                          key={partner.id} 
                          size="small"
                          style={{
                            borderRadius: 8,
                            border: '1px solid #e8e8e8',
                            background: '#fafafa'
                          }}
                        >
                          <div>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: 12
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Tag color={index < 3 ? 'gold' : 'default'} style={{ fontSize: 12 }}>
                                  #{index + 1}
                                </Tag>
                                <Text strong style={{ fontSize: 15 }}>
                                  {partner.firstName || partner.first_name || ''} {partner.lastName || partner.last_name || ''}
                                </Text>
                              </div>
                              <Tag color="blue" style={{ fontSize: 11 }}>
                                {percentage.toFixed(1)}%
                              </Tag>
                            </div>
                            
                            <div style={{ marginBottom: 10 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                📧 {partner.email || partner.partnerEmail || 'Не указан'}
                              </Text>
                            </div>
                            
                            <Row gutter={[6, 6]}>
                              <Col span={8}>
                                <div style={{ 
                                  background: '#e6f7ff', 
                                  padding: '6px 8px', 
                                  borderRadius: 4,
                                  textAlign: 'center'
                                }}>
                                  <Text style={{ fontSize: 10, color: '#666' }}>Оборот</Text>
                                  <br />
                                  <Text strong style={{ fontSize: 12, color: '#1890ff' }}>
                                    {formatCurrency(partner.turnover || 0)}
                                  </Text>
                                </div>
                              </Col>
                              <Col span={8}>
                                <div style={{ 
                                  background: '#f6ffed', 
                                  padding: '6px 8px', 
                                  borderRadius: 4,
                                  textAlign: 'center'
                                }}>
                                  <Text style={{ fontSize: 10, color: '#666' }}>Комиссия</Text>
                                  <br />
                                  <Text strong style={{ fontSize: 12, color: '#52c41a' }}>
                                    {formatCurrency(partner.commission || 0)}
                                  </Text>
                                </div>
                              </Col>
                              <Col span={8}>
                                <div style={{ 
                                  background: '#f0f0f0', 
                                  padding: '6px 8px', 
                                  borderRadius: 4,
                                  textAlign: 'center'
                                }}>
                                  <Text style={{ fontSize: 10, color: '#666' }}>Рефералов</Text>
                                  <br />
                                  <Text strong style={{ fontSize: 12, color: '#722ed1' }}>
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
                      style={{
                        marginTop: 16,
                        borderRadius: 8,
                        border: '2px solid #1890ff',
                        background: '#f0f9ff'
                      }}
                    >
                      <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                        📊 Общие итоги:
                      </Text>
                      <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#666' }}>Общий оборот</Text>
                            <br />
                            <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                              {formatCurrency(totalTurnover)}
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#666' }}>Общая комиссия</Text>
                            <br />
                            <Text strong style={{ fontSize: 14, color: '#52c41a' }}>
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
