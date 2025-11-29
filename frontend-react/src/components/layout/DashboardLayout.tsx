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
      <Layout>
        <Content className={styles.mainContent}>{children}</Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
