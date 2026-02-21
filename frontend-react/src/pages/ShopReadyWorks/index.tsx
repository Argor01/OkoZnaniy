import React, { useState } from 'react';
import { Typography, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import { authApi } from '../../api/auth';
import { catalogApi } from '../../api/catalog';
import { Filters as FiltersType, Work } from './types';
import { mockWorks } from './mockData';
import { shopApi } from '../../api/shop';
import { useDashboard } from '../../contexts/DashboardContext';
import styles from './ShopReadyWorks.module.css';

const { Title } = Typography;

const ShopReadyWorks: React.FC = () => {
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const [filters, setFilters] = useState<FiltersType>({ sortBy: 'newness' });
  const [works, setWorks] = useState<Work[]>([]);

  
  const { data: apiWorks } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['shop-purchases'],
    queryFn: () => shopApi.getPurchases(),
  });

  const { data: _profile } = useQuery({
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
    const work = works.find((w) => w.id === id);
    const sellerId = work?.author?.id;
    if (!work || !sellerId) {
      message.error('Не удалось открыть чат: неизвестен продавец');
      return;
    }
    try {
      await shopApi.purchaseWork(id);
      dashboard.openContextChat(sellerId, work.title, id);
    } catch (error: any) {
      const detail = error?.response?.data?.error || error?.response?.data?.detail;
      message.error(detail || 'Не удалось купить работу');
    }
  };

  const handleDownload = (id: number) => {
    const purchase = (Array.isArray(purchases) ? purchases : []).find((p) => p.work === id);
    if (!purchase?.delivered_file_available) return;
    shopApi.downloadPurchaseFile(purchase.id)
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = purchase.delivered_file_name || 'file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((e: unknown) => {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          message.error('Не авторизовано для скачивания файла');
        } else {
          message.error('Ошибка при скачивании файла');
        }
      });
  };

  const handleDelete = async (id: number) => {
    try {
      await shopApi.deleteWork(id);
      setWorks((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Error deleting work:', error);
    }
  };

  
  const filteredWorks = React.useMemo(() => {
    let result = [...works];

    
    if (filters.search) {
      result = result.filter(
        (work) =>
          work.title.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    
    if (filters.category) {
      result = result.filter((work) => work.work_type === filters.category);
    }

    
    if (filters.subject) {
      result = result.filter((work) => work.subject === filters.subject);
    }

    
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
    } catch {
      local = [];
    }
    const base = apiWorks && Array.isArray(apiWorks) ? apiWorks : mockWorks;
    
    
    const transformedBase = base.map((work: Work) => {
      const extended = work as Work & { subject_id?: number; work_type_id?: number };
      const subject = Number(work.subject ?? work.subjectId ?? extended.subject_id ?? 0);
      const work_type = Number(work.work_type ?? work.workTypeId ?? extended.work_type_id ?? 0);

      return {
        ...work,
        createdAt: work.created_at || work.createdAt,
        updatedAt: work.updated_at || work.updatedAt,
        category: work.work_type_name || work.category || 'Другое',
        workType: work.work_type_name || work.workType || 'Другое',
        subject,
        work_type,
        rating: work.rating || 0,
        reviewsCount: work.reviewsCount || 0,
        viewsCount: work.viewsCount || 0,
        purchasesCount: work.purchasesCount || 0,
        author: work.author || {
          id: 0,
          name: work.author_name || 'Неизвестен',
          username: work.author_name || 'Неизвестен',
          rating: 0,
        },
      };
    });
    
    const all = [...local, ...transformedBase];
    const uniqueById = Array.from(new Map(all.map((w) => [w.id, w])).values());
    setWorks(uniqueById);
  }, [apiWorks]);

  const purchasesByWorkId = React.useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    return Object.fromEntries(list.map((p) => [p.work, p]));
  }, [purchases]);

  return (
    <div className={styles.container}>
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
        Магазин готовых работ
      </Title>
      
      <Filters
        filters={filters}
        onFilterChange={setFilters}
        subjects={subjects}
        workTypes={categories}
      />
      
      <WorksList
        works={filteredWorks}
        onWorkClick={(id) => navigate(`/shop/works/${id}`)}
        onFavorite={(id) => console.log('Favorite:', id)}
        onPurchase={handlePurchase}
        onDownload={handleDownload}
        purchasesByWorkId={purchasesByWorkId}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ShopReadyWorks;
