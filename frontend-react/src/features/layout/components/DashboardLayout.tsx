import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { Layout, Modal, message, Spin } from 'antd';
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
import '@/styles/modals.css';


const ProfileModal = lazy(() => import('@/features/expert/modals/ProfileModal'));
const MessageModal = lazy(() => import('@/features/expert/modals/MessageModalNew'));
const NotificationsModal = lazy(() => import('@/features/expert/modals/NotificationsModalNew'));
const ArbitrationModal = lazy(() => import('@/features/expert/modals/ArbitrationModal'));
const FinanceModal = lazy(() => import('@/features/expert/modals/FinanceModal'));
const FriendsModal = lazy(() => import('@/features/expert/modals/FriendsModal'));
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
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [friendProfileModalVisible, setFriendProfileModalVisible] = useState(false);
  
  const [selectedUserIdForChat, setSelectedUserIdForChat] = useState<number | undefined>(undefined);
  const [selectedOrderIdForChat, setSelectedOrderIdForChat] = useState<number | undefined>(undefined);
  const [selectedChatContextTitle, setSelectedChatContextTitle] = useState<string | undefined>(undefined);
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
    queryKey: ['user-profile'],
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

  const handleLogout = useCallback(() => {
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
        } catch (_error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/');
          window.location.reload();
        }
      },
    });
  }, [navigate]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeAllModals = useCallback(() => {
    setProfileModalVisible(false);
    setMessageModalVisible(false);
    setNotificationsModalVisible(false);
    setArbitrationModalVisible(false);
    setFinanceModalVisible(false);
    setFriendsModalVisible(false);
    setFaqModalVisible(false);
    setFriendProfileModalVisible(false);
    setSelectedUserIdForChat(undefined);
    setSelectedOrderIdForChat(undefined);
    setSelectedChatContextTitle(undefined);
  }, []);

  const handleMessagesClick = useCallback(() => {
    closeAllModals();
    setMessageModalVisible(true);
  }, [closeAllModals]);

  // Обработчик события для открытия формы подачи жалобы
  React.useEffect(() => {
    const handleOpenSupportChat = () => {
      // Перенаправляем на форму подачи жалобы вместо открытия чата
      closeAllModals();
      setMessageModalVisible(true);
      setSelectedUserIdForChat(undefined);
      setSelectedOrderIdForChat(undefined);
      setSelectedChatContextTitle(undefined);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openSupportCenter'));
      }, 300);
    };

    window.addEventListener('openSupportChat', handleOpenSupportChat);
    return () => {
      window.removeEventListener('openSupportChat', handleOpenSupportChat);
    };
  }, [closeAllModals]);

  // Обработчик события для открытия чата по userId или chatId
  React.useEffect(() => {
    const handleOpenChatById = (event: Event) => {
      const customEvent = event as CustomEvent;
      const chatId = customEvent.detail?.chatId;
      const userId = customEvent.detail?.userId;
      
      closeAllModals();
      
      if (userId) {
        setSelectedUserIdForChat(userId);
      }
      
      setMessageModalVisible(true);
      
      // Отправляем событие для загрузки чата в MessageModalNew
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openChatById', {
          detail: { chatId, userId }
        }));
      }, 300);
    };

    window.addEventListener('openChatById', handleOpenChatById);
    return () => {
      window.removeEventListener('openChatById', handleOpenChatById);
    };
  }, [closeAllModals]);

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

  const handleFriendsClick = useCallback(() => {
    closeAllModals();
    setFriendsModalVisible(true);
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
    setMessageModalVisible(true);
    setSelectedUserIdForChat(undefined);
    setSelectedOrderIdForChat(undefined);
    setSelectedChatContextTitle(undefined);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openSupportCenter'));
    }, 300);
  }, [closeAllModals]);

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
    avatar: userProfile.avatar,
    role: userProfile.role
  } : undefined, [userProfile]);

  const contextValue = useMemo(() => ({
    openProfileModal: () => { closeAllModals(); setProfileModalVisible(true); },
    openMessageModal: (userId?: number) => { 
        closeAllModals(); 
        setSelectedOrderIdForChat(undefined);
        if (userId) setSelectedUserIdForChat(userId);
        setSelectedChatContextTitle(undefined);
        setMessageModalVisible(true); 
    },
    openOrderChat: (orderId: number, userId: number, chatId?: number) => {
        closeAllModals();
        setSelectedOrderIdForChat(orderId);
        setSelectedUserIdForChat(userId);
        setSelectedChatContextTitle(`Заказ #${orderId}`);
        // Если передан chatId, отправляем событие для открытия конкретного чата
        if (chatId) {
          setMessageModalVisible(true);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openChatById', {
              detail: { chatId }
            }));
          }, 300);
        } else {
          setMessageModalVisible(true);
        }
    },
    openContextChat: (userId: number, title: string, workId?: number) => {
        closeAllModals();
        setSelectedOrderIdForChat(undefined);
        setSelectedUserIdForChat(userId);
        const contextTitle =
          typeof workId === 'number' && Number.isFinite(workId) && workId > 0
            ? `${title} | work:${workId}`
            : title;
        setSelectedChatContextTitle(contextTitle);
        setMessageModalVisible(true);
    },
    openNotificationsModal: () => { closeAllModals(); setNotificationsModalVisible(true); },
    openArbitrationModal: () => { closeAllModals(); setArbitrationModalVisible(true); },
    openFinanceModal: () => { closeAllModals(); setFinanceModalVisible(true); },
    openFriendsModal: () => { closeAllModals(); setFriendsModalVisible(true); },
    openFaqModal: () => { closeAllModals(); setFaqModalVisible(true); },
    openFriendProfileModal: (friend: User) => {
        closeAllModals();
        setSelectedFriend(friend);
        setFriendProfileModalVisible(true);
    },
    closeAllModals,
  }), [closeAllModals]);

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
  ].join(' ');

  const contentClassName = [
    styles.mainContent,
    styles.contentBase,
    isMobile ? styles.contentPaddingMobile : styles.contentPaddingDesktop,
    shouldShowHeader ? styles.contentWithHeader : styles.contentNoHeader,
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
          />
        )}
        
        <div className={dashboardLayoutClassName}>
          <Sidebar
            selectedKey={getSelectedKey()}
            onMenuSelect={handleMenuSelect}
            onLogout={handleLogout}
            onMessagesClick={handleMessagesClick}
            onNotificationsClick={handleNotificationsClick}
            onArbitrationClick={handleArbitrationClick}
            onFinanceClick={handleFinanceClick}
            onFriendsClick={handleFriendsClick}
            onFaqClick={handleFaqClick}
            onImprovementsClick={handleImprovementsClick}
            mobileDrawerOpen={mobileMenuVisible}
            onMobileDrawerChange={setMobileMenuVisible}
            collapsed={false}
            unreadNotifications={unreadNotifications}
            userProfile={sidebarUserProfile}
            orderCounts={sidebarOrderCounts}
          />

          {!isMobile && desktopSidebarOpen && (
            <div
              className={styles.desktopSidebarOverlay}
              onClick={() => setDesktopSidebarOpen(false)}
            />
          )}
          
          <Layout className={styles.mainLayoutContent}>
            <Content className={contentClassName}>
              {children}
            </Content>
          </Layout>
          
          {!isMobile && (
            <RightSidebar />
          )}
        </div>
        
        <AppFooter userRole={userProfile?.role} />
      </Layout>

      
      <Suspense fallback={<Spin size="large" />}>
        {profileModalVisible && (
          <ProfileModal
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            profile={userProfile || null}
            userProfile={userProfile}
          />
        )}
        {messageModalVisible && (
          <MessageModal
            visible={messageModalVisible}
            onClose={() => {
              setMessageModalVisible(false);
              setSelectedUserIdForChat(undefined);
              setSelectedOrderIdForChat(undefined);
              setSelectedChatContextTitle(undefined);
            }}
            isMobile={window.innerWidth <= 768}
            isTablet={window.innerWidth > 768 && window.innerWidth <= 1024}
            isDesktop={window.innerWidth > 1024}
            selectedUserId={selectedUserIdForChat}
            selectedOrderId={selectedOrderIdForChat}
            chatContextTitle={selectedChatContextTitle}
            supportUserId={supportUserId || undefined}
            userProfile={userProfile}
          />
        )}
        {notificationsModalVisible && (
          <NotificationsModal
            visible={notificationsModalVisible}
            onClose={handleNotificationsClose}
            isMobile={window.innerWidth <= 768}
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
        <FriendsModal 
          visible={friendsModalVisible} 
          onClose={() => setFriendsModalVisible(false)}
          isMobile={isMobile}
          onOpenChat={(friend) => {
              setFriendsModalVisible(false);
              setSelectedUserIdForChat(friend.id);
              setMessageModalVisible(true);
          }}
          onOpenProfile={(friend) => {
              setFriendsModalVisible(false);
              setSelectedFriend(friend);
              setFriendProfileModalVisible(true);
          }}
        />
        <FaqModal 
          visible={faqModalVisible} 
          onClose={() => setFaqModalVisible(false)}
          isMobile={isMobile}
        />
        <FriendProfileModal
          visible={friendProfileModalVisible}
          onClose={() => setFriendProfileModalVisible(false)}
          friend={selectedFriend}
          onOpenChat={() => {
              setFriendProfileModalVisible(false);
              setMessageModalVisible(true);
              if (selectedFriend?.id) setSelectedUserIdForChat(selectedFriend.id);
          }}
        />
      </Suspense>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;
