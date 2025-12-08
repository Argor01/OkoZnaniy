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
      icon: <ClockCircleOutlined style={{ color: '#3b82f6' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Открыт</span>
          <Badge count={ordersCount.new} className={styles.badge} style={{ backgroundColor: '#3b82f6' }} />
        </div>
      ),
    },
    {
      key: 'confirming',
      icon: <SyncOutlined style={{ color: '#f59e0b' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На подтверждении</span>
          <Badge count={ordersCount.confirming} className={styles.badge} style={{ backgroundColor: '#f59e0b' }} />
        </div>
      ),
    },
    {
      key: 'in_progress',
      icon: <SyncOutlined style={{ color: '#8b5cf6' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На выполнении</span>
          <Badge count={ordersCount.in_progress} className={styles.badge} style={{ backgroundColor: '#8b5cf6' }} />
        </div>
      ),
    },
    {
      key: 'payment',
      icon: <DollarOutlined style={{ color: '#10b981' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Ожидает оплаты</span>
          <Badge count={ordersCount.payment} className={styles.badge} style={{ backgroundColor: '#10b981' }} />
        </div>
      ),
    },
    {
      key: 'review',
      icon: <FileSearchOutlined style={{ color: '#06b6d4' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На проверке</span>
          <Badge count={ordersCount.review} className={styles.badge} style={{ backgroundColor: '#06b6d4' }} />
        </div>
      ),
    },
    {
      key: 'completed',
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Выполнен</span>
          <Badge count={ordersCount.completed} className={styles.badge} style={{ backgroundColor: '#10b981' }} />
        </div>
      ),
    },
    {
      key: 'revision',
      icon: <EditOutlined style={{ color: '#ef4444' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>На доработке</span>
          <Badge count={ordersCount.revision} className={styles.badge} style={{ backgroundColor: '#ef4444' }} />
        </div>
      ),
    },
    {
      key: 'download',
      icon: <DownloadOutlined style={{ color: '#6366f1' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Ожидает скачивания</span>
          <Badge count={ordersCount.download} className={styles.badge} style={{ backgroundColor: '#6366f1' }} />
        </div>
      ),
    },
    {
      key: 'closed',
      icon: <CloseCircleOutlined style={{ color: '#6b7280' }} />,
      label: (
        <div className={styles.menuItemContent}>
          <span>Закрыт</span>
          <Badge count={ordersCount.closed} className={styles.badge} style={{ backgroundColor: '#6b7280' }} />
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
