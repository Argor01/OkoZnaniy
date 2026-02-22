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


export const MobileMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className={styles.mobileMenuButton}
  >
    <MenuOutlined className={styles.mobileMenuIcon} />
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
      console.log('Works navigation disabled');
      return;
    }
    if (key === 'shop-ready-works') {
      console.log('Shop ready works navigation disabled');
      return;
    }
    if (key === 'shop-add-work') {
      console.log('Shop add work navigation disabled');
      return;
    }
    if (key === 'shop-purchased') {
      console.log('Shop purchased navigation disabled');
      return;
    }
    if (key === 'orders-feed') {
      console.log('Orders feed navigation disabled');
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
      icon: unreadNotifications > 0 ? (
        <Badge dot>
          <BellOutlined className={styles.notificationDotIcon} />
        </Badge>
      ) : (
        <BellOutlined />
      ),
      label: 'Уведомления',
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
    (!isExpert && !isMobile) ? {
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
    } : (!isExpert && isMobile) ? {
      key: 'orders',
      icon: <ShoppingOutlined />,
      label: 'Заказы',
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
      <div className={styles.sidebarProfileInner}>
        <Avatar
          size={48}
          src={userProfile?.avatar || undefined}
          icon={<UserOutlined />}
          className={styles.sidebarAvatar}
        />
        <div className={styles.sidebarProfileInfo}>
          <Title level={5} className={styles.sidebarProfileName}>
            {userProfile?.username || 'Пользователь'}
          </Title>
          <Text className={styles.sidebarProfileRole}>
            {userProfile?.role === 'expert' ? 'Эксперт' : 'Пользователь'}
          </Text>
        </div>
        {isMobile && (
          <button
            onClick={() => onMobileDrawerChange?.(false)}
            className={styles.mobileProfileClose}
          >
            ✕
          </button>
        )}
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
      {isMobile && (
        <>
          <div
            onClick={() => onMobileDrawerChange?.(false)}
            className={`${styles.mobileOverlay} ${mobileDrawerOpen ? styles.mobileOverlayVisible : ''}`}
          />
          <div
            className={`${styles.mobileMenu} ${mobileDrawerOpen ? styles.mobileMenuOpen : ''}`}
          >
            {sidebarContent}
          </div>
        </>
      )}

      {!isMobile && (
        <Sider
          width={250}
          className={styles.sidebar}
        >
          {sidebarContent}
        </Sider>
      )}
    </>
  );
};

export default Sidebar;
