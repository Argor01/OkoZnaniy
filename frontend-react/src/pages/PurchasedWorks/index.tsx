import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import EmptyState from './components/EmptyState';
import { authApi } from '../../api/auth';
import { catalogApi } from '../../api/catalog';
import { FiltersState } from './types';
import { mockPurchasedWorks } from './mockData';
import styles from './PurchasedWorks.module.css';

const { Title } = Typography;

const PurchasedWorks: React.FC = () => {
  const [filters, setFilters] = useState<FiltersState>({ sortBy: 'date' });

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загрузка справочников
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Загрузка купленных работ (пока используем mock данные)
  const { data: purchasedWorks = [], isLoading } = useQuery({
    queryKey: ['purchased-works'],
    queryFn: async () => {
      // TODO: Заменить на реальный API вызов
      return mockPurchasedWorks;
    },
  });

  // Фильтрация и сортировка работ
  const filteredWorks = useMemo(() => {
    let result = [...purchasedWorks];

    // Поиск
    if (filters.search) {
      result = result.filter(
        (work) =>
          work.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
          work.description.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Фильтр по предмету
    if (filters.subject && filters.subject !== 'Все предметы') {
      result = result.filter((work) => work.subject === filters.subject);
    }

    // Фильтр по типу работы
    if (filters.workType && filters.workType !== 'Все типы') {
      result = result.filter((work) => work.workType === filters.workType);
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
      case 'date':
      default:
        result.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        break;
    }

    return result;
  }, [purchasedWorks, filters]);

  const handleDownload = (workId: number) => {
    // TODO: Реализовать скачивание работы
    console.log('Download work:', workId);
  };

  const handleViewDetails = (workId: number) => {
    // TODO: Реализовать просмотр деталей работы
    console.log('View details:', workId);
  };

  return (
    <div className={styles.container}>
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
        Купленные работы
      </Title>
      
      <Filters
        filters={filters}
        onFiltersChange={setFilters}
        subjects={subjects}
        workTypes={workTypes}
      />
      
      {filteredWorks.length === 0 ? (
        <EmptyState />
      ) : (
        <WorksList
          works={filteredWorks}
          loading={isLoading}
          onDownload={handleDownload}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );
};

export default PurchasedWorks;