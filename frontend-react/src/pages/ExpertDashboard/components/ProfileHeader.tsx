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
            style={{
              backgroundColor: profile?.avatar ? 'transparent' : '#667eea',
              border: '3px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          />
          <div className={styles.profileInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <Title level={3} style={{ margin: 0, color: '#1f2937', fontSize: isMobile ? 20 : 20 }}>
                {profile?.username || profile?.email || 'Эксперт'}
              </Title>
              {isMobile ? (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'inline-block',
                  }}
                />
              ) : (
                <Text type="secondary" style={{ fontSize: 14, color: '#6b7280' }}>
                  Онлайн
                </Text>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: isMobile ? 16 : 24,
                marginBottom: 12,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                overflow: isMobile ? 'visible' : 'auto',
              }}
            >
              <div style={{ flex: isMobile ? '1 1 100%' : 1, minWidth: isMobile ? '100%' : 150 }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 14, color: '#1f2937' }}>Рейтинг исполнителя:</Text>
                  <Rate
                    disabled
                    value={typeof expertStats?.average_rating === 'number' ? expertStats.average_rating : 0}
                    allowHalf
                    style={{ fontSize: 16 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {typeof expertStats?.average_rating === 'number' ? expertStats.average_rating.toFixed(1) : '0.0'} / 5.0
                  </Text>
                </Space>
              </div>
              <div style={{ flex: isMobile ? '1 1 100%' : 1, minWidth: isMobile ? '100%' : 150 }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 14, color: '#1f2937' }}>Рейтинг заказчика:</Text>
                  <Rate disabled value={0} allowHalf style={{ fontSize: 16 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    0.0 / 5.0
                  </Text>
                </Space>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.profileRight}>
          <div className={styles.profileStats}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#6b7280' }}>
              На сайте:{' '}
              <span className={styles.statsNumber}>
                {profile?.date_joined ? Math.floor((Date.now() - new Date(profile.date_joined).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </span>{' '}
              дней
            </Text>
            <div>
              <Text style={{ fontSize: 14, color: '#1f2937' }}>
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
                    const num = typeof val === 'string' ? Number(val.replace(/,/g, '')) : Number(val);
                    return !isNaN(num) 
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
