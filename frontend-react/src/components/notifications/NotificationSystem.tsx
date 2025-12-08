import React, { useState } from 'react';
import { Modal, Tabs, Badge, Typography, Switch, Divider, Empty } from 'antd';
import {
  BellOutlined,
  FileDoneOutlined,
  TrophyOutlined,
  CommentOutlined,
  QuestionCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import styles from './NotificationSystem.module.css';

const { Text } = Typography;
const { TabPane } = Tabs;

export interface Notification {
  id: number;
  type: 'order' | 'claim' | 'message' | 'balance' | 'bid' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  icon?: React.ReactNode;
  actionUrl?: string;
}

export interface NotificationSettings {
  orderConfirmation: boolean;
  claims: boolean;
  messages: boolean;
  balanceTopUp: boolean;
  bids: boolean;
  systemUpdates: boolean;
}

interface NotificationSystemProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
  onNotificationClick?: (notification: Notification) => void;
  isMobile?: boolean;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  visible,
  onClose,
  notifications,
  settings,
  onSettingsChange,
  onNotificationClick,
  isMobile = false,
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <FileDoneOutlined style={{ color: '#3b82f6' }} />;
      case 'claim':
        return <TrophyOutlined style={{ color: '#f59e0b' }} />;
      case 'message':
        return <CommentOutlined style={{ color: '#8b5cf6' }} />;
      case 'balance':
        return <DollarOutlined style={{ color: '#10b981' }} />;
      case 'bid':
        return <CheckCircleOutlined style={{ color: '#06b6d4' }} />;
      default:
        return <BellOutlined style={{ color: '#6b7280' }} />;
    }
  };

  const filterNotifications = (type: string) => {
    if (type === 'all') return notifications;
    return notifications.filter(n => n.type === type);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 700}
      className={styles.notificationModal}
      title={
        <div className={styles.modalHeader}>
          <BellOutlined />
          <span>Уведомления</span>
          {unreadCount > 0 && (
            <Badge count={unreadCount} />
          )}
        </div>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} className={styles.tabs}>
        <TabPane
          tab={
            <span>
              <BellOutlined />
              Все ({notifications.length})
            </span>
          }
          key="all"
        >
          <div className={styles.notificationList}>
            {filterNotifications('all').length === 0 ? (
              <Empty description="Нет уведомлений" />
            ) : (
              filterNotifications('all').map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <div className={styles.notificationIcon}>
                    {notification.icon || getNotificationIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <Text strong className={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text type="secondary" className={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text type="secondary" className={styles.notificationTime}>
                      <ClockCircleOutlined /> {notification.timestamp}
                    </Text>
                  </div>
                  {!notification.isRead && (
                    <div className={styles.unreadDot} />
                  )}
                </div>
              ))
            )}
          </div>
        </TabPane>

        <TabPane
          tab={
            <span>
              <FileDoneOutlined />
              Заказы
            </span>
          }
          key="order"
        >
          <div className={styles.notificationList}>
            {filterNotifications('order').length === 0 ? (
              <Empty description="Нет уведомлений о заказах" />
            ) : (
              filterNotifications('order').map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <div className={styles.notificationIcon}>
                    {notification.icon || getNotificationIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <Text strong className={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text type="secondary" className={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text type="secondary" className={styles.notificationTime}>
                      <ClockCircleOutlined /> {notification.timestamp}
                    </Text>
                  </div>
                  {!notification.isRead && (
                    <div className={styles.unreadDot} />
                  )}
                </div>
              ))
            )}
          </div>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              Настройки
            </span>
          }
          key="settings"
        >
          <div className={styles.settingsPanel}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              Настройки уведомлений
            </Text>
            
            <div className={styles.settingItem}>
              <div>
                <Text strong>Подтверждение заказов</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Уведомления о новых заказах и их подтверждении
                </Text>
              </div>
              <Switch
                checked={settings.orderConfirmation}
                onChange={(checked) =>
                  onSettingsChange({ ...settings, orderConfirmation: checked })
                }
              />
            </div>

            <Divider />

            <div className={styles.settingItem}>
              <div>
                <Text strong>Претензии</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Уведомления о новых претензиях и их статусе
                </Text>
              </div>
              <Switch
                checked={settings.claims}
                onChange={(checked) =>
                  onSettingsChange({ ...settings, claims: checked })
                }
              />
            </div>

            <Divider />

            <div className={styles.settingItem}>
              <div>
                <Text strong>Сообщения</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Уведомления о новых сообщениях в чате
                </Text>
              </div>
              <Switch
                checked={settings.messages}
                onChange={(checked) =>
                  onSettingsChange({ ...settings, messages: checked })
                }
              />
            </div>

            <Divider />

            <div className={styles.settingItem}>
              <div>
                <Text strong>Пополнение баланса</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Уведомления о пополнении и списании средств
                </Text>
              </div>
              <Switch
                checked={settings.balanceTopUp}
                onChange={(checked) =>
                  onSettingsChange({ ...settings, balanceTopUp: checked })
                }
              />
            </div>

            <Divider />

            <div className={styles.settingItem}>
              <div>
                <Text strong>Ставки на заказы</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Уведомления о новых ставках на ваши заказы
                </Text>
              </div>
              <Switch
                checked={settings.bids}
                onChange={(checked) =>
                  onSettingsChange({ ...settings, bids: checked })
                }
              />
            </div>

            <Divider />

            <div className={styles.settingItem}>
              <div>
                <Text strong>Системные обновления</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Уведомления об обновлениях платформы
                </Text>
              </div>
              <Switch
                checked={settings.systemUpdates}
                onChange={(checked) =>
                  onSettingsChange({ ...settings, systemUpdates: checked })
                }
              />
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default NotificationSystem;
