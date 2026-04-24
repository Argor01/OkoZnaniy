import React, { useState } from 'react';
import { Layout, Menu, Card, Typography, Button } from 'antd';
import { 
  BarChartOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  UserOutlined,
  ShoppingOutlined,
  ShopOutlined,
  SettingOutlined,
  StopOutlined,
  SafetyOutlined,
  UnorderedListOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  TagsOutlined,
  PercentageOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  MessageOutlined,
  InboxOutlined,
  CustomerServiceOutlined,
  CommentOutlined,
  WechatOutlined,
  UsergroupAddOutlined,
  LogoutOutlined,
  SettingOutlined as SettingsIcon
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const NewAdminDashboard: React.FC = () => {
  console.log('🚀 NEW ADMIN DASHBOARD LOADED!!!');
  
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState('overview');

  const menuItems = [
    {
      key: 'overview',
      icon: <BarChartOutlined />,
      label: 'Обзор',
    },
    {
      key: 'partners',
      icon: <TeamOutlined />,
      label: 'Партнеры',
    },
    {
      key: 'earnings',
      icon: <DollarOutlined />,
      label: 'Начисления',
    },
    {
      key: 'disputes',
      icon: <FileTextOutlined />,
      label: 'Споры',
    },
    {
      key: 'users_management',
      icon: <UserOutlined />,
      label: 'Управление пользователями',
      children: [
        {
          key: 'all_users',
          icon: <TeamOutlined />,
          label: 'Все пользователи',
        },
        {
          key: 'blocked_users',
          icon: <StopOutlined />,
          label: 'Заблокированные',
        },
        {
          key: 'user_roles',
          icon: <SafetyOutlined />,
          label: 'Роли и права',
        },
      ],
    },
    {
      key: 'orders_management',
      icon: <ShoppingOutlined />,
      label: 'Управление заказами',
      children: [
        {
          key: 'all_orders',
          icon: <UnorderedListOutlined />,
          label: 'Все заказы',
        },
        {
          key: 'problem_orders',
          icon: <ExclamationCircleOutlined />,
          label: 'Проблемные заказы',
        },
      ],
    },
    {
      key: 'shop_management',
      icon: <ShopOutlined />,
      label: 'Управление магазином',
      children: [
        {
          key: 'works_moderation',
          icon: <EyeOutlined />,
          label: 'Модерация работ',
        },
        {
          key: 'categories_subjects',
          icon: <TagsOutlined />,
          label: 'Категории и предметы',
        },
      ],
    },
    {
      key: 'system_settings',
      icon: <SettingOutlined />,
      label: 'Системные настройки',
      children: [
        {
          key: 'tariffs_prices',
          icon: <DollarOutlined />,
          label: 'Тарифы и цены',
        },
        {
          key: 'commission_settings',
          icon: <PercentageOutlined />,
          label: 'Настройки комиссий',
        },
        {
          key: 'notifications',
          icon: <BellOutlined />,
          label: 'Уведомления',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    setSelectedMenu(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} style={{ background: '#fff' }}>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <SettingsIcon style={{ fontSize: '24px', color: '#2b9fe6' }} />
          <Title level={4} style={{ margin: '8px 0 0 0' }}>
            ЛК администратора
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onClick={handleMenuClick}
          style={{ height: 'calc(100vh - 120px)', borderRight: 0 }}
          items={menuItems}
        />
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            {menuItems.find(item => item.key === selectedMenu)?.label || 'Админ-панель'}
          </Title>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Header>
        
        <Content style={{ margin: '24px', background: '#fff', padding: '24px' }}>
          <Card>
            <Title level={2}>🎉 Новая админ-панель работает!</Title>
            <p>Выбранный раздел: <strong>{selectedMenu}</strong></p>
            <p>Все новые разделы меню успешно загружены и отображаются в левой панели.</p>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default NewAdminDashboard;