import apiClient from '@/api/client';
import { AdminOrder, ProblemOrder } from '@/features/orders/types/orders';
import { API_ENDPOINTS } from '@/config/endpoints';

export const ordersApi = {
  getOrders: async (): Promise<AdminOrder[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.orders.list);
    return response.data;
  },

  getProblemOrders: async (): Promise<ProblemOrder[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.orders.problems);
    return response.data;
  },

  changeOrderStatus: async (orderId: number, status: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.orders.changeStatus(orderId), { status });
    return response.data;
  },
};
