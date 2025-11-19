import { apiClient } from './client';
import dayjs from 'dayjs';

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

// Флаг для использования mock данных
const USE_MOCK_DATA = true;

// Генерация mock данных
const generateMockDashboard = (): PartnerDashboardData => {
  const referralCode = 'PARTNER-2024-ABC';
  const commissionRate = 15;

  // Генерируем список рефералов
  const mockReferrals: Referral[] = [
    {
      id: 1,
      username: 'Иван Иванов',
      email: 'ivan.ivanov@example.com',
      role: 'client',
      date_joined: dayjs().subtract(45, 'days').toISOString(),
      orders_count: 12,
    },
    {
      id: 2,
      username: 'Мария Петрова',
      email: 'maria.petrova@example.com',
      role: 'expert',
      date_joined: dayjs().subtract(30, 'days').toISOString(),
      orders_count: 8,
    },
    {
      id: 3,
      username: 'Алексей Смирнов',
      email: 'alexey.smirnov@example.com',
      role: 'client',
      date_joined: dayjs().subtract(25, 'days').toISOString(),
      orders_count: 5,
    },
    {
      id: 4,
      username: 'Елена Козлова',
      email: 'elena.kozlova@example.com',
      role: 'client',
      date_joined: dayjs().subtract(20, 'days').toISOString(),
      orders_count: 15,
    },
    {
      id: 5,
      username: 'Дмитрий Волков',
      email: 'dmitry.volkov@example.com',
      role: 'expert',
      date_joined: dayjs().subtract(18, 'days').toISOString(),
      orders_count: 22,
    },
    {
      id: 6,
      username: 'Анна Новикова',
      email: 'anna.novikova@example.com',
      role: 'client',
      date_joined: dayjs().subtract(15, 'days').toISOString(),
      orders_count: 3,
    },
    {
      id: 7,
      username: 'Сергей Лебедев',
      email: 'sergey.lebedev@example.com',
      role: 'client',
      date_joined: dayjs().subtract(12, 'days').toISOString(),
      orders_count: 7,
    },
    {
      id: 8,
      username: 'Татьяна Соколова',
      email: 'tatiana.sokolova@example.com',
      role: 'expert',
      date_joined: dayjs().subtract(10, 'days').toISOString(),
      orders_count: 18,
    },
    {
      id: 9,
      username: 'Игорь Павлов',
      email: 'igor.pavlov@example.com',
      role: 'client',
      date_joined: dayjs().subtract(8, 'days').toISOString(),
      orders_count: 4,
    },
    {
      id: 10,
      username: 'Юлия Иванова',
      email: 'yulia.ivanova@example.com',
      role: 'client',
      date_joined: dayjs().subtract(5, 'days').toISOString(),
      orders_count: 9,
    },
    {
      id: 11,
      username: 'Николай Федоров',
      email: 'nikolay.fedorov@example.com',
      role: 'expert',
      date_joined: dayjs().subtract(3, 'days').toISOString(),
      orders_count: 14,
    },
    {
      id: 12,
      username: 'Ольга Морозова',
      email: 'olga.morozova@example.com',
      role: 'client',
      date_joined: dayjs().subtract(2, 'days').toISOString(),
      orders_count: 2,
    },
  ];

  const activeReferrals = mockReferrals.filter(r => r.orders_count > 0).length;

  // Генерируем историю начислений
  const mockEarnings: PartnerEarning[] = [
    {
      id: 1,
      amount: 1250,
      referral: 'Иван Иванов',
      earning_type: 'order',
      created_at: dayjs().subtract(1, 'day').toISOString(),
      is_paid: true,
    },
    {
      id: 2,
      amount: 850,
      referral: 'Мария Петрова',
      earning_type: 'order',
      created_at: dayjs().subtract(2, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 3,
      amount: 500,
      referral: 'Алексей Смирнов',
      earning_type: 'order',
      created_at: dayjs().subtract(3, 'days').toISOString(),
      is_paid: false,
    },
    {
      id: 4,
      amount: 100,
      referral: 'Елена Козлова',
      earning_type: 'registration',
      created_at: dayjs().subtract(4, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 5,
      amount: 1800,
      referral: 'Дмитрий Волков',
      earning_type: 'order',
      created_at: dayjs().subtract(5, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 6,
      amount: 300,
      referral: 'Анна Новикова',
      earning_type: 'order',
      created_at: dayjs().subtract(6, 'days').toISOString(),
      is_paid: false,
    },
    {
      id: 7,
      amount: 650,
      referral: 'Сергей Лебедев',
      earning_type: 'order',
      created_at: dayjs().subtract(7, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 8,
      amount: 1500,
      referral: 'Татьяна Соколова',
      earning_type: 'order',
      created_at: dayjs().subtract(8, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 9,
      amount: 200,
      referral: 'Игорь Павлов',
      earning_type: 'registration',
      created_at: dayjs().subtract(9, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 10,
      amount: 750,
      referral: 'Юлия Иванова',
      earning_type: 'order',
      created_at: dayjs().subtract(10, 'days').toISOString(),
      is_paid: false,
    },
    {
      id: 11,
      amount: 1200,
      referral: 'Николай Федоров',
      earning_type: 'order',
      created_at: dayjs().subtract(11, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 12,
      amount: 250,
      referral: 'Ольга Морозова',
      earning_type: 'bonus',
      created_at: dayjs().subtract(12, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 13,
      amount: 950,
      referral: 'Иван Иванов',
      earning_type: 'order',
      created_at: dayjs().subtract(13, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 14,
      amount: 600,
      referral: 'Мария Петрова',
      earning_type: 'order',
      created_at: dayjs().subtract(14, 'days').toISOString(),
      is_paid: true,
    },
    {
      id: 15,
      amount: 1100,
      referral: 'Дмитрий Волков',
      earning_type: 'order',
      created_at: dayjs().subtract(15, 'days').toISOString(),
      is_paid: true,
    },
  ];

  const totalEarnings = mockEarnings.reduce((sum, e) => sum + e.amount, 0);

  return {
    partner_info: {
      referral_code: referralCode,
      commission_rate: commissionRate,
      total_referrals: mockReferrals.length,
      active_referrals: activeReferrals,
      total_earnings: totalEarnings,
    },
    referrals: mockReferrals,
    recent_earnings: mockEarnings.sort((a, b) => 
      dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf()
    ),
  };
};

const generateMockReferralLink = (): ReferralLinkResponse => {
  const referralCode = 'PARTNER-2024-ABC';
  const baseUrl = window.location.origin;
  const referralLink = `${baseUrl}/register?ref=${referralCode}`;

  return {
    referral_code: referralCode,
    referral_link: referralLink,
  };
};

export const partnersApi = {
  getDashboard: async (): Promise<PartnerDashboardData> => {
    if (USE_MOCK_DATA) {
      // Имитируем задержку сети
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockDashboard();
    }

    try {
      const response = await apiClient.get('/users/partner_dashboard/');
      return response.data;
    } catch (error: any) {
      // Если API недоступен, используем mock данные
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для партнерского кабинета');
        return generateMockDashboard();
      }
      throw error;
    }
  },

  generateReferralLink: async (): Promise<ReferralLinkResponse> => {
    if (USE_MOCK_DATA) {
      // Имитируем задержку сети
      await new Promise(resolve => setTimeout(resolve, 300));
      return generateMockReferralLink();
    }

    try {
      const response = await apiClient.post('/users/generate_referral_link/');
      return response.data;
    } catch (error: any) {
      // Если API недоступен, используем mock данные
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('API недоступен, используем mock данные для генерации ссылки');
        return generateMockReferralLink();
      }
      throw error;
    }
  },
};
