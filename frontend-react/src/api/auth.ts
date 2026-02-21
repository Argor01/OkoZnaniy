import apiClient from './client';

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

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export const authApi = {
  
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/users/token/', data);
    const { access, refresh } = response.data;
    
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    return response.data;
  },

  
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post('/users/', data);
    return response.data;
  },

  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },

  getSupportUser: async (): Promise<{ id: number }> => {
    const response = await apiClient.get('/users/support_user/');
    return response.data;
  },

  
  getRecentUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/users/recent_users/');
    return response.data;
  },

  
  refreshToken: async (): Promise<{ access: string }> => {
    const refresh = localStorage.getItem('refresh_token');
    const response = await apiClient.post('/users/token/refresh/', { refresh });
    const { access } = response.data;
    localStorage.setItem('access_token', access);
    return response.data;
  },

  
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch('/users/update_me/', data);
    return response.data;
  },

  
  submitExpertApplication: async (data: {
    first_name: string;
    last_name: string;
    bio: string;
    experience_years: number;
    education: string;
    skills?: string;
    portfolio_url?: string;
  }): Promise<User> => {
    const response = await apiClient.post('/users/submit_expert_application/', data);
    return response.data;
  },

  
  verifyEmailCode: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/users/verify_email_code/', { email, code });
    const { access, refresh } = response.data;
    
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  },

  
  resendVerificationCode: async (email: string): Promise<void> => {
    await apiClient.post('/users/resend_verification_code/', { email });
  },

  
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post('/users/request_password_reset/', { email });
  },

  
  confirmPasswordReset: async (email: string, code: string, newPassword: string): Promise<void> => {
    await apiClient.post('/users/reset_password_with_code/', {
      email,
      code,
      new_password: newPassword,
    });
  },

  resetPasswordConfirm: async (
    uid: string,
    token: string,
    newPassword: string,
    newPassword2?: string
  ): Promise<void> => {
    await apiClient.post('/users/reset_password_confirm/', {
      uid,
      token,
      new_password: newPassword,
      new_password2: newPassword2 ?? newPassword,
    });
  },

  
  resetPasswordWithCode: async (email: string, code: string, newPassword: string): Promise<void> => {
    await apiClient.post('/users/reset_password_with_code/', {
      email,
      code,
      new_password: newPassword,
    });
  },
};
