import React, { memo, useMemo, useCallback } from 'react';
import { Badge, Button, Dropdown, Layout, Menu, Space, Typography, message } from 'antd';
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
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './DashboardHeader.module.css';
import { formatCurrency } from '@/utils/formatters';

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

const DashboardHeader: React.FC<DashboardHeaderProps> = memo(({
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

  const navItems = useMemo<MenuProps['items']>(() => {
    const items: MenuProps['items'] = [
      {
        key: '/orders-feed',
        label: 'Лента заказов',
        icon: <UnorderedListOutlined />,
      },
    ];

    if (isExpert) {
      items.push({
        key: '/works',
        label: 'Мои заказы',
        icon: <FileDoneOutlined />,
      });
      items.push({
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
      items.push({
        key: '/create-order',
        label: 'Создать заказ',
        icon: <PlusOutlined />,
      });
      items.push({
        key: '/shop/ready-works',
        label: 'Магазин работ',
        icon: <ShopOutlined />,
      });
      items.push({
        key: '/shop/purchased',
        label: 'Купленные работы',
        icon: <FileDoneOutlined />,
      });
    }
    return items;
  }, [isExpert, isClient]);

  const profileMenuItems = useMemo<MenuProps['items']>(() => [
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
  ], [onProfileClick, onLogout]);

  const handleNavClick: MenuProps['onClick'] = useCallback(({ key }) => {
    if (key !== 'shop-menu') {
      navigate(key);
    }
  }, [navigate]);

  const supportMenuItems = useMemo<MenuProps['items']>(() => [
    {
      key: 'support-info',
      label: (
        <div className={styles.supportDropdown}>
          <div className={styles.supportSection}>
            <Text strong className={styles.supportTitle}>
              Служба поддержки
            </Text>
            
            <div 
              className={styles.supportRow}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText('88005007857');
                message.success('Телефон скопирован!');
              }}
            >
              <PhoneOutlined className={styles.supportPhoneIcon} />
              <Text className={styles.supportRowText}>
                8 (800) 500-78-57
              </Text>
              <CopyOutlined className={styles.supportCopyIcon} />
            </div>
            
            <div 
              className={styles.supportRow}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText('b-oko.znaniy@mail.ru');
                message.success('Email скопирован!');
              }}
            >
              <MailOutlined className={styles.supportMailIcon} />
              <Text className={styles.supportRowText}>
                b-oko.znaniy@mail.ru
              </Text>
              <CopyOutlined className={styles.supportCopyIcon} />
            </div>
          </div>
          
          <div className={styles.supportSchedule}>
            <ClockCircleOutlined className={styles.supportScheduleIcon} />
            <div>
              <Text strong className={styles.supportScheduleTitle}>
                График работы
              </Text>
              <Text className={styles.supportScheduleText}>
                Пн-Пт 07:00 - 16:00 (МСК)
              </Text>
            </div>
          </div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'write-to-support',
      label: 'Написать нам',
      icon: <MessageOutlined />,
      onClick: onSupportClick,
    },
  ], [onSupportClick]);

  return (
    <Header className={styles.dashboardHeader}>
      <div className={styles.headerLeft}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMenuClick}
          className={styles.menuButton}
        />
        {!isMobile && (
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={navItems}
            className={styles.navMenu}
            onClick={handleNavClick}
          />
        )}
      </div>

      <div className={styles.headerLogo}>
        <img src="/assets/logo.png" alt="Око Знаний" className={styles.logoImage} />
        <span className={styles.logoText}>Око Знаний</span>
      </div>

      <div className={styles.headerRight}>
        <Space size={isMobile ? 8 : 16}>
          <Button
            type="text"
            icon={<WalletOutlined className={styles.balanceIcon} />}
            onClick={onBalanceClick}
            className={`${styles.balanceButton} balanceButton`}
          >
            {!isMobile && (
              <Text className={`${styles.balanceText} balanceText`}>
                {formatCurrency(balance)}
              </Text>
            )}
          </Button>

          <Badge count={unreadMessages} offset={[-5, 5]}>
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={onMessagesClick}
              className={styles.iconButton}
            />
          </Badge>

          
          <Badge count={unreadNotifications} offset={[-5, 5]}>
            <Button
              type="text"
              icon={<BellOutlined />}
              onClick={onNotificationsClick}
              className={styles.iconButton}
            />
          </Badge>

          
          <Dropdown
            menu={{
              items: supportMenuItems,
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<CustomerServiceOutlined />}
              className={styles.iconButton}
            />
          </Dropdown>

          
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
});

export default DashboardHeader;
