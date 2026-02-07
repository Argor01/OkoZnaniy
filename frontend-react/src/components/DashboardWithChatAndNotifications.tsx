import React, { useState } from 'react';
import DashboardHeader from './common/DashboardHeader';
import NotificationSystem, { NotificationSettings } from './notifications/NotificationSystem';
import { useChat } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';
import MessageModal from '../pages/ExpertDashboard/modals/MessageModalNew';

interface DashboardWithChatAndNotificationsProps {
  userProfile?: {
    username: string;
    avatar?: string;
    role: string;
    balance?: number;
  };
  onBalanceClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  children?: React.ReactNode;
}

/**
 * Компонент-обертка для дашбордов с интегрированным чатом и уведомлениями
 * Использование:
 * 
 * <DashboardWithChatAndNotifications userProfile={userProfile}>
 *   <YourDashboardContent />
 * </DashboardWithChatAndNotifications>
 */
const DashboardWithChatAndNotifications: React.FC<DashboardWithChatAndNotificationsProps> = ({
  userProfile,
  onBalanceClick,
  onProfileClick,
  onLogout,
  onMenuClick,
  isMobile = false,
  children,
}) => {
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  
  // Используем хуки для чата и уведомлений
  const { unreadCount: unreadMessages } = useChat();
  const { 
    notifications, 
    unreadCount: unreadNotifications,
    markAsRead,
    markAllAsRead 
  } = useNotifications();

  // Настройки уведомлений (можно сохранять в localStorage или на бэкенде)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orderConfirmation: true,
    claims: true,
    messages: true,
    balanceTopUp: true,
    bids: true,
    systemUpdates: true,
  });

  const handleNotificationClick = (notification: any) => {
    // Отмечаем как прочитанное
    markAsRead(notification.id);
    
    // Если это уведомление о сообщении, открываем чат
    if (notification.type === 'message') {
      setNotificationsModalOpen(false);
      setMessagesModalOpen(true);
    }
    
    // Можно добавить навигацию по actionUrl
    if (notification.actionUrl) {
      // navigate(notification.actionUrl);
    }
  };

  return (
    <>
      <DashboardHeader
        userProfile={userProfile}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        onMessagesClick={() => setMessagesModalOpen(true)}
        onNotificationsClick={() => setNotificationsModalOpen(true)}
        onBalanceClick={onBalanceClick}
        onProfileClick={onProfileClick}
        onLogout={onLogout}
        onMenuClick={onMenuClick}
        isMobile={isMobile}
      />

      {children}

      {/* Модалка чата */}
      <MessageModal
        visible={messagesModalOpen}
        onClose={() => setMessagesModalOpen(false)}
        isMobile={isMobile}
        isTablet={window.innerWidth > 840 && window.innerWidth <= 1024}
        isDesktop={window.innerWidth > 1024}
        userProfile={userProfile ? { role: userProfile.role } : undefined}
      />

      {/* Модалка уведомлений */}
      <NotificationSystem
        visible={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        notifications={notifications}
        settings={notificationSettings}
        onSettingsChange={setNotificationSettings}
        onNotificationClick={handleNotificationClick}
        isMobile={isMobile}
      />
    </>
  );
};

export default DashboardWithChatAndNotifications;
