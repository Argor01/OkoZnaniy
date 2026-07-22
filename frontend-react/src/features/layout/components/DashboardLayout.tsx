import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { LogoutOutlined } from '@ant-design/icons';
import { Layout, Modal, message, Spin, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '@/features/auth/api/auth';
import { chatApi } from '@/features/support/api/chat';
import { ordersApi, Order } from '@/features/orders/api/orders';
import DashboardHeader from './DashboardHeader';
import Sidebar from './Sidebar';
import { useNotifications } from '@/hooks/useNotifications';
import { DashboardContext } from '@/contexts/DashboardContext';
import { AppFooter } from '@/components/layout/AppFooter';
import RightSidebar from './RightSidebar';
import styles from './DashboardLayout.module.css';
import '@/styles/modal-overrides.css';
import logoutStyles from '@/features/common/components/LogoutModal.module.css';
import { CURRENT_USER_KEY } from '@/hooks/queries';
import { BREAKPOINTS, ROUTES } from '@/utils/constants';


const ProfileModal = lazy(() => import('@/features/expert/modals/ProfileModal'));
const NotificationsModal = lazy(() => import('@/features/expert/modals/NotificationsModalNew'));
const ArbitrationModal = lazy(() => import('@/features/expert/modals/ArbitrationModal'));
const FinanceModal = lazy(() => import('@/features/expert/modals/FinanceModal'));
const FaqModal = lazy(() => import('@/features/expert/modals/FaqModal'));
const FriendProfileModal = lazy(() => import('@/features/expert/modals/FriendProfileModal'));

const { Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  
  
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [friendProfileModalVisible, setFriendProfileModalVisible] = useState(false);
  
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);

  const { unreadCount: unreadNotifications, loadNotifications: refreshNotifications } = useNotifications();

  const handleNotificationsOpen = () => {
    setNotificationsModalVisible(true);
    refreshNotifications();
  };

  const handleNotificationsClose = () => {
    setNotificationsModalVisible(false);
    refreshNotifications();
  };

  
  const { data: userProfile, isLoading } = useQuery({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: clientOrdersData } = useQuery({
    queryKey: ['sidebar-client-orders'],
    queryFn: () => ordersApi.getClientOrders({ ordering: '-created_at' }),
    enabled: userProfile?.role === 'client' || userProfile?.role === 'expert',
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const { data: inactiveClientOrdersData } = useQuery({
    queryKey: ['sidebar-client-orders-inactive'],
    queryFn: () => ordersApi.getClientOrders({ inactive: true, ordering: '-created_at' }),
    enabled: userProfile?.role === 'client' || userProfile?.role === 'expert',
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const sidebarOrderCounts = useMemo(() => {
    const toArray = (data: unknown): Order[] => {
      if (Array.isArray(data)) return data as Order[];
      if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
        return (data as { results: Order[] }).results;
      }
      return [];
    };
    const activeOrders = toArray(clientOrdersData);
    const inactiveOrders = toArray(inactiveClientOrdersData);
    const countByStatus = (status: string) => activeOrders.filter((order) => order?.status === status).length;

    return {
      all: activeOrders.length,
      new: countByStatus('new'),
      confirming: countByStatus('confirming'),
      in_progress: countByStatus('in_progress'),
      waiting_payment: countByStatus('waiting_payment'),
      review: countByStatus('review'),
      completed: countByStatus('completed'),
      revision: countByStatus('revision'),
      download: countByStatus('download'),
      closed: countByStatus('closed'),
      inactive: inactiveOrders.length,
    };
  }, [clientOrdersData, inactiveClientOrdersData]);

  
  const balance = userProfile?.balance ? parseFloat(userProfile.balance) : 0.00;
  const [supportUserId, setSupportUserId] = useState<number | null>(() => {
    const raw = localStorage.getItem('support_user_id');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const ensureSupportUserId = React.useCallback(async () => {
    if (supportUserId) return supportUserId;
    try {
      const data = await authApi.getSupportUser();
      if (data?.id) {
        localStorage.setItem('support_user_id', String(data.id));
        setSupportUserId(data.id);
        return data.id;
      }
      return null;
    } catch {
      return null;
    }
  }, [supportUserId]);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = useCallback(() => {
    setLogoutModalVisible(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    try {
      authApi.logout();
      message.success('Вы вышли из системы');
      navigate('/');
      window.location.reload();
    } catch (_error) {
      authApi.logout();
      message.success('Вы вышли из системы');
      navigate('/');
      window.location.reload();
    }
  }, [navigate]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= BREAKPOINTS.TABLET);
  const [isChatMobile, setIsChatMobile] = useState(window.innerWidth <= 840);
  const [isChatTablet, setIsChatTablet] = useState(window.innerWidth > 840 && window.innerWidth <= 1024);
  const [isChatDesktop, setIsChatDesktop] = useState(window.innerWidth > 1024);
  // #18: промежуточный брейкпоинт — на ноутбучных экранах (≈1024-1280px)
  // трёхколоночный layout (sidebar 320 + content 1000 + rightSidebar 320)
  // не влезал и съезжал. Ниже 1280 скрываем правую колонку и даём
  // контенту растянуться.
  const [isCompact, setIsCompact] = useState(window.innerWidth <= 1400);
  const [messagesNavOpen, setMessagesNavOpen] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w <= BREAKPOINTS.TABLET);
      setIsCompact(w <= 1400);
      setIsChatMobile(w <= 840);
      setIsChatTablet(w > 840 && w <= 1024);
      setIsChatDesktop(w > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeAllModals = useCallback(() => {
    setProfileModalVisible(false);
    setNotificationsModalVisible(false);
    setArbitrationModalVisible(false);
    setFinanceModalVisible(false);
    setFaqModalVisible(false);
    setFriendProfileModalVisible(false);
  }, []);

  const openMessagesPage = useCallback((params?: {
    userId?: number;
    orderId?: number;
    chatId?: number;
    title?: string;
    support?: boolean;
  }) => {
    const search = new URLSearchParams();
    if (params?.userId) search.set('userId', String(params.userId));
    if (params?.orderId) search.set('orderId', String(params.orderId));
    if (params?.chatId) search.set('chatId', String(params.chatId));
    if (params?.title) search.set('title', params.title);
    if (params?.support) search.set('support', '1');
    const query = search.toString();

    navigate(`${ROUTES.messages}${query ? `?${query}` : ''}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  }, [location.pathname, location.search, navigate]);

  const handleMessagesClick = useCallback(() => {
    closeAllModals();
    openMessagesPage();
  }, [closeAllModals, openMessagesPage]);

  // Обработчик события для открытия формы подачи жалобы
  React.useEffect(() => {
    const handleOpenSupportChat = () => {
      // Перенаправляем на форму подачи жалобы вместо открытия чата
      closeAllModals();
      openMessagesPage({ support: true });
    };

    window.addEventListener('openSupportChat', handleOpenSupportChat);
    return () => {
      window.removeEventListener('openSupportChat', handleOpenSupportChat);
    };
  }, [closeAllModals, openMessagesPage]);

  // Обработчик события для открытия чата по userId или chatId
  React.useEffect(() => {
    const handleOpenChatById = (event: Event) => {
      const customEvent = event as CustomEvent;
      const chatId = customEvent.detail?.chatId;
      const userId = customEvent.detail?.userId;
      
      closeAllModals();
      
      openMessagesPage({ chatId, userId });
      
      // Отправляем событие для загрузки чата в MessageModalNew
    };

    window.addEventListener('openChatById', handleOpenChatById);
    return () => {
      window.removeEventListener('openChatById', handleOpenChatById);
    };
  }, [closeAllModals, openMessagesPage]);

  const handleNotificationsClick = useCallback(() => {
    closeAllModals();
    setNotificationsModalVisible(true);
  }, [closeAllModals]);

  const handleArbitrationClick = useCallback(() => {
    closeAllModals();
    navigate('/support');
  }, [closeAllModals, navigate]);

  const handleFinanceClick = useCallback(() => {
    closeAllModals();
    setFinanceModalVisible(true);
  }, [closeAllModals]);


  const handleFaqClick = useCallback(() => {
    closeAllModals();
    setFaqModalVisible(true);
  }, [closeAllModals]);

  const handleImprovementsClick = useCallback(() => {
    closeAllModals();
    navigate('/improvements');
  }, [closeAllModals, navigate]);

  const handleProfileClick = useCallback(() => {
    closeAllModals();
    setProfileModalVisible(true);
  }, [closeAllModals]);

  const handleSupportClick = useCallback(() => {
    // Перенаправляем на форму подачи жалобы
    closeAllModals();
    openMessagesPage({ support: true });
  }, [closeAllModals, openMessagesPage]);

  const handleHeaderMenuClick = useCallback(() => {
    if (isMobile) {
      setMobileMenuVisible(true);
    } else {
      setDesktopSidebarOpen((prev) => !prev);
    }
  }, [isMobile]);

  const sidebarUserProfile = useMemo(() => userProfile ? {
    id: userProfile.id,
    username: userProfile.username,
    display_username: userProfile.display_username,
    avatar: userProfile.avatar,
    role: userProfile.role
  } : undefined, [userProfile]);

  const contextValue = useMemo(() => ({
    openProfileModal: () => { closeAllModals(); setProfileModalVisible(true); },
    openMessageModal: (userId?: number) => { 
        closeAllModals(); 
        openMessagesPage({ userId }); 
    },
    openOrderChat: (orderId: number, userId: number, chatId?: number) => {
        closeAllModals();
        openMessagesPage({ orderId, userId, chatId, title: `Заказ #${orderId}` });
        // Если передан chatId, отправляем событие для открытия конкретного чата
    },
    openContextChat: (userId: number, title: string, workId?: number) => {
        closeAllModals();
        const contextTitle =
          typeof workId === 'number' && Number.isFinite(workId) && workId > 0
            ? `${title} | work:${workId}`
            : title;
        openMessagesPage({ userId, title: contextTitle });
    },
    openNotificationsModal: () => { closeAllModals(); setNotificationsModalVisible(true); },
    openArbitrationModal: () => { closeAllModals(); setArbitrationModalVisible(true); },
    openFinanceModal: () => { closeAllModals(); setFinanceModalVisible(true); },
    openFaqModal: () => { closeAllModals(); setFaqModalVisible(true); },
    openFriendProfileModal: (friend: User) => {
        closeAllModals();
        setSelectedFriend(friend);
        setFriendProfileModalVisible(true);
    },
    closeAllModals,
  }), [closeAllModals, openMessagesPage]);

  const handleMenuSelect = useCallback((key: string) => {
    if (key.startsWith('orders-') || key === 'orders') {
      const tabMap: Record<string, string> = {
        'orders-all': 'all',
        'orders-open': 'new',
        'orders-confirming': 'confirming',
        'orders-progress': 'in_progress',
        'orders-payment': 'waiting_payment',
        'orders-review': 'review',
        'orders-completed': 'completed',
        'orders-revision': 'revision',
        'orders-download': 'download',
        'orders-closed': 'closed',
        'orders-inactive': 'inactive',
      };
      const tab = tabMap[key];
      if (tab) navigate(`/works?tab=${tab}`);
      else navigate('/works');
      return;
    }

    if (key.startsWith('expert-client-orders-') || key === 'expert-client-orders') {
      const tabMap: Record<string, string> = {
        'expert-client-orders-all': 'all',
        'expert-client-orders-open': 'new',
        'expert-client-orders-confirming': 'confirming',
        'expert-client-orders-progress': 'in_progress',
        'expert-client-orders-payment': 'waiting_payment',
        'expert-client-orders-review': 'review',
        'expert-client-orders-completed': 'completed',
        'expert-client-orders-revision': 'revision',
        'expert-client-orders-download': 'download',
        'expert-client-orders-closed': 'closed',
        'expert-client-orders-inactive': 'inactive',
      };
      const tab = tabMap[key];
      if (tab) navigate(`/expert/client-orders?tab=${tab}`);
      else navigate('/expert/client-orders');
      return;
    }
  }, [navigate]);

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/expert') return 'dashboard';
    if (path.startsWith(ROUTES.messages)) return 'messages';
    if (path.startsWith('/support')) return 'arbitration';
    if (path === '/create-order') return 'create-order';
    if (path === '/orders-feed') return 'orders-feed';
    if (path.startsWith('/improvements')) return 'improvements';
    if (path.startsWith('/shop/ready-works')) return 'shop-ready-works';
    if (path.startsWith('/shop/add-work')) return 'shop-add-work';
    if (path.startsWith('/works')) {
      const tab = new URLSearchParams(location.search).get('tab');
      const tabKeyMap: Record<string, string> = {
        all: 'orders-all',
        new: 'orders-open',
        confirming: 'orders-confirming',
        in_progress: 'orders-progress',
        waiting_payment: 'orders-payment',
        review: 'orders-review',
        completed: 'orders-completed',
        revision: 'orders-revision',
        download: 'orders-download',
        closed: 'orders-closed',
        inactive: 'orders-inactive',
      };
      return tab && tabKeyMap[tab] ? tabKeyMap[tab] : 'orders';
    }
    if (path.startsWith('/expert/client-orders')) {
      const tab = new URLSearchParams(location.search).get('tab');
      const tabKeyMap: Record<string, string> = {
        all: 'expert-client-orders-all',
        new: 'expert-client-orders-open',
        confirming: 'expert-client-orders-confirming',
        in_progress: 'expert-client-orders-progress',
        waiting_payment: 'expert-client-orders-payment',
        review: 'expert-client-orders-review',
        completed: 'expert-client-orders-completed',
        revision: 'expert-client-orders-revision',
        download: 'expert-client-orders-download',
        closed: 'expert-client-orders-closed',
        inactive: 'expert-client-orders-inactive',
      };
      return tab && tabKeyMap[tab] ? tabKeyMap[tab] : 'expert-client-orders';
    }
    if (path.startsWith('/shop/purchased')) return 'shop-purchased';
    return '';
  };

  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';
  const shouldShowHeader = isExpert || isClient;
  const shouldPollMessages = Boolean(userProfile && shouldShowHeader);
  const isMessagesPage = location.pathname.startsWith(ROUTES.messages);

  React.useEffect(() => {
    if (!shouldShowHeader) return;
    void ensureSupportUserId();
  }, [ensureSupportUserId, shouldShowHeader]);

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: () => chatApi.getUnreadCount(),
    enabled: shouldPollMessages,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <Spin size="large" />
      </div>
    );
  }

  const dashboardLayoutClassName = [
    styles.dashboardLayout,
    isMobile ? styles.dashboardLayoutMobile : styles.dashboardLayoutDesktopExpanded,
    shouldShowHeader ? styles.dashboardLayoutHeader : styles.dashboardLayoutNoHeader,
    isMessagesPage ? styles.dashboardLayoutMessages : '',
  ].join(' ');

  const contentClassName = [
    styles.mainContent,
    styles.contentBase,
    isMessagesPage ? styles.contentNoPadding : (isMobile ? styles.contentPaddingMobile : styles.contentPaddingDesktop),
    shouldShowHeader ? styles.contentWithHeader : styles.contentNoHeader,
    isMessagesPage ? styles.contentNoMinHeight : '',
  ].join(' ');

  return (
    <DashboardContext.Provider value={contextValue}>
      <Layout className={styles.layoutRoot}>
        
        {shouldShowHeader && (
          <DashboardHeader
            userProfile={sidebarUserProfile}
            unreadMessages={unreadMessages}
            unreadNotifications={unreadNotifications}
            onMessagesClick={handleMessagesClick}
            onNotificationsClick={handleNotificationsOpen}
            onSupportClick={handleSupportClick}
            onBalanceClick={handleFinanceClick}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
            onMenuClick={handleHeaderMenuClick}
            isMobile={isMobile}
            isMessagesPage={isMessagesPage}
            onBurgerClick={() => setMessagesNavOpen(true)}
          />
        )}
        
        <div className={dashboardLayoutClassName}>
          {!isMessagesPage && (
            <Sidebar
              selectedKey={getSelectedKey()}
              onMenuSelect={handleMenuSelect}
              onLogout={handleLogout}
              onMessagesClick={handleMessagesClick}
              onNotificationsClick={handleNotificationsClick}
              onArbitrationClick={handleArbitrationClick}
              onFinanceClick={handleFinanceClick}
              onFaqClick={handleFaqClick}
              onImprovementsClick={handleImprovementsClick}
              mobileDrawerOpen={mobileMenuVisible}
              onMobileDrawerChange={setMobileMenuVisible}
              collapsed={false}
              unreadNotifications={unreadNotifications}
              userProfile={sidebarUserProfile}
              orderCounts={sidebarOrderCounts}
            />
          )}

          {!isMobile && desktopSidebarOpen && (
            <div
              className={styles.desktopSidebarOverlay}
              onClick={() => setDesktopSidebarOpen(false)}
            />
          )}
          
          <Layout className={`${styles.mainLayoutContent} ${isMessagesPage ? styles.mainLayoutContentMessages : ''}`}>
            <Content className={contentClassName}>
              {children}
            </Content>
          </Layout>
          
          {!isCompact && !isMessagesPage && (
            <RightSidebar />
          )}
        </div>
        
        {!isMessagesPage && <AppFooter userRole={userProfile?.role} />}
      </Layout>

      <Drawer
        placement="left"
        open={messagesNavOpen}
        onClose={() => setMessagesNavOpen(false)}
        width={320}
        className={styles.messagesNavDrawer}
        closable={false}
        maskClosable
        keyboard
      >
        <Sidebar
          selectedKey={getSelectedKey()}
          onMenuSelect={(key) => { handleMenuSelect(key); setMessagesNavOpen(false); }}
          onLogout={() => { setMessagesNavOpen(false); handleLogout(); }}
          onMessagesClick={() => { setMessagesNavOpen(false); handleMessagesClick(); }}
          onNotificationsClick={() => { setMessagesNavOpen(false); handleNotificationsOpen(); }}
          onArbitrationClick={() => { setMessagesNavOpen(false); handleArbitrationClick(); }}
          onFinanceClick={() => { setMessagesNavOpen(false); handleFinanceClick(); }}
          onFaqClick={() => { setMessagesNavOpen(false); handleFaqClick(); }}
          onImprovementsClick={() => { setMessagesNavOpen(false); handleImprovementsClick(); }}
          mobileDrawerOpen={messagesNavOpen}
          onMobileDrawerChange={setMessagesNavOpen}
          collapsed={false}
          unreadNotifications={unreadNotifications}
          userProfile={sidebarUserProfile}
          orderCounts={sidebarOrderCounts}
        />
      </Drawer>

      <Suspense fallback={<Spin size="large" />}>
        {profileModalVisible && (
          <ProfileModal
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            profile={userProfile || null}
            userProfile={userProfile}
          />
        )}
        {notificationsModalVisible && (
          <NotificationsModal
            visible={notificationsModalVisible}
            onClose={handleNotificationsClose}
            isMobile={isChatMobile}
            isTablet={isChatTablet}
          />
        )}
                <ArbitrationModal 
          visible={arbitrationModalVisible} 
          onClose={() => setArbitrationModalVisible(false)}
          isMobile={isMobile}
        />
        <FinanceModal 
          visible={financeModalVisible} 
          onClose={() => setFinanceModalVisible(false)}
          profile={userProfile}
          isMobile={isMobile}
        />

        <FaqModal 
          visible={faqModalVisible} 
          onClose={() => setFaqModalVisible(false)}
          isMobile={isChatMobile}
          isTablet={isChatTablet}
        />
        <FriendProfileModal
          visible={friendProfileModalVisible}
          onClose={() => setFriendProfileModalVisible(false)}
          friend={selectedFriend}
          onOpenChat={() => {
              setFriendProfileModalVisible(false);
              if (selectedFriend?.id) openMessagesPage({ userId: selectedFriend.id });
          }}
        />
      </Suspense>

      <Modal
        open={logoutModalVisible}
        onCancel={() => setLogoutModalVisible(false)}
        footer={null}
        centered
        width={400}
        closable={false}
        className={logoutStyles.logoutModal}
        wrapClassName={logoutStyles.logoutModalWrap}
      >
        <div className={logoutStyles.logoutModalBody}>
          <div className={logoutStyles.logoutModalIcon}>
            <LogoutOutlined />
          </div>
          <h3 className={logoutStyles.logoutModalTitle}>Выход из системы</h3>
          <p className={logoutStyles.logoutModalText}>Вы уверены, что хотите выйти из аккаунта?</p>
          <div className={logoutStyles.logoutModalActions}>
            <button
              className={`${logoutStyles.logoutModalBtn} ${logoutStyles.logoutModalBtnCancel}`}
              onClick={() => setLogoutModalVisible(false)}
            >
              Отмена
            </button>
            <button
              className={`${logoutStyles.logoutModalBtn} ${logoutStyles.logoutModalBtnConfirm}`}
              onClick={confirmLogout}
            >
              Выйти
            </button>
          </div>
        </div>
      </Modal>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;
