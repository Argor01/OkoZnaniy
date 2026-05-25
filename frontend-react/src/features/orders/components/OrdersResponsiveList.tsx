import React from 'react';
import { Avatar, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined } from '@ant-design/icons';
import type { Order } from '@/features/orders/api/orders';
import styles from '@/features/orders/pages/MyWorks/MyWorks.module.css';

const statusClassMap: Record<string, string> = {
  new: styles.statusNew,
  confirming: styles.statusConfirming,
  in_progress: styles.statusInProgress,
  review: styles.statusReview,
  under_review: styles.statusReview,
  revision: styles.statusRevision,
  waiting_payment: styles.statusWaitingPayment,
  completed: styles.statusCompleted,
  download: styles.statusDownload,
  closed: styles.statusClosed,
  cancelled: styles.statusCancelled,
  canceled: styles.statusCancelled,
  dispute: styles.statusDispute,
};

interface OrderCounterparty {
  label: string;
  name: string;
  avatar?: string | null;
}

interface OrdersResponsiveListProps {
  orders: Order[];
  loading: boolean;
  columns: ColumnsType<Order>;
  isCompact: boolean;
  isMobile: boolean;
  onOpenOrder: (order: Order) => void;
  getCounterparty: (order: Order) => OrderCounterparty;
  getStatusLabel: (status: string) => string;
  isOverdueOrder: (order: Order) => boolean;
  formatOrderDate: (value: unknown) => string;
  formatRemaining: (value: unknown, status?: unknown) => string;
  formatBudget: (value: unknown) => string;
}

export const OrdersResponsiveList: React.FC<OrdersResponsiveListProps> = ({
  orders,
  loading,
  columns,
  isCompact,
  isMobile,
  onOpenOrder,
  getCounterparty,
  getStatusLabel,
  isOverdueOrder,
  formatOrderDate,
  formatRemaining,
  formatBudget,
}) => {
  if (!isCompact) {
    return (
      <Table
        className={styles.table}
        columns={columns}
        dataSource={orders}
        rowKey={(record) => record.id}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          onClick: () => onOpenOrder(record),
          style: { cursor: 'pointer' },
        })}
      />
    );
  }

  if (loading) {
    return (
      <div className={styles.ordersResponsiveLoading}>
        <Spin size="large" />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className={styles.ordersEmptyWrap}>
        <Empty description="Заказы не найдены" />
      </div>
    );
  }

  return (
    <div className={styles.ordersCardsGrid}>
      {orders.map((order) => {
        const overdue = isOverdueOrder(order);
        const counterparty = getCounterparty(order);
        const titleMeta = [order?.work_type?.name, order?.subject?.name].filter(Boolean).join(' • ');
        const remaining = overdue ? 'Просрочено' : formatRemaining(order?.deadline, order?.status);
        const statusClassName = overdue
          ? styles.statusOverdue
          : statusClassMap[String(order?.status ?? '')] || styles.statusTag;

        return (
          <button
            key={order.id}
            type="button"
            className={`${styles.orderCardButton} ${isMobile ? styles.orderCardButtonMobile : ''}`}
            onClick={() => onOpenOrder(order)}
          >
            <div className={styles.orderCardTopRow}>
              <div className={styles.orderCardStatusRow}>
                <Tag className={`${styles.statusTag} ${statusClassName}`}>
                  {overdue ? 'Просрочен' : getStatusLabel(String(order?.status ?? ''))}
                </Tag>
                <span className={styles.orderCardId}>#{order.id}</span>
              </div>
              <span className={styles.orderCardDate}>{formatOrderDate(order?.created_at)}</span>
            </div>

            <div className={styles.orderCardTitle}>{String(order?.title ?? 'Без названия')}</div>
            {titleMeta ? <div className={styles.orderCardMeta}>{titleMeta}</div> : null}

            <div className={styles.orderCardCounterparty}>
              <Avatar size={32} src={counterparty.avatar || undefined} icon={<UserOutlined />} />
              <div className={styles.orderCardCounterpartyText}>
                <span className={styles.orderCardCounterpartyLabel}>{counterparty.label}</span>
                <span className={styles.orderCardCounterpartyName}>{counterparty.name}</span>
              </div>
            </div>

            <div className={styles.orderCardStats}>
              <div className={styles.orderCardStat}>
                <span className={styles.orderCardStatLabel}>Бюджет</span>
                <span className={styles.orderCardStatValue}>{formatBudget(order?.budget)}</span>
              </div>
              <div className={styles.orderCardStat}>
                <span className={styles.orderCardStatLabel}>Осталось</span>
                <span className={`${styles.orderCardStatValue} ${overdue ? styles.orderCardStatValueDanger : ''}`}>
                  {remaining}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
