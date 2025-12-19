import React, { useState } from 'react';
import { Layout, Typography, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from '../../components/layout/Sidebar';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import { authApi } from '../../api/auth';
import { catalogApi } from '../../api/catalog';
import { Filters as FiltersType, Work } from './types';
import { mockWorks } from './mockData';
import { shopApi } from '../../api/shop';
import styles from './ShopReadyWorks.module.css';

// Импорт модальных окон
import ProfileModal from '../ExpertDashboard/modals/ProfileModal';
import ApplicationModal from '../ExpertDashboard/modals/ApplicationModal';
import WelcomeModal from '../ExpertDashboard/modals/WelcomeModal';
import SpecializationModal from '../ExpertDashboard/modals/SpecializationModal';
import MessageModal from '../ExpertDashboard/modals/MessageModalNew';
import NotificationsModal from '../ExpertDashboard/modals/NotificationsModalNew';
import ArbitrationModal from '../ExpertDashboard/modals/ArbitrationModal';
import FinanceModal from '../ExpertDashboard/modals/FinanceModal';
import FriendsModal from '../ExpertDashboard/modals/FriendsModal';
import FaqModal from '../ExpertDashboard/modals/FaqModal';
import FriendProfileModal from '../ExpertDashboard/modals/FriendProfileModal';
import { mockNotifications, mockArbitrationCases } from '../ExpertDashboard/mockData';

const { Content, Header } = Layout;
const { Title } = Typography;

const ShopReadyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersType>({ sortBy: 'newness' });
  const [works, setWorks] = useState<Work[]>([]);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Дополнительный state
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [editingSpecialization, setEditingSpecialization] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);

  const { data: apiWorks, isLoading: worksLoading } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  const { data: fetchedSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  // Обновляем subjects при загрузке
  React.useEffect(() => {
    if (fetchedSubjects.length > 0) {
      setSubjects(fetchedSubjects);
    }
  }, [fetchedSubjects]);

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Обработчики
  const handleMenuSelect = (key: string) => {
    if (key === 'shop-ready-works') {
      // Уже на этой странице
      return;
    }
    if (key === 'shop-add-work') {
      navigate('/shop/add-work');
      return;
    }
    if (key === 'shop-my-works' || key === 'works') {
      navigate('/works');
      return;
    }
    if (key === 'shop-purchased') {
      navigate('/shop/purchased');
      return;
    }
    if (key.startsWith('orders-') || key === 'orders') {
      navigate('/expert');
      return;
    }
    // Другие пункты меню обрабатываются через модальные окна в Sidebar
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (error) {
      message.error('Ошибка при выходе');
    }
  };

  const handleWorkClick = (id: number) => {
    message.info(`Открыть работу ${id}`);
    // TODO: Открыть модальное окно с деталями работы
  };

  const handleFavorite = (id: number) => {
    setWorks((prevWorks) =>
      prevWorks.map((work) =>
        work.id === id ? { ...work, isFavorite: !work.isFavorite } : work
      )
    );
    message.success('Добавлено в избранное');
  };

  const handlePurchase = (id: number) => {
    message.info(`Купить работу ${id}`);
    // TODO: Открыть модальное окно покупки
  };

  const handleDelete = (id: number) => {
    shopApi.deleteWork(id)
      .then(() => {
        setWorks((prev) => prev.filter((w) => w.id !== id));
        message.success('Работа удалена');
      })
      .catch(() => {
        try {
          const key = 'shop_custom_works';
          const local: Work[] = JSON.parse(localStorage.getItem(key) || '[]');
          const nextLocal = local.filter((w) => w.id !== id);
          localStorage.setItem(key, JSON.stringify(nextLocal));
          setWorks((prev) => prev.filter((w) => w.id !== id));
          message.warning('Удалено локально (сервер недоступен)');
        } catch {
          message.error('Не удалось удалить работу');
        }
      });
  };

  // Фильтрация и сортировка работ
  const filteredWorks = React.useMemo(() => {
    let result = [...works];

    // Поиск
    if (filters.search) {
      result = result.filter(
        (work) =>
          work.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
          work.description.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Фильтр по категории
    if (filters.category && filters.category !== 'Все категории') {
      result = result.filter((work) => work.category === filters.category);
    }

    // Фильтр по предмету
    if (filters.subject && filters.subject !== 'Все предметы') {
      result = result.filter((work) => work.subject === filters.subject);
    }

    // Сортировка
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        result.sort((a, b) => b.viewsCount - a.viewsCount);
        break;
      case 'newness':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [works, filters]);

  React.useEffect(() => {
    let local: Work[] = [];
    try {
      local = JSON.parse(localStorage.getItem('shop_custom_works') || '[]');
    } catch {}
    const base = apiWorks && Array.isArray(apiWorks) ? apiWorks : mockWorks;
    const all = [...local, ...base];
    const uniqueById = Array.from(new Map(all.map((w) => [w.id, w])).values());
    setWorks(uniqueById);
  }, [apiWorks]);

  return (
    <>
    <Layout className={styles.layout}>
      <Sidebar
        selectedKey="shop-ready-works"
        onMenuSelect={handleMenuSelect}
        onLogout={handleLogout}
        onProfileClick={() => setProfileModalVisible(true)}
        onSupportClick={() => setApplicationModalVisible(true)}
        onWelcomeClick={() => setWelcomeModalVisible(true)}
        onSpecializationClick={() => setSpecializationModalVisible(true)}
        onMessagesClick={() => setMessageModalVisible(true)}
        onNotificationsClick={() => setNotificationsModalVisible(true)}
        onArbitrationClick={() => setArbitrationModalVisible(true)}
        onFinanceClick={() => setFinanceModalVisible(true)}
        onFriendsClick={() => setFriendsModalVisible(true)}
        onFaqClick={() => setFaqModalVisible(true)}
        mobileDrawerOpen={mobileMenuVisible}
        onMobileDrawerChange={setMobileMenuVisible}
        userProfile={
          profile
            ? {
                username: profile.username,
                avatar: profile.avatar,
                role: profile.role,
              }
            : undefined
        }
      />

      <Layout className={styles.mainLayout}>
        <Header
          style={{
            background: 'white',
            padding: isMobile ? '0 16px' : '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{ 
                  borderRadius: '8px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              />
            )}
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Магазин готовых работ
            </Title>
          </div>
          <Button 
            type={isMobile ? "text" : "default"} 
            danger 
            icon={<LogoutOutlined style={{ fontSize: isMobile ? '20px' : undefined }} />} 
            onClick={handleLogout}
            style={isMobile ? { 
              minWidth: 'auto', 
              width: '40px', 
              height: '40px', 
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            } : undefined}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>

        <Content className={styles.content}>
          <Filters filters={filters} onFilterChange={setFilters} />

          <WorksList
            works={filteredWorks}
            loading={worksLoading}
            onWorkClick={handleWorkClick}
            onFavorite={handleFavorite}
            onPurchase={handlePurchase}
            onDelete={handleDelete}
            currentUserId={profile?.id}
          />
        </Content>
      </Layout>
    </Layout>
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        profile={profile}
        userProfile={profile}
      />
      
      <ApplicationModal
        visible={applicationModalVisible}
        onClose={() => setApplicationModalVisible(false)}
      />
      
      <WelcomeModal
        visible={welcomeModalVisible}
        onClose={() => setWelcomeModalVisible(false)}
        userProfile={profile}
      />
      
      <SpecializationModal
        visible={specializationModalVisible}
        onClose={() => setSpecializationModalVisible(false)}
        editingSpecialization={editingSpecialization}
        subjects={subjects}
      />
      
      <MessageModal
        visible={messageModalVisible}
        onClose={() => setMessageModalVisible(false)}
        isMobile={isMobile}
        isTablet={window.innerWidth > 840 && window.innerWidth <= 1024}
        isDesktop={window.innerWidth > 1024}
        onCreateOrder={() => {
          // Логика создания заказа
        }}
      />
      
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
        notifications={mockNotifications}
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
        onOpenChat={(chat) => {
          setSelectedChat(chat);
          setMessageModalVisible(true);
          setFriendsModalVisible(false);
        }}
        onOpenProfile={(friend) => {
          setSelectedFriend(friend);
          setFriendProfileModalVisible(true);
          setFriendsModalVisible(false);
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
          setFriendProfileModalVisible(false);
          setMessageModalVisible(true);
        }}
        isMobile={isMobile}
      />
    </>
  );
};

export default ShopReadyWorks;
