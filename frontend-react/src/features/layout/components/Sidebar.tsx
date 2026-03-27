import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Menu, Avatar, Typography, Badge } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  MessageOutlined,
  BellOutlined,
  LogoutOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  TrophyOutlined,
  ShopOutlined,
  MenuOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
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
  collapsed?: boolean;
  orderCounts?: Partial<Record<'all' | 'new' | 'confirming' | 'in_progress' | 'waiting_payment' | 'review' | 'completed' | 'revision' | 'download' | 'closed' | 'inactive', number>>;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({
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
  collapsed = false,
  orderCounts,
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

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
    
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
      return;
    }
    if (key === 'shop-ready-works') {
      return;
    }
    if (key === 'shop-add-work') {
      return;
    }
    if (key === 'shop-purchased') {
      return;
    }
    if (key === 'orders-feed') {
      return;
    }
    if (key.startsWith('orders-') || key === 'orders') {
      const tabMap: Record<string, string> = {
        'orders-all': 'all',
        'orders-open': 'new',
        'orders-confirming': 'confirming',
        'orders-progress': 'in_progress',
        'orders-payment': 'waiting_payment',
        'orders-review': 'review',
        'orders-completed': 'completed',
        'orders-revision': 'revision',
        'orders-download': 'download',
        'orders-closed': 'closed',
        'orders-inactive': 'inactive',
      };
      const tab = tabMap[key];
      if (tab) {
        navigate(`/works?tab=${tab}`);
      } else {
        navigate('/works');
      }
      onMenuSelect(key);
      return;
    }

    if (key.startsWith('expert-client-orders-') || key === 'expert-client-orders') {
      const tabMap: Record<string, string> = {
        'expert-client-orders-all': 'all',
        'expert-client-orders-open': 'new',
        'expert-client-orders-confirming': 'confirming',
        'expert-client-orders-progress': 'in_progress',
        'expert-client-orders-payment': 'waiting_payment',
        'expert-client-orders-review': 'review',
        'expert-client-orders-completed': 'completed',
        'expert-client-orders-revision': 'revision',
        'expert-client-orders-download': 'download',
        'expert-client-orders-closed': 'closed',
        'expert-client-orders-inactive': 'inactive',
      };
      const tab = tabMap[key];
      if (tab) {
        navigate(`${ROUTES.expert.clientOrders}?tab=${tab}`);
      } else {
        navigate(ROUTES.expert.clientOrders);
      }
      onMenuSelect(key);
      return;
    }

    onMenuSelect(key);
  }, [
    isMobile,
    onMobileDrawerChange,
    navigate,
    onMessagesClick,
    onNotificationsClick,
    onArbitrationClick,
    onFriendsClick,
    onFaqClick,
    onLogout,
    onMenuSelect
  ]);

  const isExpert = userProfile?.role === 'expert';

  const menuItems = useMemo(() => [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: 'Аккаунт',
    },
    {
      key: 'messages',
      icon: unreadMessages > 0 ? (
        <Badge dot>
          <MessageOutlined className={styles.notificationDotIcon} />
        </Badge>
      ) : (
        <MessageOutlined />
      ),
      label: 'Сообщения',
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
    (!isExpert && !isMobile) ? {
      key: 'orders',
      icon: <ShoppingOutlined />,
      label: 'Мои заказы',
      children: [
        { key: 'orders-all', label: `Все (${orderCounts?.all ?? 0})` },
        { key: 'orders-open', label: `Открыт (${orderCounts?.new ?? 0})` },
        { key: 'orders-confirming', label: `На подтверждении (${orderCounts?.confirming ?? 0})` },
        { key: 'orders-progress', label: `В работе у эксперта (${orderCounts?.in_progress ?? 0})` },
        { key: 'orders-payment', label: `Ожидает оплаты (${orderCounts?.waiting_payment ?? 0})` },
        { key: 'orders-review', label: `На проверке (${orderCounts?.review ?? 0})` },
        { key: 'orders-completed', label: `Выполнен (${orderCounts?.completed ?? 0})` },
        { key: 'orders-revision', label: `На доработке (${orderCounts?.revision ?? 0})` },
        { key: 'orders-download', label: `Ожидает скачивания (${orderCounts?.download ?? 0})` },
        { key: 'orders-closed', label: `Закрыт (${orderCounts?.closed ?? 0})` },
        { key: 'orders-inactive', label: `Неактивные (${orderCounts?.inactive ?? 0})` },
      ],
    } : (!isExpert && isMobile) ? {
      key: 'orders',
      icon: <ShoppingOutlined />,
      label: 'Заказы',
    } : (isExpert && !isMobile) ? {
      key: 'expert-client-orders',
      icon: <ShoppingOutlined />,
      label: 'Мои заказы',
      children: [
        { key: 'expert-client-orders-all', label: `Все (${orderCounts?.all ?? 0})` },
        { key: 'expert-client-orders-open', label: `Открыт (${orderCounts?.new ?? 0})` },
        { key: 'expert-client-orders-confirming', label: `На подтверждении (${orderCounts?.confirming ?? 0})` },
        { key: 'expert-client-orders-progress', label: `В работе у эксперта (${orderCounts?.in_progress ?? 0})` },
        { key: 'expert-client-orders-payment', label: `Ожидает оплаты (${orderCounts?.waiting_payment ?? 0})` },
        { key: 'expert-client-orders-review', label: `На проверке (${orderCounts?.review ?? 0})` },
        { key: 'expert-client-orders-completed', label: `Выполнен (${orderCounts?.completed ?? 0})` },
        { key: 'expert-client-orders-revision', label: `На доработке (${orderCounts?.revision ?? 0})` },
        { key: 'expert-client-orders-download', label: `Ожидает скачивания (${orderCounts?.download ?? 0})` },
        { key: 'expert-client-orders-closed', label: `Закрыт (${orderCounts?.closed ?? 0})` },
        { key: 'expert-client-orders-inactive', label: `Неактивные (${orderCounts?.inactive ?? 0})` },
      ],
    } : (isExpert && isMobile) ? {
      key: 'expert-client-orders',
      icon: <ShoppingOutlined />,
      label: 'Мои заказы',
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
  ].filter(Boolean), [isExpert, isMobile, unreadMessages, unreadNotifications, orderCounts]);

  const profileSection = useMemo(() => (
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
  ), [userProfile?.avatar, userProfile?.username, userProfile?.role, isMobile, onMobileDrawerChange]);

  const sidebarContent = useMemo(() => (
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
  ), [profileSection, selectedKey, isMobile, openKeys, handleMenuClick, menuItems]);

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
          trigger={null}
          collapsible
          collapsed={collapsed}
          collapsedWidth={0}
        >
          {sidebarContent}
        </Sider>
      )}
    </>
  );
});

export default Sidebar;
