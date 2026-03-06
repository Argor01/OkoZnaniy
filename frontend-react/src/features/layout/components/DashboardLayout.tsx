import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { Layout, Modal, message, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '@/features/auth/api/auth';
import { chatApi } from '@/features/support/api/chat';
import DashboardHeader from './DashboardHeader';
import Sidebar from './Sidebar';
import { useNotifications } from '@/hooks/useNotifications';
import { DashboardContext } from '@/contexts/DashboardContext';
import { AppFooter } from '@/components/layout/AppFooter';
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

  const { unreadCount: unreadNotifications } = useNotifications();

  
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  
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

  // Обработчик события для открытия чата с поддержкой
  React.useEffect(() => {
    const handleOpenSupportChat = () => {
      closeAllModals();
      setMessageModalVisible(true);
      // Отправляем событие для загрузки чата поддержки в MessageModalNew
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('loadSupportChatInModal'));
      }, 100);
    };

    window.addEventListener('openSupportChat', handleOpenSupportChat);
    return () => {
      window.removeEventListener('openSupportChat', handleOpenSupportChat);
    };
  }, [closeAllModals]);

  const handleNotificationsClick = useCallback(() => {
    closeAllModals();
    setNotificationsModalVisible(true);
  }, [closeAllModals]);

  const handleArbitrationClick = useCallback(() => {
    closeAllModals();
    setArbitrationModalVisible(true);
  }, [closeAllModals]);

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

  const handleProfileClick = useCallback(() => {
    closeAllModals();
    setProfileModalVisible(true);
  }, [closeAllModals]);

  const handleSupportClick = useCallback(() => {
    void (async () => {
      const id = await ensureSupportUserId();
      if (!id) {
        message.error('Поддержка не настроена');
        return;
      }
      closeAllModals();
      setSelectedUserIdForChat(id);
      setSelectedChatContextTitle(undefined);
      setMessageModalVisible(true);
    })();
  }, [closeAllModals, ensureSupportUserId]);

  const handleHeaderMenuClick = useCallback(() => {
    if (isMobile) {
      setMobileMenuVisible(true);
    } else {
      setDesktopSidebarOpen((prev) => !prev);
    }
  }, [isMobile]);

  const sidebarUserProfile = useMemo(() => userProfile ? {
    username: userProfile.username,
    avatar: userProfile.avatar,
    role: userProfile.role
  } : undefined, [userProfile?.username, userProfile?.avatar, userProfile?.role]);

  const contextValue = useMemo(() => ({
    openProfileModal: () => { closeAllModals(); setProfileModalVisible(true); },
    openMessageModal: (userId?: number) => { 
        closeAllModals(); 
        if (userId) setSelectedUserIdForChat(userId);
        setSelectedChatContextTitle(undefined);
        setMessageModalVisible(true); 
    },
    openOrderChat: (orderId: number, userId: number) => {
        closeAllModals();
        setSelectedOrderIdForChat(orderId);
        setSelectedUserIdForChat(userId);
        setSelectedChatContextTitle(undefined);
        setMessageModalVisible(true);
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
      navigate('/expert?tab=orders');
      return;
    }
  }, [navigate]);

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/expert') return 'dashboard';
    if (path === '/create-order') return 'create-order';
    if (path === '/orders-feed') return 'orders-feed';
    if (path.startsWith('/shop/ready-works')) return 'shop-ready-works';
    if (path.startsWith('/shop/add-work')) return 'shop-add-work';
    if (path.startsWith('/works')) return 'works';
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
    isMobile ? styles.dashboardLayoutMobile : (desktopSidebarOpen ? styles.dashboardLayoutDesktop : ''),
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
            onNotificationsClick={handleNotificationsClick}
            onSupportClick={handleSupportClick}
            onBalanceClick={handleFinanceClick}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
            onMenuClick={handleHeaderMenuClick}
            isMobile={isMobile}
          />
        )}
        
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
          mobileDrawerOpen={mobileMenuVisible}
          onMobileDrawerChange={setMobileMenuVisible}
          collapsed={!isMobile && !desktopSidebarOpen}
          unreadNotifications={unreadNotifications}
          userProfile={sidebarUserProfile}
        />
        
        <Layout className={dashboardLayoutClassName}>
          <Content className={contentClassName}>
            {children}
          </Content>
          <AppFooter userRole={userProfile?.role} />
        </Layout>
      </Layout>

      
      <Suspense fallback={null}>
        <ProfileModal 
          visible={profileModalVisible} 
          onClose={() => setProfileModalVisible(false)} 
          profile={userProfile}
          userProfile={userProfile}
        />
        <MessageModal 
          visible={messageModalVisible} 
          onClose={() => { setMessageModalVisible(false); setSelectedUserIdForChat(undefined); setSelectedOrderIdForChat(undefined); setSelectedChatContextTitle(undefined); }}
          isMobile={isMobile}
          isTablet={window.innerWidth > 840 && window.innerWidth <= 1024}
          isDesktop={window.innerWidth > 1024}
          selectedUserId={selectedUserIdForChat}
          selectedOrderId={selectedOrderIdForChat}
          chatContextTitle={selectedChatContextTitle}
          supportUserId={supportUserId ?? undefined}
          userProfile={userProfile}
        />
        <NotificationsModal 
          visible={notificationsModalVisible} 
          onClose={() => setNotificationsModalVisible(false)}
          isMobile={isMobile}
        />
        <ArbitrationModal 
          visible={arbitrationModalVisible} 
          onClose={() => setArbitrationModalVisible(false)}
          cases={[]} 
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
