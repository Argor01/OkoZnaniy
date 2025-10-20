import React from 'react';
import { Card, Space, Button } from 'antd';
import { useRouter } from 'next/router';
import { OrderStatus } from './OrderStatus';
import { DiscountedPrice } from '../shared/Price/DiscountedPrice';
import { formatDate } from '@/utils/formatters';
import { Order } from '@/store/slices/ordersSlice';
import { FileOutlined, EditOutlined } from '@ant-design/icons';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }: OrderCardProps) => {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/orders/${order.id}`);
  };

  return (
    <Card
      className="order-card"
      title={
        <div className="order-card-header">
          <span className="order-number">Заказ #{order.id}</span>
          <OrderStatus status={order.status} />
        </div>
      }
      actions={[
        <Button
          key="view"
          type="link"
          icon={<FileOutlined />}
          onClick={handleViewDetails}
        >
          Подробнее
        </Button>,
        order.status === 'new' && (
          <Button
            key="edit"
            type="link"
            icon={<EditOutlined />}
            onClick={() => router.push(`/orders/${order.id}/edit`)}
          >
            Редактировать
          </Button>
        ),
      ].filter(Boolean)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <h4>{order.title}</h4>
          <p className="description">{order.description}</p>
        </div>

        <div className="order-info">
          <div className="info-item">
            <span className="label">Срок сдачи:</span>
            <span className="value">{formatDate(order.deadline)}</span>
          </div>
          <div className="info-item">
            <span className="label">Стоимость:</span>
            <span className="value">
              <DiscountedPrice
                originalPrice={order.original_price || order.budget}
                discountAmount={order.discount_amount}
                finalPrice={order.final_price}
              />
            </span>
          </div>
        </div>

        {order.files.length > 0 && (
          <div className="files-info">
            <span className="label">Файлы:</span>
            <span className="value">{order.files.length} шт.</span>
          </div>
        )}
      </Space>

      <style jsx>{`
        .order-card {
          width: 100%;
          margin-bottom: 16px;
        }
        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .order-number {
          font-weight: 500;
        }
        .description {
          color: #666;
          margin: 8px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .order-info {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        .info-item {
          flex: 1;
          min-width: 200px;
        }
        .label {
          color: #666;
          margin-right: 8px;
        }
        .files-info {
          color: #666;
        }
        :global(.ant-card-actions) {
          background: #fafafa;
        }
      `}</style>
    </Card>
  );
}; 