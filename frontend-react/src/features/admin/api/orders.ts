import apiClient from '@/api/client';
import { AdminOrder, ProblemOrder } from '@/features/orders/types/orders';
import { API_ENDPOINTS } from '@/config/endpoints';

export const ordersApi = {
  getOrders: async (): Promise<AdminOrder[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.orders.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  getProblemOrders: async (): Promise<ProblemOrder[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.orders.problems);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  changeOrderStatus: async (orderId: number, status: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.orders.changeStatus(orderId), { status });
    return response.data;
  },
};
