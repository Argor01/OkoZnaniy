
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth';
import { ordersApi } from '@/features/orders/api/orders';
import { expertsApi } from '@/features/expert/api/experts';
import { ORDER_STATUSES } from '@/utils/constants';

export const useExpertData = () => {
  
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  
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

  
  const { data: specializations = [], isLoading: specializationsLoading } = useQuery({
    queryKey: ['expert-specializations'],
    queryFn: () => expertsApi.getSpecializations(),
  });

  
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

  
  const ordersCount = {
    all: orders.length,
    new: orders.filter((o) => o.status === ORDER_STATUSES.NEW).length,
    confirming: orders.filter((o) => o.status === ORDER_STATUSES.CONFIRMING).length,
    in_progress: orders.filter((o) => o.status === ORDER_STATUSES.IN_PROGRESS).length,
    waiting_payment: orders.filter((o) => o.status === ORDER_STATUSES.WAITING_PAYMENT).length,
    review: orders.filter((o) => o.status === ORDER_STATUSES.REVIEW).length,
    completed: orders.filter((o) => o.status === ORDER_STATUSES.COMPLETED).length,
    revision: orders.filter((o) => o.status === ORDER_STATUSES.REVISION).length,
    download: orders.filter((o) => o.status === ORDER_STATUSES.DOWNLOAD).length,
    closed: orders.filter((o) => o.status === ORDER_STATUSES.CLOSED).length,
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
