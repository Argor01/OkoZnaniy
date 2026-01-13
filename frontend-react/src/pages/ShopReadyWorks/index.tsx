import React, { useState } from 'react';
import { Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import { authApi } from '../../api/auth';
import { catalogApi } from '../../api/catalog';
import { Filters as FiltersType, Work } from './types';
import { mockWorks } from './mockData';
import { shopApi } from '../../api/shop';
import styles from './ShopReadyWorks.module.css';

const { Title } = Typography;

const ShopReadyWorks: React.FC = () => {
  const [filters, setFilters] = useState<FiltersType>({ sortBy: 'newness' });
  const [works, setWorks] = useState<Work[]>([]);
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

  // Загрузка работ из API
  const { data: apiWorks } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  // Загрузка справочников
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  const handlePurchase = async (id: number) => {
    try {
      await shopApi.purchaseWork(id);
      // Обновить список работ
    } catch (error) {
      console.error('Error purchasing work:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await shopApi.deleteWork(id);
      setWorks((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Error deleting work:', error);
    }
  };
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
    <div className={styles.container}>
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
        Магазин готовых работ
      </Title>
      
      <Filters
        filters={filters}
        onFiltersChange={setFilters}
        subjects={subjects}
        categories={categories}
      />
      
      <WorksList
        works={filteredWorks}
        onPurchase={handlePurchase}
        onDelete={handleDelete}
        userProfile={profile}
      />
    </div>
  );

export default ShopReadyWorks;
