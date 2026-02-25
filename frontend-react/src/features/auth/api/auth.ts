import apiClient from '@/api/client';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '@/features/user/types/users';
import { API_ENDPOINTS } from '@/config/endpoints';

export type { AuthResponse, LoginRequest, RegisterRequest, User };

export const authApi = {
  
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.login, data);
    const { access, refresh } = response.data;
    
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    return response.data;
  },

  
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.register, data);
    return response.data;
  },

  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get(API_ENDPOINTS.auth.me);
    return response.data;
  },

  getSupportUser: async (): Promise<{ id: number }> => {
    const response = await apiClient.get(API_ENDPOINTS.users.supportUser);
    return response.data;
  },

  
  getRecentUsers: async (): Promise<User[]> => {
    const response = await apiClient.get(API_ENDPOINTS.users.recent);
    return response.data;
  },

  
  refreshToken: async (): Promise<{ access: string }> => {
    const refresh = localStorage.getItem('refresh_token');
    const response = await apiClient.post(API_ENDPOINTS.auth.refreshToken, { refresh });
    const { access } = response.data;
    localStorage.setItem('access_token', access);
    return response.data;
  },

  
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch(API_ENDPOINTS.users.updateProfile, data);
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
    const response = await apiClient.post(API_ENDPOINTS.users.submitExpertApplication, data);
    return response.data;
  },

  
  verifyEmailCode: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.verifyEmailCode, { email, code });
    const { access, refresh } = response.data;
    
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  },

  
  resendVerificationCode: async (email: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.auth.resendVerificationCode, { email });
  },

  
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.auth.requestPasswordReset, { email });
  },

  checkTelegramAuthStatus: async (authId: string): Promise<{ authenticated: boolean; access: string; refresh: string; user: any }> => {
    const response = await apiClient.get(API_ENDPOINTS.auth.telegramAuthStatus(authId));
    return response.data;
  },

  
  confirmPasswordReset: async (email: string, code: string, newPassword: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.auth.resetPasswordWithCode, {
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
    await apiClient.post(API_ENDPOINTS.auth.resetPasswordConfirm, {
      uid,
      token,
      new_password: newPassword,
      new_password2: newPassword2 ?? newPassword,
    });
  },

  
  resetPasswordWithCode: async (email: string, code: string, newPassword: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.auth.resetPasswordWithCode, {
      email,
      code,
      new_password: newPassword,
    });
  },
};
