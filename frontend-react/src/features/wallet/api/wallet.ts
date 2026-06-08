import { apiClient } from '@/api/client';

export type WalletBalance = {
  balance: string;
  frozen_balance: string;
  available_balance: string;
};

export type WalletStats = {
  total_topup: string;
  total_spent: string;
  total_earned: string;
};

export type WalletTransaction = {
  id: number;
  amount: string;
  type:
    | 'hold' | 'release' | 'payout' | 'commission' | 'refund'
    | 'topup' | 'withdrawal' | 'purchase';
  type_display: string;
  direction: 'in' | 'out';
  description: string;
  order_id: number | null;
  balance_after: string | null;
  timestamp: string;
};

export type TopupResponse = {
  payment_id: string;
  amount: string;
  method: string;
  payment_url: string;
};

export const walletApi = {
  me: async (): Promise<WalletBalance> => {
    const { data } = await apiClient.get('/wallet/me/');
    return data;
  },
  stats: async (): Promise<WalletStats> => {
    const { data } = await apiClient.get('/wallet/stats/');
    return data;
  },
  transactions: async (params?: { type?: string[]; limit?: number }): Promise<WalletTransaction[]> => {
    const { data } = await apiClient.get('/wallet/transactions/', {
      params: { type: params?.type, limit: params?.limit ?? 50 },
    });
    return data;
  },
  topup: async (body: { amount: number; payment_method: string }): Promise<TopupResponse> => {
    const { data } = await apiClient.post('/wallet/topup/', body);
    return data;
  },
};
