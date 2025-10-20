import React, { useEffect } from 'react';
import { Typography, Descriptions, Button, Space, Spin } from 'antd';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OrderStatus } from '@/components/orders/OrderStatus';
import { DiscountedPrice } from '@/components/shared/Price/DiscountedPrice';
import { fetchOrderById, Order } from '@/store/slices/ordersSlice';
import { formatDate } from '@/utils/formatters';

const { Title } = Typography;

interface OrderFile {
  id: number;
  name: string;
  url: string;
}

const OrderPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const dispatch = useDispatch<AppDispatch>();
  const { currentOrder: order, loading } = useSelector(
    (state: RootState) => state.orders
  );
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(Number(id)));
    }
  }, [dispatch, id]);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const canEdit = user?.role === 'client' && order.status === 'new';

  return (
    <ProtectedRoute>
      <div className="order-page">
        <div className="header">
          <div className="title-section">
            <Title level={2}>Заказ #{order.id}</Title>
            <OrderStatus status={order.status} />
          </div>
          {canEdit && (
            <Button
              type="primary"
              onClick={() => router.push(`/orders/${order.id}/edit`)}
            >
              Редактировать
            </Button>
          )}
        </div>

        <Descriptions bordered column={1} className="order-details">
          <Descriptions.Item label="Название">
            {order.title}
          </Descriptions.Item>
          <Descriptions.Item label="Описание">
            {order.description}
          </Descriptions.Item>
          <Descriptions.Item label="Срок сдачи">
            {formatDate(order.deadline)}
          </Descriptions.Item>
          <Descriptions.Item label="Стоимость">
            <DiscountedPrice
              originalPrice={order.original_price || order.budget}
              discountAmount={order.discount_amount}
              finalPrice={order.final_price}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Дата создания">
            {formatDate(order.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Последнее обновление">
            {formatDate(order.updated_at)}
          </Descriptions.Item>
        </Descriptions>

        {order.files.length > 0 && (
          <div className="files-section">
            <Title level={4}>Прикрепленные файлы</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {order.files.map((file: OrderFile) => (
                <Button
                  key={file.id}
                  type="link"
                  href={file.url}
                  target="_blank"
                >
                  {file.name}
                </Button>
              ))}
            </Space>
          </div>
        )}

        <style jsx>{`
          .order-page {
            max-width: 1000px;
            margin: 0 auto;
            padding: 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
          }
          .title-section {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
          }
          .order-details {
            background: white;
            border-radius: 8px;
            overflow: hidden;
          }
          .files-section {
            margin-top: 24px;
          }
          :global(.ant-descriptions-bordered) {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
};

export default OrderPage; 