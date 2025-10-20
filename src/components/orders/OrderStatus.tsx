import React from 'react';
import { Tag } from 'antd';

export type OrderStatusType = 'new' | 'in_progress' | 'review' | 'completed' | 'cancelled';

interface OrderStatusProps {
  status: OrderStatusType;
}

const statusConfig: Record<OrderStatusType, { color: string; text: string }> = {
  new: { color: 'blue', text: 'Новый' },
  in_progress: { color: 'processing', text: 'В работе' },
  review: { color: 'warning', text: 'На проверке' },
  completed: { color: 'success', text: 'Завершен' },
  cancelled: { color: 'error', text: 'Отменен' },
};

export const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <Tag color={config.color} style={{ minWidth: 85, textAlign: 'center' }}>
      {config.text}
    </Tag>
  );
}; 