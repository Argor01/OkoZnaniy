import React, { useState } from 'react';
import { Modal, Typography } from 'antd';
import { 
  BellOutlined, 
  FileDoneOutlined, 
  TrophyOutlined, 
  CommentOutlined, 
  QuestionCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import { Notification } from '../types';

const { Text } = Typography;

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  isMobile: boolean;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  isMobile
}) => {
  const [notificationTab, setNotificationTab] = useState<string>('all');

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
        <Text strong style={{ 
          fontSize: isMobile ? 20 : 24, 
          color: '#1f2937', 
          display: 'block', 
          marginBottom: isMobile ? 16 : 24 
        }}>
          Уведомления
        </Text>

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
          <div
            onClick={() => setNotificationTab('all')}
            style={{
              flex: isMobile ? '0 0 auto' : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 6 : 8,
              padding: isMobile ? '10px 12px' : '12px 16px',
              cursor: 'pointer',
              borderRadius: 8,
              background: notificationTab === 'all' ? '#ffffff' : 'transparent',
              borderBottom: notificationTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease',
              minWidth: isMobile ? 'auto' : 0
            }}
          >
            <BellOutlined style={{ 
              fontSize: isMobile ? 16 : 18, 
              color: notificationTab === 'all' ? '#3b82f6' : '#6b7280',
              flexShrink: 0
            }} />
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              color: notificationTab === 'all' ? '#1f2937' : '#6b7280',
              fontWeight: notificationTab === 'all' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Все
            </Text>
          </div>
          <div
            onClick={() => setNotificationTab('orders')}
            style={{
              flex: isMobile ? '0 0 auto' : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 6 : 8,
              padding: isMobile ? '10px 12px' : '12px 16px',
              cursor: 'pointer',
              borderRadius: 8,
              background: notificationTab === 'orders' ? '#ffffff' : 'transparent',
              borderBottom: notificationTab === 'orders' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease',
              minWidth: isMobile ? 'auto' : 0
            }}
          >
            <FileDoneOutlined style={{ 
              fontSize: isMobile ? 16 : 18, 
              color: notificationTab === 'orders' ? '#3b82f6' : '#6b7280',
              flexShrink: 0
            }} />
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              color: notificationTab === 'orders' ? '#1f2937' : '#6b7280',
              fontWeight: notificationTab === 'orders' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Заказы
            </Text>
          </div>
          <div
            onClick={() => setNotificationTab('claims')}
            style={{
              flex: isMobile ? '0 0 auto' : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 6 : 8,
              padding: isMobile ? '10px 12px' : '12px 16px',
              cursor: 'pointer',
              borderRadius: 8,
              background: notificationTab === 'claims' ? '#ffffff' : 'transparent',
              borderBottom: notificationTab === 'claims' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease',
              minWidth: isMobile ? 'auto' : 0
            }}
          >
            <TrophyOutlined style={{ 
              fontSize: isMobile ? 16 : 18, 
              color: notificationTab === 'claims' ? '#3b82f6' : '#6b7280',
              flexShrink: 0
            }} />
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              color: notificationTab === 'claims' ? '#1f2937' : '#6b7280',
              fontWeight: notificationTab === 'claims' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Претензии
            </Text>
          </div>
          <div
            onClick={() => setNotificationTab('forum')}
            style={{
              flex: isMobile ? '0 0 auto' : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 6 : 8,
              padding: isMobile ? '10px 12px' : '12px 16px',
              cursor: 'pointer',
              borderRadius: 8,
              background: notificationTab === 'forum' ? '#ffffff' : 'transparent',
              borderBottom: notificationTab === 'forum' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease',
              minWidth: isMobile ? 'auto' : 0
            }}
          >
            <CommentOutlined style={{ 
              fontSize: isMobile ? 16 : 18, 
              color: notificationTab === 'forum' ? '#3b82f6' : '#6b7280',
              flexShrink: 0
            }} />
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              color: notificationTab === 'forum' ? '#1f2937' : '#6b7280',
              fontWeight: notificationTab === 'forum' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Форум
            </Text>
          </div>
          <div
            onClick={() => setNotificationTab('questions')}
            style={{
              flex: isMobile ? '0 0 auto' : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 6 : 8,
              padding: isMobile ? '10px 12px' : '12px 16px',
              cursor: 'pointer',
              borderRadius: 8,
              background: notificationTab === 'questions' ? '#ffffff' : 'transparent',
              borderBottom: notificationTab === 'questions' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease',
              minWidth: isMobile ? 'auto' : 0
            }}
          >
            <QuestionCircleOutlined style={{ 
              fontSize: isMobile ? 16 : 18, 
              color: notificationTab === 'questions' ? '#3b82f6' : '#6b7280',
              flexShrink: 0
            }} />
            <Text style={{ 
              fontSize: isMobile ? 13 : 14, 
              color: notificationTab === 'questions' ? '#1f2937' : '#6b7280',
              fontWeight: notificationTab === 'questions' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Вопросы
            </Text>
          </div>
        </div>

        {/* Область контента */}
        <div style={{ 
          minHeight: isMobile ? '300px' : '500px',
          background: '#ffffff',
          borderRadius: isMobile ? 8 : 12,
          border: '1px solid #e5e7eb',
          padding: isMobile ? '12px' : '16px'
        }}>
          {notifications
            .filter(notification => {
              if (notificationTab === 'all') return true;
              if (notificationTab === 'orders') return notification.type === 'order';
              if (notificationTab === 'claims') return notification.type === 'claim';
              if (notificationTab === 'forum') return notification.type === 'forum';
              if (notificationTab === 'questions') return notification.type === 'question';
              return false;
            })
            .map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: isMobile ? '12px' : '16px',
                  marginBottom: isMobile ? '8px' : '12px',
                  background: notification.isRead ? '#ffffff' : '#eff6ff',
                  borderRadius: isMobile ? 8 : 12,
                  border: `1px solid ${notification.isRead ? '#e5e7eb' : '#bfdbfe'}`,
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
                  background: notification.isRead ? '#f3f4f6' : '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 18 : 20,
                  flexShrink: 0
                }}>
                  {notification.icon}
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
                      fontWeight: notification.isRead ? 500 : 600,
                      lineHeight: 1.4
                    }}>
                      {notification.title}
                    </Text>
                    {!notification.isRead && (
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
                    {notification.timestamp}
                  </Text>
                </div>
              </div>
            ))}
          
          {notifications.filter(notification => {
            if (notificationTab === 'all') return true;
            if (notificationTab === 'orders') return notification.type === 'order';
            if (notificationTab === 'claims') return notification.type === 'claim';
            if (notificationTab === 'forum') return notification.type === 'forum';
            if (notificationTab === 'questions') return notification.type === 'question';
            return false;
          }).length === 0 && (
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
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationsModal;
