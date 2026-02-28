import React from 'react';
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
  FilterOutlined,
} from '@ant-design/icons';
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
  const menuItems = [
    {
      key: 'all',
      icon: <ShoppingOutlined />,
      label: 'Все заказы',
      count: ordersCount.all,
      iconClass: '',
    },
    {
      type: 'divider',
    },
    {
      key: ORDER_STATUSES.NEW,
      icon: <ClockCircleOutlined />,
      label: 'Открыт',
      count: ordersCount[ORDER_STATUSES.NEW],
      iconClass: styles.iconBlue,
    },
    {
      key: ORDER_STATUSES.CONFIRMING,
      icon: <SyncOutlined />,
      label: 'На подтверждении',
      count: ordersCount[ORDER_STATUSES.CONFIRMING],
      iconClass: styles.iconAmber,
    },
    {
      key: ORDER_STATUSES.IN_PROGRESS,
      icon: <SyncOutlined />,
      label: 'На выполнении',
      count: ordersCount[ORDER_STATUSES.IN_PROGRESS],
      iconClass: styles.iconViolet,
    },
    {
      key: ORDER_STATUSES.WAITING_PAYMENT,
      icon: <DollarOutlined />,
      label: 'Ожидает оплаты',
      count: ordersCount[ORDER_STATUSES.WAITING_PAYMENT],
      iconClass: styles.iconGreen,
    },
    {
      key: ORDER_STATUSES.REVIEW,
      icon: <FileSearchOutlined />,
      label: 'На проверке',
      count: ordersCount[ORDER_STATUSES.REVIEW],
      iconClass: styles.iconCyan,
    },
    {
      key: ORDER_STATUSES.COMPLETED,
      icon: <CheckCircleOutlined />,
      label: 'Завершен',
      count: ordersCount[ORDER_STATUSES.COMPLETED],
      iconClass: styles.iconGreen,
    },
    {
      key: ORDER_STATUSES.REVISION,
      icon: <EditOutlined />,
      label: 'В доработке',
      count: ordersCount[ORDER_STATUSES.REVISION],
      iconClass: styles.iconRed,
    },
    {
      key: ORDER_STATUSES.DOWNLOAD,
      icon: <DownloadOutlined />,
      label: 'Можно скачать',
      count: ordersCount[ORDER_STATUSES.DOWNLOAD],
      iconClass: styles.iconIndigo,
    },
    {
      key: ORDER_STATUSES.CLOSED,
      icon: <CloseCircleOutlined />,
      label: 'Отменен',
      count: ordersCount[ORDER_STATUSES.CLOSED],
      iconClass: styles.iconGray,
    },
  ];

  if (isMobile) return null; // Or handle mobile differently

  return (
    <div className={styles.ordersSidebar}>
      <div className={styles.sidebarHeader}>
        <FilterOutlined className={styles.headerIcon} />
        <h2 className={styles.headerTitle}>Фильтры</h2>
      </div>
      
      <ul className={styles.menu}>
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <li key={`divider-${index}`} className={styles.divider} />;
          }

          const isActive = selectedStatus === item.key;
          
          return (
            <li 
              key={item.key} 
              className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
              onClick={() => onStatusChange?.(item.key as string)}
            >
              <span className={`${styles.icon} ${item.iconClass}`}>{item.icon}</span>
              <div className={styles.menuItemContent}>
                <span>{item.label}</span>
                {item.count > 0 && (
                  <span className={`${styles.badge} ${isActive ? styles.badgeActive : ''}`}>
                    {item.count}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default OrdersSidebar;
