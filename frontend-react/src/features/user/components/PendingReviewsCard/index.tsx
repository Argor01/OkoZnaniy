import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Modal,
  Rate,
  Space,
  Spin,
  Typography,
  message as antMessage,
} from 'antd';
import { UserOutlined, StarFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { expertsApi } from '@/features/expert/api/experts';
import { apiClient } from '@/api/client';
import { getMediaUrl } from '@/config/api';
import { SectionHeader, SurfaceCard } from '@/features/common';
import styles from './styles.module.css';

const { Text, Paragraph } = Typography;

interface PendingItem {
  order_id: number;
  order_title: string;
  order_number?: string | null;
  completed_at: string | null;
  expert_id: number | null;
  expert_username: string | null;
  expert_full_name: string | null;
  expert_avatar: string | null;
}

const PendingReviewsCard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeItem, setActiveItem] = useState<PendingItem | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: () => expertsApi.getPendingReviews(),
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!activeItem) return;
      await apiClient.post('/experts/reviews/', {
        order: activeItem.order_id,
        rating,
        comment,
      });
    },
    onSuccess: () => {
      antMessage.success('Спасибо за отзыв!');
      setActiveItem(null);
      setRating(5);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['expert-reviews'] });
    },
    onError: () => {
      antMessage.error('Не удалось сохранить отзыв');
    },
  });

  const items = data?.results ?? [];
  if (!isLoading && items.length === 0) return null;

  return (
    <SurfaceCard
      title={<SectionHeader title="ПОСТАВЬТЕ ОТЗЫВ" />}
      className={styles.card}
    >
      {isLoading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.order_id} className={styles.item}>
              <div
                className={styles.expert}
                role="button"
                tabIndex={0}
                onClick={() =>
                  item.expert_username && navigate(`/expert/${item.expert_username}`)
                }
              >
                <Avatar
                  size={40}
                  src={getMediaUrl(item.expert_avatar)}
                  icon={<UserOutlined />}
                />
                <div className={styles.expertText}>
                  <Text strong>
                    {item.expert_full_name ||
                      `@${item.expert_username || 'expert'}`}
                  </Text>
                  <Text type="secondary" className={styles.meta}>
                    {item.order_title}
                  </Text>
                  {item.completed_at && (
                    <Text type="secondary" className={styles.meta}>
                      Завершён {dayjs(item.completed_at).format('DD.MM.YYYY')}
                    </Text>
                  )}
                </div>
              </div>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    setActiveItem(item);
                    setRating(5);
                    setComment('');
                  }}
                >
                  Оставить отзыв
                </Button>
              </Space>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!activeItem}
        centered
        title="Оставьте отзыв"
        okText="Отправить"
        cancelText="Отмена"
        onCancel={() => setActiveItem(null)}
        onOk={() => submit.mutate()}
        okButtonProps={{ loading: submit.isPending }}
        destroyOnHidden
      >
        {activeItem ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph type="secondary" className={styles.modalSubtitle}>
              {activeItem.order_title}
            </Paragraph>
            <div className={styles.ratingRow}>
              <Text strong>Оценка:</Text>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarFilled
                    key={star}
                    className={
                      star <= rating ? styles.starFilled : styles.starEmpty
                    }
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
            <Rate
              value={rating}
              onChange={(v) => setRating(v)}
              className={styles.rateHidden}
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Поделитесь впечатлениями (необязательно)"
              className={styles.textarea}
              rows={4}
            />
          </Space>
        ) : null}
      </Modal>
    </SurfaceCard>
  );
};

export default PendingReviewsCard;
