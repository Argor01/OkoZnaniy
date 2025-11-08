// Типы для API директора

export interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'arbitrator' | 'partner' | 'expert' | 'client';
  is_active?: boolean;
  date_joined: string;
  last_login?: string;
  username?: string;
}

export interface ExpertApplication {
  id: number;
  user: Employee;
  experience_years?: number;
  education?: string;
  skills?: string;
  portfolio_url?: string;
  bio?: string;
  biography?: string;
  specializations?: string[];
  status?: 'new' | 'under_review' | 'approved' | 'rejected';
  submitted_at?: string;
  reviewed_at?: string;
  application_submitted_at?: string;
  application_reviewed_at?: string;
  application_approved?: boolean;
}

export interface RegisterEmployeeRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'arbitrator' | 'partner' | 'expert';
  password?: string;
  username?: string;
}


export interface MonthlyTurnover {
  period?: string;
  total: number;
  previous_period?: number;
  previousPeriod?: number;
  change?: number;
  change_percent?: number;
  changePercent?: number;
  daily_data?: Array<{
    date: string;
    amount: number;
  }>;
  dailyData?: Array<{
    date: string;
    amount: number;
  }>;
}

export interface NetProfit {
  period?: {
    start: string;
    end: string;
  };
  total: number;
  income: number;
  expense: number;
  previous_period?: number;
  previousPeriod?: number;
  change?: number;
  change_percent?: number;
  changePercent?: number;
  daily_data?: Array<{
    date: string;
    profit: number;
  }>;
  dailyData?: Array<{
    date: string;
    profit: number;
  }>;
  income_breakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  incomeBreakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expense_breakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expenseBreakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface IncomeDetail {
  date: string;
  category: string;
  amount: number;
  description: string;
  order_id?: number;
  orderId?: number;
  partner_id?: number;
  partnerId?: number;
}

export interface ExpenseDetail {
  date: string;
  category: string;
  amount: number;
  description: string;
  recipient_id?: number;
  recipientId?: number;
  recipient_name?: string;
  recipientName?: string;
}

export interface Partner {
  id: number;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  referralCode?: string;
  referral_code?: string;
  commissionPercent?: number;
  commission_percent?: number;
  totalReferrals?: number;
  total_referrals?: number;
  activeReferrals?: number;
  active_referrals?: number;
  totalEarnings?: number;
  total_earnings?: number;
  isActive?: boolean;
  is_active?: boolean;
  status?: 'active' | 'inactive';
  dateJoined?: string;
  date_joined?: string;
  referrals?: Array<{
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
    date_joined: string;
    is_active: boolean;
  }>;
}

export interface PartnerTurnover {
  id?: number;
  partnerId: number;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  partnerName: string;
  email?: string;
  partnerEmail: string;
  referralCount?: number;
  referrals_count?: number;
  referralsCount?: number;
  turnover: number;
  commission: number;
  percentageOfTotal?: number;
}

export interface PartnerTurnoverResponse {
  period: string;
  totalTurnover: number;
  partners: PartnerTurnover[];
}

export interface KPI {
  totalTurnover?: number;
  total_turnover?: number;
  netProfit?: number;
  net_profit?: number;
  activeOrders?: number;
  active_orders?: number;
  averageOrderValue?: number;
  averageOrder?: number;
  average_check?: number;
  averageCheck?: number;
  totalClients?: number;
  total_clients?: number;
  totalExperts?: number;
  total_experts?: number;
  totalPartners?: number;
  total_partners?: number;
  conversionRate?: number;
  conversion_rate?: number;
  turnoverChange?: number;
  turnover_change?: number;
  profitChange?: number;
  profit_change?: number;
  ordersChange?: number;
  orders_change?: number;
  averageCheckChange?: number;
  average_check_change?: number;
}

export interface StatisticsSummary {
  period?: {
    start: string;
    end: string;
  };
  kpi?: KPI;
  previousPeriod?: KPI;
  previous_period?: KPI;
  currentPeriod?: {
    turnover?: number;
    profit?: number;
    orders?: number;
    averageCheck?: number;
    average_check?: number;
  };
  current_period?: {
    turnover?: number;
    profit?: number;
    orders?: number;
    averageCheck?: number;
    average_check?: number;
  };
  trends?: {
    turnover: Array<{ date: string; value: number }>;
    profit: Array<{ date: string; value: number }>;
    orders: Array<{ date: string; value: number }>;
  };
  turnoverChange?: number;
  turnover_change?: number;
  profitChange?: number;
  profit_change?: number;
  ordersChange?: number;
  orders_change?: number;
  averageCheckChange?: number;
  average_check_change?: number;
}

