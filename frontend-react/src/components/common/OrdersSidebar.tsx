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
import styles from './OrdersSidebar.module.css';

interface OrdersSidebarProps {
  ordersCount: {
    all: number;
    new: number;
    confirming: number;
    in_progress: number;
    payment: number;
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
      key: 'new',
      icon: <ClockCircleOutlined className={styles.iconBlue} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Открыт</span>
          <Badge count={ordersCount.new} className={`${styles.badge} ${styles.badgeBlue}`} />
        </div>
      ),
    },
    {
      key: 'confirming',
      icon: <SyncOutlined className={styles.iconAmber} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На подтверждении</span>
          <Badge count={ordersCount.confirming} className={`${styles.badge} ${styles.badgeAmber}`} />
        </div>
      ),
    },
    {
      key: 'in_progress',
      icon: <SyncOutlined className={styles.iconViolet} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На выполнении</span>
          <Badge count={ordersCount.in_progress} className={`${styles.badge} ${styles.badgeViolet}`} />
        </div>
      ),
    },
    {
      key: 'payment',
      icon: <DollarOutlined className={styles.iconGreen} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Ожидает оплаты</span>
          <Badge count={ordersCount.payment} className={`${styles.badge} ${styles.badgeGreen}`} />
        </div>
      ),
    },
    {
      key: 'review',
      icon: <FileSearchOutlined className={styles.iconCyan} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На проверке</span>
          <Badge count={ordersCount.review} className={`${styles.badge} ${styles.badgeCyan}`} />
        </div>
      ),
    },
    {
      key: 'completed',
      icon: <CheckCircleOutlined className={styles.iconGreen} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Выполнен</span>
          <Badge count={ordersCount.completed} className={`${styles.badge} ${styles.badgeGreen}`} />
        </div>
      ),
    },
    {
      key: 'revision',
      icon: <EditOutlined className={styles.iconRed} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На доработке</span>
          <Badge count={ordersCount.revision} className={`${styles.badge} ${styles.badgeRed}`} />
        </div>
      ),
    },
    {
      key: 'download',
      icon: <DownloadOutlined className={styles.iconIndigo} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Ожидает скачивания</span>
          <Badge count={ordersCount.download} className={`${styles.badge} ${styles.badgeIndigo}`} />
        </div>
      ),
    },
    {
      key: 'closed',
      icon: <CloseCircleOutlined className={styles.iconGray} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Закрыт</span>
          <Badge count={ordersCount.closed} className={`${styles.badge} ${styles.badgeGray}`} />
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
