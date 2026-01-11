import React from 'react';
import { Typography, Rate, Empty, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { expertsApi } from '../../../../api/experts';
import styles from '../../ExpertDashboard.module.css';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface ReviewsTabProps {
  isMobile: boolean;
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ isMobile }) => {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['expert-reviews'],
    queryFn: () => expertsApi.getReviews(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  React.useEffect(() => {
    console.log('ReviewsTab: Fetched reviews:', reviews);
  }, [reviews]);

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
          {reviews.map((review: any) => (
            <div key={review.id} className={styles.orderCard}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 6, marginBottom: 4, flexDirection: isMobile ? 'column' : 'row' }}>
                  <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                    {review.client?.first_name} {review.client?.last_name}
                  </Text>
                  <Rate disabled defaultValue={review.rating} style={{ fontSize: isMobile ? 14 : 16 }} />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(review.created_at).format('DD.MM.YYYY')}
                </Text>
              </div>
              <Paragraph style={{ color: '#6b7280', marginBottom: 8 }}>
                {review.text}
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Заказ: {review.order?.title}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
