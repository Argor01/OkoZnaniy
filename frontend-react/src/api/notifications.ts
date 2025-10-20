import { apiClient } from './client';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_object_id?: number;
  related_object_type?: string;
}

export const notificationsApi = {
  // Получить все уведомления пользователя
  getNotifications: (): Promise<Notification[]> => {
    return apiClient.get('/notifications/');
  },

  // Отметить уведомление как прочитанное
  markAsRead: (notificationId: number): Promise<Notification> => {
    return apiClient.post(`/notifications/${notificationId}/mark_read/`);
  },

  // Отметить все уведомления как прочитанные
  markAllAsRead: (): Promise<{ message: string }> => {
    return apiClient.post('/notifications/mark_all_read/');
  },
};
