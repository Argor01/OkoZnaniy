import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message, Tabs } from 'antd';
import type { FC } from 'react';
import { authApi } from '../../api/auth';
import type { User } from '../../api/auth';
import { expertsApi, type Specialization } from '../../api/experts';
import { useNotifications } from '../../hooks/useNotifications';
import ProfileHeader from './components/ProfileHeader/index';
import ApplicationStatus from './components/ApplicationStatus/index';
import AboutTab from './components/AboutTab';
import SpecializationsTab from './components/SpecializationsTab';
import ReviewsTab from './components/ReviewsTab';
import OrdersTab from './components/OrdersTab';
import WorksTab from './components/WorksTab';
import FriendsTab from './components/FriendsTab';
import { UserProfile } from './types';
import { mockArbitrationCases } from './mockData';
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

const ExpertDashboard: FC = () => {
  const queryClient = useQueryClient();
  
  // Загружаем уведомления
  useNotifications();
  
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [editingSpecialization, setEditingSpecialization] = useState<Specialization | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  
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

  const deleteSpecializationMutation = useMutation({
    mutationFn: (id: number) => expertsApi.deleteSpecialization(id),
    onSuccess: () => {
      message.success('Специализация удалена');
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось удалить специализацию';
      message.error(detail);
    },
  });

  const specializations = Array.isArray(specializationsData) ? specializationsData : [];

  const { data: expertStats } = useQuery({
    queryKey: ['expert-statistics', userProfile?.id],
    queryFn: () => expertsApi.getExpertStatistics(userProfile!.id),
    enabled: !!userProfile?.id,
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

  return (
    <>
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
                    onDelete={(spec) => {
                      if (!spec?.id) return;
                      deleteSpecializationMutation.mutate(spec.id);
                    }}
                  />
                ),
              }] : []),
              // Отзывы только для экспертов
              ...(userProfile?.role === 'expert' ? [{
                key: 'reviews',
                label: 'Отзывы',
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
                label: 'Работы',
                children: (
                  <WorksTab 
                    isMobile={isMobile}
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
                      closeAllModals();
                      setSelectedUserIdForChat(friend.id);
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
        cases={mockArbitrationCases}
        isMobile={isMobile}
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
          closeAllModals();
          setSelectedUserIdForChat(friend.id);
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
          if (selectedFriend?.id) setSelectedUserIdForChat(selectedFriend.id);
          setMessageModalVisible(true);
        }}
      />
    </>
  );
};

export default ExpertDashboard;
