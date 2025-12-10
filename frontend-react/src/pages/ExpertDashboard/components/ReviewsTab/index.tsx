import React from 'react';
import { Typography, Rate } from 'antd';
import styles from '../../ExpertDashboard.module.css';

const { Text, Paragraph } = Typography;

interface ReviewsTabProps {
  isMobile: boolean;
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ isMobile }) => {
  const reviews = [
    {
      id: 1,
      author: 'Иван Петров',
      rating: 5,
      date: '15.11.2024',
      text: 'Отличная работа! Все выполнено качественно и в срок. Решения подробно расписаны, все понятно. Рекомендую этого исполнителя!',
      order: 'Решение задач по высшей математике'
    },
    {
      id: 2,
      author: 'Мария Сидорова',
      rating: 5,
      date: '10.11.2024',
      text: 'Очень довольна результатом! Курсовая работа выполнена на высоком уровне, все требования учтены. Спасибо за оперативность и профессионализм!',
      order: 'Курсовая работа по экономике'
    },
    {
      id: 3,
      author: 'Алексей Смирнов',
      rating: 4,
      date: '05.11.2024',
      text: 'Хорошая работа, все сделано правильно. Единственное - хотелось бы чуть больше комментариев в коде. В целом доволен.',
      order: 'Лабораторная работа по программированию'
    }
  ];

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Отзывы</h2>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        {reviews.map((review) => (
          <div key={review.id} className={styles.orderCard}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 6, marginBottom: 4, flexDirection: isMobile ? 'column' : 'row' }}>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>{review.author}</Text>
                <Rate disabled defaultValue={review.rating} style={{ fontSize: isMobile ? 14 : 16 }} />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>{review.date}</Text>
            </div>
            <Paragraph style={{ color: '#6b7280', marginBottom: 8 }}>
              {review.text}
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>Заказ: {review.order}</Text>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsTab;
