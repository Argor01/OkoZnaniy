import React, { useState } from 'react';
import { Typography, Card, Tag, Button, Space, Empty, Spin, Radio, Tooltip, message } from 'antd';
import { ClockCircleOutlined, UserOutlined, FilterOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi, Bid } from '../../../../api/orders';
import { authApi } from '../../../../api/auth';
import { ORDER_STATUS_COLORS, ORDER_STATUS_TEXTS } from '../../../../config/orderStatuses';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from '../../ExpertDashboard.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

interface OrdersTabProps {
  isMobile: boolean;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ isMobile }) => {
  const navigate = useNavigate();
  const [orderFilter, setOrderFilter] = useState<'my' | 'available'>('available'); // По умолчанию доступные заказы

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Устанавливаем правильный фильтр в зависимости от роли пользователя
  React.useEffect(() => {
    if (userProfile?.role === 'client') {
      setOrderFilter('my');
    } else if (userProfile?.role === 'expert') {
      setOrderFilter('available');
    }
  }, [userProfile?.role]);

  // Загружаем размещенные заказы пользователя (только для клиентов)
  const { data: myOrdersData, isLoading: myOrdersLoading } = useQuery({
    queryKey: ['user-orders'],
    queryFn: () => ordersApi.getClientOrders(),
    enabled: !!userProfile && userProfile.role === 'client',
  });

  // Загружаем доступные заказы (лента)
  const { data: availableOrdersData, isLoading: availableOrdersLoading } = useQuery({
    queryKey: ['available-orders'],
    queryFn: () => ordersApi.getAvailableOrders({ ordering: '-created_at' }),
    enabled: !!userProfile,
  });

  // Определяем какие данные показывать в зависимости от фильтра
  const currentOrdersData = orderFilter === 'my' ? myOrdersData : availableOrdersData;
  const isLoading = orderFilter === 'my' ? myOrdersLoading : availableOrdersLoading;

  const sanitizeOrders = (items: any) => {
    const raw = Array.isArray(items?.results) ? items.results : (Array.isArray(items) ? items : []);
    return raw.filter((order: any) => {
      if (!order) return false;
      if (order.is_active === false) return false;
      if (order.deleted === true) return false;
      return !!order.id && !!order.title;
    });
  };

  const orders = sanitizeOrders(currentOrdersData);

  const availableOrders = Array.isArray(availableOrdersData?.results)
    ? availableOrdersData.results
    : (Array.isArray(availableOrdersData) ? availableOrdersData : []);

  const availableOrdersSanitized = sanitizeOrders(availableOrders);

  const freshOrders = availableOrdersSanitized.slice(0, 5);

  // Используем реальные данные
  const displayOrders = orderFilter === 'available' ? freshOrders : orders;

  const getStatusColor = (status: string) => ORDER_STATUS_COLORS[status] || 'default';
  const getStatusText = (status: string) => ORDER_STATUS_TEXTS[status] || status;

  if (isLoading) {
    return (
      <div className={styles.sectionCard}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionCard}>
        <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className={styles.sectionTitle}>
            Заказы
          </h2>
          <Button 
            type="primary"
            onClick={() => navigate('/create-order')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: 8,
            }}
          >
            Создать заказ
          </Button>
        </div>

        {/* Фильтр заказов */}
        <div style={{ marginBottom: 24 }}>
          <Radio.Group 
            value={orderFilter} 
            onChange={(e) => setOrderFilter(e.target.value)}
            style={{ width: '100%' }}
          >
            <Radio.Button 
              value="my" 
              style={{ 
                borderRadius: '8px 0 0 8px',
                fontWeight: 500,
                minWidth: isMobile ? 'auto' : 150,
                textAlign: 'center'
              }}
            >
              <Space>
                <UserOutlined />
                Мои размещенные заказы
              </Space>
            </Radio.Button>
            <Radio.Button 
              value="available" 
              style={{ 
                borderRadius: '0 8px 8px 0',
                fontWeight: 500,
                minWidth: isMobile ? 'auto' : 150,
                textAlign: 'center'
              }}
            >
              <Space>
                <FilterOutlined />
                Доступные заказы
              </Space>
            </Radio.Button>
          </Radio.Group>
        </div>

        {displayOrders.length === 0 ? (
          <Empty
            description={
              <div>
                <Text style={{ fontSize: 16, color: '#999' }}>
                  {orderFilter === 'my' 
                    ? 'У вас пока нет размещенных заказов'
                    : 'Нет доступных заказов для отклика'}
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          />
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {displayOrders.map((order: any) => (
              <Card
                key={order.id}
                hoverable
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: 20 } }}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                      {order.title}
                    </Text>
                    <Space size={8} wrap>
                      <Tag color={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Tag>
                      {order.subject_name && (
                        <Tag color="blue">{order.subject_name}</Tag>
                      )}
                      {order.work_type_name && (
                        <Tag>{order.work_type_name}</Tag>
                      )}
                    </Space>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Tooltip title="Скопировать ссылку на заказ">
                        <Button
                          type="text"
                          size="small"
                          icon={<ShareAltOutlined />}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/orders/${order.id}`;
                            try {
                              await navigator.clipboard.writeText(url);
                              message.success('Ссылка скопирована');
                            } catch {
                              message.error('Не удалось скопировать ссылку');
                            }
                          }}
                        />
                      </Tooltip>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#667eea' }}>
                      {order.budget ? `${order.budget} ₽` : 'Договорная'}
                    </div>
                  </div>
                </div>

                {order.description && (
                  <Paragraph 
                    ellipsis={{ rows: 2 }}
                    style={{ color: '#666', marginBottom: 12 }}
                  >
                    {order.description}
                  </Paragraph>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <Space size={16} wrap>
                    {order.deadline && (
                      <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#999' }} />
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {dayjs(order.deadline).fromNow()}
                        </Text>
                      </Space>
                    )}
                    {order.responses_count !== undefined && (
                      <Space size={4}>
                        <UserOutlined style={{ color: '#999' }} />
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {order.responses_count} откликов
                        </Text>
                      </Space>
                    )}
                  </Space>
                  {orderFilter === 'available' && userProfile?.role === 'expert' && (
                    <Button 
                      type="primary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                      style={{
                        background: '#52c41a',
                        border: 'none',
                        borderRadius: 6,
                        marginLeft: 8
                      }}
                    >
                      Откликнуться
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
