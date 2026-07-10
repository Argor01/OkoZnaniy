import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useDashboard } from '@/contexts/DashboardContext';
import { shopApi } from '@/features/shop/api/shop';
import { Filters as FiltersType, Work } from '@/features/shop/types';
import { useCurrentUser, useSubjects, useWorkTypes } from '@/hooks/queries';
import { logger } from '@/utils/logger';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import styles from './ShopReadyWorks.module.css';

const { Title } = Typography;

const READY_WORK_PURCHASE_WARNING = '\u0413\u043e\u0442\u043e\u0432\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b \u0432\u043e\u0437\u0432\u0440\u0430\u0442\u0443 \u043d\u0435 \u043f\u043e\u0434\u043b\u0435\u0436\u0430\u0442, \u0434\u0430\u043b\u044c\u043d\u0435\u0439\u0448\u0438\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u0438 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0438 \u0431\u0443\u0434\u0443\u0442 \u0437\u0430 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0443\u044e \u043f\u043b\u0430\u0442\u0443';

const ShopReadyWorks: React.FC = () => {
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FiltersType>({ sortBy: 'newness' });

  const { data: apiWorks, isLoading } = useQuery({
    queryKey: ['shop-works', filters.sortBy],
    queryFn: async () => {
      const data = await shopApi.getWorks();
      return data;
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['shop-purchases'],
    queryFn: () => shopApi.getPurchases(),
  });

  const { data: profile } = useCurrentUser();
  const { data: subjects = [] } = useSubjects();
  const { data: categories = [] } = useWorkTypes();

  const processedWorks = React.useMemo(() => {
    const base = apiWorks && Array.isArray(apiWorks) ? apiWorks : [];

    interface RawWork extends Work {
      subjectId?: number;
      subject_id?: number;
      workTypeId?: number;
      work_type_id?: number;
      createdAt?: string;
      updatedAt?: string;
      category?: string;
    }

    return base.map((work: Work) => {
      const extended = work as RawWork;
      const subject = Number(work.subject ?? extended.subjectId ?? extended.subject_id ?? 0);
      const work_type = Number(work.work_type ?? extended.workTypeId ?? extended.work_type_id ?? 0);

      return {
        ...work,
        created_at: work.created_at || extended.createdAt,
        updated_at: work.updated_at || extended.updatedAt,
        category: work.work_type_name || extended.category || 'Другое',
        subject,
        work_type,
        rating: work.rating || 0,
        reviewsCount: work.reviewsCount || 0,
        viewsCount: work.viewsCount || 0,
        purchasesCount: work.purchasesCount || 0,
        execution_days: work.execution_days || 0,
        author: work.author ? {
          ...work.author,
          avatar: work.author.avatar,
        } : {
          id: 0,
          name: work.author_name || 'Неизвестен',
          username: undefined,
          display_username: undefined,
          rating: 0,
          avatar: work.author_avatar,
        },
      };
    });
  }, [apiWorks]);

  const processPurchase = async (id: number) => {
    const work = processedWorks.find((item) => item.id === id);
    const sellerId = work?.author?.id;
    if (!work || !sellerId) {
      message.error('Не удалось оформить покупку: неизвестен продавец');
      return;
    }

    try {
      const purchase = await shopApi.purchaseWork(id);
      queryClient.invalidateQueries({ queryKey: ['shop-purchases'] });
      if (purchase.order) {
        navigate(`/orders/${purchase.order}`);
        return;
      }
      dashboard.openContextChat(sellerId, work.title, id);
    } catch (error: any) {
      const detail = error?.response?.data?.error || error?.response?.data?.detail;
      message.error(detail || 'Не удалось купить работу');
    }
  };

  const handlePurchase = (id: number) => {
    Modal.confirm({
      title: '\u0412\u0430\u0436\u043d\u043e\u0435 \u043f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435',
      content: READY_WORK_PURCHASE_WARNING,
      okText: '\u042f \u0441\u043e\u0433\u043b\u0430\u0441\u0435\u043d',
      cancelText: '\u041e\u0442\u043c\u0435\u043d\u0430',
      centered: true,
      onOk: () => processPurchase(id),
    });
  };

  const handleDownload = (id: number) => {
    const purchase = (Array.isArray(purchases) ? purchases : [])
      .filter((item) => item.work === id && item.delivered_file_available)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
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
      queryClient.setQueryData(['shop-works', filters.sortBy], (oldData: Work[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((work) => work.id !== id);
      });
    } catch (error) {
      logger.error('Error deleting work:', error);
    }
  };

  const filteredWorks = React.useMemo(() => {
    let result = [...processedWorks];

    if (filters.search) {
      result = result.filter((work) => work.title.toLowerCase().includes(filters.search!.toLowerCase()));
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
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
    }

    return result;
  }, [processedWorks, filters]);

  const purchasesByWorkId = React.useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    return list.reduce<Record<number, typeof list[number]>>((acc, purchase) => {
      const current = acc[purchase.work];
      if (!current || new Date(purchase.created_at || 0).getTime() > new Date(current.created_at || 0).getTime()) {
        acc[purchase.work] = purchase;
      }
      return acc;
    }, {});
  }, [purchases]);

  return (
    <div className={styles.container}>
      <Title level={2} className={styles.pageTitle}>
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
        loading={isLoading}
        onWorkClick={(id) => navigate(`/shop/works/${id}`)}
        onPurchase={handlePurchase}
        onDownload={handleDownload}
        purchasesByWorkId={purchasesByWorkId}
        onDelete={handleDelete}
        currentUserId={profile?.id}
      />
    </div>
  );
};

export default ShopReadyWorks;
