import React, { useState } from 'react';
import { Layout, Typography, Modal, message, Spin } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  TrophyOutlined,
  WalletOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  ShopOutlined,
  TeamOutlined,
  HeartOutlined,
  GiftOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { ordersApi } from '../../api/orders';
import DashboardHeader from '../common/DashboardHeader';
import Sidebar from './Sidebar';
import { useNotifications } from '../../hooks/useNotifications';
import { DashboardContext } from '../../contexts/DashboardContext';
import styles from './DashboardLayout.module.css';

// Импорт модальных окон
import ProfileModal from '../../pages/ExpertDashboard/modals/ProfileModal';
import MessageModal from '../../pages/ExpertDashboard/modals/MessageModalNew';
import NotificationsModal from '../../pages/ExpertDashboard/modals/NotificationsModalNew';
import ArbitrationModal from '../../pages/ExpertDashboard/modals/ArbitrationModal';
import FinanceModal from '../../pages/ExpertDashboard/modals/FinanceModal';
import FriendsModal from '../../pages/ExpertDashboard/modals/FriendsModal';
import FaqModal from '../../pages/ExpertDashboard/modals/FaqModal';
import FriendProfileModal from '../../pages/ExpertDashboard/modals/FriendProfileModal';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  
  // State для модальных окон
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [friendProfileModalVisible, setFriendProfileModalVisible] = useState(false);
  
  const [selectedUserIdForChat, setSelectedUserIdForChat] = useState<number | undefined>(undefined);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  const { unreadCount: unreadNotifications } = useNotifications();

  // Загружаем профиль пользователя
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем заказы для подсчета статистики
  const { data: ordersData } = useQuery({
    queryKey: ['user-orders', userProfile?.role],
    queryFn: () => {
      if (userProfile?.role === 'client') {
        return ordersApi.getClientOrders();
      } else if (userProfile?.role === 'expert') {
        return ordersApi.getMyOrders({});
      }
      return null;
    },
    enabled: !!userProfile,
  });

  // Подсчет статистики заказов
  const orders = ordersData?.results || ordersData || [];
  const ordersCount = {
    all: orders.length,
    new: orders.filter((o: any) => o.status === 'new').length,
    confirming: orders.filter((o: any) => o.status === 'confirming').length,
    in_progress: orders.filter((o: any) => o.status === 'in_progress').length,
    payment: orders.filter((o: any) => o.status === 'payment').length,
    review: orders.filter((o: any) => o.status === 'review').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    revision: orders.filter((o: any) => o.status === 'revision').length,
    download: orders.filter((o: any) => o.status === 'download').length,
    closed: orders.filter((o: any) => o.status === 'closed').length,
  };

  // Получаем баланс из профиля пользователя
  const balance = userProfile?.balance ? parseFloat(userProfile.balance) : 0.00;

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
        } catch (error) {
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
  };

  const contextValue = {
    openProfileModal: () => { closeAllModals(); setProfileModalVisible(true); },
    openMessageModal: (userId?: number) => { 
        closeAllModals(); 
        if (userId) setSelectedUserIdForChat(userId);
        setMessageModalVisible(true); 
    },
    openNotificationsModal: () => { closeAllModals(); setNotificationsModalVisible(true); },
    openArbitrationModal: () => { closeAllModals(); setArbitrationModalVisible(true); },
    openFinanceModal: () => { closeAllModals(); setFinanceModalVisible(true); },
    openFriendsModal: () => { closeAllModals(); setFriendsModalVisible(true); },
    openFaqModal: () => { closeAllModals(); setFaqModalVisible(true); },
    openFriendProfileModal: (friend: any) => {
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
    // Other navigation is handled by Sidebar's navigate calls or simple links
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';

  return (
    <DashboardContext.Provider value={contextValue}>
      <Layout style={{ minHeight: '100vh' }}>
        {/* Header */}
        <DashboardHeader
          userProfile={userProfile ? {
            username: userProfile.username,
            avatar: userProfile.avatar,
            role: userProfile.role,
            balance: balance
          } : undefined}
          unreadMessages={0}
          unreadNotifications={unreadNotifications}
          onMessagesClick={() => { closeAllModals(); setMessageModalVisible(true); }}
          onNotificationsClick={() => { closeAllModals(); setNotificationsModalVisible(true); }}
          onBalanceClick={() => { closeAllModals(); setFinanceModalVisible(true); }}
          onProfileClick={() => { closeAllModals(); setProfileModalVisible(true); }}
          onLogout={handleLogout}
          onMenuClick={() => setMobileMenuVisible(true)}
          isMobile={isMobile}
        />
        
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
        
        <Layout style={{ 
          marginLeft: isMobile ? 0 : 250, 
          marginTop: 64, // Отступ для хедера
          background: '#f5f5f5',
          transition: 'all 0.2s'
        }}>
          <Content className={styles.mainContent} style={{ 
            padding: isMobile ? '16px' : '24px', 
            minHeight: 'calc(100vh - 64px)',
            display: 'block',
            visibility: 'visible',
            opacity: 1
          }}>
            {children}
          </Content>
        </Layout>
      </Layout>

      {/* Modals */}
      <ProfileModal 
        visible={profileModalVisible} 
        onClose={() => setProfileModalVisible(false)} 
        profile={userProfile}
        userProfile={userProfile}
      />
      <MessageModal 
        visible={messageModalVisible} 
        onClose={() => { setMessageModalVisible(false); setSelectedUserIdForChat(undefined); }}
        isMobile={isMobile}
        isTablet={window.innerWidth > 840 && window.innerWidth <= 1024}
        isDesktop={window.innerWidth > 1024}
        selectedUserId={selectedUserIdForChat}
      />
      <NotificationsModal 
        visible={notificationsModalVisible} 
        onClose={() => setNotificationsModalVisible(false)}
        isMobile={isMobile}
        isDesktop={!isMobile}
      />
      <ArbitrationModal 
        visible={arbitrationModalVisible} 
        onClose={() => setArbitrationModalVisible(false)}
        cases={[]} 
        isMobile={isMobile}
        isDesktop={!isMobile}
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
        isMobile={isMobile}
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
