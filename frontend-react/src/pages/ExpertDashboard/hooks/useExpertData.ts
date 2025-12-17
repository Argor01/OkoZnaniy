// Хук для загрузки данных эксперта
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../../api/auth';
import { ordersApi } from '../../../api/orders';
import { expertsApi } from '../../../api/experts';

export const useExpertData = () => {
  // Загружаем профиль пользователя
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем заказы
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', userProfile?.role],
    queryFn: () => {
      if (userProfile?.role === 'client') {
        return ordersApi.getClientOrders();
      } else if (userProfile?.role === 'expert') {
        return ordersApi.getMyOrders({});
      }
      return null;
    },
    enabled: !!userProfile,
  });

  // Загружаем анкету эксперта
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['expert-application'],
    queryFn: async () => {
      try {
        return await expertsApi.getMyApplication();
      } catch {
        return null;
      }
    },
    retry: false,
  });

  // Загружаем специализации
  const { data: specializations = [], isLoading: specializationsLoading } = useQuery({
    queryKey: ['expert-specializations'],
    queryFn: () => expertsApi.getSpecializations(),
  });

  // Загружаем статистику эксперта
  const { data: expertStats } = useQuery({
    queryKey: ['expert-statistics', userProfile?.id],
    queryFn: () => expertsApi.getExpertStatistics(userProfile!.id),
    enabled: !!userProfile?.id,
  });

  const orders = Array.isArray(ordersData?.results) ? ordersData.results : (Array.isArray(ordersData) ? ordersData : []);

  // Подсчет заказов по статусам
  const ordersCount = {
    all: orders.length,
    new: orders.filter((o: any) => o.status === 'new').length,
    confirming: orders.filter((o: any) => o.status === 'confirming').length,
    in_progress: orders.filter((o: any) => o.status === 'in_progress').length,
    payment: orders.filter((o: any) => o.status === 'payment').length,
    review: orders.filter((o: any) => o.status === 'review').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    revision: orders.filter((o: any) => o.status === 'revision').length,
    download: orders.filter((o: any) => o.status === 'download').length,
    closed: orders.filter((o: any) => o.status === 'closed').length,
  };

  return {
    userProfile,
    profileLoading,
    orders,
    ordersLoading,
    ordersCount,
    application,
    applicationLoading,
    specializations,
    specializationsLoading,
    expertStats,
  };
};
