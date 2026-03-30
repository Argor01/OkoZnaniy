import { AdminOrder, ProblemOrder } from '@/features/orders/types/orders';
import { PartnerEarning as BasePartnerEarning } from '@/features/partner/types/partners';
import { Claim, SupportRequest } from '@/features/support/types/support';

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

export interface PartnerEarning extends BasePartnerEarning {
  partner: string;
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

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_blocked: boolean;
  date_joined: string;
  last_login: string | null;
  permissions?: string[];
  avatar?: string;
}

export interface BlockedUser extends AdminUser {
  block_duration: string;
  block_reason: string;
  blocked_at: string;
  unblock_date?: string;
  violation_count: number;
}

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  users_count: number;
  is_system: boolean;
}

export interface AdminPermission {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string;
}

export type { AdminOrder, Claim, ProblemOrder, SupportRequest };

export interface ChatRoom {
  id: number;
  name: string;
  type: string;
  created_at: string;
  description?: string;
  participants?: any[];
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    role: string;
    online: boolean;
  };
  sent_at: string;
  is_pinned: boolean;
  is_system: boolean;
}

export interface DirectorCommunication {
  id: number;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceTariff {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  description: string;
  urgency_multipliers: {
    '24h': number;
    week: number;
    [key: string]: number;
  };
}

export interface CommissionSettings {
  id: number;
  name: string;
  type: string;
  value: number;
  applies_to: string;
  is_active: boolean;
  description?: string;
}

export interface Work {
  id: number;
  title: string;
  description: string;
  price: number;
  moderation_status: string;
  created_at: string;
  subject: string;
  work_type: string;
  pages_count: number;
  words_count: number;
  author: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    rating: number;
    works_count: number;
  };
  file_url?: string;
  preview_url?: string;
}
