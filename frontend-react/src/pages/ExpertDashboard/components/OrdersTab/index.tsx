import React from 'react';
import { Typography, Card, Tag, Button, Space, Empty, Spin } from 'antd';
import { ClockCircleOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../../../api/orders';
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

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем заказы
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['user-orders', userProfile?.role],
    queryFn: () => {
      if (userProfile?.role === 'client') {
        return ordersApi.getClientOrders();
      } else if (userProfile?.role === 'expert') {
        return ordersApi.getMyOrders({});
      }
      return null;
    },
    enabled: !!userProfile,
  });

  const orders = ordersData?.results || ordersData || [];
  const isClient = userProfile?.role === 'client';

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
        <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.sectionTitle}>
            {isClient ? 'Мои заказы' : 'Доступные заказы'}
          </h2>
          {isClient && (
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
          )}
        </div>

        {orders.length === 0 ? (
          <Empty
            description={
              <div>
                <Text style={{ fontSize: 16, color: '#999' }}>
                  {isClient 
                    ? 'У вас пока нет заказов'
                    : 'Нет доступных заказов'}
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
            {isClient && (
              <Button 
                type="primary" 
                onClick={() => navigate('/create-order')}
              >
                Создать первый заказ
              </Button>
            )}
          </Empty>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {orders.map((order: any) => (
              <Card
                key={order.id}
                hoverable
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                }}
                bodyStyle={{ padding: 20 }}
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
                  <Button 
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    Подробнее
                  </Button>
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
