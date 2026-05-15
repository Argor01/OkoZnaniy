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
  QuestionCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/features/auth/api/auth';
import PersonnelManagement from '../components/PersonnelManagement/PersonnelManagement';
import FinancialStatistics from '../components/FinancialStatistics/FinancialStatistics';
import PartnerPanel from '../components/PartnerPanel/PartnerPanel';
import GeneralStatistics from '../components/GeneralStatistics/GeneralStatistics';
import { DirectorChatsSection } from '../components/InternalCommunication';
import ContactBannedUsers from '../components/ContactBannedUsers';
import ImprovementRecommendations from '../components/ImprovementRecommendations/ImprovementRecommendations';
import DirectorFaqModal from '../modals/DirectorFaqModal';
import { ThemeToggle } from '@/components/ui';
import ErrorBoundary from '@/features/common/components/ErrorBoundary';
import '@/styles/modal-overrides.css';
import '@/styles/director.css';
import styles from '@/features/director/DirectorDashboard.module.css';
import logoutStyles from '@/features/common/components/LogoutModal.module.css';

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
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 840 && window.innerWidth <= 1024);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 840;
      const tablet = window.innerWidth > 840 && window.innerWidth <= 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // NOW SAFE TO HAVE CONDITIONAL RETURNS
  if (authLoading) {
    return (
      <div className={styles.directorDashboardLoading}>
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
      component: <ErrorBoundary><PersonnelManagement /></ErrorBoundary>,
    },
    {
      key: 'finance',
      icon: <DollarOutlined />,
      label: 'Финансовая статистика',
      component: <ErrorBoundary><FinancialStatistics /></ErrorBoundary>,
    },
    {
      key: 'partners',
      icon: <UserAddOutlined />,
      label: 'Панель партнёров',
      component: <ErrorBoundary><PartnerPanel /></ErrorBoundary>,
    },
    {
      key: 'statistics',
      icon: <BarChartOutlined />,
      label: 'Общая статистика',
      component: <ErrorBoundary><GeneralStatistics /></ErrorBoundary>,
    },
    {
      key: 'internal-communication',
      icon: <MessageOutlined />,
      label: 'Внутренняя коммуникация',
      component: <ErrorBoundary><DirectorChatsSection /></ErrorBoundary>,
    },
    {
      key: 'contact-bans',
      icon: <StopOutlined />,
      label: 'Баны за обмен контактами',
      component: <ErrorBoundary><ContactBannedUsers /></ErrorBoundary>,
    },
    {
      key: 'improvement-recommendations',
      icon: <BulbOutlined />,
      label: 'Рекомендации по улучшению',
      component: <ErrorBoundary><ImprovementRecommendations /></ErrorBoundary>,
    },
  ];

  const handleFaqClick = () => {
    setFaqModalVisible(true);
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      authApi.logout();
      message.success('Вы вышли из системы');
      navigate('/admin');
    } catch (error) {
      authApi.logout();
      message.success('Вы вышли из системы');
      navigate('/admin');
    }
  };

  const currentMenuItem = menuItems.find((item) => item.key === selectedMenu);

  const handleMenuClick = (key: string) => {
    if (key === 'faq') {
      handleFaqClick();
      if (isMobile) {
        setDrawerVisible(false);
      }
      return;
    }
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
      items={[
        ...menuItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
        })),
        {
          key: 'faq',
          icon: <QuestionCircleOutlined />,
          label: 'FAQ',
        },
      ]}
    />
  );

  return (
    <Layout className={styles.directorDashboardLayout}>
      <DirectorFaqModal
        visible={faqModalVisible}
        onClose={() => setFaqModalVisible(false)}
        isMobile={isMobile}
      />
      
      {!isMobile && (
        <Sider
          width={isTablet ? 200 : 250}
          className={styles.directorDashboardSider}
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
              className={styles.directorDashboardMobileOverlay}
            />
          )}
          <div
            className={[
              'directorDashboardMobileDrawer',
              drawerVisible ? 'directorDashboardMobileDrawerOpen' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className={styles.directorDashboardMobileCloseRow}>
              <button
                onClick={() => setDrawerVisible(false)}
                className={styles.directorDashboardMobileCloseButton}
              >
                ✕
              </button>
            </div>
            <div
              className={styles.directorDashboardMobileHeader}
            >
              <BankOutlined className={styles.directorDashboardMobileHeaderIcon} />
              <Title level={5} className={styles.directorDashboardMobileHeaderTitle}>
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
              className={styles.directorDashboardMenuButton}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle size={isMobile ? 'small' : 'middle'} />
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
          </div>
        </Header>
        <Content
          className={[
            'directorDashboardContent',
            isMobile ? 'directorDashboardContentMobile' : '',
            isTablet ? 'directorDashboardContentTablet' : '',
          ].filter(Boolean).join(' ')}
          key={selectedMenu}
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

      <Modal
        open={logoutModalVisible}
        onCancel={() => setLogoutModalVisible(false)}
        footer={null}
        centered
        width={400}
        closable={false}
        className={logoutStyles.logoutModal}
      >
        <div className={logoutStyles.logoutModalBody}>
          <div className={logoutStyles.logoutModalIcon}>
            <LogoutOutlined />
          </div>
          <h3 className={logoutStyles.logoutModalTitle}>Выход из системы</h3>
          <p className={logoutStyles.logoutModalText}>Вы уверены, что хотите выйти из аккаунта?</p>
          <div className={logoutStyles.logoutModalActions}>
            <button className={`${logoutStyles.logoutModalBtn} ${logoutStyles.logoutModalBtnCancel}`} onClick={() => setLogoutModalVisible(false)}>Отмена</button>
            <button className={`${logoutStyles.logoutModalBtn} ${logoutStyles.logoutModalBtnConfirm}`} onClick={confirmLogout}>Выйти</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default DirectorDashboard;

