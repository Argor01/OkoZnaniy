import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, Tag, Spin, Alert, Rate, Divider, Avatar } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { expertsApi, type ExpertStatistics, type ExpertReview } from '@/features/expert/api/experts';
import dayjs from 'dayjs';
import { getMediaUrl } from '@/config/api';
import styles from './ExpertProfile.module.css';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';

const { Title, Text, Paragraph } = Typography;



const ExpertProfile: React.FC = () => {
  const { expertId } = useParams<{ expertId: string }>();
  const navigate = useNavigate();
  const [expertStats, setExpertStats] = React.useState<ExpertStatistics | null>(null);
  const [expert, setExpert] = React.useState<any>(null);

  
  const { data: expertData, isLoading: expertLoading, error: expertError } = useQuery({
    queryKey: ['expert', expertId],
    queryFn: async () => {
      
      const response = await fetch(`http://localhost:8000/api/users/${expertId}/`);
      if (!response.ok) throw new Error('Эксперт не найден');
      return response.json();
    },
    enabled: !!expertId,
  });

  
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['expert-stats', expertId],
    queryFn: () => expertsApi.getExpertStatistics(Number(expertId)),
    enabled: !!expertId,
  });

  
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['expert-reviews', expertId],
    queryFn: () => expertsApi.getReviews(Number(expertId)),
    enabled: !!expertId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  React.useEffect(() => {
    console.log('ExpertProfile: Fetched reviews:', reviews);
  }, [reviews]);

  React.useEffect(() => {
    if (expertData) {
      setExpert(expertData);
    }
    
    if (statsData) {
      setExpertStats(statsData);
    }
  }, [expertData, statsData]);

  if (expertLoading) {
    return (
      <div className={styles.loadingState}>
        <Spin size="large" />
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (expertError || !expert) {
    return (
      <div className={styles.errorState}>
        <Alert
          message="Эксперт не найден"
          description="Профиль эксперта не существует или был удален."
          type="error"
          showIcon
          action={
            <AppButton variant="primary" onClick={() => navigate(-1)}>
              Назад
            </AppButton>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      <div className={styles.headerRow}>
        <AppButton icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} variant="secondary">
          Назад
        </AppButton>
        <div>
          <div className={styles.headerMeta}>
            {expert.avatar ? (
              <img
                src={getMediaUrl(expert.avatar)}
                alt="Аватар"
                className={styles.headerAvatar}
              />
            ) : (
              <div className={styles.headerAvatarFallback}>
                <UserOutlined />
              </div>
            )}
            <div>
              <Title level={2} className={styles.headerTitle}>
                {expert.first_name} {expert.last_name}
                {expert.is_verified && <CheckCircleOutlined className={styles.verifiedIcon} />}
              </Title>
              <Text type="secondary">@{expert.username}</Text>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div>
          {expert.bio && (
            <AppCard title="О себе" className={styles.cardSpacing}>
              <Paragraph>{expert.bio}</Paragraph>
            </AppCard>
          )}

          {expert.education && (
            <AppCard title="Образование" className={styles.cardSpacing}>
              <Paragraph>{expert.education}</Paragraph>
            </AppCard>
          )}

          {expert.skills && (
            <AppCard title="Навыки" className={styles.cardSpacing}>
              <div className={styles.skillsWrap}>
                {expert.skills.split(',').map((skill: string, index: number) => (
                  <Tag key={index} color="blue">
                    {skill.trim()}
                  </Tag>
                ))}
              </div>
            </AppCard>
          )}

          {expert.portfolio_url && (
            <AppCard title="Портфолио" className={styles.cardSpacing}>
              <AppButton 
                variant="link" 
                href={expert.portfolio_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Посмотреть портфолио
              </AppButton>
            </AppCard>
          )}
        </div>

        <div>
          <AppCard title="Рейтинг и статистика" className={styles.cardSpacing}>
            {statsLoading ? (
              <Spin />
            ) : expertStats ? (
              <div>
                <div className={styles.statsHeader}>
                  <div className={styles.statsValue}>
                    {expertStats.average_rating ? Number(expertStats.average_rating).toFixed(1) : 'Н/Д'}
                  </div>
                  <Rate disabled value={Number(expertStats.average_rating) || 0} className={styles.statsRate} />
                  <div className={styles.statsMeta}>
                    на основе {expertStats.completed_orders} заказов
                  </div>
                </div>
                <Divider />
                <div className={styles.statsRow}>
                  <Text>Всего заказов:</Text>
                  <Text strong>{expertStats.total_orders}</Text>
                </div>
                <div className={styles.statsRow}>
                  <Text>Завершено:</Text>
                  <Text strong>{expertStats.completed_orders}</Text>
                </div>
                <div className={styles.statsRow}>
                  <Text>Успешность:</Text>
                  <Text strong>{(expertStats.success_rate * 100).toFixed(1)}%</Text>
                </div>
                <div className={styles.statsRowLast}>
                  <Text>Заработано:</Text>
                  <Text strong>
                    {(() => {
                      const value = expertStats.total_earnings;
                      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
                      return `${value.toLocaleString('ru-RU', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })} ₽`;
                    })()}
                  </Text>
                </div>
              </div>
            ) : (
              <Text type="secondary">Статистика недоступна</Text>
            )}
          </AppCard>

          <AppCard title="Контактная информация">
            <div className={styles.infoList}>
              <div>
                <Text strong>Email:</Text>
                <br />
                <Text copyable>{expert.email}</Text>
              </div>
              {expert.phone && (
                <div>
                  <Text strong>Телефон:</Text>
                  <br />
                  <Text copyable>{expert.phone}</Text>
                </div>
              )}
              {expert.telegram_id && (
                <div>
                  <Text strong>Telegram:</Text>
                  <br />
                  <Text>@{expert.telegram_id}</Text>
                </div>
              )}
            </div>
          </AppCard>

          <AppCard title="Дополнительно" className={styles.cardTopSpacing}>
            <div className={styles.infoList}>
              {expert.experience_years && (
                <div>
                  <Text strong>Опыт работы:</Text>
                  <br />
                  <Text>{expert.experience_years} лет</Text>
                </div>
              )}
              {expert.hourly_rate && (
                <div>
                  <Text strong>Почасовая ставка:</Text>
                  <br />
                  <Text>{expert.hourly_rate} ₽/час</Text>
                </div>
              )}
              <div>
                <Text strong>На платформе с:</Text>
                <br />
                <Text>{dayjs(expert.date_joined).format('DD.MM.YYYY')}</Text>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <AppCard title={`Отзывы (${reviews.length})`} className={styles.reviewsCard}>
        {reviewsLoading ? (
          <div className={styles.reviewsLoading}>
            <Spin />
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.reviewsEmpty}>
            Нет отзывов
          </div>
        ) : (
          <div className={styles.reviewsList}>
            {reviews.map((review: ExpertReview) => (
              <div 
                key={review.id}
                className={styles.reviewCard}
              >
                <div className={styles.reviewHeader}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/user/${review.client.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/user/${review.client.id}`);
                    }}
                    className={styles.reviewAuthor}
                  >
                    <Avatar
                      size={32}
                      src={getMediaUrl(review.client.avatar)}
                      icon={<UserOutlined className={styles.reviewAvatarIcon} />}
                    />
                    <div>
                      <Text strong className={styles.reviewAuthorName}>
                        @{review.client.username || `user${review.client.id}`}
                      </Text>
                      <br />
                      <Text type="secondary" className={styles.reviewAuthorMeta}>
                        {review.client.first_name} {review.client.last_name}
                      </Text>
                    </div>
                  </div>
                  <div className={styles.reviewRating}>
                    <Rate disabled value={review.rating} className={styles.reviewRatingValue} />
                    <br />
                    <Text type="secondary" className={styles.reviewDate}>
                      {dayjs(review.created_at).format('DD.MM.YYYY')}
                    </Text>
                  </div>
                </div>
                <Text type="secondary" className={styles.reviewOrder}>
                  {review.order?.title}
                </Text>
                <Paragraph className={styles.reviewText}>
                  {review.text || review.comment}
                </Paragraph>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
};

export default ExpertProfile;
