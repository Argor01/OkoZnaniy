import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';

export type PaymentMethod = 'sbp' | 'card' | 'sberbank' | 'sberpay_qr';

export interface PaymentCreateRequest {
  order_id: number;
  amount: number;
  payment_method: PaymentMethod;
}

export interface PaymentResponse {
  id: number;
  order: number;
  amount: string;
  payment_method: PaymentMethod;
  status: string;
  payment_id: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  metadata: Record<string, unknown>;
  payment_link: string;
}

export const paymentsApi = {
  createPayment: async (data: PaymentCreateRequest): Promise<PaymentResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.payments.createPayment, data);
    return response.data;
  },

  getPayment: async (id: number): Promise<PaymentResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.payments.detail(id));
    return response.data;
  },

  checkStatus: async (id: number) => {
    const response = await apiClient.get(API_ENDPOINTS.payments.checkStatus(id));
    return response.data;
  },
};
