import React from 'react';
import { Avatar, Typography, Rate, Space, Button, Tooltip } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { UserProfile } from '../../types';
import type { ExpertStatistics } from '../../../../api/experts';
import { ordersApi, type Order } from '../../../../api/orders';
import { formatCurrency } from '../../../../utils/formatters';
import styles from '../../ExpertDashboard.module.css';

const { Title, Text } = Typography;

export interface ProfileHeaderProps {
  profile: UserProfile | null;
  expertStats: ExpertStatistics | undefined;
  userProfile: UserProfile | null | undefined;
  isMobile: boolean;
  onEditProfile?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  expertStats,
  userProfile,
  isMobile,
  onEditProfile,
}) => {
  const displayName =
    (profile?.first_name || profile?.last_name)
      ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      : (userProfile?.username || userProfile?.email || 'Эксперт');

  const { data: ordersData } = useQuery({
    queryKey: ['expert-success-rate-orders', userProfile?.id],
    queryFn: () => ordersApi.getMyOrders({}),
    enabled: !!userProfile?.id && userProfile?.role === 'expert',
  });

  const orders = React.useMemo<Order[] | undefined>(() => {
    if (!ordersData) return undefined;
    if (Array.isArray(ordersData)) return ordersData as Order[];
    const results = (ordersData as { results?: unknown })?.results;
    return Array.isArray(results) ? (results as Order[]) : [];
  }, [ordersData]);

  const computedSuccessRate = React.useMemo<number | undefined>(() => {
    if (!orders) return undefined;
    if (!userProfile?.id) return undefined;

    const now = Date.now();
    const currentUserId = Number(userProfile.id);
    const isExecutorOrder = (order: Order) => {
      const expertId =
        order.expert?.id ?? (order as unknown as { expert_id?: unknown } | null)?.expert_id;
      if (!expertId) return false;
      return Number(expertId) === currentUserId;
    };
    const isOverdue = (order: Order) => {
      if (order.is_overdue === true) return true;
      if (!(order.status === 'in_progress' || order.status === 'revision')) return false;
      const deadlineTime = new Date(order.deadline).getTime();
      if (!Number.isFinite(deadlineTime)) return false;
      return deadlineTime <= now;
    };
    const relevant = orders.filter((order) => {
      if (!isExecutorOrder(order)) return false;
      if (order.status === 'completed') return true;
      if (order.status === 'cancelled') return true;
      return isOverdue(order);
    });

    if (relevant.length === 0) return 0;
    const completedCount = relevant.filter((order) => order.status === 'completed').length;
    return (completedCount / relevant.length) * 100;
  }, [orders, userProfile?.id]);

  const displayedSuccessRate =
    typeof computedSuccessRate === 'number'
      ? computedSuccessRate
      : (expertStats?.success_rate ? Number(expertStats.success_rate) : 0);

  return (
    <div className={styles.profileBlock}>
      <div className={styles.profileBlockContent}>
        <div className={styles.profileLeft}>
          <Avatar
            size={isMobile ? 100 : 80}
            src={userProfile?.avatar || undefined}
            icon={<UserOutlined />}
            className={styles.profileAvatar}
          />
          <div className={styles.profileInfo}>
            <div className={styles.profileNameRow}>
              <Title level={3} className={styles.profileNameTitle}>
                {displayName}
              </Title>
              {isMobile ? (
                <span className={styles.profileOnlineDot} />
              ) : (
                <Text type="secondary" className={styles.profileOnlineText}>
                  Онлайн
                </Text>
              )}
            </div>
            <div
              className={`${styles.profileStatsRow} ${isMobile ? styles.profileStatsRowMobile : ''}`}
            >
              <div
                className={`${styles.profileStatColumn} ${isMobile ? styles.profileStatColumnMobile : ''}`}
              >
                <Space direction="vertical" size={8} className={styles.profileStatSpace}>
                  <Text className={styles.profileStatLabel}>Рейтинг исполнителя:</Text>
                  <Rate
                    disabled
                    value={typeof expertStats?.average_rating === 'number' ? expertStats.average_rating : 0}
                    allowHalf
                    className={styles.profileStatRate}
                  />
                  <Text type="secondary" className={styles.profileStatSubtext}>
                    {typeof expertStats?.average_rating === 'number' ? expertStats.average_rating.toFixed(1) : '0.0'} / 5.0
                  </Text>
                </Space>
              </div>
              <div
                className={`${styles.profileStatColumn} ${isMobile ? styles.profileStatColumnMobile : ''}`}
              >
                <Space direction="vertical" size={8} className={styles.profileStatSpace}>
                  <Text className={styles.profileStatLabel}>Рейтинг заказчика:</Text>
                  <Rate
                    disabled
                    value={0}
                    allowHalf
                    className={styles.profileStatRate}
                  />
                  <Text type="secondary" className={styles.profileStatSubtext}>
                    0.0 / 5.0
                  </Text>
                </Space>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.profileRight}>
          <div className={styles.profileStats}>
            <Text type="secondary" className={styles.profileStatsMeta}>
              На сайте: <span className={styles.statsNumber}>{userProfile?.date_joined ? Math.floor((Date.now() - new Date(userProfile.date_joined).getTime()) / (1000 * 60 * 60 * 24)) : 0}</span> дней
            </Text>
            <div>
              <Text className={styles.profileStatsLine}>
                Статистика работ:{' '}
                <Tooltip
                  title="Процент заказов со статусом «Завершено» среди завершенных и просроченных заказов"
                  placement="top"
                >
                  <span className={styles.statsNumberSuccess}>
                    {Number(displayedSuccessRate).toFixed(0)}%
                  </span>
                </Tooltip>
                {' | '}
                <Tooltip title="Сумма ваших выплат (заработано) по завершенным заказам" placement="top">
                  <span className={styles.statsNumberEarnings}>
                    {formatCurrency(expertStats?.total_earnings || 0)}
                  </span>
                </Tooltip>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
export { ProfileHeader };
