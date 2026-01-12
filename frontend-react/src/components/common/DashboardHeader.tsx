import React from 'react';
import { Layout, Avatar, Badge, Button, Space, Typography, Dropdown, Menu } from 'antd';
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
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './DashboardHeader.module.css';

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
      label: 'Мой профиль',
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
            icon={<WalletOutlined />}
            onClick={onBalanceClick}
            className={styles.balanceButton}
          >
            {!isMobile && (
              <Text className={styles.balanceText}>
                {balance.toFixed(2)} ₽
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

          {/* Профиль */}
          <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight">
            <div className={styles.profileSection}>
              <Avatar
                size={isMobile ? 28 : 32}
                src={userProfile?.avatar ? `http://localhost:8000${userProfile.avatar}` : undefined}
                icon={!userProfile?.avatar && <UserOutlined />}
                className={styles.avatar}
              />
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
