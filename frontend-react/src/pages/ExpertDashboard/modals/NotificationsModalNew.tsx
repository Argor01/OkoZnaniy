import React, { useState, useEffect } from 'react';
import { Modal, Typography, Spin, message as antMessage } from 'antd';
import ErrorBoundary from '../../../components/ErrorBoundary';
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
import styles from '../ExpertDashboard.module.css';

const { Text } = Typography;

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}


const getNotificationIcon = (type: string) => {
  const iconClassMap: Record<string, string> = {
    'new_order': styles.notificationsIconPrimary,
    'order_taken': styles.notificationsIconSuccess,
    'order_assigned': styles.notificationsIconSuccess,
    'file_uploaded': styles.notificationsIconInfo,
    'new_comment': styles.notificationsIconWarning,
    'status_changed': styles.notificationsIconPrimary,
    'deadline_soon': styles.notificationsIconDanger,
    'document_verified': styles.notificationsIconSuccess,
    'specialization_verified': styles.notificationsIconSuccess,
    'review_received': styles.notificationsIconWarning,
    'new_rating': styles.notificationsIconWarning,
    'rating_milestone': styles.notificationsIconHighlight,
    'payment_received': styles.notificationsIconSuccess,
    'order_completed': styles.notificationsIconSuccess,
    'new_contact': styles.notificationsIconPrimary,
    'application_approved': styles.notificationsIconSuccess,
    'application_rejected': styles.notificationsIconDanger,
  };
  const iconClassName = iconClassMap[type] || styles.notificationsIconMuted;
  const iconMap: Record<string, React.ReactNode> = {
    'new_order': <FileDoneOutlined className={iconClassName} />,
    'order_taken': <CheckCircleOutlined className={iconClassName} />,
    'order_assigned': <CheckCircleOutlined className={iconClassName} />,
    'file_uploaded': <FileDoneOutlined className={iconClassName} />,
    'new_comment': <CommentOutlined className={iconClassName} />,
    'status_changed': <BellOutlined className={iconClassName} />,
    'deadline_soon': <ClockCircleOutlined className={iconClassName} />,
    'document_verified': <CheckCircleOutlined className={iconClassName} />,
    'specialization_verified': <CheckCircleOutlined className={iconClassName} />,
    'review_received': <TrophyOutlined className={iconClassName} />,
    'new_rating': <TrophyOutlined className={iconClassName} />,
    'rating_milestone': <TrophyOutlined className={iconClassName} />,
    'payment_received': <CheckCircleOutlined className={iconClassName} />,
    'order_completed': <CheckCircleOutlined className={iconClassName} />,
    'new_contact': <QuestionCircleOutlined className={iconClassName} />,
    'application_approved': <CheckCircleOutlined className={iconClassName} />,
    'application_rejected': <ClockCircleOutlined className={iconClassName} />,
  };
  return iconMap[type] || <BellOutlined className={iconClassName} />;
};


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
      antMessage.error('Не удалось отметить уведомление');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      antMessage.success('Все уведомления отмечены как прочитанные');
    } catch (error) {
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

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const filteredNotifications = safeNotifications.filter(notification => {
    if (notificationTab === 'all') return true;
    const category = getNotificationCategory(notification.type);
    return category === notificationTab;
  });

  return (
    <Modal
      title={null}
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 'calc(100vw - 300px)'}
      wrapClassName={`${styles.notificationsModalWrap} ${isMobile ? styles.notificationsModalWrapMobile : styles.notificationsModalWrapDesktop}`}
    >
      <ErrorBoundary>
      <div className={`${styles.notificationsModalContent} ${isMobile ? styles.notificationsModalContentMobile : styles.notificationsModalContentDesktop}`}>
        <div className={`${styles.notificationsModalHeader} ${isMobile ? styles.notificationsModalHeaderMobile : styles.notificationsModalHeaderDesktop}`}>
          <Text strong className={`${styles.notificationsModalTitle} ${isMobile ? styles.notificationsModalTitleMobile : styles.notificationsModalTitleDesktop}`}>
            Уведомления
          </Text>
          {notifications.some(n => !n.is_read) && (
            <Text 
              onClick={handleMarkAllAsRead}
              className={`${styles.notificationsModalMarkAll} ${isMobile ? styles.notificationsModalMarkAllMobile : styles.notificationsModalMarkAllDesktop}`}
            >
              Отметить все
            </Text>
          )}
        </div>

        <div className={`${styles.notificationsModalTabs} ${isMobile ? styles.notificationsModalTabsMobile : styles.notificationsModalTabsDesktop}`}>
          {[
            { key: 'all', label: 'Все', icon: <BellOutlined /> },
            { key: 'orders', label: 'Заказы', icon: <FileDoneOutlined /> },
            { key: 'forum', label: 'Форум', icon: <CommentOutlined /> },
            { key: 'questions', label: 'Вопросы', icon: <QuestionCircleOutlined /> },
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setNotificationTab(tab.key)}
              className={`${styles.notificationsModalTab} ${notificationTab === tab.key ? styles.notificationsModalTabActive : styles.notificationsModalTabInactive} ${isMobile ? styles.notificationsModalTabMobile : styles.notificationsModalTabDesktop}`}
            >
              {React.isValidElement(tab.icon)
                ? React.cloneElement(tab.icon as React.ReactElement<{ className?: string }>, {
                    className: `${styles.notificationsModalTabIcon} ${notificationTab === tab.key ? styles.notificationsModalTabIconActive : styles.notificationsModalTabIconInactive} ${isMobile ? styles.notificationsModalTabIconMobile : styles.notificationsModalTabIconDesktop}`
                  })
                : tab.icon}
              <Text className={`${styles.notificationsModalTabLabel} ${notificationTab === tab.key ? styles.notificationsModalTabLabelActive : styles.notificationsModalTabLabelInactive} ${isMobile ? styles.notificationsModalTabLabelMobile : styles.notificationsModalTabLabelDesktop}`}>
                {tab.label}
              </Text>
            </div>
          ))}
        </div>

        <div className={`${styles.notificationsModalList} ${isMobile ? styles.notificationsModalListMobile : styles.notificationsModalListDesktop}`}>
          {loading ? (
            <div className={styles.notificationsModalLoading}>
              <Spin size="large" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className={styles.notificationsModalEmpty}>
              <BellOutlined className={styles.notificationsModalEmptyIcon} />
              <Text type="secondary" className={styles.notificationsModalEmptyText}>
                Нет уведомлений в этой категории
              </Text>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                className={`${styles.notificationsModalItem} ${notification.is_read ? styles.notificationsModalItemRead : styles.notificationsModalItemUnread} ${isMobile ? styles.notificationsModalItemMobile : styles.notificationsModalItemDesktop}`}
              >
                
                <div className={`${styles.notificationsModalItemIcon} ${notification.is_read ? styles.notificationsModalItemIconRead : styles.notificationsModalItemIconUnread} ${isMobile ? styles.notificationsModalItemIconMobile : styles.notificationsModalItemIconDesktop}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                
                <div className={styles.notificationsModalItemBody}>
                  <div className={styles.notificationsModalItemHeader}>
                    <Text strong className={`${styles.notificationsModalItemTitle} ${notification.is_read ? styles.notificationsModalItemTitleRead : styles.notificationsModalItemTitleUnread} ${isMobile ? styles.notificationsModalItemTitleMobile : styles.notificationsModalItemTitleDesktop}`}>
                      {notification.title}
                    </Text>
                    {!notification.is_read && (
                      <div className={`${styles.notificationsModalUnreadDot} ${isMobile ? styles.notificationsModalUnreadDotMobile : styles.notificationsModalUnreadDotDesktop}`} />
                    )}
                  </div>
                  <Text className={`${styles.notificationsModalItemText} ${isMobile ? styles.notificationsModalItemTextMobile : styles.notificationsModalItemTextDesktop}`}>
                    {notification.message}
                  </Text>
                  <Text type="secondary" className={`${styles.notificationsModalItemTime} ${isMobile ? styles.notificationsModalItemTimeMobile : styles.notificationsModalItemTimeDesktop}`}>
                    <ClockCircleOutlined className={styles.notificationsModalItemTimeIcon} />
                    {formatTimestamp(notification.created_at)}
                  </Text>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </ErrorBoundary>
    </Modal>
  );
};

export default NotificationsModal;
