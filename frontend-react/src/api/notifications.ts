import apiClient from './client';

export interface Notification {
  id: number;
  type: string;
  type_display: string;
  title: string;
  message: string;
  related_object_id?: number;
  related_object_type?: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  
  getAll: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/notifications/');
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await apiClient.post(`/notifications/notifications/${id}/mark_read/`);
    return response.data;
  },

  
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/notifications/mark_all_read/');
  },

  
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/notifications/${id}/`);
  },

  
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/notifications/');
    let notifications: Notification[] = [];
    
    if (response.data && Array.isArray(response.data.results)) {
      notifications = response.data.results;
    } else if (Array.isArray(response.data)) {
      notifications = response.data;
    }
    
    return notifications.filter(n => !n.is_read).length;
  },
};
