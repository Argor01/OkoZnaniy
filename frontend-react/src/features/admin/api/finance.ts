import { apiClient } from '@/api/client';
import { Partner, PartnerEarning, UpdatePartnerRequest } from '@/features/admin/types/admin';
import { API_ENDPOINTS } from '@/config/endpoints';

export const financeApi = {
  // Tariffs
  getTariffs: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.finance.tariffs.list);
    return response.data;
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
    return response.data;
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
    return response.data;
  },

  getEarnings: async (): Promise<PartnerEarning[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.finance.earnings);
    return response.data;
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
};
