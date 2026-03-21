import apiClient from '@/api/client';
import { PartnerDashboardData, PartnerEarning, PartnerInfo, Referral, ReferralLinkResponse, MapPartner } from '@/features/partner/types/partners';
import { API_ENDPOINTS } from '@/config/endpoints';

export type { PartnerDashboardData, PartnerEarning, PartnerInfo, Referral, ReferralLinkResponse, MapPartner };

export const partnersApi = {
  getDashboard: async (): Promise<PartnerDashboardData> => {
    const response = await apiClient.get(API_ENDPOINTS.partners.dashboard);
    return response.data;
  },

  generateReferralLink: async (): Promise<ReferralLinkResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.partners.generateLink);
    return response.data;
  },

  getPartnersList: async (): Promise<MapPartner[]> => {
    const response = await apiClient.get(API_ENDPOINTS.partners.list);
    return response.data;
  },
};
