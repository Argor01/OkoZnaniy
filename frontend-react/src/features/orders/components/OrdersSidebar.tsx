import React from 'react';
import { Menu, Badge } from 'antd';
import {
  ShoppingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DollarOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
  EditOutlined,
  DownloadOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { ORDER_STATUSES } from '@/utils/constants';
import styles from './OrdersSidebar.module.css';

interface OrdersSidebarProps {
  ordersCount: {
    all: number;
    new: number;
    confirming: number;
    in_progress: number;
    waiting_payment: number;
    review: number;
    completed: number;
    revision: number;
    download: number;
    closed: number;
  };
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  isMobile?: boolean;
}

const OrdersSidebar: React.FC<OrdersSidebarProps> = ({
  ordersCount,
  selectedStatus = 'all',
  onStatusChange,
  isMobile = false,
}) => {
  const menuItems: MenuProps['items'] = [
    {
      key: 'all',
      icon: <ShoppingOutlined />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Все заказы</span>
          <Badge count={ordersCount.all} className={styles.badge} />
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: ORDER_STATUSES.NEW,
      icon: <ClockCircleOutlined className={styles.iconBlue} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Открыт</span>
          <Badge count={ordersCount[ORDER_STATUSES.NEW]} className={`${styles.badge} ${styles.badgeBlue}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.CONFIRMING,
      icon: <SyncOutlined className={styles.iconAmber} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На подтверждении</span>
          <Badge count={ordersCount[ORDER_STATUSES.CONFIRMING]} className={`${styles.badge} ${styles.badgeAmber}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.IN_PROGRESS,
      icon: <SyncOutlined className={styles.iconViolet} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На выполнении</span>
          <Badge count={ordersCount[ORDER_STATUSES.IN_PROGRESS]} className={`${styles.badge} ${styles.badgeViolet}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.WAITING_PAYMENT,
      icon: <DollarOutlined className={styles.iconGreen} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Ожидает оплаты</span>
          <Badge count={ordersCount[ORDER_STATUSES.WAITING_PAYMENT]} className={`${styles.badge} ${styles.badgeGreen}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.REVIEW,
      icon: <FileSearchOutlined className={styles.iconCyan} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На проверке</span>
          <Badge count={ordersCount[ORDER_STATUSES.REVIEW]} className={`${styles.badge} ${styles.badgeCyan}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.COMPLETED,
      icon: <CheckCircleOutlined className={styles.iconGreen} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Выполнен</span>
          <Badge count={ordersCount[ORDER_STATUSES.COMPLETED]} className={`${styles.badge} ${styles.badgeGreen}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.REVISION,
      icon: <EditOutlined className={styles.iconRed} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На доработке</span>
          <Badge count={ordersCount[ORDER_STATUSES.REVISION]} className={`${styles.badge} ${styles.badgeRed}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.DOWNLOAD,
      icon: <DownloadOutlined className={styles.iconLime} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Ожидает скачивания</span>
          <Badge count={ordersCount[ORDER_STATUSES.DOWNLOAD]} className={`${styles.badge} ${styles.badgeLime}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.CLOSED,
      icon: <FileDoneOutlined className={styles.iconGray} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Закрыт</span>
          <Badge count={ordersCount[ORDER_STATUSES.CLOSED]} className={`${styles.badge} ${styles.badgeGray}`} />
        </div>
      ),
    },
    {
      key: ORDER_STATUSES.CANCELLED,
      icon: <CloseCircleOutlined className={styles.iconRed} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Отменен</span>
          {/* Badge is not usually shown for cancelled or is 0 */}
        </div>
      ),
    },
  ];


  return (
    <div className={styles.ordersSidebar}>
      <div className={styles.sidebarHeader}>
        <ShoppingOutlined className={styles.headerIcon} />
        <h3 className={styles.headerTitle}>Мои заказы</h3>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedStatus]}
        items={menuItems}
        onClick={({ key }) => onStatusChange?.(key)}
        className={styles.menu}
      />
    </div>
  );
};

export default OrdersSidebar;
