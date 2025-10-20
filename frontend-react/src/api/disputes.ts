import { apiClient } from './client';

export interface Dispute {
  id: number;
  order: {
    id: number;
    title: string;
    client: { id: number; username: string };
    expert: { id: number; username: string } | null;
  };
  reason: string;
  resolved: boolean;
  result: string | null;
  arbitrator: { id: number; username: string } | null;
  created_at: string;
}

export interface CreateDisputeRequest {
  reason: string;
}

export interface AssignArbitratorRequest {
  arbitrator_id: number;
}

export interface ResolveDisputeRequest {
  result: string;
}

export const disputesApi = {
  // Получить все споры (для админов)
  getDisputes: (): Promise<Dispute[]> => {
    return apiClient.get('/orders/disputes/');
  },

  // Получить споры для арбитра
  getMyDisputes: (): Promise<Dispute[]> => {
    return apiClient.get('/orders/disputes/my_disputes/');
  },

  // Получить спор по ID
  getDispute: (id: number): Promise<Dispute> => {
    return apiClient.get(`/orders/disputes/${id}/`);
  },

  // Создать спор по заказу
  createDispute: (orderId: number, data: CreateDisputeRequest): Promise<Dispute> => {
    return apiClient.post(`/orders/orders/${orderId}/create_dispute/`, data);
  },

  // Назначить арбитра на спор
  assignArbitrator: (disputeId: number, data: AssignArbitratorRequest): Promise<Dispute> => {
    return apiClient.post(`/orders/disputes/${disputeId}/assign_arbitrator/`, data);
  },

  // Решить спор
  resolveDispute: (disputeId: number, data: ResolveDisputeRequest): Promise<Dispute> => {
    return apiClient.post(`/orders/disputes/${disputeId}/resolve/`, data);
  },
};
