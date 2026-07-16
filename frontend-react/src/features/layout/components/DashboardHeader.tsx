import React, { memo, useMemo } from 'react';
import { Badge, Button, Dropdown, Layout, Space, Typography, message } from 'antd';
import {
  UserOutlined,
  EditOutlined,
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
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui';
import styles from './DashboardHeader.module.css';
import { getDisplayUsername } from '@/utils/formatters';
import WalletBadge from '@/features/wallet/components/WalletBadge';

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
    display_username?: string;
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
  const { isDark, toggleTheme } = useTheme();
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
        {isMobile && (
          <div className={styles.mobileNavIcons}>
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
                    trigger={['click']}
                    placement="bottomLeft"
                  >
                    <Button 
                      type="text" 
                      className={`${styles.mobileNavIcon} ${isChildActive ? styles.mobileNavIconActive : ''}`}
                      icon={item.icon}
                    />
                  </Dropdown>
                );
              }

              return (
                <Button
                  key={item.key}
                  type="text"
                  className={`${styles.mobileNavIcon} ${isActive ? styles.mobileNavIconActive : ''}`}
                  icon={item.icon}
                  onClick={() => navigate(item.key)}
                />
              );
            })}
          </div>
        )}
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

              
              <Button
                type="text"
                className={styles.themeToggle}
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                title={isDark ? 'Светлая тема' : 'Тёмная тема'}
              />

              <WalletBadge />

              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'edit-profile',
                      label: 'Редактировать профиль',
                      icon: <EditOutlined />,
                      onClick: onProfileClick,
                    },
                    { type: 'divider' },
                    {
                      key: 'logout',
                      label: 'Выход',
                      icon: <LogoutOutlined />,
                      danger: true,
                      onClick: onLogout,
                    },
                  ],
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Button
                  type="text"
                  className={styles.profileSection}
                >
                  <Text className={styles.username}>
                    {getDisplayUsername(userProfile || {})}
                  </Text>
                  <DownOutlined style={{ fontSize: 10, color: 'white', marginLeft: 4 }} />
                </Button>
              </Dropdown>
            </>
          )}
          
          {isMobile && (
            <>
              <WalletBadge compact />
              <ThemeToggle
                size="middle"
                className={`${styles.iconButton} ${styles.themeToggle} ${styles.mobileThemeToggle}`}
              />
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={onLogout}
                className={`${styles.iconButton} ${styles.logoutButton}`}
                danger
              />
            </>
          )}
        </Space>
      </div>
    </Header>
  );
});

export default DashboardHeader;
