import { apiClient } from '@/api/client';
import { AssignArbitratorRequest, CreateDisputeRequest, Dispute, ResolveDisputeRequest } from '@/features/arbitrator/types/disputes';

export type { AssignArbitratorRequest, CreateDisputeRequest, Dispute, ResolveDisputeRequest };

export const disputesApi = {
  getDisputes: async (): Promise<Dispute[]> => {
    const response = await apiClient.get('/orders/disputes/');
    const data = response.data;
    
    if (data?.data?.results && Array.isArray(data.data.results)) {
      return data.data.results;
    }
    if (Array.isArray(data)) {
      return data;
    }
    if (data?.results && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  },

  // Получение споров, назначенных текущему арбитру
  getMyDisputes: async (): Promise<Dispute[]> => {
    const response = await apiClient.get('/orders/disputes/my_disputes/');
    return response.data;
  },


  getDispute: async (id: number): Promise<Dispute> => {
    const response = await apiClient.get(`/orders/disputes/${id}/`);
    return response.data;
  },


  createDispute: async (orderId: number, data: CreateDisputeRequest): Promise<Dispute> => {
    const response = await apiClient.post(`/orders/orders/${orderId}/create_dispute/`, data);
    return response.data;
  },


  assignArbitrator: async (disputeId: number, data: AssignArbitratorRequest): Promise<Dispute> => {
    const response = await apiClient.post(`/orders/disputes/${disputeId}/assign_arbitrator/`, data);
    return response.data;
  },


  resolveDispute: async (disputeId: number, data: ResolveDisputeRequest): Promise<Dispute> => {
    const response = await apiClient.post(`/orders/disputes/${disputeId}/resolve/`, data);
    return response.data;
  },
};
