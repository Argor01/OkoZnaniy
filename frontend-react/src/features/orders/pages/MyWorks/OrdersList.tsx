import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Empty, Pagination, Skeleton, Tag } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import type { Order } from '@/features/orders/api/orders';
import styles from './MyWorks.module.css';

type Props = {
  orders: Order[];
  loading: boolean;
  isClient: boolean;
  onOpen: (id: number) => void;
  getStatusLabel: (status: string) => string;
  formatOrderDate: (value: unknown) => string;
  formatRemaining: (value: unknown, status?: unknown) => string;
  formatBudget: (value: unknown) => string;
  isOverdue: (order: Order) => boolean;
};

const PAGE_SIZE = 10;

const OrdersList: React.FC<Props> = ({
  orders, loading, isClient, onOpen, getStatusLabel,
  formatOrderDate, formatRemaining, formatBudget, isOverdue,
}) => {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [orders]);
  const visibleOrders = useMemo(
    () => orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [orders, page],
  );

  if (loading) {
    return <div className={styles.ordersList}>{[0, 1, 2].map((key) => <div key={key} className={styles.orderListSkeleton}><Skeleton active avatar paragraph={{ rows: 2 }} /></div>)}</div>;
  }
  if (orders.length === 0) {
    return <div className={styles.ordersListEmpty}><Empty description="Заказы по выбранным фильтрам не найдены" /></div>;
  }

  return (
    <div className={styles.ordersListWrap}>
      <div className={styles.ordersList}>
        {visibleOrders.map((order) => {
          const overdue = isOverdue(order);
          const counterparty = isClient ? order.expert : order.client;
          const counterpartyName = counterparty?.username || (isClient ? 'Эксперт не назначен' : order.client_name || 'Клиент');
          const category = [order.work_type?.name, order.subject?.name].filter(Boolean).join(' • ');
          return (
            <button
              type="button"
              key={order.id}
              className={styles.orderListItem}
              onClick={() => onOpen(order.id)}
              aria-label={`Открыть заказ №${order.id}: ${order.title || 'Без названия'}`}
            >
              <div className={styles.orderListTop}>
                <div className={styles.orderListHeading}>
                  <span className={styles.orderListId}>№ {order.id}</span>
                  <h3 className={styles.orderListTitle}>{order.title || 'Без названия'}</h3>
                  {category && <span className={styles.orderListCategory}>{category}</span>}
                </div>
                <Tag className={styles.orderListStatus} color={overdue ? 'red' : undefined}>
                  {overdue ? 'Просрочен' : getStatusLabel(String(order.status || ''))}
                </Tag>
              </div>

              <div className={styles.orderListBody}>
                <div className={styles.orderListPerson}>
                  <Avatar size={36} src={counterparty?.avatar} icon={<UserOutlined />} />
                  <span><small>{isClient ? 'Эксперт' : 'Клиент'}</small><strong>{counterpartyName}</strong></span>
                </div>
                <div className={styles.orderListFact}><CalendarOutlined /><span><small>Создан</small><strong>{formatOrderDate(order.created_at)}</strong></span></div>
                <div className={`${styles.orderListFact} ${overdue ? styles.orderListFactDanger : ''}`}><ClockCircleOutlined /><span><small>Осталось</small><strong>{overdue ? 'Просрочено' : formatRemaining(order.deadline, order.status)}</strong></span></div>
                <div className={styles.orderListPrice}>{formatBudget(order.budget)}</div>
                <RightOutlined className={styles.orderListArrow} />
              </div>
            </button>
          );
        })}
      </div>
      {orders.length > PAGE_SIZE && (
        <Pagination current={page} pageSize={PAGE_SIZE} total={orders.length} showSizeChanger={false} onChange={setPage} className={styles.ordersPagination} />
      )}
    </div>
  );
};

export default OrdersList;
