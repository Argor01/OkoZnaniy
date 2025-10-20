import { apiClient } from './client';

export interface Partner {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  referral_code: string;
  partner_commission_rate: number;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  date_joined: string;
  is_verified: boolean;
}

export interface PartnerEarning {
  id: number;
  partner: string;
  referral: string;
  amount: number;
  earning_type: string;
  created_at: string;
  is_paid: boolean;
}

export interface UpdatePartnerRequest {
  first_name?: string;
  last_name?: string;
  partner_commission_rate?: number;
  is_verified?: boolean;
}

export const adminApi = {
  // Получить всех партнеров
  getPartners: (): Promise<Partner[]> => {
    return apiClient.get('/users/admin_partners/');
  },

  // Получить все начисления
  getEarnings: (): Promise<PartnerEarning[]> => {
    return apiClient.get('/users/admin_earnings/');
  },

  // Обновить партнера
  updatePartner: (partnerId: number, data: UpdatePartnerRequest): Promise<Partner> => {
    return apiClient.patch(`/users/${partnerId}/admin_update_partner/`, data);
  },

  // Отметить начисление как выплаченное
  markEarningPaid: (earningId: number): Promise<{ message: string }> => {
    return apiClient.post('/users/admin_mark_earning_paid/', {
      earning_id: earningId,
    });
  },
  getArbitrators: (): Promise<Partner[]> => {
    return apiClient.get('/users/admin_arbitrators/');
  },
};
