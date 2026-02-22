import React, { useState } from 'react';
import { Layout, Modal, message, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '../../api/auth';
import { chatApi } from '../../api/chat';
import DashboardHeader from '../common/DashboardHeader';
import Sidebar from './Sidebar';
import { useNotifications } from '../../hooks/useNotifications';
import { DashboardContext } from '../../contexts/DashboardContext';
import styles from './DashboardLayout.module.css';


import ProfileModal from '../../pages/ExpertDashboard/modals/ProfileModal';
import MessageModal from '../../pages/ExpertDashboard/modals/MessageModalNew';
import NotificationsModal from '../../pages/ExpertDashboard/modals/NotificationsModalNew';
import ArbitrationModal from '../../pages/ExpertDashboard/modals/ArbitrationModal';
import FinanceModal from '../../pages/ExpertDashboard/modals/FinanceModal';
import FriendsModal from '../../pages/ExpertDashboard/modals/FriendsModal';
import FaqModal from '../../pages/ExpertDashboard/modals/FaqModal';
import FriendProfileModal from '../../pages/ExpertDashboard/modals/FriendProfileModal';

const { Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  
  
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
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeAllModals = () => {
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
  };

  const contextValue = {
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
  };

  const handleMenuSelect = (key: string) => {
    if (key.startsWith('orders-') || key === 'orders') {
      navigate('/expert?tab=orders');
      return;
    }
    
  };

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
    isMobile ? styles.dashboardLayoutMobile : styles.dashboardLayoutDesktop,
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
            userProfile={userProfile ? {
              username: userProfile.username,
              avatar: userProfile.avatar,
              role: userProfile.role,
              balance: balance
            } : undefined}
            unreadMessages={unreadMessages}
            unreadNotifications={unreadNotifications}
            onMessagesClick={() => { closeAllModals(); setMessageModalVisible(true); }}
            onNotificationsClick={() => { closeAllModals(); setNotificationsModalVisible(true); }}
            onSupportClick={() => {
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
            }}
            onBalanceClick={() => { closeAllModals(); setFinanceModalVisible(true); }}
            onProfileClick={() => { closeAllModals(); setProfileModalVisible(true); }}
            onLogout={handleLogout}
            onMenuClick={() => setMobileMenuVisible(true)}
            isMobile={isMobile}
          />
        )}
        
        <Sidebar
          selectedKey={getSelectedKey()}
          onMenuSelect={handleMenuSelect}
          onLogout={handleLogout}
          onMessagesClick={() => { closeAllModals(); setMessageModalVisible(true); }}
          onNotificationsClick={() => { closeAllModals(); setNotificationsModalVisible(true); }}
          onArbitrationClick={() => { closeAllModals(); setArbitrationModalVisible(true); }}
          onFinanceClick={() => { closeAllModals(); setFinanceModalVisible(true); }}
          onFriendsClick={() => { closeAllModals(); setFriendsModalVisible(true); }}
          onFaqClick={() => { closeAllModals(); setFaqModalVisible(true); }}
          mobileDrawerOpen={mobileMenuVisible}
          onMobileDrawerChange={setMobileMenuVisible}
          unreadNotifications={unreadNotifications}
          userProfile={userProfile ? {
            username: userProfile.username,
            avatar: userProfile.avatar,
            role: userProfile.role
          } : undefined}
        />
        
        <Layout className={dashboardLayoutClassName}>
          <Content className={contentClassName}>
            {children}
          </Content>
        </Layout>
      </Layout>

      
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
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;
