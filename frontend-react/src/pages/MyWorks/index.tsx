import React, { useState } from 'react';
import { Typography, Input, Select, Row, Col, Card, Empty, Statistic, Tabs } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, StarFilled, FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders';
import styles from './MyWorks.module.css';

const { Title } = Typography;

const MyWorks: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('completed');

  // Загружаем завершенные работы
  const { data: completedWorks, isLoading: completedLoading } = useQuery({
    queryKey: ['my-orders-completed'],
    queryFn: async () => {
      try {
        const data = await ordersApi.getMyOrders({ status: 'completed' });
        return data || [];
      } catch (error) {
        console.error('Error loading completed works:', error);
        return [];
      }
    },
  });

  // Загружаем работы в процессе
  const { data: inProgressWorks, isLoading: inProgressLoading } = useQuery({
    queryKey: ['my-orders-in-progress'],
    queryFn: async () => {
      try {
        const data = await ordersApi.getMyOrders({ status: 'in_progress' });
        return data || [];
      } catch (error) {
        console.error('Error loading in-progress works:', error);
        return [];
      }
    },
  });

  const filteredWorks = (works: any[]) => {
    if (!works) return [];
    
    let filtered = works;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(work => work.status === statusFilter);
    }
    
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(work => 
        work.title?.toLowerCase().includes(search) ||
        work.description?.toLowerCase().includes(search) ||
        work.subject?.name?.toLowerCase().includes(search) ||
        work.work_type?.name?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  };

  return (
    <div className={styles.contentContainer}>
      {/* Заголовок */}
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
        Мои работы
      </Title>

      {/* Статистика */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statsCard}>
            <Statistic
              title="Завершенные работы"
              value={completedWorks?.length || 0}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statsCard}>
            <Statistic
              title="В работе"
              value={inProgressWorks?.length || 0}
              prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statsCard}>
            <Statistic
              title="Общий доход"
              value={completedWorks?.reduce((sum: number, work: any) => sum + (Number(work.budget) || 0), 0) || 0}
              formatter={(value) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0 }).format(Number(value))}
              suffix="₽"
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statsCard}>
            <Statistic
              title="Средний рейтинг"
              value={completedWorks?.length ? 
                (completedWorks.reduce((sum: number, work: any) => sum + (Number(work.rating) || 0), 0) / completedWorks.length).toFixed(1) : 
                '0.0'
              }
              prefix={<StarFilled style={{ color: '#fbbf24' }} />}
              valueStyle={{ color: '#fbbf24' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Фильтры и поиск */}
      <Card className={styles.filterCard} style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Поиск по работам..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className={styles.searchInput}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Фильтр по статусу"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              suffixIcon={<FilterOutlined />}
              className={styles.filterSelect}
            >
              <Select.Option value="all">Все статусы</Select.Option>
              <Select.Option value="completed">Завершенные</Select.Option>
              <Select.Option value="in_progress">В работе</Select.Option>
              <Select.Option value="review">На проверке</Select.Option>
              <Select.Option value="cancelled">Отмененные</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Вкладки работ */}
      <div className={styles.tabsContainer}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'completed',
              label: `Завершенные (${completedWorks?.length || 0})`,
              children: (
                <div>
                  {completedLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <div>Загрузка...</div>
                    </div>
                  ) : filteredWorks(completedWorks || []).length === 0 ? (
                    <Empty
                      description="Нет завершенных работ"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <Row gutter={[24, 24]}>
                      {filteredWorks(completedWorks || []).map((work: any) => (
                        <Col xs={24} sm={12} lg={8} key={work.id}>
                          <Card
                            hoverable
                            className={styles.workCard}
                          >
                            <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                              {work.title}
                            </Title>
                            <p>{work.description}</p>
                            <div style={{ marginTop: 16 }}>
                              <strong>{work.budget} ₽</strong>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: 'in_progress',
              label: `В работе (${inProgressWorks?.length || 0})`,
              children: (
                <div>
                  {inProgressLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <div>Загрузка...</div>
                    </div>
                  ) : filteredWorks(inProgressWorks || []).length === 0 ? (
                    <Empty
                      description="Нет работ в процессе"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <Row gutter={[24, 24]}>
                      {filteredWorks(inProgressWorks || []).map((work: any) => (
                        <Col xs={24} sm={12} lg={8} key={work.id}>
                          <Card
                            hoverable
                            className={styles.workCard}
                          >
                            <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                              {work.title}
                            </Title>
                            <p>{work.description}</p>
                            <div style={{ marginTop: 16 }}>
                              <strong>{work.budget} ₽</strong>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default MyWorks;