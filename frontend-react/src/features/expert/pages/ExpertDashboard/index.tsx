import React, { useState, useRef, Suspense, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message, Tabs, Skeleton, Spin } from 'antd';
import type { FC } from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '@/features/auth/api/auth';
import type { User } from '@/features/auth/api/auth';
import { expertsApi, type Specialization } from '@/features/expert/api/experts';
import { useNotifications } from '@/hooks/useNotifications';
import ProfileHeader from '../../components/ProfileHeader/index';
import ApplicationStatus from '../../components/ApplicationStatus/index';
import { UserProfile } from '../../types';
import styles from './ExpertDashboard.module.css';


import AboutTab from '../../components/AboutTab';
const SpecializationsTab = React.lazy(() => import('../../components/SpecializationsTab'));
const ReviewsTab = React.lazy(() => import('../../components/ReviewsTab'));
const OrdersTab = React.lazy(() => import('../../components/OrdersTab'));
const WorksTab = React.lazy(() => import('../../components/WorksTab'));
const FriendsTab = React.lazy(() => import('../../components/FriendsTab'));


const ProfileModal = React.lazy(() => import('../../modals/ProfileModal'));
const ApplicationModal = React.lazy(() => import('../../modals/ApplicationModal'));
const WelcomeModal = React.lazy(() => import('../../modals/WelcomeModal'));
const SpecializationModal = React.lazy(() => import('../../modals/SpecializationModal'));
const MessageModal = React.lazy(() => import('../../modals/MessageModalNew'));
const NotificationsModal = React.lazy(() => import('../../modals/NotificationsModalNew'));
const ArbitrationModal = React.lazy(() => import('../../modals/ArbitrationModal'));
const FinanceModal = React.lazy(() => import('../../modals/FinanceModal'));
const FriendsModal = React.lazy(() => import('../../modals/FriendsModal'));
const FaqModal = React.lazy(() => import('../../modals/FaqModal'));
const FriendProfileModal = React.lazy(() => import('../../modals/FriendProfileModal'));

const ExpertDashboard: FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  
  
  useNotifications();
  
  
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
  
  
  const [activeTab, setActiveTab] = useState<string>('about');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [editingSpecialization, setEditingSpecialization] = useState<Specialization | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const applicationStatusRef = useRef<HTMLDivElement>(null);

  const closeAllModals = useCallback(() => {
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
  }, []);

  
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    ,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleEditProfile = useCallback(() => {
    closeAllModals();
    setProfileModalVisible(true);
  }, [closeAllModals]);

  const handleOpenApplicationModal = useCallback(() => {
    closeAllModals();
    setApplicationModalVisible(true);
  }, [closeAllModals]);

  const items = useMemo(() => {
    const list = [
      {
        key: 'about',
        label: 'О себе',
        children: (
          <AboutTab
            profile={userProfile || null}
            loading={isProfileLoading}
            isMobile={isMobile}
            onEdit={handleEditProfile}
          />
        ),
      }
    ];

    if (userProfile?.role === 'expert') {
      list.push({
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
      });

      list.push({
        key: 'reviews',
        label: 'Отзывы',
        children: <ReviewsTab isMobile={isMobile} expertId={userProfile?.id} />,
      });
    }

    list.push({
      key: 'orders',
      label: 'Заказы',
      children: <OrdersTab isMobile={isMobile} />,
    });

    if (userProfile?.role === 'expert') {
      list.push({
        key: 'works',
        label: 'Работы',
        children: (
          <WorksTab 
            isMobile={isMobile}
            userProfile={userProfile}
          />
        ),
      });
    }

    list.push({
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
    });

    return list;
  }, [userProfile, isMobile, specializations, specializationsLoading, closeAllModals, deleteSpecializationMutation, handleEditProfile]);

  React.useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (!tab) return;
    const allowedTabs = items.map(item => item.key);
    if (allowedTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search, items, activeTab]);

  React.useEffect(() => {
    const focus = new URLSearchParams(location.search).get('focus');
    if (focus !== 'application') return;
    const timer = window.setTimeout(() => {
      applicationStatusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.search]);

  return (
    <>
      <div className={styles.expertContentContainer}>
        <ProfileHeader
          profile={userProfile || null}
          loading={isProfileLoading}
          expertStats={expertStats}
          userProfile={userProfile}
          isMobile={isMobile}
          onEditProfile={handleEditProfile}
        />
        
        <div ref={applicationStatusRef}>
          <ApplicationStatus
            application={application || null}
            applicationLoading={applicationLoading}
            userProfile={userProfile}
            onOpenApplicationModal={handleOpenApplicationModal}
          />
        </div>
        
        <div ref={tabsRef}>
          <Suspense fallback={<div style={{ padding: '24px' }}><Skeleton active paragraph={{ rows: 6 }} /></div>}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={items}
            />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<Spin size="large" fullscreen />}>
        {profileModalVisible && (
          <ProfileModal
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            profile={userProfile || null}
            userProfile={userProfile}
          />
        )}
        
        {applicationModalVisible && (
          <ApplicationModal
            visible={applicationModalVisible}
            onClose={() => setApplicationModalVisible(false)}
            application={application || null}
          />
        )}
        
        {welcomeModalVisible && (
          <WelcomeModal
            visible={welcomeModalVisible}
            onClose={() => setWelcomeModalVisible(false)}
          />
        )}
        
        {specializationModalVisible && (
          <SpecializationModal
            visible={specializationModalVisible}
            onClose={() => {
              setSpecializationModalVisible(false);
              setEditingSpecialization(null);
            }}
            editingSpecialization={editingSpecialization}
          />
        )}
        
        {messageModalVisible && selectedUserIdForChat && (
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
            userProfile={userProfile || undefined}
          />
        )}
        
        {notificationsModalVisible && (
          <NotificationsModal
            visible={notificationsModalVisible}
            onClose={() => setNotificationsModalVisible(false)}
            isMobile={isMobile}
          />
        )}
        
                {arbitrationModalVisible && (
          <ArbitrationModal
            visible={arbitrationModalVisible}
            onClose={() => setArbitrationModalVisible(false)}
            isMobile={isMobile}
          />
        )}
        
        {financeModalVisible && (
          <FinanceModal
            visible={financeModalVisible}
            onClose={() => setFinanceModalVisible(false)}
            profile={userProfile || null}
            isMobile={isMobile}
          />
        )}
        
        {friendsModalVisible && (
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
        )}
        
        {faqModalVisible && (
          <FaqModal
            visible={faqModalVisible}
            onClose={() => setFaqModalVisible(false)}
            isMobile={isMobile}
          />
        )}
        
        {friendProfileModalVisible && selectedFriend && (
          <FriendProfileModal
            visible={friendProfileModalVisible}
            onClose={() => {
              setFriendProfileModalVisible(false);
              setSelectedFriend(null);
            }}
            friend={selectedFriend}
            onOpenChat={() => {
              setFriendProfileModalVisible(false);
              if (selectedFriend?.id) setSelectedUserIdForChat(selectedFriend.id);
              setMessageModalVisible(true);
            }}
          />
        )}
      </Suspense>
    </>
  );
};

export default ExpertDashboard;
