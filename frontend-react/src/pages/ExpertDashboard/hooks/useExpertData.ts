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

  type OrderWithStatus = { status: string };
  const hasStatus = (o: unknown): o is OrderWithStatus =>
    !!o &&
    typeof o === 'object' &&
    'status' in o &&
    typeof (o as { status?: unknown }).status === 'string';

  const ordersRaw: unknown[] = Array.isArray((ordersData as { results?: unknown })?.results)
    ? ((ordersData as { results: unknown[] }).results)
    : (Array.isArray(ordersData) ? (ordersData as unknown[]) : []);

  const orders = ordersRaw.filter(hasStatus);

  // Подсчет заказов по статусам
  const ordersCount = {
    all: orders.length,
    new: orders.filter((o) => o.status === 'new').length,
    confirming: orders.filter((o) => o.status === 'confirming').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    payment: orders.filter((o) => o.status === 'payment').length,
    review: orders.filter((o) => o.status === 'review').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    revision: orders.filter((o) => o.status === 'revision').length,
    download: orders.filter((o) => o.status === 'download').length,
    closed: orders.filter((o) => o.status === 'closed').length,
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
