

import { apiClient } from '../../../api/client';
import type { 
  CustomerRequest, 
  RequestMessage, 
  RequestStats,
  RequestsApiResponse,
  MessagesApiResponse,
  CreateRequestForm,
  UpdateRequestForm 
} from '../types/requests.types';

export const requestsApi = {
  
  async getRequests(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    page?: number;
    page_size?: number;
    assigned_to_me?: boolean;
  }): Promise<RequestsApiResponse> {
    const response = await apiClient.get('/admin/customer-requests/', { params });
    return response.data;
  },

  
  async getRequest(id: number): Promise<CustomerRequest> {
    const response = await apiClient.get(`/admin/customer-requests/${id}/`);
    return response.data;
  },

  
  async getRequestMessages(requestId: number, params?: {
    page?: number;
    page_size?: number;
    include_internal?: boolean;
  }): Promise<MessagesApiResponse> {
    const response = await apiClient.get(`/admin/customer-requests/${requestId}/messages/`, { params });
    return response.data;
  },

  
  async takeRequest(requestId: number): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/take/`);
    return response.data;
  },

  
  async sendMessage(
    requestId: number, 
    content: string, 
    isInternal = false,
    attachments?: File[]
  ): Promise<RequestMessage> {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('is_internal', isInternal.toString());
    
    
    if (attachments && attachments.length > 0) {
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }

    const response = await apiClient.post(
      `/admin/customer-requests/${requestId}/messages/`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  
  async completeRequest(requestId: number, resolution?: string): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      status: 'completed',
      resolution: resolution || undefined,
    });
    return response.data;
  },

  
  async updateRequest(requestId: number, data: UpdateRequestForm): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, data);
    return response.data;
  },

  
  async assignRequest(requestId: number, adminId: number): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/assign/`, {
      admin_id: adminId,
    });
    return response.data;
  },

  
  async updatePriority(
    requestId: number, 
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      priority
    });
    return response.data;
  },

  
  async addTags(requestId: number, tags: string[]): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      tags
    });
    return response.data;
  },

  
  async uploadFile(requestId: number, file: File, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request_id', requestId.toString());
    if (description) {
      formData.append('description', description);
    }
    
    const response = await apiClient.post('/admin/customer-requests/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  
  async getRequestStats(params?: {
    period?: 'today' | 'week' | 'month' | 'year';
    admin_id?: number;
  }): Promise<RequestStats> {
    const response = await apiClient.get('/admin/customer-requests/stats/', { params });
    return response.data;
  },

  
  async searchRequests(query: string, filters?: {
    status?: string;
    priority?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<RequestsApiResponse> {
    const params = {
      search: query,
      ...filters,
    };
    
    const response = await apiClient.get('/admin/customer-requests/search/', { params });
    return response.data;
  },

  
  async exportRequests(format: 'csv' | 'excel', filters?: {
    status?: string;
    priority?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<Blob> {
    const params = {
      format,
      ...filters,
    };
    
    const response = await apiClient.get('/admin/customer-requests/export/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  
  async getRequestHistory(requestId: number): Promise<any[]> {
    const response = await apiClient.get(`/admin/customer-requests/${requestId}/history/`);
    return response.data;
  },

  
  async createRequest(data: CreateRequestForm): Promise<CustomerRequest> {
    const response = await apiClient.post('/admin/customer-requests/', data);
    return response.data;
  },

  
  async closeRequest(requestId: number, reason?: string): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/close/`, {
      reason: reason || undefined,
    });
    return response.data;
  },

  
  async reopenRequest(requestId: number, reason?: string): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/reopen/`, {
      reason: reason || undefined,
    });
    return response.data;
  },

  
  async getAvailableAdmins(): Promise<any[]> {
    const response = await apiClient.get('/admin/users/admins/');
    return response.data;
  },

  
  async markMessagesAsRead(requestId: number, messageIds?: number[]): Promise<void> {
    await apiClient.post(`/admin/customer-requests/${requestId}/mark-read/`, {
      message_ids: messageIds,
    });
  },

  
  async getResponseTemplates(category?: string): Promise<any[]> {
    const params = category ? { category } : {};
    const response = await apiClient.get('/admin/response-templates/', { params });
    return response.data;
  },
};