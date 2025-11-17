import React, { useState, useEffect } from 'react';
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

  // Получение количества новых обращений для отображения в навигации
  const { data: newClaimsData } = useQuery({
    queryKey: ['arbitrator-claims', 'new', 'count'],
    queryFn: () => arbitratorApi.getClaims({ status: 'new', page_size: 1 }),
    select: (data) => data?.count || 0,
    retry: false,
    retryOnMount: false,
    refetchInterval: 30000, // Обновление каждые 30 секунд
  });

  useEffect(() => {
    if (newClaimsData !== undefined) {
      setNewClaimsCount(newClaimsData);
    }
  }, [newClaimsData]);

  // Проверка аутентификации и роли
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);

      // Проверка роли
      if (currentUser.role !== 'arbitrator') {
        message.error('У вас нет доступа к этой странице');
        navigate('/dashboard');
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
  };

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        try {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/login');
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/login');
        }
      },
    });
  };

  const handleMenuClick = (key: string) => {
    if (key === 'claims_processing') {
      setMainSection('claims');
      setOpenKeys([]); // Закрываем меню "Обращения" при переходе в другую секцию
    } else if (key === 'communication') {
      setMainSection('communication');
      setOpenKeys([]); // Закрываем меню "Обращения" при переходе в другую секцию
    } else if (['new', 'in_progress', 'completed', 'pending_approval'].includes(key)) {
      setSelectedTab(key as NavigationTab);
      setMainSection('navigation');
      setOpenKeys(['claims']); // Открываем меню "Обращения" при выборе подпункта
    }
  };

  // Если загрузка - показываем спиннер
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Если пользователь не авторизован - редирект на login
  if (!user) {
    return null; // ProtectedRoute перенаправит на /login
  }

  // Если пользователь не имеет роли arbitrator - показываем ошибку доступа
  if (user.role !== 'arbitrator') {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="У вас нет прав для доступа к кабинету арбитра."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Вернуться на главную
          </Button>
        }
      />
    );
  }

  // Рендер контента в зависимости от выбранной секции
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

  // Получение заголовка текущей секции
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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={280}
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
          <FileTextOutlined
            style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }}
          />
          <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
            Личный кабинет арбитра
          </Title>
          {user && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              {user.first_name} {user.last_name}
            </div>
          )}
        </div>

        {/* Главное меню навигации */}
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
          style={{
            borderRight: 0,
          }}
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
                        <span style={{ marginLeft: 8, color: '#1890ff' }}>
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
            {getSectionTitle()}
          </Title>
          <Space>
            <Button
              type="default"
              icon={<UserOutlined />}
              onClick={() => {
                // Можно добавить переход к профилю
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
          style={{
            margin: '16px',
            padding: '0',
            background: 'transparent',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {renderContent()}
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          Личный кабинет арбитра © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default ArbitratorDashboard;
