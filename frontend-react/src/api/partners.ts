import { apiClient } from './client';

export interface PartnerInfo {
  referral_code: string;
  commission_rate: number;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
}

export interface Referral {
  id: number;
  username: string;
  email: string;
  role: string;
  date_joined: string;
  orders_count: number;
}

export interface PartnerEarning {
  id: number;
  amount: number;
  referral: string;
  earning_type: string;
  created_at: string;
  is_paid: boolean;
}

export interface PartnerDashboardData {
  partner_info: PartnerInfo;
  referrals: Referral[];
  recent_earnings: PartnerEarning[];
}

export interface ReferralLinkResponse {
  referral_code: string;
  referral_link: string;
}

export const partnersApi = {
  getDashboard: (): Promise<PartnerDashboardData> =>
    apiClient.get('/users/partner_dashboard/').then(response => response.data),

  generateReferralLink: (): Promise<ReferralLinkResponse> =>
    apiClient.post('/users/generate_referral_link/').then(response => response.data),
};
