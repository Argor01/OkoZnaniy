import { apiClient } from '@/api/client';
import { Partner, PartnerEarning, UpdatePartnerRequest } from '@/features/admin/types/admin';
import { API_ENDPOINTS } from '@/config/endpoints';

export interface EarningsResponse {
  earnings: PartnerEarning[];
  partners_pending: Array<{ id: number; username: string; pending_balance: string }>;
}

export const financeApi = {
  // Tariffs
  getTariffs: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.finance.tariffs.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  createTariff: async (data: any) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.finance.tariffs.list, data);
    return response.data;
  },

  updateTariff: async (id: number, data: any) => {
    const response = await apiClient.patch(API_ENDPOINTS.admin.finance.tariffs.detail(id), data);
    return response.data;
  },

  deleteTariff: async (id: number) => {
    await apiClient.delete(API_ENDPOINTS.admin.finance.tariffs.detail(id));
  },

  // Commissions
  getCommissions: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.finance.commissions.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  createCommission: async (data: any) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.finance.commissions.list, data);
    return response.data;
  },

  updateCommission: async (id: number, data: any) => {
    const response = await apiClient.patch(API_ENDPOINTS.admin.finance.commissions.detail(id), data);
    return response.data;
  },

  deleteCommission: async (id: number) => {
    await apiClient.delete(API_ENDPOINTS.admin.finance.commissions.detail(id));
  },

  // Partners & Earnings
  getPartners: async (): Promise<Partner[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.finance.partners);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  getEarnings: async (): Promise<EarningsResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.finance.earnings);
    const data = response.data;
    if (data && typeof data === 'object' && Array.isArray(data.earnings)) {
      return data;
    }
    return { earnings: Array.isArray(data) ? data : [], partners_pending: [] };
  },

  updatePartner: async (partnerId: number, data: UpdatePartnerRequest): Promise<Partner> => {
    const response = await apiClient.patch(API_ENDPOINTS.admin.finance.updatePartner(partnerId), data);
    return response.data;
  },

  markEarningPaid: async (earningId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.admin.finance.markEarningPaid, {
      earning_id: earningId,
    });
    return response.data;
  },

  payPartnerEarnings: async (earningIds: number[]): Promise<{ message: string; amount: string; earnings_count: number }> => {
    const response = await apiClient.post(API_ENDPOINTS.admin.finance.markEarningPaid, {
      earning_ids: earningIds,
    });
    return response.data;
  },
};
