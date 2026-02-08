import React from 'react';
import { Badge, Button, Dropdown, Layout, Menu, Space, Tooltip, Typography } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  WalletOutlined,
  LogoutOutlined,
  MenuOutlined,
  UnorderedListOutlined,
  ShopOutlined,
  FileDoneOutlined,
  PlusOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './DashboardHeader.module.css';
import { formatCurrency } from '../../utils/formatters';

const { Header } = Layout;
const { Text } = Typography;

interface DashboardHeaderProps {
  userProfile?: {
    username: string;
    avatar?: string;
    role: string;
    balance?: number;
  };
  unreadMessages?: number;
  unreadNotifications?: number;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  onSupportClick?: () => void;
  onBalanceClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userProfile,
  unreadMessages = 0,
  unreadNotifications = 0,
  onMessagesClick,
  onNotificationsClick,
  onSupportClick,
  onBalanceClick,
  onProfileClick,
  onLogout,
  onMenuClick,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const rawBalance = userProfile?.balance;
  const balance = rawBalance ? Number(rawBalance) : 0;
  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';

  const navItems: MenuProps['items'] = [
    {
      key: '/orders-feed',
      label: 'Лента заказов',
      icon: <UnorderedListOutlined />,
    },
  ];

  if (isExpert) {
    navItems.push({
      key: '/works',
      label: 'Мои работы',
      icon: <FileDoneOutlined />,
    });
    navItems.push({
      key: 'shop-menu',
      label: 'Магазин',
      icon: <ShopOutlined />,
      children: [
        {
          key: '/shop/ready-works',
          label: 'Магазин готовых работ',
        },
        {
          key: '/shop/add-work',
          label: 'Добавить работу',
        },
        {
          key: '/shop/purchased',
          label: 'Купленные работы',
        },
      ],
    });
  } else if (isClient) {
    navItems.push({
      key: '/create-order',
      label: 'Создать заказ',
      icon: <PlusOutlined />,
    });
    navItems.push({
      key: '/shop/ready-works',
      label: 'Магазин работ',
      icon: <ShopOutlined />,
    });
    navItems.push({
      key: '/shop/purchased',
      label: 'Купленные работы',
      icon: <FileDoneOutlined />,
    });
  }

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Редактировать профиль',
      icon: <UserOutlined />,
      onClick: onProfileClick,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Выйти',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <Header className={styles.dashboardHeader}>
      <div className={styles.headerLeft}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuClick}
            className={styles.menuButton}
          />
        )}
        {!isMobile && (
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={navItems}
            className={styles.navMenu}
            onClick={({ key }) => {
              if (key !== 'shop-menu') {
                navigate(key);
              }
            }}
          />
        )}
      </div>

      <div className={styles.headerRight}>
        <Space size={isMobile ? 8 : 16}>
          {/* Баланс */}
          <Button
            type="text"
            icon={<WalletOutlined style={{ color: 'white' }} />}
            onClick={onBalanceClick}
            className={`${styles.balanceButton} balanceButton`}
            style={{ color: 'white' }}
          >
            {!isMobile && (
              <Text className={`${styles.balanceText} balanceText`} style={{ color: 'white' }}>
                {formatCurrency(balance)}
              </Text>
            )}
          </Button>

          {/* Сообщения */}
          <Badge count={unreadMessages} offset={[-5, 5]}>
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={onMessagesClick}
              className={styles.iconButton}
            />
          </Badge>

          {/* Уведомления */}
          <Badge count={unreadNotifications} offset={[-5, 5]}>
            <Button
              type="text"
              icon={<BellOutlined />}
              onClick={onNotificationsClick}
              className={styles.iconButton}
            />
          </Badge>

          <Tooltip title="Поддержка" placement="bottom">
            <Button
              type="text"
              icon={<CustomerServiceOutlined />}
              onClick={onSupportClick}
              className={styles.iconButton}
            />
          </Tooltip>

          {/* Профиль */}
          <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight">
            <div className={styles.profileSection}>
              {!isMobile && (
                <Text className={styles.username}>
                  {userProfile?.username || 'Пользователь'}
                </Text>
              )}
            </div>
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
};

export default DashboardHeader;
