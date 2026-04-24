import React, { useMemo, useState } from 'react';
import { Typography, Rate, Empty, Spin, Avatar, Button, Modal, Input, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi, type ExpertReview } from '@/features/expert/api/experts';
import styles from './ReviewsTab.module.css';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import { getMediaUrl } from '../../../../config/api';
import { useAuth } from '@/features/auth';

const { Text, Paragraph } = Typography;

interface ReviewsTabProps {
  isMobile: boolean;
  expertId?: number;
}

type ReviewWithReply = ExpertReview & {
  reply_text?: string;
  reply_at?: string | null;
  is_appealed?: boolean;
};

const STARS = [5, 4, 3, 2, 1];

const ReviewsTab: React.FC<ReviewsTabProps> = ({ isMobile, expertId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState<number[]>([]);
  const [replyModal, setReplyModal] = useState<{ id: number } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [appealModal, setAppealModal] = useState<{ id: number } | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const isOwnExpert = !!user && !!expertId && user.id === expertId;

  const publicQuery = useQuery({
    queryKey: ['expert-reviews-public', expertId, ratingFilter.join(',')],
    queryFn: () =>
      expertsApi.getPublicReviews({
        expert: expertId as number,
        rating: ratingFilter.length ? ratingFilter : undefined,
      }),
    enabled: !!expertId,
    staleTime: 0,
  });

  const reviews: ReviewWithReply[] = useMemo(
    () => (publicQuery.data?.results as ReviewWithReply[]) || [],
    [publicQuery.data],
  );
  const breakdown = publicQuery.data?.breakdown || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const total = publicQuery.data?.count ?? 0;
  const average = publicQuery.data?.average_rating ?? 0;

  const replyMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => expertsApi.replyToReview(id, text),
    onSuccess: () => {
      message.success('Ответ опубликован');
      setReplyModal(null);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['expert-reviews-public', expertId] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { reply_text?: string; detail?: string } } })?.response?.data
          ?.reply_text ||
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось отправить ответ';
      message.error(msg);
    },
  });

  const appealMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => expertsApi.appealReview(id, reason),
    onSuccess: () => {
      message.success('Обжалование отправлено администратору');
      setAppealModal(null);
      setAppealReason('');
      queryClient.invalidateQueries({ queryKey: ['expert-reviews-public', expertId] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { appeal_reason?: string; detail?: string } } })?.response?.data
          ?.appeal_reason ||
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось отправить обжалование';
      message.error(msg);
    },
  });

  const toggleRating = (r: number) => {
    setRatingFilter((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  if (publicQuery.isLoading) {
    return (
      <div className={`${styles.sectionCard} ${styles.sectionCardLoading}`}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Отзывы</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Rate disabled allowHalf value={Number(average) || 0} />
          <Text strong>{Number(average).toFixed(2)}</Text>
          <Text type="secondary">всего: {total}</Text>
        </div>
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {STARS.map((s) => (
            <Button
              key={s}
              size="small"
              type={ratingFilter.includes(s) ? 'primary' : 'default'}
              onClick={() => toggleRating(s)}
            >
              {s}★ ({breakdown[String(s)] ?? 0})
            </Button>
          ))}
          {ratingFilter.length > 0 && (
            <Button size="small" type="link" onClick={() => setRatingFilter([])}>
              Сбросить фильтр
            </Button>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <Empty description={ratingFilter.length ? 'Нет отзывов с такой оценкой' : 'Нет отзывов'} />
      ) : (
        <div className={styles.reviewGrid}>
          {reviews.map((review) => (
            <div key={review.id} className={`${styles.orderCard} ${styles.reviewCard}`}>
              <div className={styles.reviewHeaderRow}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => review.client?.username && navigate(`/user/${review.client.username}`)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && review.client?.username) {
                      navigate(`/user/${review.client.username}`);
                    }
                  }}
                  className={styles.reviewUser}
                >
                  <Avatar
                    size={48}
                    src={getMediaUrl(review.client?.avatar)}
                    icon={<UserOutlined className={styles.reviewAvatarIcon} />}
                  />
                  <div className={styles.reviewUserText}>
                    <Text strong className={isMobile ? styles.reviewUserNameMobile : styles.reviewUserName}>
                      @{review.client?.username || `user${review.client?.id ?? ''}`}
                    </Text>
                    <Text type="secondary" className={styles.reviewUserMeta}>
                      {review.client?.first_name} {review.client?.last_name}
                    </Text>
                  </div>
                </div>

                <div className={styles.reviewMeta}>
                  <Rate
                    disabled
                    value={review.rating}
                    className={isMobile ? styles.reviewRateMobile : styles.reviewRate}
                  />
                  <Text type="secondary" className={styles.reviewDate}>
                    {dayjs(review.created_at).format('DD.MM.YYYY')}
                  </Text>
                </div>
              </div>

              <Paragraph className={styles.reviewText}>{review.text || review.comment || ''}</Paragraph>

              {review.reply_text && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: '#f0f5ff',
                    borderRadius: 8,
                    borderLeft: '3px solid #1677ff',
                  }}
                >
                  <Text strong>Ответ эксперта:</Text>
                  <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>{review.reply_text}</Paragraph>
                  {review.reply_at && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(review.reply_at).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  )}
                </div>
              )}

              {isOwnExpert && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!review.reply_text && (
                    <Button size="small" onClick={() => setReplyModal({ id: review.id })}>
                      Ответить
                    </Button>
                  )}
                  {!review.is_appealed && (
                    <Button size="small" danger onClick={() => setAppealModal({ id: review.id })}>
                      Обжаловать
                    </Button>
                  )}
                  {review.is_appealed && <Text type="warning">Обжалование на рассмотрении</Text>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!replyModal}
        title="Ответ на отзыв"
        onCancel={() => {
          setReplyModal(null);
          setReplyText('');
        }}
        onOk={() => replyModal && replyMutation.mutate({ id: replyModal.id, text: replyText })}
        confirmLoading={replyMutation.isPending}
        okText="Отправить"
        cancelText="Отмена"
      >
        <Input.TextArea
          rows={4}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          maxLength={2000}
          showCount
          placeholder="Напишите ваш ответ клиенту..."
        />
      </Modal>

      <Modal
        open={!!appealModal}
        title="Обжалование отзыва"
        onCancel={() => {
          setAppealModal(null);
          setAppealReason('');
        }}
        onOk={() =>
          appealModal && appealMutation.mutate({ id: appealModal.id, reason: appealReason })
        }
        confirmLoading={appealMutation.isPending}
        okText="Обжаловать"
        cancelText="Отмена"
      >
        <Paragraph type="secondary">
          Опишите, почему отзыв должен быть пересмотрен. Администратор рассмотрит обращение и
          примет решение оставить или удалить отзыв.
        </Paragraph>
        <Input.TextArea
          rows={5}
          value={appealReason}
          onChange={(e) => setAppealReason(e.target.value)}
          minLength={10}
          maxLength={2000}
          showCount
          placeholder="Причина обжалования (минимум 10 символов)..."
        />
      </Modal>
    </div>
  );
};

export default ReviewsTab;
