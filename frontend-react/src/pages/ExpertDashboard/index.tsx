import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Typography, message, Layout, Tabs } from 'antd';
import { LogoutOutlined, MenuOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { expertsApi } from '../../api/experts';
import { catalogApi } from '../../api/catalog';
import { ordersApi } from '../../api/orders';
import { useNotifications } from '../../hooks/useNotifications';
import DashboardHeader from '../../components/common/DashboardHeader';
import Sidebar from '../../components/layout/Sidebar';
import ProfileHeader from './components/ProfileHeader/index';
import ApplicationStatus from './components/ApplicationStatus/index';
import AboutTab from './components/AboutTab';
import SpecializationsTab from './components/SpecializationsTab';
import ReviewsTab from './components/ReviewsTab';
import OrdersTab from './components/OrdersTab';
import WorksTab from './components/WorksTab';
import FriendsTab from './components/FriendsTab';
import { UserProfile, ChatMessage } from './types';
import { mockNotifications, mockArbitrationCases, mockMessages } from './mockData';
import styles from './ExpertDashboard.module.css';

// Импорт модальных окон
import ProfileModal from './modals/ProfileModal';
import ApplicationModal from './modals/ApplicationModal';
import WelcomeModal from './modals/WelcomeModal';
import SpecializationModal from './modals/SpecializationModal';
import MessageModal from './modals/MessageModalNew';
import NotificationsModal from './modals/NotificationsModalNew';
import ArbitrationModal from './modals/ArbitrationModal';
import FinanceModal from './modals/FinanceModal';
import FriendsModal from './modals/FriendsModal';
import FaqModal from './modals/FaqModal';
import FriendProfileModal from './modals/FriendProfileModal';

const { Title } = Typography;
const { Header, Content } = Layout;

const ExpertDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Загружаем уведомления
  const { unreadCount: unreadNotifications } = useNotifications();
  
  // State для модальных окон
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
  const [specializationModalVisible, setSpecializationModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [friendProfileModalVisible, setFriendProfileModalVisible] = useState(false);
  const [selectedUserIdForChat, setSelectedUserIdForChat] = useState<number | undefined>(undefined);
  
  // Остальной state
  const [activeTab, setActiveTab] = useState<string>('about');
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('orders');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockMessages);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [editingSpecialization, setEditingSpecialization] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  
  const tabsRef = useRef<HTMLDivElement>(null);

  const closeAllModals = () => {
    setProfileModalVisible(false);
    setApplicationModalVisible(false);
    setWelcomeModalVisible(false);
    setSpecializationModalVisible(false);
    setMessageModalVisible(false);
    setNotificationsModalVisible(false);
    setArbitrationModalVisible(false);
    setFinanceModalVisible(false);
    setFriendsModalVisible(false);
    setFaqModalVisible(false);
    setFriendProfileModalVisible(false);
    setSelectedUserIdForChat(undefined);
  };

  // Загрузка данных
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['expert-application'],
    queryFn: async () => {
      try {
        return await expertsApi.getMyApplication();
      } catch {
        return null;
      }
    },
    retry: false
  });

  const { data: specializationsData, isLoading: specializationsLoading } = useQuery({
    queryKey: ['expert-specializations'],
    queryFn: () => expertsApi.getSpecializations(),
  });

  const specializations = Array.isArray(specializationsData) ? specializationsData : [];

  const { data: expertStats } = useQuery({
    queryKey: ['expert-statistics', userProfile?.id],
    queryFn: () => expertsApi.getExpertStatistics(userProfile!.id),
    enabled: !!userProfile?.id,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  React.useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    authApi.logout();
    message.success('Вы вышли из системы');
    navigate('/');
    window.location.reload();
  };

  const handleMenuSelect = (key: string) => {
    if (key.startsWith('orders-')) {
      setSelectedMenuKey('orders');
      setActiveTab('orders');
      setTimeout(() => {
        tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }
    if (key === 'orders') {
      setSelectedMenuKey(key);
      setActiveTab(key);
      setTimeout(() => {
        tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }
    setSelectedMenuKey(key);
  };

  return (
    <>
      <Layout style={{ minHeight: '100vh' }} className={styles.expertDashboardPage}>
        <Sidebar
          selectedKey={selectedMenuKey}
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
          userProfile={profile ? {
            username: profile.username,
            avatar: profile.avatar,
            role: profile.role
          } : undefined}
        />
        
        <Layout style={{ marginLeft: isMobile ? 0 : 250 }}>
          <DashboardHeader
            userProfile={userProfile}
            unreadNotifications={unreadNotifications}
            onMenuClick={() => setMobileMenuVisible(true)}
            onLogout={handleLogout}
            onProfileClick={() => { closeAllModals(); setProfileModalVisible(true); }}
            onMessagesClick={() => setMessageModalVisible(true)}
            onNotificationsClick={() => setNotificationsModalVisible(true)}
            onBalanceClick={() => setFinanceModalVisible(true)}
            isMobile={isMobile}
          />
          
          <Content
            style={{
              margin: isMobile ? '0' : '24px',
              padding: isMobile ? '16px' : '24px',
              background: '#fff',
              borderRadius: isMobile ? '0' : '8px',
              minHeight: 'calc(100vh - 112px)',
              marginBottom: isMobile ? '80px' : '24px',
            }}
          >
            <div className={styles.expertContentContainer}>
              <ProfileHeader
                profile={profile}
                expertStats={expertStats}
                userProfile={userProfile}
                isMobile={isMobile}
                onEditProfile={() => { closeAllModals(); setProfileModalVisible(true); }}
              />
              
              <ApplicationStatus
                application={application || null}
                applicationLoading={applicationLoading}
                userProfile={userProfile}
                isMobile={isMobile}
                onOpenApplicationModal={() => { closeAllModals(); setApplicationModalVisible(true); }}
              />
              
              <div ref={tabsRef}>
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'about',
                      label: 'О себе',
                      children: (
                        <AboutTab
                          profile={profile}
                          isMobile={isMobile}
                          onEdit={() => { closeAllModals(); setProfileModalVisible(true); }}
                        />
                      ),
                    },
                    // Специализации только для экспертов
                    ...(userProfile?.role === 'expert' ? [{
                      key: 'specializations',
                      label: `Специализации ${specializations.length || 0}`,
                      children: (
                        <SpecializationsTab
                          specializations={specializations}
                          specializationsLoading={specializationsLoading}
                          isMobile={isMobile}
                          onEdit={(spec) => {
                            closeAllModals();
                            setEditingSpecialization(spec);
                            setSpecializationModalVisible(true);
                          }}
                          onAdd={() => {
                            closeAllModals();
                            setEditingSpecialization(null);
                            setSpecializationModalVisible(true);
                          }}
                        />
                      ),
                    }] : []),
                    // Отзывы только для экспертов
                    ...(userProfile?.role === 'expert' ? [{
                      key: 'reviews',
                      label: 'Отзывы 3',
                      children: <ReviewsTab isMobile={isMobile} />,
                    }] : []),
                    {
                      key: 'orders',
                      label: 'Заказы',
                      children: <OrdersTab isMobile={isMobile} />,
                    },
                    // Работы только для экспертов
                    ...(userProfile?.role === 'expert' ? [{
                      key: 'works',
                      label: 'Работы 0',
                      children: (
                        <WorksTab 
                          isMobile={isMobile}
                          myCompleted={[]}
                          myInProgress={[]}
                        />
                      ),
                    }] : []),
                    {
                      key: 'friends',
                      label: 'Мои друзья',
                      children: (
                        <FriendsTab 
                          isMobile={isMobile}
                          onOpenChat={(friend) => {
                            console.log('FriendsTab onOpenChat called with friend:', friend);
                            closeAllModals();
                            setSelectedUserIdForChat(friend.id);
                            console.log('Setting selectedUserIdForChat to:', friend.id);
                            setMessageModalVisible(true);
                          }}
                          onOpenProfile={(friend) => {
                            closeAllModals();
                            setSelectedFriend(friend);
                            setFriendProfileModalVisible(true);
                          }}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>

      {/* Модальные окна */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        profile={profile}
        userProfile={userProfile}
      />
      
      <ApplicationModal
        visible={applicationModalVisible}
        onClose={() => setApplicationModalVisible(false)}
      />
      
      <WelcomeModal
        visible={welcomeModalVisible}
        onClose={() => setWelcomeModalVisible(false)}
        userProfile={userProfile}
      />
      
      <SpecializationModal
        visible={specializationModalVisible}
        onClose={() => setSpecializationModalVisible(false)}
        editingSpecialization={editingSpecialization}
        subjects={subjects}
      />
      
      <MessageModal
        visible={messageModalVisible}
        onClose={() => {
          setMessageModalVisible(false);
          setSelectedUserIdForChat(undefined);
        }}
        isMobile={isMobile}
        isTablet={window.innerWidth > 840 && window.innerWidth <= 1024}
        isDesktop={window.innerWidth > 1024}
        selectedUserId={selectedUserIdForChat}
        onCreateOrder={() => {
          // Логика создания заказа
        }}
      />
      
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        isMobile={isMobile}
        isDesktop={window.innerWidth > 1024}
      />
      
      <ArbitrationModal
        visible={arbitrationModalVisible}
        onClose={() => setArbitrationModalVisible(false)}
        cases={mockArbitrationCases}
        isMobile={isMobile}
        isDesktop={window.innerWidth > 1024}
      />
      
      <FinanceModal
        visible={financeModalVisible}
        onClose={() => setFinanceModalVisible(false)}
        profile={profile}
        isMobile={isMobile}
      />
      
      <FriendsModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
        onOpenChat={(friend) => {
          console.log('FriendsModal onOpenChat called with friend:', friend);
          closeAllModals();
          setSelectedUserIdForChat(friend.id);
          console.log('Setting selectedUserIdForChat to:', friend.id);
          setMessageModalVisible(true);
        }}
        onOpenProfile={(friend) => {
          closeAllModals();
          setSelectedFriend(friend);
          setFriendProfileModalVisible(true);
        }}
        isMobile={isMobile}
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
          closeAllModals();
          setMessageModalVisible(true);
        }}
        isMobile={isMobile}
      />
    </>
  );
};

export default ExpertDashboard;
