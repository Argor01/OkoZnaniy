import React, { useState } from 'react';
import { Modal, Typography } from 'antd';
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  FileTextOutlined,
  CommentOutlined,
  QuestionCircleOutlined,
  TrophyOutlined,
  FileDoneOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface Notification {
  id: number;
  type: 'order' | 'claim' | 'forum' | 'question' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  icon?: React.ReactNode;
  actionUrl?: string;
}

interface NotificationsModalProps {
  visible: boolean;
  onCancel: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onCancel
}) => {
  const [notificationTab, setNotificationTab] = useState<string>('all');
  const [isMobile] = useState(window.innerWidth <= 840);
  const [isDesktop] = useState(window.innerWidth > 1024);

  // Тестовые данные для уведомлений
  const mockNotifications: Notification[] = [
    {
      id: 1,
      type: 'order',
      title: 'Новый заказ доступен',
      message: 'Появился новый заказ по математике. Срок выполнения: 3 дня. Бюджет: 5000₽',
      timestamp: '2 минуты назад',
      isRead: false,
      icon: <FileDoneOutlined style={{ color: '#3b82f6' }} />
    },
    {
      id: 2,
      type: 'order',
      title: 'Заказ принят',
      message: 'Ваша ставка на заказ "Решение задач по физике" была принята заказчиком',
      timestamp: '1 час назад',
      isRead: false,
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
    },
    {
      id: 3,
      type: 'claim',
      title: 'Новая претензия',
      message: 'Заказчик открыл претензию по заказу #1234. Требуется ваш ответ',
      timestamp: '3 часа назад',
      isRead: true,
      icon: <TrophyOutlined style={{ color: '#f59e0b' }} />
    },
    {
      id: 4,
      type: 'forum',
      title: 'Новый комментарий',
      message: 'Пользователь Иван ответил на ваш вопрос в форуме "Методы решения интегралов"',
      timestamp: '5 часов назад',
      isRead: true,
      icon: <CommentOutlined style={{ color: '#8b5cf6' }} />
    },
    {
      id: 5,
      type: 'question',
      title: 'Вопрос от заказчика',
      message: 'Заказчик задал вопрос по заказу "Курсовая работа по экономике"',
      timestamp: '1 день назад',
      isRead: true,
      icon: <QuestionCircleOutlined style={{ color: '#06b6d4' }} />
    },
    {
      id: 6,
      type: 'system',
      title: 'Обновление профиля',
      message: 'Ваш профиль успешно верифицирован. Теперь вы можете принимать больше заказов',
      timestamp: '2 дня назад',
      isRead: true,
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
    },
    {
      id: 7,
      type: 'order',
      title: 'Заказ завершен',
      message: 'Заказ "Лабораторная работа по химии" успешно завершен. Средства зачислены на ваш счет',
      timestamp: '3 дня назад',
      isRead: true,
      icon: <DollarOutlined style={{ color: '#10b981' }} />
    },
    {
      id: 8,
      type: 'forum',
      title: 'Новая тема в форуме',
      message: 'Создана новая тема "Лучшие практики оформления дипломных работ"',
      timestamp: '4 дня назад',
      isRead: true,
      icon: <CommentOutlined style={{ color: '#8b5cf6' }} />
    }
  ];

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onCancel}
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

          top: isMobile ? 0 : '60px',
          left: isMobile ? 0 : (isDesktop ? '280px' : '250px'),
          right: isMobile ? 0 : '20px',
          bottom: isMobile ? 0 : '20px',
          width: isMobile ? '100vw' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)'),
          height: isMobile ? '100vh' : 'calc(100vh - 80px)',
          transform: isMobile ? 'none' : 'none',
          position: 'fixed'
        },
        body: {
          padding: '0',
          height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 140px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
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
          flex: 1,
          background: '#ffffff',
          borderRadius: isMobile ? 8 : 12,
          border: '1px solid #e5e7eb',
          padding: isMobile ? '12px' : '16px'
        }}>
          {mockNotifications
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
          
          {mockNotifications.filter(notification => {
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
              flex: 1
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