import React from 'react';
import { Typography, Button, Empty, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { OrderCard } from '@/components/orders/OrderCard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const { Title } = Typography;

const OrdersPage: React.FC = () => {
  const router = useRouter();
  const { orders, loading } = useSelector((state: RootState) => state.orders);
  const { user } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="orders-page">
        <div className="header">
          <Title level={2}>Мои заказы</Title>
          {user?.role === 'client' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/orders/new')}
            >
              Создать заказ
            </Button>
          )}
        </div>

        {orders.length === 0 ? (
          <Empty
            description={
              <span>
                {user?.role === 'client'
                  ? 'У вас пока нет заказов. Создайте новый заказ!'
                  : 'Нет доступных заказов'}
              </span>
            }
          />
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        <style jsx>{`
          .orders-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
          }
          .orders-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
};

export default OrdersPage; 