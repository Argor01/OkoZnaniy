import apiClient from '@/api/client';
import { PartnerDashboardData, PartnerEarning, PartnerInfo, Referral, ReferralLinkResponse } from '@/features/partner/types/partners';
import { API_ENDPOINTS } from '@/config/endpoints';

export type { PartnerDashboardData, PartnerEarning, PartnerInfo, Referral, ReferralLinkResponse };

export const partnersApi = {
  getDashboard: async (): Promise<PartnerDashboardData> => {
    const response = await apiClient.get(API_ENDPOINTS.partners.dashboard);
    return response.data;
  },

  generateReferralLink: async (): Promise<ReferralLinkResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.partners.generateLink);
    return response.data;
  },
};
