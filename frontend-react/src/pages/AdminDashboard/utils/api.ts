/**
 * API утилиты для админ-панели
 */

import type { User } from '../../../api/auth';
import type { Order } from '../../../api/orders';
import type { Partner, Dispute, AdminStats } from '../types';

const API_BASE = '/api/admin';

/**
 * Базовый класс для API запросов
 */
class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient();

/**
 * API для работы со статистикой
 */
export const statsApi = {
  getStats: (): Promise<AdminStats> => 
    apiClient.get<AdminStats>('/stats'),
    
  getRevenueChart: (period: string): Promise<any[]> => 
    apiClient.get<any[]>(`/stats/revenue?period=${period}`),
    
  getUsersChart: (period: string): Promise<any[]> => 
    apiClient.get<any[]>(`/stats/users?period=${period}`),
};

/**
 * API для работы с пользователями
 */
export const usersApi = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ users: User[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    
    return apiClient.get<{ users: User[]; total: number }>(
      `/users?${query.toString()}`
    );
  },
  
  getUser: (id: number): Promise<User> => 
    apiClient.get<User>(`/users/${id}`),
    
  updateUser: (id: number, data: Partial<User>): Promise<User> => 
    apiClient.put<User>(`/users/${id}`, data),
    
  deleteUser: (id: number): Promise<void> => 
    apiClient.delete<void>(`/users/${id}`),
    
  blockUser: (id: number): Promise<User> => 
    apiClient.post<User>(`/users/${id}/block`),
    
  unblockUser: (id: number): Promise<User> => 
    apiClient.post<User>(`/users/${id}/unblock`),
};

/**
 * API для работы с заказами
 */
export const ordersApi = {
  getOrders: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ orders: Order[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    
    return apiClient.get<{ orders: Order[]; total: number }>(
      `/orders?${query.toString()}`
    );
  },
  
  getOrder: (id: number): Promise<Order> => 
    apiClient.get<Order>(`/orders/${id}`),
    
  updateOrderStatus: (id: number, status: string): Promise<Order> => 
    apiClient.put<Order>(`/orders/${id}/status`, { status }),
    
  cancelOrder: (id: number, reason: string): Promise<Order> => 
    apiClient.post<Order>(`/orders/${id}/cancel`, { reason }),
};

/**
 * API для работы с партнерами
 */
export const partnersApi = {
  getPartners: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ partners: Partner[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    
    return apiClient.get<{ partners: Partner[]; total: number }>(
      `/partners?${query.toString()}`
    );
  },
  
  getPartner: (id: number): Promise<Partner> => 
    apiClient.get<Partner>(`/partners/${id}`),
    
  updatePartner: (id: number, data: Partial<Partner>): Promise<Partner> => 
    apiClient.put<Partner>(`/partners/${id}`, data),
    
  approvePartner: (id: number): Promise<Partner> => 
    apiClient.post<Partner>(`/partners/${id}/approve`),
    
  rejectPartner: (id: number, reason: string): Promise<Partner> => 
    apiClient.post<Partner>(`/partners/${id}/reject`, { reason }),
    
  blockPartner: (id: number): Promise<Partner> => 
    apiClient.post<Partner>(`/partners/${id}/block`),
};

/**
 * API для работы со спорами
 */
export const disputesApi = {
  getDisputes: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ disputes: Dispute[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    
    return apiClient.get<{ disputes: Dispute[]; total: number }>(
      `/disputes?${query.toString()}`
    );
  },
  
  getDispute: (id: number): Promise<Dispute> => 
    apiClient.get<Dispute>(`/disputes/${id}`),
    
  assignArbitrator: (id: number, arbitratorId: number): Promise<Dispute> => 
    apiClient.post<Dispute>(`/disputes/${id}/assign`, { arbitratorId }),
    
  resolveDispute: (id: number, resolution: string, winner: 'customer' | 'expert'): Promise<Dispute> => 
    apiClient.post<Dispute>(`/disputes/${id}/resolve`, { resolution, winner }),
    
  addComment: (id: number, comment: string): Promise<Dispute> => 
    apiClient.post<Dispute>(`/disputes/${id}/comments`, { comment }),
};
