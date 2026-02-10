import React from 'react';
import { Typography, Rate, Empty, Spin, Avatar } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { expertsApi, type ExpertReview } from '../../../../api/experts';
import styles from '../../ExpertDashboard.module.css';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import { getMediaUrl } from '../../../../config/api';

const { Text, Paragraph } = Typography;

interface ReviewsTabProps {
  isMobile: boolean;
  expertId?: number;
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ isMobile, expertId }) => {
  const navigate = useNavigate();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['expert-reviews', expertId],
    queryFn: () => expertsApi.getReviews(expertId),
    enabled: !!expertId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className={styles.sectionCard} style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Отзывы</h2>
      </div>
      {reviews.length === 0 ? (
        <Empty description="Нет отзывов" />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {reviews.map((review: ExpertReview) => (
            <div key={review.id} className={`${styles.orderCard} ${styles.reviewCard}`}>
              <div className={styles.reviewHeaderRow}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/user/${review.client.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/user/${review.client.id}`);
                  }}
                  className={styles.reviewUser}
                >
                  <Avatar
                    size={48}
                    src={getMediaUrl(review.client.avatar)}
                    icon={<UserOutlined style={{ fontSize: 16 }} />}
                  />
                  <div className={styles.reviewUserText}>
                    <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                      @{review.client.username || `user${review.client.id}`}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {review.client.first_name} {review.client.last_name}
                    </Text>
                  </div>
                </div>

                <div className={styles.reviewMeta}>
                  <Rate disabled value={review.rating} style={{ fontSize: isMobile ? 14 : 16 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(review.created_at).format('DD.MM.YYYY')}
                  </Text>
                </div>
              </div>

              <Paragraph className={styles.reviewText}>{review.text || review.comment || '—'}</Paragraph>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
