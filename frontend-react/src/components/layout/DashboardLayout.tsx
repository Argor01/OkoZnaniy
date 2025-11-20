import React, { useState } from 'react';
import { Layout, Menu, Avatar, Badge, Typography, Button, Modal, message, Spin } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  TrophyOutlined,
  WalletOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  ShopOutlined,
  TeamOutlined,
  HeartOutlined,
  GiftOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { ordersApi } from '../../api/orders';
import styles from './DashboardLayout.module.css';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Загружаем профиль пользователя
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем заказы для подсчета статистики
  const { data: ordersData } = useQuery({
    queryKey: ['user-orders', userProfile?.role],
    queryFn: () => {
      if (userProfile?.role === 'client') {
        return ordersApi.getClientOrders();
      } else if (userProfile?.role === 'expert') {
        return ordersApi.getMyOrders({});
      }
      return null;
    },
    enabled: !!userProfile,
  });

  // Подсчет статистики заказов
  const orders = ordersData?.results || ordersData || [];
  const ordersCount = {
    all: orders.length,
    new: orders.filter((o: any) => o.status === 'new').length,
    confirming: orders.filter((o: any) => o.status === 'confirming').length,
    in_progress: orders.filter((o: any) => o.status === 'in_progress').length,
    payment: orders.filter((o: any) => o.status === 'payment').length,
    review: orders.filter((o: any) => o.status === 'review').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    revision: orders.filter((o: any) => o.status === 'revision').length,
    download: orders.filter((o: any) => o.status === 'download').length,
    closed: orders.filter((o: any) => o.status === 'closed').length,
  };

  // Получаем баланс из профиля пользователя
  const balance = userProfile?.balance ? parseFloat(userProfile.balance) : 0.00;

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/');
          window.location.reload();
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/');
          window.location.reload();
        }
      },
    });
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/expert') return 'expert';
    if (path === '/create-order') return 'create-order';
    if (path.startsWith('/shop/ready-works')) return 'shop-ready-works';
    if (path.startsWith('/shop/add-work')) return 'shop-add-work';
    if (path.startsWith('/works')) return 'works';
    if (path.startsWith('/shop/purchased')) return 'shop-purchased';
    return 'expert';
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={250}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className={styles.sidebar}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div className={styles.sidebarProfile}>
          <Badge count={<TrophyOutlined style={{ color: '#f97316', fontSize: 16 }} />} offset={[-5, 5]}>
            <Avatar
              size={collapsed ? 40 : 64}
              src={userProfile?.avatar ? `http://localhost:8000${userProfile.avatar}` : undefined}
              icon={!userProfile?.avatar && <UserOutlined />}
              style={{
                backgroundColor: userProfile?.avatar ? 'transparent' : '#667eea',
                border: '3px solid #fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
          </Badge>
          {!collapsed && (
            <div style={{ marginLeft: 12, flex: 1 }}>
              <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                {userProfile?.username || userProfile?.email || 'Пользователь'}
              </Title>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {isExpert ? 'Эксперт' : isClient ? 'Клиент' : userProfile?.role}
              </div>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          className={styles.sidebarMenu}
          style={{ borderRight: 0 }}
        >
          {isClient && (
            <>
              <Menu.Item
                key="create-order"
                icon={<FileDoneOutlined />}
                onClick={() => navigate('/create-order')}
              >
                Создать заказ
              </Menu.Item>
            </>
          )}

          {isExpert && (
            <>
              <Menu.Item
                key="expert"
                icon={<ShoppingOutlined />}
                onClick={() => navigate('/expert')}
              >
                Дашборд эксперта
              </Menu.Item>
              <Menu.Item key="messages" icon={<MessageOutlined />}>
                Сообщения
              </Menu.Item>
              <Menu.Item key="notifications" icon={<BellOutlined />}>
                Уведомления
              </Menu.Item>
              <Menu.Item key="arbitration" icon={<TrophyOutlined />}>
                Арбитраж
              </Menu.Item>
              <Menu.Item key="balance" icon={<WalletOutlined />}>
                Счет: {balance.toFixed(2)} ₽
              </Menu.Item>
              <Menu.Item
                key="works"
                icon={<FileDoneOutlined />}
                onClick={() => navigate('/works')}
              >
                Мои работы
              </Menu.Item>
              <Menu.SubMenu key="shop" icon={<ShopOutlined />} title="Авторский магазин">
                <Menu.Item key="shop-ready-works" onClick={() => navigate('/shop/ready-works')}>
                  Магазин готовых работ
                </Menu.Item>
                <Menu.Item key="shop-add-work" onClick={() => navigate('/shop/add-work')}>
                  Добавить работу
                </Menu.Item>
                <Menu.Item key="shop-my-works" onClick={() => navigate('/works')}>
                  Мои работы
                </Menu.Item>
                <Menu.Item key="shop-purchased" onClick={() => navigate('/shop/purchased')}>
                  Купленные работы
                </Menu.Item>
              </Menu.SubMenu>
              <Menu.Item key="friends" icon={<TeamOutlined />}>
                Мои друзья
              </Menu.Item>
              <Menu.Item key="favorites" icon={<HeartOutlined />}>
                Избранное
              </Menu.Item>
              <Menu.Item key="bonuses" icon={<GiftOutlined />}>
                Бонусы
              </Menu.Item>
              <Menu.Item key="paid-services" icon={<DollarOutlined />}>
                Платные услуги
              </Menu.Item>
            </>
          )}

          <Menu.Item key="faq" icon={<QuestionCircleOutlined />}>
            FAQ
          </Menu.Item>
          <Menu.Item key="logout" icon={<LogoutOutlined />} danger onClick={handleLogout}>
            Выйти
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout>
        <Content className={styles.mainContent}>{children}</Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
