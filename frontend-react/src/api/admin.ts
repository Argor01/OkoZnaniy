import { apiClient } from './client';
import dayjs from 'dayjs';

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

export interface Arbitrator {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Флаг для использования mock данных
const USE_MOCK_DATA = false;

// Хранилище для обновленных партнеров
const getUpdatedPartners = (): Map<number, Partial<Partner>> => {
  try {
    const stored = localStorage.getItem('admin_updated_partners');
    if (stored) {
      const updates = JSON.parse(stored) as Array<[number, Partial<Partner>]>;
      return new Map(updates);
    }
  } catch (e) {
    console.warn('Error reading updated partners from localStorage:', e);
  }
  return new Map<number, Partial<Partner>>();
};

const saveUpdatedPartner = (partnerId: number, updates: Partial<Partner>): void => {
  try {
    const updatedPartners = getUpdatedPartners();
    const existing = updatedPartners.get(partnerId) || {};
    updatedPartners.set(partnerId, { ...existing, ...updates });
    localStorage.setItem('admin_updated_partners', JSON.stringify(Array.from(updatedPartners.entries())));
  } catch (e) {
    console.warn('Error saving updated partner to localStorage:', e);
  }
};

// Хранилище для выплаченных начислений
const getPaidEarningsIds = (): Set<number> => {
  try {
    const stored = localStorage.getItem('admin_paid_earnings');
    if (stored) {
      const ids = JSON.parse(stored) as number[];
      return new Set(ids);
    }
  } catch (e) {
    console.warn('Error reading paid earnings from localStorage:', e);
  }
  return new Set<number>();
};

const savePaidEarningId = (earningId: number): void => {
  try {
    const paidIds = getPaidEarningsIds();
    paidIds.add(earningId);
    localStorage.setItem('admin_paid_earnings', JSON.stringify(Array.from(paidIds)));
  } catch (e) {
    console.warn('Error saving paid earning to localStorage:', e);
  }
};

// Генерация mock данных для партнеров
const generateMockPartners = (): Partner[] => {
  const basePartners: Partner[] = [
    {
      id: 1,
      username: 'partner1',
      email: 'partner1@example.com',
      first_name: 'Мария',
      last_name: 'Сидорова',
      referral_code: 'REF-MARIA-2023',
      partner_commission_rate: 15,
      total_referrals: 45,
      active_referrals: 32,
      total_earnings: 125000,
      date_joined: dayjs().subtract(180, 'days').toISOString(),
      is_verified: true,
    },
    {
      id: 2,
      username: 'partner2',
      email: 'partner2@example.com',
      first_name: 'Ольга',
      last_name: 'Морозова',
      referral_code: 'REF-OLGA-2024',
      partner_commission_rate: 12,
      total_referrals: 28,
      active_referrals: 18,
      total_earnings: 68000,
      date_joined: dayjs().subtract(120, 'days').toISOString(),
      is_verified: true,
    },
    {
      id: 3,
      username: 'partner3',
      email: 'partner3@example.com',
      first_name: 'Алексей',
      last_name: 'Новиков',
      referral_code: 'REF-ALEX-2023',
      partner_commission_rate: 18,
      total_referrals: 67,
      active_referrals: 52,
      total_earnings: 210000,
      date_joined: dayjs().subtract(250, 'days').toISOString(),
      is_verified: true,
    },
    {
      id: 4,
      username: 'partner4',
      email: 'partner4@example.com',
      first_name: 'Елена',
      last_name: 'Волкова',
      referral_code: 'REF-ELENA-2023',
      partner_commission_rate: 10,
      total_referrals: 15,
      active_referrals: 10,
      total_earnings: 35000,
      date_joined: dayjs().subtract(90, 'days').toISOString(),
      is_verified: false,
    },
    {
      id: 5,
      username: 'partner5',
      email: 'partner5@example.com',
      first_name: 'Дмитрий',
      last_name: 'Петров',
      referral_code: 'REF-DMITRY-2024',
      partner_commission_rate: 14,
      total_referrals: 38,
      active_referrals: 25,
      total_earnings: 95000,
      date_joined: dayjs().subtract(60, 'days').toISOString(),
      is_verified: true,
    },
    {
      id: 6,
      username: 'partner6',
      email: 'partner6@example.com',
      first_name: 'Анна',
      last_name: 'Козлова',
      referral_code: 'REF-ANNA-2024',
      partner_commission_rate: 16,
      total_referrals: 22,
      active_referrals: 15,
      total_earnings: 52000,
      date_joined: dayjs().subtract(45, 'days').toISOString(),
      is_verified: true,
    },
  ];

  // Применяем обновления из localStorage
  const updatedPartners = getUpdatedPartners();
  return basePartners.map(partner => {
    const updates = updatedPartners.get(partner.id);
    return updates ? { ...partner, ...updates } : partner;
  });
};

// Генерация mock данных для начислений
const generateMockEarnings = (): PartnerEarning[] => {
  const partners = generateMockPartners();
  const paidEarningsIds = getPaidEarningsIds();
  
  const earnings: PartnerEarning[] = [
    {
      id: 1,
      partner: 'Мария Сидорова',
      referral: 'Иван Иванов',
      amount: 1250,
      earning_type: 'order',
      created_at: dayjs().subtract(1, 'day').toISOString(),
      is_paid: paidEarningsIds.has(1),
    },
    {
      id: 2,
      partner: 'Ольга Морозова',
      referral: 'Петр Петров',
      amount: 850,
      earning_type: 'order',
      created_at: dayjs().subtract(2, 'days').toISOString(),
      is_paid: paidEarningsIds.has(2),
    },
    {
      id: 3,
      partner: 'Алексей Новиков',
      referral: 'Анна Смирнова',
      amount: 1800,
      earning_type: 'order',
      created_at: dayjs().subtract(3, 'days').toISOString(),
      is_paid: paidEarningsIds.has(3),
    },
    {
      id: 4,
      partner: 'Елена Волкова',
      referral: 'Сергей Лебедев',
      amount: 500,
      earning_type: 'registration',
      created_at: dayjs().subtract(4, 'days').toISOString(),
      is_paid: paidEarningsIds.has(4),
    },
    {
      id: 5,
      partner: 'Дмитрий Петров',
      referral: 'Татьяна Соколова',
      amount: 1200,
      earning_type: 'order',
      created_at: dayjs().subtract(5, 'days').toISOString(),
      is_paid: paidEarningsIds.has(5),
    },
    {
      id: 6,
      partner: 'Анна Козлова',
      referral: 'Игорь Павлов',
      amount: 750,
      earning_type: 'order',
      created_at: dayjs().subtract(6, 'days').toISOString(),
      is_paid: paidEarningsIds.has(6),
    },
    {
      id: 7,
      partner: 'Мария Сидорова',
      referral: 'Юлия Иванова',
      amount: 950,
      earning_type: 'order',
      created_at: dayjs().subtract(7, 'days').toISOString(),
      is_paid: paidEarningsIds.has(7),
    },
    {
      id: 8,
      partner: 'Ольга Морозова',
      referral: 'Николай Федоров',
      amount: 600,
      earning_type: 'order',
      created_at: dayjs().subtract(8, 'days').toISOString(),
      is_paid: paidEarningsIds.has(8),
    },
    {
      id: 9,
      partner: 'Алексей Новиков',
      referral: 'Ольга Морозова',
      amount: 1500,
      earning_type: 'order',
      created_at: dayjs().subtract(9, 'days').toISOString(),
      is_paid: paidEarningsIds.has(9),
    },
    {
      id: 10,
      partner: 'Елена Волкова',
      referral: 'Дмитрий Волков',
      amount: 300,
      earning_type: 'bonus',
      created_at: dayjs().subtract(10, 'days').toISOString(),
      is_paid: paidEarningsIds.has(10),
    },
    {
      id: 11,
      partner: 'Дмитрий Петров',
      referral: 'Анна Новикова',
      amount: 1100,
      earning_type: 'order',
      created_at: dayjs().subtract(11, 'days').toISOString(),
      is_paid: paidEarningsIds.has(11),
    },
    {
      id: 12,
      partner: 'Анна Козлова',
      referral: 'Сергей Лебедев',
      amount: 650,
      earning_type: 'order',
      created_at: dayjs().subtract(12, 'days').toISOString(),
      is_paid: paidEarningsIds.has(12),
    },
    {
      id: 13,
      partner: 'Мария Сидорова',
      referral: 'Иван Иванов',
      amount: 1400,
      earning_type: 'order',
      created_at: dayjs().subtract(13, 'days').toISOString(),
      is_paid: paidEarningsIds.has(13),
    },
    {
      id: 14,
      partner: 'Ольга Морозова',
      referral: 'Петр Петров',
      amount: 900,
      earning_type: 'order',
      created_at: dayjs().subtract(14, 'days').toISOString(),
      is_paid: paidEarningsIds.has(14),
    },
    {
      id: 15,
      partner: 'Алексей Новиков',
      referral: 'Анна Смирнова',
      amount: 1700,
      earning_type: 'order',
      created_at: dayjs().subtract(15, 'days').toISOString(),
      is_paid: paidEarningsIds.has(15),
    },
  ];

  return earnings.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
};

// Генерация mock данных для арбитров
const generateMockArbitrators = (): Arbitrator[] => {
  return [
    {
      id: 1,
      username: 'arbitrator1',
      first_name: 'Александр',
      last_name: 'Иванов',
      email: 'arbitrator1@example.com',
    },
    {
      id: 2,
      username: 'arbitrator2',
      first_name: 'Елена',
      last_name: 'Петрова',
      email: 'arbitrator2@example.com',
    },
    {
      id: 3,
      username: 'arbitrator3',
      first_name: 'Сергей',
      last_name: 'Смирнов',
      email: 'arbitrator3@example.com',
    },
    {
      id: 4,
      username: 'arbitrator4',
      first_name: 'Мария',
      last_name: 'Козлова',
      email: 'arbitrator4@example.com',
    },
  ];
};

export const adminApi = {
  // Получить всех партнеров
  getPartners: async (): Promise<Partner[]> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockPartners();
    }

    try {
      const response = await apiClient.get('/users/admin_partners/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для партнеров');
        return generateMockPartners();
      }
      throw error;
    }
  },

  // Получить все начисления
  getEarnings: async (): Promise<PartnerEarning[]> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockEarnings();
    }

    try {
      const response = await apiClient.get('/users/admin_earnings/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для начислений');
        return generateMockEarnings();
      }
      throw error;
    }
  },

  // Обновить партнера
  updatePartner: async (partnerId: number, data: UpdatePartnerRequest): Promise<Partner> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveUpdatedPartner(partnerId, data);
      const partners = generateMockPartners();
      const partner = partners.find(p => p.id === partnerId);
      if (!partner) {
        throw new Error('Партнер не найден');
      }
      return { ...partner, ...data };
    }

    try {
      const response = await apiClient.patch(`/users/${partnerId}/admin_update_partner/`, data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для обновления партнера');
        saveUpdatedPartner(partnerId, data);
        const partners = generateMockPartners();
        const partner = partners.find(p => p.id === partnerId);
        if (!partner) {
          throw new Error('Партнер не найден');
        }
        return { ...partner, ...data };
      }
      throw error;
    }
  },

  // Отметить начисление как выплаченное
  markEarningPaid: async (earningId: number): Promise<{ message: string }> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      savePaidEarningId(earningId);
      return { message: 'Начисление отмечено как выплаченное' };
    }

    try {
      const response = await apiClient.post('/users/admin_mark_earning_paid/', {
        earning_id: earningId,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для отметки начисления');
        savePaidEarningId(earningId);
        return { message: 'Начисление отмечено как выплаченное' };
      }
      throw error;
    }
  },

  getArbitrators: async (): Promise<Arbitrator[]> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return generateMockArbitrators();
    }

    try {
      const response = await apiClient.get('/users/admin_arbitrators/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для арбитров');
        return generateMockArbitrators();
      }
      throw error;
    }
  },
};
