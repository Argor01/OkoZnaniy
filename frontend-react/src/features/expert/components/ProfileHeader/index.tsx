import React from 'react';
import { Avatar, Typography, Rate, Space, Button, Tooltip, Skeleton } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import { UserProfile } from '../../types';
import type { ExpertStatistics } from '@/features/expert/api/experts';
import { formatCurrency, getDisplayUsername, truncateDisplayName } from '../../../../utils/formatters';
import styles from './ProfileHeader.module.css';

const { Title, Text } = Typography;

export interface ProfileHeaderProps {
  profile: UserProfile | null;
  loading?: boolean;
  expertStats: ExpertStatistics | undefined;
  userProfile: UserProfile | null | undefined;
  isMobile: boolean;
  onEditProfile?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({
  profile,
  loading,
  expertStats,
  userProfile,
  isMobile,
  onEditProfile,
}) => {
  const displayName = truncateDisplayName(
    (profile?.first_name || profile?.last_name)
      ? [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      : getDisplayUsername(userProfile || {})
  );
  const roleKind = userProfile?.role === 'expert' ? 'expert' : 'client';
  const roleLabel = roleKind === 'expert' ? 'Эксперт' : 'Клиент';

  const displayedSuccessRate = Number(expertStats?.success_rate || 0);
  const expertRating = Number(expertStats?.average_rating || 0);
  const clientRating = Number(expertStats?.client_average_rating || userProfile?.average_rating || 0);


  if (loading) {
    return (
      <div className={styles.profileBlock}>
        <div className={styles.profileBlockContent}>
          <Skeleton avatar active paragraph={{ rows: 2 }} />
        </div>
      </div>
    );
  }

  const daysOnSite = userProfile?.date_joined
    ? Math.max(0, Math.floor((Date.now() - new Date(userProfile.date_joined).getTime()) / 86400000))
    : 0;

  return (
    <section className={styles.profileBlock} aria-label="Профиль и статистика">
      <div className={styles.identityRow}>
        <Avatar
          size={isMobile ? 72 : 88}
          src={userProfile?.avatar || undefined}
          icon={<UserOutlined />}
          className={styles.profileAvatar}
        />
        <div className={styles.identityContent}>
          <div className={styles.profileNameRow}>
            <Title level={2} className={styles.profileNameTitle}>{displayName}</Title>
            <span className={`${styles.profileRoleBadge} ${styles[`profileRoleBadge_${roleKind}`]}`}>{roleLabel}</span>
            <span className={styles.onlineStatus}><span className={styles.profileOnlineDot} />Онлайн</span>
          </div>
          <Text type="secondary" className={styles.memberSince}>На сайте {daysOnSite} дн.</Text>
        </div>
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={onEditProfile}
          className={styles.editProfileButton}
          aria-label="Редактировать профиль"
        >
          {!isMobile && 'Редактировать'}
        </Button>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.ratingsGroup}>
          <div className={styles.ratingItem}>
            <Text className={styles.profileStatLabel}>Как исполнитель</Text>
            <div className={styles.ratingValueRow}>
              <Rate disabled value={expertRating} allowHalf className={styles.profileStatRate} />
              <strong>{expertRating.toFixed(1)}</strong>
            </div>
          </div>
          <div className={styles.ratingItem}>
            <Text className={styles.profileStatLabel}>Как заказчик</Text>
            <div className={styles.ratingValueRow}>
              <Rate disabled value={clientRating} allowHalf className={styles.profileStatRate} />
              <strong>{clientRating.toFixed(1)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.metricsGroup}>
          <Tooltip title="Доля завершённых заказов среди завершённых, отменённых и истёкших">
            <div className={styles.metricItem}><span>Успешность</span><strong>{displayedSuccessRate.toFixed(0)}%</strong></div>
          </Tooltip>
          <Tooltip title="Фактические выплаты по завершённым заказам">
            <div className={styles.metricItem}><span>Заработано</span><strong>{formatCurrency(expertStats?.total_earnings || 0)}</strong></div>
          </Tooltip>
          <div className={styles.metricItem}><span>Все заказы</span><strong>{expertStats?.total_orders || 0}</strong></div>
        </div>
      </div>
    </section>
  );
});

export default ProfileHeader;
export { ProfileHeader };
