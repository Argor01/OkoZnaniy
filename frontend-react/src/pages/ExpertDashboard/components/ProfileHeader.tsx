import React from 'react';
import { Avatar, Typography, Rate, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { UserProfile } from '../types';
import type { ExpertStatistics } from '../../../api/experts';
import styles from '../ExpertDashboard.module.css';

const { Title, Text } = Typography;

interface ProfileHeaderProps {
  profile: UserProfile | null;
  expertStats?: ExpertStatistics;
  isMobile?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  expertStats,
  isMobile = false,
}) => {
  return (
    <div className={styles.profileBlock}>
      <div className={styles.profileBlockContent}>
        <div className={styles.profileLeft}>
          <Avatar
            size={isMobile ? 100 : 80}
            src={profile?.avatar ? `http://localhost:8000${profile.avatar}` : undefined}
            icon={!profile?.avatar && <UserOutlined />}
            className={`${styles.profileAvatar} ${profile?.avatar ? styles.profileAvatarTransparent : ''}`}
          />
          <div className={styles.profileInfo}>
            <div className={styles.profileNameRow}>
              <Title level={3} className={styles.profileNameTitle}>
                {profile?.username || profile?.email || 'Эксперт'}
              </Title>
              {isMobile ? (
                <span className={styles.profileOnlineDot} />
              ) : (
                <Text type="secondary" className={styles.profileOnlineText}>
                  Онлайн
                </Text>
              )}
            </div>
            <div className={`${styles.profileStatsRow} ${isMobile ? styles.profileStatsRowMobile : ''}`}>
              <div className={`${styles.profileStatColumn} ${isMobile ? styles.profileStatColumnMobile : ''}`}>
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
              <div className={`${styles.profileStatColumn} ${isMobile ? styles.profileStatColumnMobile : ''}`}>
                <Space direction="vertical" size={8} className={styles.profileStatSpace}>
                  <Text className={styles.profileStatLabel}>Рейтинг заказчика:</Text>
                  <Rate disabled value={0} allowHalf className={styles.profileStatRate} />
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
              На сайте:{' '}
              <span className={styles.statsNumber}>
                {profile?.date_joined ? Math.floor((Date.now() - new Date(profile.date_joined).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </span>{' '}
              дней
            </Text>
            <div>
              <Text className={styles.profileStatsLine}>
                Статистика работ: <span className={styles.statsNumber}>{expertStats?.total_orders || 0}</span>
                {' | '}
                <span className={styles.statsNumberCompleted}>{expertStats?.completed_orders || 0}</span>
                {' | '}
                <span className={styles.statsNumberSuccess}>{expertStats?.success_rate ? Number(expertStats.success_rate).toFixed(0) : 0}</span>%
                {' | '}
                <span className={styles.statsNumberEarnings}>
                  {(() => {
                    const val = expertStats?.total_earnings;
                    if (!val) return '0 ₽';
                    const num = typeof val === 'number' ? val : Number(val);
                    return Number.isFinite(num)
                      ? num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽'
                      : '0 ₽';
                  })()}
                </span>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
