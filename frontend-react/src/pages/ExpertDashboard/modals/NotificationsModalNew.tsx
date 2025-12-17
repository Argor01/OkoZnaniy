import React, { useState, useEffect } from 'react';
import { Modal, Typography, Spin, message as antMessage } from 'antd';
import { 
  BellOutlined, 
  FileDoneOutlined, 
  TrophyOutlined, 
  CommentOutlined, 
  QuestionCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { notificationsApi, Notification } from '../../../api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Text } = Typography;

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

// Маппинг типов уведомлений на иконки
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'new_order': <FileDoneOutlined style={{ color: '#3b82f6' }} />,
    'order_taken': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'order_assigned': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'file_uploaded': <FileDoneOutlined style={{ color: '#8b5cf6' }} />,
    'new_comment': <CommentOutlined style={{ color: '#f59e0b' }} />,
    'status_changed': <BellOutlined style={{ color: '#3b82f6' }} />,
    'deadline_soon': <ClockCircleOutlined style={{ color: '#ef4444' }} />,
    'document_verified': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'specialization_verified': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'review_received': <TrophyOutlined style={{ color: '#f59e0b' }} />,
    'new_rating': <TrophyOutlined style={{ color: '#f59e0b' }} />,
    'rating_milestone': <TrophyOutlined style={{ color: '#fbbf24' }} />,
    'payment_received': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'order_completed': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'new_contact': <QuestionCircleOutlined style={{ color: '#3b82f6' }} />,
    'application_approved': <CheckCircleOutlined style={{ color: '#10b981' }} />,
    'application_rejected': <ClockCircleOutlined style={{ color: '#ef4444' }} />,
  };
  return iconMap[type] || <BellOutlined style={{ color: '#6b7280' }} />;
};

// Маппинг типов на категории
const getNotificationCategory = (type: string): string => {
  if (['new_order', 'order_taken', 'order_assigned', 'order_completed', 'status_changed'].includes(type)) {
    return 'orders';
  }
  if (['new_comment', 'file_uploaded'].includes(type)) {
    return 'forum';
  }
  if (['new_contact', 'application_approved', 'application_rejected'].includes(type)) {
    return 'questions';
  }
  return 'all';
};

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  isMobile
}) => {
  const [notificationTab, setNotificationTab] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      antMessage.error('Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    try {
      await notificationsApi.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      antMessage.success('Все уведомления отмечены как прочитанные');
    } catch (error) {
      console.error('Ошибка отметки всех уведомлений:', error);
      antMessage.error('Не удалось отметить уведомления');
    }
  };

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch {
      return dateString;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (notificationTab === 'all') return true;
    const category = getNotificationCategory(notification.type);
    return category === notificationTab;
  });

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="auto"
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: isMobile ? '16px' : '32px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          height: isMobile ? '100vh' : 'auto'
        },
        body: {
          padding: '0',
          maxHeight: isMobile ? 'calc(100vh - 32px)' : '80vh',
          overflowY: 'auto'
        },
        header: {
          display: 'none'
        }
      }}
    >
      <div style={{ padding: '0' }}>
        {/* Заголовок */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 16 : 24 }}>
          <Text strong style={{ 
            fontSize: isMobile ? 20 : 24, 
            color: '#1f2937'
          }}>
            Уведомления
          </Text>
          {notifications.some(n => !n.is_read) && (
            <Text 
              onClick={handleMarkAllAsRead}
              style={{ 
                fontSize: isMobile ? 12 : 14, 
                color: '#3b82f6',
                cursor: 'pointer'
              }}
            >
              Отметить все
            </Text>
          )}
        </div>

        {/* Навигационные вкладки */}
        <div style={{ 
          display: 'flex', 
          gap: 0,
          marginBottom: isMobile ? 16 : 24,
          background: '#f9fafb',
          borderRadius: isMobile ? 8 : 12,
          padding: '4px',
          border: '1px solid #e5e7eb',
          overflowX: isMobile ? 'auto' : 'visible',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}>
          {[
            { key: 'all', label: 'Все', icon: <BellOutlined /> },
            { key: 'orders', label: 'Заказы', icon: <FileDoneOutlined /> },
            { key: 'forum', label: 'Форум', icon: <CommentOutlined /> },
            { key: 'questions', label: 'Вопросы', icon: <QuestionCircleOutlined /> },
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setNotificationTab(tab.key)}
              style={{
                flex: isMobile ? '0 0 auto' : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? 6 : 8,
                padding: isMobile ? '10px 12px' : '12px 16px',
                cursor: 'pointer',
                borderRadius: 8,
                background: notificationTab === tab.key ? '#ffffff' : 'transparent',
                borderBottom: notificationTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease',
                minWidth: isMobile ? 'auto' : 0
              }}
            >
              {React.cloneElement(tab.icon as React.ReactElement, {
                style: { 
                  fontSize: isMobile ? 16 : 18, 
                  color: notificationTab === tab.key ? '#3b82f6' : '#6b7280',
                  flexShrink: 0
                }
              })}
              <Text style={{ 
                fontSize: isMobile ? 13 : 14, 
                color: notificationTab === tab.key ? '#1f2937' : '#6b7280',
                fontWeight: notificationTab === tab.key ? 500 : 400,
                whiteSpace: 'nowrap'
              }}>
                {tab.label}
              </Text>
            </div>
          ))}
        </div>

        {/* Область контента */}
        <div style={{ 
          minHeight: isMobile ? '300px' : '500px',
          background: '#ffffff',
          borderRadius: isMobile ? 8 : 12,
          border: '1px solid #e5e7eb',
          padding: isMobile ? '12px' : '16px'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <Spin size="large" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              minHeight: '400px'
            }}>
              <BellOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
              <Text type="secondary" style={{ fontSize: 14 }}>
                Нет уведомлений в этой категории
              </Text>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                style={{
                  padding: isMobile ? '12px' : '16px',
                  marginBottom: isMobile ? '8px' : '12px',
                  background: notification.is_read ? '#ffffff' : '#eff6ff',
                  borderRadius: isMobile ? 8 : 12,
                  border: `1px solid ${notification.is_read ? '#e5e7eb' : '#bfdbfe'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  gap: isMobile ? 12 : 16,
                  alignItems: 'flex-start'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* Иконка */}
                <div style={{
                  width: isMobile ? 36 : 40,
                  height: isMobile ? 36 : 40,
                  borderRadius: isMobile ? 8 : 10,
                  background: notification.is_read ? '#f3f4f6' : '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 18 : 20,
                  flexShrink: 0
                }}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Контент */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: 4
                  }}>
                    <Text strong style={{ 
                      fontSize: isMobile ? 14 : 15, 
                      color: '#1f2937',
                      fontWeight: notification.is_read ? 500 : 600,
                      lineHeight: 1.4
                    }}>
                      {notification.title}
                    </Text>
                    {!notification.is_read && (
                      <div style={{
                        width: isMobile ? 6 : 8,
                        height: isMobile ? 6 : 8,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        flexShrink: 0,
                        marginLeft: 8,
                        marginTop: isMobile ? 4 : 6
                      }} />
                    )}
                  </div>
                  <Text style={{ 
                    fontSize: isMobile ? 13 : 14, 
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: isMobile ? 6 : 8,
                    lineHeight: 1.5
                  }}>
                    {notification.message}
                  </Text>
                  <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, color: '#9ca3af' }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatTimestamp(notification.created_at)}
                  </Text>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationsModal;
