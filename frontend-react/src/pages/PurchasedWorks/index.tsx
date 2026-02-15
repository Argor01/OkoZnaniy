import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import EmptyState from './components/EmptyState';
import { authApi } from '../../api/auth';
import { catalogApi } from '../../api/catalog';
import { FiltersState, PurchasedWork } from './types';
import { mockPurchasedWorks } from './mockData';
import { shopApi, type Purchase } from '../../api/shop';
import styles from './PurchasedWorks.module.css';

const { Title } = Typography;

const PurchasedWorks: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersState>({ sortBy: 'date' });

  // Загрузка профиля пользователя
  const { data: _profile } = useQuery({
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
      try {
        const purchases = await shopApi.getPurchases();
        const mapped = (Array.isArray(purchases) ? purchases : []).map((p: Purchase): PurchasedWork => {
          const w = (p.work_detail ?? {}) as any;
          const subjectId = Number(w.subject ?? w.subject_id ?? 0);
          const workTypeId = Number(w.work_type ?? w.work_type_id ?? 0);
          const deliveredFile =
            p.delivered_file_url
              ? [{
                  id: 1,
                  name: p.delivered_file_name || 'Файл',
                  type: p.delivered_file_type || '',
                  size: typeof p.delivered_file_size === 'number' ? p.delivered_file_size : 0,
                  url: p.delivered_file_url,
                }]
              : [];

          return {
            id: p.id,
            workId: p.work,
            subjectId: Number.isFinite(subjectId) ? subjectId : 0,
            workTypeId: Number.isFinite(workTypeId) ? workTypeId : 0,
            title: String(w.title ?? p.work_title ?? 'Работа'),
            description: String(w.description ?? ''),
            price: typeof p.price_paid === 'number' ? p.price_paid : Number(p.price_paid ?? 0),
            purchaseDate: p.created_at,
            isDownloaded: false,
            category: String(w.work_type_name ?? w.category ?? w.workType ?? 'Другое'),
            subject: String(w.subject_name ?? w.subject ?? '—'),
            workType: String(w.work_type_name ?? w.workType ?? 'Другое'),
            rating: typeof p.rating === 'number' ? p.rating : (typeof w.rating === 'number' ? w.rating : 0),
            reviewsCount: typeof w.reviewsCount === 'number' ? w.reviewsCount : 0,
            viewsCount: typeof w.viewsCount === 'number' ? w.viewsCount : 0,
            purchasesCount: typeof w.purchasesCount === 'number' ? w.purchasesCount : 0,
            author: {
              id: Number(w.author?.id ?? 0),
              name: String(w.author?.name ?? w.author?.username ?? w.author_name ?? 'Неизвестен'),
              avatar: w.author?.avatar,
              rating: typeof w.author?.rating === 'number' ? w.author.rating : 0,
            },
            preview: w.preview ?? undefined,
            files: deliveredFile,
            tags: Array.isArray(w.tags) ? w.tags : [],
            createdAt: String(w.created_at ?? w.createdAt ?? p.created_at),
            updatedAt: String(w.updated_at ?? w.updatedAt ?? p.created_at),
            isFavorite: false,
          };
        });
        return mapped;
      } catch {
        return mockPurchasedWorks;
      }
    },
  });

  // Фильтрация и сортировка работ
  const filteredWorks = useMemo(() => {
    let result = [...purchasedWorks];

    // Поиск
    if (filters.search) {
      result = result.filter(
        (work) =>
          work.title.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Фильтр по предмету
    if (typeof filters.subjectId === 'number') {
      result = result.filter((work) => work.subjectId === filters.subjectId);
    }

    // Фильтр по типу работы
    if (typeof filters.workTypeId === 'number') {
      result = result.filter((work) => work.workTypeId === filters.workTypeId);
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
    const work = purchasedWorks.find((w) => w.id === workId);
    const url = work?.files?.[0]?.url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewDetails = (workId: number) => {
    navigate(`/shop/works/${workId}`);
  };

  return (
    <div className={styles.container}>
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
        Купленные работы
      </Title>
      
      <Filters
        filters={filters}
        onFilterChange={(next) => setFilters(next)}
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
          onView={handleViewDetails}
        />
      )}
    </div>
  );
};

export default PurchasedWorks;
