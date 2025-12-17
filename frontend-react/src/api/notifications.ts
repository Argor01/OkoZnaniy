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
  // Получить все уведомления
  getAll: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/notifications/');
    return response.data;
  },

  // Отметить уведомление как прочитанное
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await apiClient.post(`/notifications/notifications/${id}/mark_read/`);
    return response.data;
  },

  // Отметить все уведомления как прочитанные
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/notifications/mark_all_read/');
  },

  // Удалить уведомление
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/notifications/${id}/`);
  },

  // Получить количество непрочитанных уведомлений
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/notifications/');
    const notifications: Notification[] = response.data;
    return notifications.filter(n => !n.is_read).length;
  },
};
