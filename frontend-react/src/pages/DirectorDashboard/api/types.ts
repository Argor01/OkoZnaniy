


export interface InternalMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    role: string;
  };
  recipient: {
    id: number;
    username: string;
    role: string;
  };
  text: string;
  claim_id?: number;
  priority: 'low' | 'medium' | 'high';
  attachments: Attachment[];
  created_at: string;
  read_at?: string;
  status: 'sent' | 'read' | 'replied';
}

export interface Attachment {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
}


export interface GetMessagesParams {
  page?: number;
  page_size?: number;
  claim_id?: number;
  unread_only?: boolean;
}


export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


export interface SendMessageRequest {
  text: string;
  claim_id?: number;
  priority?: 'low' | 'medium' | 'high';
  attachments?: File[];
}


export interface Claim {
  id: number;
  type: 'refund' | 'dispute' | 'conflict';
  status: 'new' | 'in_progress' | 'completed' | 'pending_approval';
  priority: 'low' | 'medium' | 'high';
  order: {
    id: number;
    title: string;
    description?: string;
    amount: number;
    created_at: string;
    deadline?: string;
    status: string;
  };
  client: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
  expert?: {
    id: number;
    username: string;
    email: string;
    rating?: number;
  };
  created_at: string;
  updated_at: string;
  taken_at?: string;
  arbitrator?: {
    id: number;
    username: string;
  };
  decision?: Decision;
  messages?: any[];
  attachments?: any[];
}

export interface Decision {
  id: number;
  claim_id: number;
  decision_type: 'full_refund' | 'partial_refund' | 'no_refund' | 'revision' | 'other';
  refund_amount?: number;
  reasoning: string;
  client_comment?: string;
  expert_comment?: string;
  created_at: string;
  arbitrator: {
    id: number;
    username: string;
  };
  requires_approval: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approval_comment?: string;
}

export interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  phone?: string;
  role: 'admin' | 'arbitrator' | 'partner' | 'expert' | 'client';
  is_active?: boolean;
  date_joined: string;
  last_login?: string;
  username?: string;
  experience_years?: number;
  education?: string;
  skills?: string;
  portfolio_url?: string;
  bio?: string;
  application_approved?: boolean;
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
  status?: 'new' | 'under_review' | 'approved' | 'rejected' | 'deactivated';
  submitted_at?: string;
  reviewed_at?: string;
  application_submitted_at?: string;
  application_reviewed_at?: string;
  application_approved?: boolean;
  status_display?: string;
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
  total?: number;
  total_turnover?: number;
  orders_count?: number;
  start_date?: string;
  end_date?: string;
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

