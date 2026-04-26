import React, { useState, useEffect } from 'react';
import { Modal, Typography, Spin, Space, Avatar, message as antMessage } from 'antd';
import { ErrorBoundary } from '@/features/common';
import { useNavigate } from 'react-router-dom';
import { 
  BellOutlined, 
  FileDoneOutlined, 
  TrophyOutlined, 
  CommentOutlined, 
  QuestionCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarFilled,
  UserOutlined
} from '@ant-design/icons';
import { notificationsApi, Notification } from '@/features/common/api/notifications';
import { ordersApi } from '@/features/orders/api/orders';
import { apiClient } from '@/api/client';
import { getMediaUrl } from '@/config/api';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './NotificationsModalNew.module.css';

const { Text } = Typography;

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}


const getNotificationIcon = (type: string) => {
  const iconClassMap: Record<string, string> = {
    'new_order': styles.notificationsIconPrimary,
    'new_bid': styles.notificationsIconPrimary,
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
    'application_submitted': styles.notificationsIconInfo,
    'application_approved': styles.notificationsIconSuccess,
    'application_rejected': styles.notificationsIconDanger,
    'expert_violation': styles.notificationsIconDanger,
    'review_request': styles.notificationsIconWarning,
    'review_reply': styles.notificationsIconWarning,
    'review_appeal': styles.notificationsIconDanger,
    'complaint_filed': styles.notificationsIconDanger,
  };
  const iconClassName = iconClassMap[type] || styles.notificationsIconMuted;
  const iconMap: Record<string, React.ReactNode> = {
    'new_order': <FileDoneOutlined className={iconClassName} />,
    'new_bid': <FileDoneOutlined className={iconClassName} />,
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
    'application_submitted': <FileDoneOutlined className={iconClassName} />,
    'application_approved': <CheckCircleOutlined className={iconClassName} />,
    'application_rejected': <ClockCircleOutlined className={iconClassName} />,
    'expert_violation': <QuestionCircleOutlined className={iconClassName} />,
    'review_request': <TrophyOutlined className={iconClassName} />,
    'review_reply': <CommentOutlined className={iconClassName} />,
    'review_appeal': <QuestionCircleOutlined className={iconClassName} />,
    'complaint_filed': <QuestionCircleOutlined className={iconClassName} />,
  };
  return iconMap[type] || <BellOutlined className={iconClassName} />;
};


const getNotificationCategory = (type: string): string => {
  if (['new_order', 'new_bid', 'order_taken', 'order_assigned', 'order_completed', 'status_changed', 'expert_violation'].includes(type)) {
    return 'orders';
  }
  if (['review_received', 'new_rating', 'rating_milestone', 'review_request', 'review_reply', 'review_appeal'].includes(type)) {
    return 'reviews';
  }
  if (['new_contact', 'application_approved', 'application_rejected', 'application_submitted'].includes(type)) {
    return 'questions';
  }
  return 'all';
};

const extractOrderId = (notification: Notification): number | null => {
  if (notification.related_object_type === 'order' && notification.related_object_id) {
    return notification.related_object_id;
  }
  const source = `${notification.title || ''} ${notification.message || ''}`;
  const match = source.match(/#(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const resolveNotificationTarget = (notification: Notification): string | null => {
  if (
    ['support_request', 'claim', 'arbitration_case'].includes(notification.related_object_type || '') ||
    ['support_request', 'claim', 'arbitration_case'].includes(String(notification.data?.ticket_type || ''))
  ) {
    return '/support';
  }

  const orderId = extractOrderId(notification);
  if (orderId) return `/orders/${orderId}`;

  if (notification.type === 'application_approved' || notification.type === 'application_rejected') {
    return '/expert?focus=application';
  }

  if (notification.type === 'specialization_verified') {
    return '/expert?tab=specializations';
  }

  if (
    notification.type === 'review_received' ||
    notification.type === 'new_rating' ||
    notification.type === 'rating_milestone' ||
    notification.type === 'review_reply' ||
    notification.type === 'review_appeal'
  ) {
    return '/expert?tab=reviews';
  }
  if (notification.type === 'review_request') {
    const orderId = extractOrderId(notification);
    return orderId ? `/orders/${orderId}` : '/dashboard?tab=pending-reviews';
  }

  if (notification.related_object_type === 'expert_application') return '/expert?focus=application';
  if (notification.related_object_type === 'specialization') return '/expert?tab=specializations';
  if (notification.related_object_type === 'review') return '/expert?tab=reviews';
  if (notification.related_object_type === 'order') return '/orders-feed';

  if (
    ['new_bid', 'new_order', 'order_taken', 'order_assigned', 'status_changed', 'order_completed', 'payment_received', 'deadline_soon', 'expert_violation'].includes(notification.type)
  ) {
    return '/orders-feed';
  }

  return '/expert';
};

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  isMobile
}) => {
  const navigate = useNavigate();
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

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewOrderData, setReviewOrderData] = useState<{
    orderId: number;
    orderTitle: string;
    expertName: string;
    expertAvatar: string | null;
    completedAt: string | null;
  } | null>(null);
  const [reviewOrderLoading, setReviewOrderLoading] = useState(false);

  const handleReviewNotificationClick = async (notification: Notification) => {
    const orderId = extractOrderId(notification);
    if (!orderId) {
      antMessage.error('Не удалось определить заказ');
      return;
    }

    setReviewOrderLoading(true);
    setReviewModalOpen(true);
    setReviewRating(5);
    setReviewComment('');

    try {
      const order = await ordersApi.getById(orderId);
      const expertName = order.expert?.full_name || order.expert?.username || notification.data?.expert_username as string || 'Эксперт';
      const expertAvatar = order.expert?.avatar || null;
      setReviewOrderData({
        orderId,
        orderTitle: order.title || `Заказ #${orderId}`,
        expertName,
        expertAvatar,
        completedAt: order.completed_at || order.updated_at || null,
      });
    } catch {
      const data = notification.data || {};
      setReviewOrderData({
        orderId,
        orderTitle: `Заказ #${orderId}`,
        expertName: (data.expert_username as string) || 'Эксперт',
        expertAvatar: null,
        completedAt: null,
      });
    } finally {
      setReviewOrderLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewOrderData) return;
    setReviewSubmitting(true);
    try {
      await apiClient.post('/experts/reviews/', {
        order: reviewOrderData.orderId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      antMessage.success('Спасибо за отзыв!');
      setReviewModalOpen(false);
      setReviewOrderData(null);
    } catch {
      antMessage.error('Не удалось сохранить отзыв');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification);
    }

    if (notification.type === 'review_request') {
      await handleReviewNotificationClick(notification);
      return;
    }

    const target = resolveNotificationTarget(notification);
    if (!target) {
      antMessage.info('Для этого уведомления переход не настроен');
      return;
    }

    onClose();
    navigate(target);
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
  const filteredNotifications = safeNotifications
    .filter(notification => !['new_message', 'message', 'chat_message', 'private_message'].includes(notification.type))
    .filter(notification => {
    if (notificationTab === 'all') return true;
    const category = getNotificationCategory(notification.type);
    return category === notificationTab;
  });

  const formatNotificationMessage = (notification: Notification) => {
    if (notification.type === 'file_uploaded') {
      const orderId = extractOrderId(notification);
      return orderId ? `К заказу №${orderId} прикреплен файл` : 'К заказу прикреплен файл';
    }
    return notification.message
      .replace(/Ставка:\s*0([.,]0+)?\s*([₽рrub]+|Договорная)?/gi, 'Ставка: Договорная')
      .replace(/Бюджет:\s*0([.,]0+)?\s*([₽рrub]+|Договорная)?/gi, 'Бюджет: Договорная')
      .replace(/\b0([.,]0+)?\s*([₽рrub]+|Договорная)/gi, 'Договорная');
  };

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
            { key: 'reviews', label: 'Отзывы', icon: <TrophyOutlined /> },
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
                onClick={() => void handleNotificationClick(notification)}
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
                    {formatNotificationMessage(notification)}
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

      <Modal
        open={reviewModalOpen}
        centered
        title="Оставьте отзыв о работе"
        okText="Отправить отзыв"
        cancelText="Отмена"
        onCancel={() => { setReviewModalOpen(false); setReviewOrderData(null); }}
        onOk={handleSubmitReview}
        okButtonProps={{ loading: reviewSubmitting, disabled: reviewOrderLoading }}
        destroyOnHidden
        width={480}
      >
        {reviewOrderLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
          </div>
        ) : reviewOrderData ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
              <Avatar
                size={48}
                src={getMediaUrl(reviewOrderData.expertAvatar)}
                icon={<UserOutlined />}
              />
              <div>
                <Text strong style={{ display: 'block', fontSize: 16 }}>
                  {reviewOrderData.expertName}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {reviewOrderData.orderTitle}
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text strong>Оценка:</Text>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarFilled
                    key={star}
                    style={{
                      fontSize: 28,
                      cursor: 'pointer',
                      color: star <= reviewRating ? 'var(--color-brand-orange-500, #ff9500)' : '#d9d9d9',
                    }}
                    onClick={() => setReviewRating(star)}
                  />
                ))}
              </div>
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Поделитесь впечатлениями (необязательно)"
              style={{
                width: '100%',
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: '8px 12px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: 14,
              }}
              rows={4}
            />
          </Space>
        ) : null}
      </Modal>
    </Modal>
  );
};

export default NotificationsModal;
