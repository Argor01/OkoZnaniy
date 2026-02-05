/**
 * API для работы с запросами клиентов
 */

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
  /**
   * Получение списка запросов с фильтрацией
   */
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

  /**
   * Получение деталей конкретного запроса
   */
  async getRequest(id: number): Promise<CustomerRequest> {
    const response = await apiClient.get(`/admin/customer-requests/${id}/`);
    return response.data;
  },

  /**
   * Получение сообщений запроса
   */
  async getRequestMessages(requestId: number, params?: {
    page?: number;
    page_size?: number;
    include_internal?: boolean;
  }): Promise<MessagesApiResponse> {
    const response = await apiClient.get(`/admin/customer-requests/${requestId}/messages/`, { params });
    return response.data;
  },

  /**
   * Взятие запроса в работу текущим администратором
   */
  async takeRequest(requestId: number): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/take/`);
    return response.data;
  },

  /**
   * Отправка сообщения в запрос
   */
  async sendMessage(
    requestId: number, 
    content: string, 
    isInternal = false,
    attachments?: File[]
  ): Promise<RequestMessage> {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('is_internal', isInternal.toString());
    
    // Добавляем файлы если есть
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

  /**
   * Завершение запроса
   */
  async completeRequest(requestId: number, resolution?: string): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      status: 'completed',
      resolution: resolution || undefined,
    });
    return response.data;
  },

  /**
   * Обновление запроса (статус, приоритет, назначение и т.д.)
   */
  async updateRequest(requestId: number, data: UpdateRequestForm): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, data);
    return response.data;
  },

  /**
   * Назначение запроса другому администратору
   */
  async assignRequest(requestId: number, adminId: number): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/assign/`, {
      admin_id: adminId,
    });
    return response.data;
  },

  /**
   * Изменение приоритета запроса
   */
  async updatePriority(
    requestId: number, 
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      priority
    });
    return response.data;
  },

  /**
   * Добавление тегов к запросу
   */
  async addTags(requestId: number, tags: string[]): Promise<CustomerRequest> {
    const response = await apiClient.patch(`/admin/customer-requests/${requestId}/`, {
      tags
    });
    return response.data;
  },

  /**
   * Загрузка файла к запросу
   */
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

  /**
   * Получение статистики запросов
   */
  async getRequestStats(params?: {
    period?: 'today' | 'week' | 'month' | 'year';
    admin_id?: number;
  }): Promise<RequestStats> {
    const response = await apiClient.get('/admin/customer-requests/stats/', { params });
    return response.data;
  },

  /**
   * Поиск запросов
   */
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

  /**
   * Экспорт запросов в CSV/Excel
   */
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

  /**
   * Получение истории изменений запроса
   */
  async getRequestHistory(requestId: number): Promise<any[]> {
    const response = await apiClient.get(`/admin/customer-requests/${requestId}/history/`);
    return response.data;
  },

  /**
   * Создание нового запроса (от имени клиента)
   */
  async createRequest(data: CreateRequestForm): Promise<CustomerRequest> {
    const response = await apiClient.post('/admin/customer-requests/', data);
    return response.data;
  },

  /**
   * Закрытие запроса
   */
  async closeRequest(requestId: number, reason?: string): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/close/`, {
      reason: reason || undefined,
    });
    return response.data;
  },

  /**
   * Переopen запроса
   */
  async reopenRequest(requestId: number, reason?: string): Promise<CustomerRequest> {
    const response = await apiClient.post(`/admin/customer-requests/${requestId}/reopen/`, {
      reason: reason || undefined,
    });
    return response.data;
  },

  /**
   * Получение доступных администраторов для назначения
   */
  async getAvailableAdmins(): Promise<any[]> {
    const response = await apiClient.get('/admin/users/admins/');
    return response.data;
  },

  /**
   * Отметка сообщений как прочитанных
   */
  async markMessagesAsRead(requestId: number, messageIds?: number[]): Promise<void> {
    await apiClient.post(`/admin/customer-requests/${requestId}/mark-read/`, {
      message_ids: messageIds,
    });
  },

  /**
   * Получение шаблонов ответов
   */
  async getResponseTemplates(category?: string): Promise<any[]> {
    const params = category ? { category } : {};
    const response = await apiClient.get('/admin/response-templates/', { params });
    return response.data;
  },
};