import React, { memo, useMemo, useCallback } from 'react';
import { Badge, Button, Dropdown, Layout, Space, Typography, message } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuOutlined,
  ShopOutlined,
  FileDoneOutlined,
  PlusOutlined,
  CustomerServiceOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DownOutlined,
  AppstoreOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './DashboardHeader.module.css';
import { ROUTES } from '@/utils/constants';

const { Header } = Layout;
const { Text } = Typography;

type HeaderNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  children?: Array<{
    key: string;
    label: string;
  }>;
};

interface DashboardHeaderProps {
  userProfile?: {
    id: string | number;
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
  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';

  const navItems = useMemo(() => {
    const items: HeaderNavItem[] = [
      {
        key: '/orders-feed',
        label: 'Лента заказов',
        icon: <AppstoreOutlined />,
      },
    ];

    if (isExpert) {
      items.push({
        key: '/works',
        label: 'Заказы в работе',
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
        key: 'shop-menu',
        label: 'Магазин',
        icon: <ShopOutlined />,
        children: [
          {
            key: '/shop/ready-works',
            label: 'Каталог',
          },
          {
            key: '/shop/purchased',
            label: 'Мои покупки',
          },
        ],
      });
    }
    return items;
  }, [isExpert, isClient]);

  const renderNavItems = () => {
    return (
      <div className={styles.customNav}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.key;
          
          if (item.children) {
            const isChildActive = item.children.some(child => location.pathname === child.key);
            const menuItems: MenuProps['items'] = item.children.map(child => ({
              key: child.key,
              label: child.label,
              onClick: () => navigate(child.key),
            }));

            return (
              <Dropdown 
                key={item.key} 
                menu={{ items: menuItems }}
                trigger={['hover']}
              >
                <Button 
                  type="text" 
                  className={`${styles.navItem} ${isChildActive ? styles.navItemActive : ''}`}
                  icon={item.icon}
                >
                  {item.label} <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                </Button>
              </Dropdown>
            );
          }

          return (
            <Button
              key={item.key}
              type="text"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              icon={item.icon}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </Button>
          );
        })}
      </div>
    );
  };

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

  const handleProfileMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') {
      onProfileClick?.();
    } else if (key === 'logout') {
      onLogout?.();
    }
  };

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
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuClick}
            className={styles.menuButton}
          />
        )}
        {!isMobile && renderNavItems()}
      </div>

      <div className={styles.headerLogo}>
        <div className={styles.logoImageWrapper}>
          <img src="/assets/logo.png" alt="Око Знаний" className={styles.logoImage} />
        </div>
        <span className={styles.logoText}>Око Знаний</span>
      </div>

      <div className={styles.headerRight}>
        <Space size={isMobile ? 8 : 16}>
          {!isMobile && (
            <>
              {/* Кнопка личного кабинета */}
              <Button
                type="text"
                icon={<ProfileOutlined />}
                onClick={() => navigate(ROUTES.user.profile.replace(':userId', String(userProfile?.id || '')))}
                className={`${styles.iconButton} ${styles.profileLinkButton}`}
                title="Личный кабинет"
              />
              
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
                  <Text className={styles.username}>
                    {userProfile?.username || 'Пользователь'}
                  </Text>
                </div>
              </Dropdown>
            </>
          )}
          
          {isMobile && (
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={onLogout}
              className={`${styles.iconButton} ${styles.logoutButton}`}
              danger
            />
          )}
        </Space>
      </div>
    </Header>
  );
});

export default DashboardHeader;
