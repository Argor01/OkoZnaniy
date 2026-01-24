import React, { useState } from 'react';
import { Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersType>({ sortBy: 'newness' });
  const [works, setWorks] = useState<Work[]>([]);

  // Загрузка данных
  const { data: apiWorks } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

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
      // TODO: Реализовать покупку работы
      console.log('Purchase work:', id);
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
    
    // Преобразуем данные из API в нужный формат
    const transformedBase = base.map((work: any) => ({
      ...work,
      // Обеспечиваем совместимость полей
      createdAt: work.created_at || work.createdAt,
      updatedAt: work.updated_at || work.updatedAt,
      category: work.work_type_name || work.category || 'Другое',
      workType: work.work_type_name || work.workType || 'Другое',
      rating: work.rating || 0,
      reviewsCount: work.reviewsCount || 0,
      viewsCount: work.viewsCount || 0,
      purchasesCount: work.purchasesCount || 0,
      // Обеспечиваем правильную структуру автора
      author: work.author || {
        id: 0,
        name: work.author_name || 'Неизвестен',
        username: work.author_name || 'Неизвестен',
        rating: 0
      }
    }));
    
    const all = [...local, ...transformedBase];
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
        onFilterChange={setFilters}
      />
      
      <WorksList
        works={filteredWorks}
        onWorkClick={(id) => navigate(`/shop/works/${id}`)}
        onFavorite={(id) => console.log('Favorite:', id)}
        onPurchase={handlePurchase}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ShopReadyWorks;