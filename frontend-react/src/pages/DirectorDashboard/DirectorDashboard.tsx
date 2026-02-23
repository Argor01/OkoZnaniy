import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, message, Modal, Spin, Result } from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  UserAddOutlined,
  BarChartOutlined,
  LogoutOutlined,
  BankOutlined,
  MessageOutlined,
  MenuOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import PersonnelManagement from './components/PersonnelManagement/PersonnelManagement';
import FinancialStatistics from './components/FinancialStatistics/FinancialStatistics';
import PartnerPanel from './components/PartnerPanel/PartnerPanel';
import GeneralStatistics from './components/GeneralStatistics/GeneralStatistics';
import { AdminChatsSection } from '../AdminDashboard/components/Sections/AdminChatsSection';
import ContactBannedUsers from './components/ContactBannedUsers';

const { Header, Sider, Content, Footer } = Layout;
const { Title } = Typography;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  component: React.ReactNode;
};

// Mock данные для чатов директора
const mockChatRooms = [
  {
    id: 1,
    name: 'Общий чат администраторов',
    description: 'Общение всех администраторов платформы',
    type: 'general' as const,
    participants: [
      {
        id: 1,
        username: 'admin_chief',
        first_name: 'Анна',
        last_name: 'Главная',
        role: 'Главный администратор',
        online: true,
      },
      {
        id: 2,
        username: 'admin_support',
        first_name: 'Петр',
        last_name: 'Поддержкин',
        role: 'Администратор поддержки',
        online: true,
      },
      {
        id: 3,
        username: 'admin_content',
        first_name: 'Мария',
        last_name: 'Контентова',
        role: 'Контент-администратор',
        online: false,
        last_seen: '2024-02-04T07:30:00Z',
      },
    ],
    created_by: {
      id: 100,
      username: 'director',
      first_name: 'Владимир',
      last_name: 'Директоров',
    },
    created_at: '2024-01-01T10:00:00Z',
    last_message: {
      id: 1,
      text: 'Доброе утро, команда! Сегодня у нас много новых обращений',
      sender: {
        id: 1,
        username: 'admin_chief',
        first_name: 'Анна',
        last_name: 'Главная',
        role: 'Главный администратор',
        online: true,
      },
      sent_at: '2024-02-04T08:00:00Z',
      is_pinned: false,
      is_system: false,
    },
    unread_count: 3,
    is_muted: false,
    is_archived: false,
  },
  {
    id: 2,
    name: 'Чат с директором',
    description: 'Прямая связь с руководством',
    type: 'private' as const,
    participants: [
      {
        id: 100,
        username: 'director',
        first_name: 'Владимир',
        last_name: 'Директоров',
        role: 'Директор',
        online: true,
      },
      {
        id: 1,
        username: 'admin_chief',
        first_name: 'Анна',
        last_name: 'Главная',
        role: 'Главный администратор',
        online: true,
      },
    ],
    created_by: {
      id: 100,
      username: 'director',
      first_name: 'Владимир',
      last_name: 'Директоров',
    },
    created_at: '2024-01-01T10:00:00Z',
    last_message: {
      id: 3,
      text: 'Подготовьте отчет по итогам недели к завтрашнему совещанию',
      sender: {
        id: 100,
        username: 'director',
        first_name: 'Владимир',
        last_name: 'Директоров',
        role: 'Директор',
        online: true,
      },
      sent_at: '2024-02-04T09:15:00Z',
      is_pinned: true,
      is_system: false,
    },
    unread_count: 0,
    is_muted: false,
    is_archived: false,
  },
];

const DirectorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<string>('personnel');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const isMobile = window.innerWidth <= 840;
  const isTablet = window.innerWidth > 840 && window.innerWidth <= 1024;

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 840;
      if (mobile !== isMobile) {
        window.location.reload(); 
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (cancelled) return;
        setRole(user?.role ?? null);
      } catch (_error) {
        authApi.logout();
        if (!cancelled) {
          setRole(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="directorDashboardLoading">
        <Spin size="large" />
      </div>
    );
  }

  if (role === null) {
    return (
      <Result
        status="info"
        title="Требуется вход"
        subTitle="Войдите в систему, чтобы открыть личный кабинет директора."
        extra={
          <Button type="primary" onClick={() => navigate('/admin')}>
            Перейти ко входу
          </Button>
        }
      />
    );
  }

  if (role !== 'director') {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="У вас нет прав для доступа к личному кабинету директора."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Вернуться на главную
          </Button>
        }
      />
    );
  }

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
      key: 'internal-communication',
      icon: <MessageOutlined />,
      label: 'Внутренняя коммуникация',
      component: <AdminChatsSection chatRooms={mockChatRooms} currentUserId={1} />,
    },
    {
      key: 'contact-bans',
      icon: <StopOutlined />,
      label: 'Баны за обмен контактами',
      component: <ContactBannedUsers />,
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
      className={[
        'directorDashboardMenu',
        isMobile ? 'directorDashboardMenuMobile' : 'directorDashboardMenuDesktop',
      ].join(' ')}
      items={menuItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      }))}
    />
  );

  return (
    <Layout className="directorDashboardLayout">
      {!isMobile && (
        <Sider
          width={isTablet ? 200 : 250}
          className="directorDashboardSider"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <div
            className={[
              'directorDashboardSiderHeader',
              isTablet ? 'directorDashboardSiderHeaderTablet' : '',
            ].filter(Boolean).join(' ')}
          >
            <BankOutlined
              className={[
                'directorDashboardSiderIcon',
                isTablet ? 'directorDashboardSiderIconTablet' : '',
              ].filter(Boolean).join(' ')}
            />
            <Title
              level={4}
              className={[
                'directorDashboardSiderTitle',
                isTablet ? 'directorDashboardSiderTitleTablet' : '',
              ].filter(Boolean).join(' ')}
            >
              ЛК директора
            </Title>
          </div>
          {renderMenu()}
        </Sider>
      )}

      {isMobile && (
        <>
          {drawerVisible && (
            <div
              onClick={() => setDrawerVisible(false)}
              className="directorDashboardMobileOverlay"
            />
          )}
          <div
            className={[
              'directorDashboardMobileDrawer',
              drawerVisible ? 'directorDashboardMobileDrawerOpen' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="directorDashboardMobileCloseRow">
              <button
                onClick={() => setDrawerVisible(false)}
                className="directorDashboardMobileCloseButton"
              >
                ✕
              </button>
            </div>
            <div
              className="directorDashboardMobileHeader"
            >
              <BankOutlined className="directorDashboardMobileHeaderIcon" />
              <Title level={5} className="directorDashboardMobileHeaderTitle">
                ЛК директора
              </Title>
            </div>
            {renderMenu()}
          </div>
        </>
      )}

      <Layout>
        <Header
          className={[
            'directorDashboardHeader',
            isMobile ? 'directorDashboardHeaderMobile' : '',
          ].filter(Boolean).join(' ')}
        >
          {isMobile && (
            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              className="directorDashboardMenuButton"
            />
          )}
          <Title 
            level={isMobile ? 5 : 3} 
            className={[
              'directorDashboardHeaderTitle',
              isMobile ? 'directorDashboardHeaderTitleMobile' : '',
            ].filter(Boolean).join(' ')}
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
            className={isMobile ? 'directorDashboardLogoutButtonMobile' : undefined}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>
        <Content
          className={[
            'directorDashboardContent',
            isMobile ? 'directorDashboardContentMobile' : '',
            isTablet ? 'directorDashboardContentTablet' : '',
          ].filter(Boolean).join(' ')}
        >
          {currentMenuItem?.component}
        </Content>
        {!isMobile && (
          <Footer
            className={[
              'directorDashboardFooter',
              isTablet ? 'directorDashboardFooterTablet' : '',
            ].filter(Boolean).join(' ')}
          >
            Личный кабинет директора © {new Date().getFullYear()}
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default DirectorDashboard;

