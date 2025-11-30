import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Typography, Badge, Button, Drawer } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  MessageOutlined,
  BellOutlined,
  WalletOutlined,
  LogoutOutlined,
  MenuOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  TrophyOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

const { Sider } = Layout;
const { Text, Title } = Typography;

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
}) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (isMobile) {
      setMobileDrawerVisible(false);
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
    if (key === 'shop-my-works') {
      navigate('/works');
      return;
    }
    if (key === 'shop-purchased') {
      navigate('/shop/purchased');
      return;
    }
    if (key.startsWith('orders-') || key === 'orders') {
      navigate('/expert');
      onMenuSelect(key);
      return;
    }

    onMenuSelect(key);
  };

  const menuItems = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      openKeys={isMobile ? [] : openKeys}
      onOpenChange={setOpenKeys}
      onClick={handleMenuClick}
      className={styles.sidebarMenu}
    >
      <Menu.Item key="messages" icon={<MessageOutlined />}>
        <Badge count={unreadMessages} offset={[10, 0]}>
          Сообщения
        </Badge>
      </Menu.Item>
      <Menu.Item key="notifications" icon={<BellOutlined />}>
        <Badge count={unreadNotifications} offset={[10, 0]}>
          Уведомления
        </Badge>
      </Menu.Item>
      <Menu.Item key="arbitration" icon={<TrophyOutlined />}>
        Арбитраж
      </Menu.Item>
      <Menu.Item key="balance" icon={<WalletOutlined />}>
        Счет: 0.00 ₽
      </Menu.Item>
      {!isMobile ? (
        <Menu.SubMenu key="orders" icon={<ShoppingOutlined />} title="Мои заказы">
          <Menu.Item key="orders-all">Все (0)</Menu.Item>
          <Menu.Item key="orders-open">Открыт (0)</Menu.Item>
          <Menu.Item key="orders-confirming">На подтверждении (0)</Menu.Item>
          <Menu.Item key="orders-progress">На выполнении (0)</Menu.Item>
          <Menu.Item key="orders-payment">Ожидает оплаты (0)</Menu.Item>
          <Menu.Item key="orders-review">На проверке (0)</Menu.Item>
          <Menu.Item key="orders-completed">Выполнен (0)</Menu.Item>
          <Menu.Item key="orders-revision">На доработке (0)</Menu.Item>
          <Menu.Item key="orders-download">Ожидает скачивания (0)</Menu.Item>
          <Menu.Item key="orders-closed">Закрыт (0)</Menu.Item>
        </Menu.SubMenu>
      ) : (
        <Menu.Item key="orders" icon={<ShoppingOutlined />}>
          Заказы
        </Menu.Item>
      )}
      <Menu.Item key="works" icon={<FileDoneOutlined />}>
        Мои работы
      </Menu.Item>
      {!isMobile && (
        <Menu.SubMenu key="shop" icon={<ShopOutlined />} title="Авторский магазин">
          <Menu.Item key="shop-ready-works">Магазин готовых работ</Menu.Item>
          <Menu.Item key="shop-add-work">Добавить работу в магазин</Menu.Item>
          <Menu.Item key="shop-my-works">Мои работы</Menu.Item>
          <Menu.Item key="shop-purchased">Купленные работы</Menu.Item>
        </Menu.SubMenu>
      )}
      <Menu.Item key="friends" icon={<TeamOutlined />}>
        Мои друзья
      </Menu.Item>
      <Menu.Item key="faq" icon={<QuestionCircleOutlined />}>
        FAQ
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger className={styles.logoutMenuItem}>
        Выйти
      </Menu.Item>
    </Menu>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="primary"
          icon={<MenuOutlined />}
          onClick={() => setMobileDrawerVisible(true)}
          className={styles.mobileMenuButton}
        >
          Меню
        </Button>
        <Drawer
          title={
            <div className={styles.drawerHeader}>
              <Avatar
                size={48}
                src={userProfile?.avatar ? `http://localhost:8000${userProfile.avatar}` : undefined}
                icon={!userProfile?.avatar && <UserOutlined />}
                style={{ backgroundColor: '#667eea' }}
              />
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {userProfile?.username || 'Пользователь'}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {userProfile?.role === 'expert' ? 'Эксперт' : 'Пользователь'}
                </Text>
              </div>
            </div>
          }
          placement="left"
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          width={280}
          styles={{
            body: { padding: 0 },
            header: { borderBottom: '1px solid #f0f0f0' },
          }}
        >
          {menuItems}
        </Drawer>
      </>
    );
  }

  return (
    <Sider
      width={250}
      className={styles.sidebar}
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        position: 'relative',
        height: '100vh',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      <div className={styles.sidebarProfile}>
        <Avatar
          size={48}
          src={userProfile?.avatar ? `http://localhost:8000${userProfile.avatar}` : undefined}
          icon={!userProfile?.avatar && <UserOutlined />}
          style={{ backgroundColor: '#667eea' }}
        />
        <div style={{ marginLeft: 12 }}>
          <Title level={5} style={{ margin: 0, fontSize: 14 }}>
            {userProfile?.username || 'Пользователь'}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {userProfile?.role === 'expert' ? 'Эксперт' : 'Пользователь'}
          </Text>
        </div>
      </div>
      {menuItems}
    </Sider>
  );
};

export default Sidebar;
