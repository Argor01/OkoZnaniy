import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, message, Modal } from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  UserAddOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import PersonnelManagement from './components/PersonnelManagement/PersonnelManagement';
import FinancialStatistics from './components/FinancialStatistics/FinancialStatistics';
import PartnerPanel from './components/PartnerPanel/PartnerPanel';
import GeneralStatistics from './components/GeneralStatistics/GeneralStatistics';

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
  const [selectedMenu, setSelectedMenu] = useState<string>('statistics');

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
  ];

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
          navigate('/admin');
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/admin');
        }
      },
    });
  };

  const currentMenuItem = menuItems.find((item) => item.key === selectedMenu);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={250}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <BankOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
            Личный кабинет директора
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onClick={({ key }) => setSelectedMenu(key)}
          style={{
            borderRight: 0,
            height: 'calc(100vh - 120px)',
          }}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            {currentMenuItem?.label || 'Личный кабинет директора'}
          </Title>
          <Space>
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {currentMenuItem?.component}
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          Личный кабинет директора © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default DirectorDashboard;

