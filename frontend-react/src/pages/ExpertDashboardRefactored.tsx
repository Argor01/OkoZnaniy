import React, { useState } from 'react';
import { Layout, Row, Col } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ordersApi } from '../api/orders';
import DashboardHeader from '../components/common/DashboardHeader';
import OrdersSidebar from '../components/common/OrdersSidebar';
import ChatSystem, { Chat } from '../components/chat/ChatSystem';
import NotificationSystem, { NotificationSettings } from '../components/notifications/NotificationSystem';
import { useNotifications } from '../hooks/useNotifications';
import styles from './ExpertDashboardRefactored.module.css';

const { Content } = Layout;

const ExpertDashboardRefactored: React.FC = () => {
  const [isMobile] = useState(window.innerWidth <= 840);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('all');
  const [chatVisible, setChatVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем заказы
  const { data: ordersData } = useQuery({
    queryKey: ['user-orders'],
    queryFn: () => ordersApi.getMyOrders({}),
  });

  const orders = ordersData?.results || ordersData || [];

  // Подсчет заказов по статусам
  const ordersCount = {
    all: orders.length,
    new: orders.filter((o: any) => o.status === 'new').length,
    confirming: orders.filter((o: any) => o.status === 'confirming').length,
    in_progress: orders.filter((o: any) => o.status === 'in_progress').length,
    payment: orders.filter((o: any) => o.status === 'payment').length,
    review: orders.filter((o: any) => o.status === 'review').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    revision: orders.filter((o: any) => o.status === 'revision').length,
    download: orders.filter((o: any) => o.status === 'download').length,
    closed: orders.filter((o: any) => o.status === 'closed').length,
  };

  // Тестовые данные для чатов
  const [chats] = useState<Chat[]>([
    {
      id: 1,
      chatId: 1,
      userName: 'Иван Петров',
      lastMessage: 'Здравствуйте! Когда будет готова работа?',
      timestamp: '2 мин назад',
      isRead: false,
      isOnline: true,
      unreadCount: 3,
      messages: [
        { id: 1, text: 'Здравствуйте!', timestamp: '10:30', isMine: false, isRead: true },
        { id: 2, text: 'Добрый день!', timestamp: '10:32', isMine: true, isRead: true },
      ],
    },
  ]);

  // Используем хук для уведомлений из БД
  const { 
    notifications, 
    unreadCount: unreadNotifications,
    markAsRead 
  } = useNotifications();

  // Настройки уведомлений
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orderConfirmation: true,
    claims: true,
    messages: true,
    balanceTopUp: true,
    bids: true,
    systemUpdates: false,
  });

  const handleSendMessage = (chatId: number, message: string) => {
    console.log('Отправка сообщения:', chatId, message);
    // Здесь будет логика отправки сообщения на сервер
  };

  const handleLogout = () => {
    authApi.logout();
    window.location.href = '/';
  };

  return (
    <Layout className={styles.dashboard}>
      <DashboardHeader
        userProfile={{
          username: userProfile?.username || 'Пользователь',
          avatar: userProfile?.avatar,
          role: userProfile?.role || 'expert',
          balance: typeof userProfile?.balance === 'number' ? userProfile.balance : 0,
        }}
        unreadMessages={chats.filter(c => !c.isRead).length}
        unreadNotifications={unreadNotifications}
        onMessagesClick={() => setChatVisible(true)}
        onNotificationsClick={() => setNotificationsVisible(true)}
        onBalanceClick={() => console.log('Открыть баланс')}
        onLogout={handleLogout}
        isMobile={isMobile}
      />

      <Layout className={styles.mainLayout}>
        <Content className={styles.content}>
          <Row gutter={[24, 24]}>
            {!isMobile && (
              <Col xs={24} lg={6}>
                <OrdersSidebar
                  ordersCount={ordersCount}
                  selectedStatus={selectedOrderStatus}
                  onStatusChange={setSelectedOrderStatus}
                />
              </Col>
            )}
            <Col xs={24} lg={isMobile ? 24 : 18}>
              <div className={styles.ordersContent}>
                <h2>Заказы - {selectedOrderStatus}</h2>
                {/* Здесь будет список заказов */}
              </div>
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* Система чата */}
      <ChatSystem
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        chats={chats}
        onSendMessage={handleSendMessage}
        isMobile={isMobile}
      />

      {/* Система уведомлений */}
      <NotificationSystem
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        notifications={notifications}
        settings={notificationSettings}
        onSettingsChange={setNotificationSettings}
        onNotificationClick={(notification) => {
          markAsRead(notification.id);
          // Можно добавить навигацию или другие действия
          if (notification.actionUrl) {
            console.log('Переход к:', notification.actionUrl);
          }
        }}
        isMobile={isMobile}
      />
    </Layout>
  );
};

export default ExpertDashboardRefactored;
