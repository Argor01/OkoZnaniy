import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Typography, Badge } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  MessageOutlined,
  BellOutlined,
  WalletOutlined,
  LogoutOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  TrophyOutlined,
  ShopOutlined,
  MenuOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

const { Sider } = Layout;
const { Text, Title } = Typography;

// Экспортируем кнопку для использования в хедере
export const MobileMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
    }}
  >
    <MenuOutlined style={{ fontSize: '20px' }} />
  </button>
);

interface SidebarProps {
  selectedKey: string;
  onMenuSelect: (key: string) => void;
  userProfile?: {
    username: string;
    avatar?: string;
    role: string;
  };
  unreadMessages?: number;
  unreadNotifications?: number;
  onLogout: () => void;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  onArbitrationClick?: () => void;
  onFinanceClick?: () => void;
  onFriendsClick?: () => void;
  onFaqClick?: () => void;
  mobileDrawerOpen?: boolean;
  onMobileDrawerChange?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedKey,
  onMenuSelect,
  userProfile,
  unreadMessages = 0,
  unreadNotifications = 0,
  onLogout,
  onMessagesClick,
  onNotificationsClick,
  onArbitrationClick,
  onFinanceClick,
  onFriendsClick,
  onFaqClick,
  mobileDrawerOpen = false,
  onMobileDrawerChange,
}) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    // Закрываем drawer на мобильных после клика
    if (isMobile && onMobileDrawerChange) {
      onMobileDrawerChange(false);
    }

    if (key === 'dashboard') {
      navigate('/expert');
      return;
    }
    if (key === 'messages') {
      onMessagesClick?.();
      return;
    }
    if (key === 'notifications') {
      onNotificationsClick?.();
      return;
    }
    if (key === 'arbitration') {
      onArbitrationClick?.();
      return;
    }
    if (key === 'balance' || key.startsWith('balance-')) {
      onFinanceClick?.();
      return;
    }
    if (key === 'friends') {
      onFriendsClick?.();
      return;
    }
    if (key === 'faq') {
      onFaqClick?.();
      return;
    }
    if (key === 'logout') {
      onLogout();
      return;
    }
    if (key === 'works') {
      navigate('/works');
      return;
    }
    if (key === 'shop-ready-works') {
      navigate('/shop/ready-works');
      return;
    }
    if (key === 'shop-add-work') {
      navigate('/shop/add-work');
      return;
    }
    if (key === 'shop-purchased') {
      navigate('/shop/purchased');
      return;
    }
    if (key === 'orders-feed') {
      navigate('/orders-feed');
      return;
    }
    if (key.startsWith('orders-') || key === 'orders') {
      navigate('/expert');
      onMenuSelect(key);
      return;
    }

    onMenuSelect(key);
  };

  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';

  const menuItems = [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: 'Аккаунт',
    },
    {
      key: 'messages',
      icon: <MessageOutlined />,
      label: (
        <Badge count={unreadMessages} offset={[10, 0]}>
          Сообщения
        </Badge>
      ),
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: (
        <Badge count={unreadNotifications} offset={[10, 0]}>
          Уведомления
        </Badge>
      ),
    },
    {
      key: 'arbitration',
      icon: <TrophyOutlined />,
      label: 'Арбитраж',
    },
    {
      key: 'balance',
      icon: <WalletOutlined />,
      label: 'Счет: 0.00 ₽',
    },
    !isMobile ? {
      key: 'orders',
      icon: <ShoppingOutlined />,
      label: 'Мои заказы',
      children: [
        { key: 'orders-all', label: 'Все (0)' },
        { key: 'orders-open', label: 'Открыт (0)' },
        { key: 'orders-confirming', label: 'На подтверждении (0)' },
        { key: 'orders-progress', label: 'На выполнении (0)' },
        { key: 'orders-payment', label: 'Ожидает оплаты (0)' },
        { key: 'orders-review', label: 'На проверке (0)' },
        { key: 'orders-completed', label: 'Выполнен (0)' },
        { key: 'orders-revision', label: 'На доработке (0)' },
        { key: 'orders-download', label: 'Ожидает скачивания (0)' },
        { key: 'orders-closed', label: 'Закрыт (0)' },
      ],
    } : {
      key: 'orders',
      icon: <ShoppingOutlined />,
      label: 'Заказы',
    },
    {
      key: 'orders-feed',
      icon: <UnorderedListOutlined />,
      label: 'Лента работ',
    },
    // "Мои работы" - только для экспертов
    isExpert ? {
      key: 'works',
      icon: <FileDoneOutlined />,
      label: 'Мои работы',
    } : null,
    // "Авторский магазин" - только для экспертов
    (isExpert && !isMobile) ? {
      key: 'shop',
      icon: <ShopOutlined />,
      label: 'Авторский магазин',
      children: [
        { key: 'shop-ready-works', label: 'Магазин готовых работ' },
        { key: 'shop-add-work', label: 'Добавить работу в магазин' },
        { key: 'shop-purchased', label: 'Купленные работы' },
      ],
    } : null,
    {
      key: 'friends',
      icon: <TeamOutlined />,
      label: 'Мои друзья',
    },
    {
      key: 'faq',
      icon: <QuestionCircleOutlined />,
      label: 'FAQ',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      danger: true,
      className: styles.logoutMenuItem,
    },
  ].filter(Boolean);

  const profileSection = (
    <div className={styles.sidebarProfile}>
      <Avatar
        size={48}
        src={userProfile?.avatar || undefined}
        icon={<UserOutlined />}
        style={{ backgroundColor: '#667eea' }}
      />
      <div style={{ marginLeft: 12, flex: 1 }}>
        <Title level={5} style={{ margin: 0, fontSize: 14, color: 'white' }}>
          {userProfile?.username || 'Пользователь'}
        </Title>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
          {userProfile?.role === 'expert' ? 'Эксперт' : 'Пользователь'}
        </Text>
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      {profileSection}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        openKeys={isMobile ? [] : openKeys}
        onOpenChange={setOpenKeys}
        onClick={handleMenuClick}
        className={styles.sidebarMenu}
        items={menuItems}
      />
    </>
  );

  return (
    <>
      {/* Overlay для мобильных */}
      {isMobile && (
        <>
          <div
            onClick={() => onMobileDrawerChange?.(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              opacity: mobileDrawerOpen ? 1 : 0,
              visibility: mobileDrawerOpen ? 'visible' : 'hidden',
              transition: 'opacity 0.3s ease, visibility 0.3s ease',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              maxWidth: '100vw',
              background: '#fff',
              zIndex: 9999,
              overflowY: 'auto',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
              transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>
              <button
                onClick={() => onMobileDrawerChange?.(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Десктопный Sider */}
      {!isMobile && (
        <Sider
          width={250}
          className={styles.sidebar}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            borderRight: '1px solid #f0f0f0',
            zIndex: 1001,
          }}
        >
          {sidebarContent}
        </Sider>
      )}
    </>
  );
};

export default Sidebar;
