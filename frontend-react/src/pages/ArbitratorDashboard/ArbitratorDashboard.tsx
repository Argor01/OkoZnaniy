import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout, Button, Typography, Space, message, Modal, Result, Spin, Menu } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  FileTextOutlined,
  MessageOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi, type User } from '../../api/auth';
import { arbitratorApi } from './api/arbitratorApi';
import { type NavigationTab } from './components/NavigationPanel/NavigationPanel';
import NewClaims from './components/NavigationPanel/NewClaims';
import InProgress from './components/NavigationPanel/InProgress';
import Completed from './components/NavigationPanel/Completed';
import PendingApproval from './components/NavigationPanel/PendingApproval';
import ClaimsProcessing from './components/ClaimsProcessing/ClaimsProcessing';
import InternalCommunication from './components/InternalCommunication/InternalCommunication';

const { Header, Sider, Content, Footer } = Layout;
const { Title } = Typography;

type MainSection = 'navigation' | 'claims' | 'communication';

const ArbitratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainSection, setMainSection] = useState<MainSection>('navigation');
  const [selectedTab, setSelectedTab] = useState<NavigationTab>('new');
  const [newClaimsCount, setNewClaimsCount] = useState(0);
  const [openKeys, setOpenKeys] = useState<string[]>(['claims']);

  
  const { data: newClaimsData } = useQuery({
    queryKey: ['arbitrator-claims', 'new', 'count'],
    queryFn: () => arbitratorApi.getClaims({ status: 'new', page_size: 1 }),
    select: (data) => data?.count || 0,
    retry: false,
    retryOnMount: false,
    refetchInterval: 30000, 
  });

  useEffect(() => {
    if (newClaimsData !== undefined) {
      setNewClaimsCount(newClaimsData);
    }
  }, [newClaimsData]);

  
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);

      
      if (currentUser.role !== 'arbitrator') {
        message.error('У вас нет доступа к этой странице');
        navigate('/expert');
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
          navigate('/administrator');
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/administrator');
        }
      },
    });
  };

  const handleMenuClick = (key: string) => {
    if (key === 'claims_processing') {
      setMainSection('claims');
      setOpenKeys([]); 
    } else if (key === 'communication') {
      setMainSection('communication');
      setOpenKeys([]); 
    } else if (['new', 'in_progress', 'completed', 'pending_approval'].includes(key)) {
      setSelectedTab(key as NavigationTab);
      setMainSection('navigation');
      setOpenKeys(['claims']); 
    }
  };

  
  if (loading) {
    return (
      <div className="fullScreenCenter">
        <Spin size="large" />
      </div>
    );
  }

  
  if (!user) {
    return null; 
  }

  
  if (user.role !== 'arbitrator') {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="У вас нет прав для доступа к кабинету арбитра."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Вернуться на главную
          </Button>
        }
      />
    );
  }

  
  const renderContent = () => {
    if (mainSection === 'navigation') {
      switch (selectedTab) {
        case 'new':
          return <NewClaims />;
        case 'in_progress':
          return <InProgress />;
        case 'completed':
          return <Completed />;
        case 'pending_approval':
          return <PendingApproval />;
        default:
          return <NewClaims />;
      }
    } else if (mainSection === 'claims') {
      return <ClaimsProcessing />;
    } else if (mainSection === 'communication') {
      return <InternalCommunication />;
    }
    return <NewClaims />;
  };

  
  const getSectionTitle = (): string => {
    if (mainSection === 'navigation') {
      switch (selectedTab) {
        case 'new':
          return 'Новые обращения';
        case 'in_progress':
          return 'В работе';
        case 'completed':
          return 'Завершённые';
        case 'pending_approval':
          return 'Ожидают решения';
        default:
          return 'Новые обращения';
      }
    } else if (mainSection === 'claims') {
      return 'Обработка претензий';
    } else if (mainSection === 'communication') {
      return 'Внутренняя коммуникация';
    }
    return 'Личный кабинет арбитра';
  };

  return (
    <Layout className="arbitratorLayout">
      <Sider
        width={280}
        className="arbitratorSider"
      >
        <div
          className="arbitratorSiderHeader"
        >
          <FileTextOutlined
            className="arbitratorSiderIcon"
          />
          <Title level={4} className="arbitratorSiderTitle">
            Личный кабинет арбитра
          </Title>
          {user && (
            <div className="arbitratorSiderUser">
              {user.first_name} {user.last_name}
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[
            mainSection === 'navigation' 
              ? selectedTab 
              : mainSection === 'claims' 
                ? 'claims_processing' 
                : 'communication'
          ]}
          openKeys={openKeys}
          onClick={({ key }) => handleMenuClick(key as string)}
          onOpenChange={(keys) => setOpenKeys(keys)}
          className="arbitratorMenu"
          items={[
            {
              key: 'claims',
              icon: <FileTextOutlined />,
              label: 'Обращения',
              children: [
                {
                  key: 'new',
                  icon: <BellOutlined />,
                  label: (
                    <span>
                      Новые обращения
                      {newClaimsCount > 0 && (
                        <span className="arbitratorNavCount">
                          ({newClaimsCount})
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'in_progress',
                  icon: <ClockCircleOutlined />,
                  label: 'В работе',
                },
                {
                  key: 'completed',
                  icon: <CheckCircleOutlined />,
                  label: 'Завершённые',
                },
                {
                  key: 'pending_approval',
                  icon: <HourglassOutlined />,
                  label: 'Ожидают решения',
                },
              ],
            },
            {
              key: 'claims_processing',
              icon: <FileTextOutlined />,
              label: 'Обработка претензий',
            },
            {
              key: 'communication',
              icon: <MessageOutlined />,
              label: 'Коммуникация с дирекцией',
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          className="arbitratorHeader"
        >
          <Title level={3} className="arbitratorSectionHeaderTitle">
            {getSectionTitle()}
          </Title>
          <Space>
            <Button
              type="default"
              icon={<UserOutlined />}
              onClick={() => {
                
                message.info('Профиль пользователя');
              }}
            >
              {user?.first_name} {user?.last_name}
            </Button>
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
          className="arbitratorContent"
        >
          {renderContent()}
        </Content>
        <Footer className="arbitratorFooter">
          Личный кабинет арбитра © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default ArbitratorDashboard;
