import { useState, useEffect, useCallback } from 'react';
import { notificationsApi, Notification as ApiNotification } from '../api/notifications';
import { Notification } from '../components/notifications/NotificationSystem';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const formatNotification = (apiNotif: ApiNotification): Notification => {
    return {
      id: apiNotif.id,
      type: apiNotif.type as any,
      title: apiNotif.title,
      message: apiNotif.message,
      timestamp: formatTimestamp(apiNotif.created_at),
      isRead: apiNotif.is_read,
      actionUrl: apiNotif.related_object_id 
        ? `/${apiNotif.related_object_type}/${apiNotif.related_object_id}`
        : undefined,
    };
  };

  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const apiNotifications = await notificationsApi.getNotifications();
      const formatted = apiNotifications.map(formatNotification);
      setNotifications(formatted);
      setUnreadCount(formatted.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка отметки всех уведомлений:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Обновляем уведомления каждые 30 секунд
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
};
