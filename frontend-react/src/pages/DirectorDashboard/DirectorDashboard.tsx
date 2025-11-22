import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, message, Modal, Drawer, Grid } from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  UserAddOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BankOutlined,
  MessageOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import PersonnelManagement from './components/PersonnelManagement/PersonnelManagement';
import FinancialStatistics from './components/FinancialStatistics/FinancialStatistics';
import PartnerPanel from './components/PartnerPanel/PartnerPanel';
import GeneralStatistics from './components/GeneralStatistics/GeneralStatistics';
import ArbitratorCommunication from './components/ArbitratorCommunication/ArbitratorCommunication';

const { Header, Sider, Content, Footer } = Layout;
const { Title } = Typography;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  component: React.ReactNode;
};

const DirectorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [selectedMenu, setSelectedMenu] = useState<string>('personnel');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  const menuItems: MenuItem[] = [
    {
      key: 'personnel',
      icon: <TeamOutlined />,
      label: 'Управление персоналом',
      component: <PersonnelManagement />,
    },
    {
      key: 'finance',
      icon: <DollarOutlined />,
      label: 'Финансовая статистика',
      component: <FinancialStatistics />,
    },
    {
      key: 'partners',
      icon: <UserAddOutlined />,
      label: 'Панель партнёров',
      component: <PartnerPanel />,
    },
    {
      key: 'statistics',
      icon: <BarChartOutlined />,
      label: 'Общая статистика',
      component: <GeneralStatistics />,
    },
    {
      key: 'arbitrators',
      icon: <MessageOutlined />,
      label: 'Коммуникация с арбитрами',
      component: <ArbitratorCommunication />,
    },
  ];

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        try {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/administrator');
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/administrator');
        }
      },
    });
  };

  const currentMenuItem = menuItems.find((item) => item.key === selectedMenu);

  const handleMenuClick = (key: string) => {
    setSelectedMenu(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const renderMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[selectedMenu]}
      onClick={({ key }) => handleMenuClick(key)}
      style={{
        borderRight: 0,
        height: isMobile ? 'auto' : 'calc(100vh - 120px)',
      }}
      items={menuItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      }))}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          width={isTablet ? 200 : 250}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          }}
          breakpoint="lg"
          collapsedWidth="0"
        >
          <div
            style={{
              padding: isTablet ? '16px' : '24px',
              textAlign: 'center',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <BankOutlined style={{ fontSize: isTablet ? '28px' : '32px', color: '#1890ff', marginBottom: '8px' }} />
            <Title level={4} style={{ margin: 0, fontSize: isTablet ? '14px' : '16px' }}>
              ЛК директора
            </Title>
          </div>
          {renderMenu()}
        </Sider>
      )}

      {/* Drawer для мобильных */}
      <Drawer
        title="Меню"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <BankOutlined style={{ fontSize: '28px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={5} style={{ margin: 0 }}>
            ЛК директора
          </Title>
        </div>
        {renderMenu()}
      </Drawer>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 16px' : '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                style={{ fontSize: '18px' }}
              />
            )}
            <Title level={isMobile ? 5 : 3} style={{ margin: 0 }}>
              {isMobile 
                ? currentMenuItem?.label?.split(' ')[0] || 'Директор'
                : currentMenuItem?.label || 'Личный кабинет директора'}
            </Title>
          </Space>
          <Button
            type="default"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size={isMobile ? 'small' : 'middle'}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : isTablet ? '16px' : '24px',
            padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {currentMenuItem?.component}
        </Content>
        {!isMobile && (
          <Footer style={{ textAlign: 'center', background: '#fff', padding: isTablet ? '12px' : '24px' }}>
            Личный кабинет директора © {new Date().getFullYear()}
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default DirectorDashboard;

