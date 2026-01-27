import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, message, Modal } from 'antd';
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
  const [selectedMenu, setSelectedMenu] = useState<string>('personnel');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const isMobile = window.innerWidth <= 840;
  const isTablet = window.innerWidth > 840 && window.innerWidth <= 1024;

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 840;
      if (mobile !== isMobile) {
        window.location.reload(); // Простой способ обновить состояние
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

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
      {isMobile && (
        <>
          {/* Overlay */}
          {drawerVisible && (
            <div
              onClick={() => setDrawerVisible(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9998,
                opacity: drawerVisible ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
          {/* Sidebar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '100vw',
              background: '#fff',
              zIndex: 9999,
              overflowY: 'auto',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
              transform: drawerVisible ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>
              <button
                onClick={() => setDrawerVisible(false)}
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
          </div>
        </>
      )}

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 16px' : '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {isMobile && (
            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{
                borderRadius: '8px',
                height: '40px',
                width: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                left: '16px',
                zIndex: 1,
              }}
            />
          )}
          <Title 
            level={isMobile ? 5 : 3} 
            style={{ 
              margin: 0,
              flex: 1,
              textAlign: isMobile ? 'center' : 'left',
              paddingLeft: isMobile ? '52px' : 0,
              paddingRight: isMobile ? '52px' : 0,
            }}
          >
            {isMobile 
              ? currentMenuItem?.label?.split(' ')[0] || 'Директор'
              : currentMenuItem?.label || 'Личный кабинет директора'}
          </Title>
          <Button
            type="default"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size={isMobile ? 'small' : 'middle'}
            style={isMobile ? {
              position: 'absolute',
              right: '16px',
              zIndex: 1,
            } : {}}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : isTablet ? '20px' : '24px',
            padding: isMobile ? '16px' : isTablet ? '20px' : '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
            marginLeft: isMobile ? '12px' : isTablet ? '20px' : '24px',
            marginRight: isMobile ? '12px' : isTablet ? '20px' : '24px',
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

