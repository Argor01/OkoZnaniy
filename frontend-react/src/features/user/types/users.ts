export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  telegram_id?: number;
  balance: string;
  frozen_balance: string;
  date_joined: string;
  last_login?: string;
  specializations: any[];
  avatar?: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  education?: string;
  skills?: string;
  portfolio_url?: string;
  is_verified?: boolean;
  has_submitted_application?: boolean;
  application_approved?: boolean;
  application_submitted_at?: string;
  application_reviewed_at?: string;
}

export interface UserSummary {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  password2: string;
  role: 'client' | 'expert' | 'partner';
  referral_code?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}
