
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';
import { message } from 'antd';

export const useOrders = (enabled: boolean = true) => {
  const { data: orders = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_ORDERS,
    queryFn: adminPanelApi.getOrders,
    enabled,
    initialData: [],
    select: (data: any) => {
      let ordersArray: any[] = [];
      if (Array.isArray(data)) ordersArray = data;
      else if (data && typeof data === 'object' && Array.isArray(data.results)) ordersArray = data.results;
      else if (data && typeof data === 'object' && Array.isArray(data.data)) ordersArray = data.data;
      
      // Нормализуем данные заказов, особенно budget
      return ordersArray.map((order: any) => ({
        ...order,
        budget: Number(order.budget) || 0,
      }));
    }
  });

  return { orders, loading, refetch };
};

// Alias for backward compatibility or clarity
export const useAllOrders = useOrders;

export const useProblemOrders = (enabled: boolean = true) => {
  const { data: orders = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_PROBLEM_ORDERS,
    queryFn: adminPanelApi.getProblemOrders,
    enabled,
    initialData: [],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { orders, loading, refetch };
};

export const useOrderActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: changeStatus, isPending: changingStatus } = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      adminPanelApi.changeOrderStatus(orderId, status),
    onSuccess: () => {
      message.success('Статус заказа обновлен');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ORDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PROBLEM_ORDERS });
    },
    onError: (error) => {
      console.error('Failed to change order status:', error);
      message.error('Не удалось изменить статус заказа');
    },
  });

  return {
    changeStatus,
    changeOrderStatus: (orderId: number, status: string) => changeStatus({ orderId, status }), // Compatibility alias
    changingStatus,
  };
};
