import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Spin, Alert, Button, Rate, Tag, Space, Avatar } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { expertsApi, type ExpertReview } from '../api/experts';
import { apiClient } from '../api/client';
import dayjs from 'dayjs';
import { getMediaUrl } from '../config/api';
import SectionHeader from '../components/common/SectionHeader';
import SurfaceCard from '../components/common/SurfaceCard';
import styles from './UserProfile.module.css';

const { Text, Paragraph } = Typography;

const UserProfile: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${userId}/`);
      return response.data;
    },
    enabled: !!userId,
  });

  
  const { data: ordersStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-orders-stats', userId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/orders/orders/?client=${userId}`);
        const orders = response.data as { results?: Array<{ status?: string }> };
        const relevantOrders = (orders.results || []).filter((order) => order.status !== 'cancelled');
        const total = relevantOrders.length;
        const completed = relevantOrders.filter((order) => order.status === 'completed').length;
        const success_rate = total > 0 ? (completed / total) * 100 : 0;
        return { total, completed, success_rate };
      } catch (_error: unknown) {
        return { total: 0, completed: 0, success_rate: 0 };
      }
    },
    enabled: !!userId,
  });

  
  const { data: expertStats, isLoading: expertStatsLoading } = useQuery({
    queryKey: ['expert-stats', userId],
    queryFn: () => expertsApi.getExpertStatistics(Number(userId)),
    enabled: !!userId && userData?.role === 'expert',
  });

  
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['expert-reviews', userId],
    queryFn: () => expertsApi.getReviews(Number(userId)),
    enabled: !!userId && userData?.role === 'expert',
  });

  if (userLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="Пользователь не найден"
          description="Профиль пользователя не существует или был удален."
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate(-1)}>
              Назад
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          className={styles.backButton}
          size="large"
        >
          Назад
        </Button>

        <Card>
          <Space direction="vertical" size="large" className={styles.fullWidth}>
            
            <div className={styles.profileStack}>
              
              <Card 
                className={styles.headerCard}
              >
                <Space direction="vertical" size={12} className={styles.fullWidth}>
                  <div className={styles.headerRow}>
                    <Text type="secondary" className={styles.profileLabel}>
                      ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
                    </Text>
                    <Tag 
                      className={styles.roleTag}
                    >
                      {userData.role === 'client' ? 'Заказчик' : userData.role === 'expert' ? 'Эксперт' : 'Пользователь'}
                    </Tag>
                  </div>
                  <Space align="center" size={20}>
                    {userData.avatar ? (
                      <img
                        src={getMediaUrl(userData.avatar)}
                        alt="Аватар"
                        className={styles.avatarImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.classList.add(styles.avatarImageHidden);
                          const fallback = target.parentElement?.querySelector('[data-role="avatar-fallback"]') as HTMLElement;
                          if (fallback) fallback.classList.remove(styles.avatarFallbackHidden);
                        }}
                      />
                    ) : null}
                    <div 
                      data-role="avatar-fallback"
                      className={`${styles.avatarFallback} ${userData.avatar ? styles.avatarFallbackHidden : ''}`}
                    >
                      <UserOutlined />
                    </div>
                    <div>
                      <div className={styles.nameRow}>
                        <Text className={styles.nameText}>
                          {userData.first_name && userData.last_name 
                            ? `${userData.first_name} ${userData.last_name}`
                            : userData.username
                          }
                        </Text>
                        {userData.is_verified && <CheckCircleOutlined className={styles.verifiedIcon} />}
                      </div>
                      <Text className={styles.usernameText}>@{userData.username}</Text>
                    </div>
                  </Space>
                </Space>
              </Card>

              
              <SurfaceCard title={<SectionHeader title="РЕЙТИНГ И СТАТИСТИКА" />}>
                {(statsLoading || expertStatsLoading) ? (
                  <div className={styles.statsLoading}>
                    <Spin size="large" />
                  </div>
                ) : userData.role === 'expert' && expertStats ? (
                  <div className={styles.statsGrid}>
                    
                    <div className={styles.statCardCenter}>
                      <div className={styles.statValueRating}>
                        {expertStats.average_rating ? Number(expertStats.average_rating).toFixed(1) : 'Н/Д'}
                      </div>
                      <Rate disabled value={Number(expertStats.average_rating) || 0} className={styles.rateLarge} />
                      <div className={styles.statLabel}>
                        Средний рейтинг
                      </div>
                      <div className={styles.statSubLabel}>
                        на основе {expertStats.completed_orders} заказов
                      </div>
                    </div>

                    
                    <div className={styles.statCardBlock}>
                      <div className={styles.statBlockTitle}>
                        <div className={styles.statNumberLarge}>
                          {expertStats.total_orders}
                        </div>
                        <div className={styles.statLabel}>Всего заказов</div>
                      </div>
                      <div className={`${styles.statRow} ${styles.statRowSpacing}`}>
                        <Text>Завершено:</Text>
                        <Text strong className={styles.statSuccess}>{expertStats.completed_orders}</Text>
                      </div>
                      <div className={styles.statRow}>
                        <Text>Успешность:</Text>
                        <Text strong className={styles.statSuccess}>{Number(expertStats.success_rate || 0).toFixed(1)}%</Text>
                      </div>
                    </div>
                  </div>
                ) : ordersStats ? (
                  <div className={styles.statsGrid}>
                    
                    <div className={styles.statCardCenter}>
                      <div className={styles.statValuePrimary}>
                        {ordersStats.success_rate.toFixed(1)}%
                      </div>
                      <div className={styles.statLabel}>
                        Успешность заказов
                      </div>
                    </div>

                    
                    <div className={styles.statCardBlock}>
                      <div className={styles.statBlockTitle}>
                        <div className={styles.statNumberLarge}>
                          {ordersStats.total}
                        </div>
                        <div className={styles.statLabel}>Всего заказов</div>
                      </div>
                      <div className={styles.statRow}>
                        <Text>Завершено:</Text>
                        <Text strong className={styles.statSuccess}>{ordersStats.completed}</Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.statsEmpty}>
                    <Text type="secondary" className={styles.statsEmptyText}>Статистика недоступна</Text>
                  </div>
                )}
              </SurfaceCard>
            </div>

            
            <div>
              
              {userData.bio && (
                <SurfaceCard title="О себе" className={styles.sectionMargin}>
                  <Paragraph>{userData.bio}</Paragraph>
                </SurfaceCard>
              )}

              
              {userData.role === 'expert' && userData.education && (
                <SurfaceCard title="Образование" className={styles.sectionMargin}>
                  <Paragraph>{userData.education}</Paragraph>
                </SurfaceCard>
              )}

              {(userData.role === 'expert' && (userData.experience_years || userData.hourly_rate)) && (
                <SurfaceCard title="Дополнительно" className={styles.sectionMargin}>
                  <Space direction="vertical" size={8} className={styles.fullWidth}>
                    {!!userData.experience_years && (
                      <Space size={8}>
                        <Text>Опыт работы:</Text>
                        <Text strong>{userData.experience_years} лет</Text>
                      </Space>
                    )}
                    {!!userData.hourly_rate && (
                      <Space size={8}>
                        <Text>Почасовая ставка:</Text>
                        <Text strong>{Number(userData.hourly_rate).toLocaleString('ru-RU')} ₽/час</Text>
                      </Space>
                    )}
                  </Space>
                </SurfaceCard>
              )}

              
              {userData.role === 'expert' && userData.skills && (
                <SurfaceCard title="Навыки" className={styles.sectionMargin}>
                  <div className={styles.tagList}>
                    {userData.skills.split(',').map((skill: string, index: number) => (
                      <Tag key={index} color="green">
                        {skill.trim()}
                      </Tag>
                    ))}
                  </div>
                </SurfaceCard>
              )}

              
              {userData.role === 'expert' && userData.portfolio_url && (
                <SurfaceCard title="Портфолио" className={styles.sectionMargin}>
                  <Button 
                    type="link" 
                    href={userData.portfolio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Посмотреть портфолио
                  </Button>
                </SurfaceCard>
              )}
            </div>

            
            {userData.role === 'expert' && userData.specializations && Array.isArray(userData.specializations) && userData.specializations.length > 0 && (
              <SurfaceCard title="Специализации">
                <div className={styles.tagList}>
                  {userData.specializations.map(
                    (
                      spec: {
                        custom_name?: string;
                        subject?: { name?: string };
                        hourly_rate?: number | string;
                        experience_years?: number | string;
                      },
                      index: number
                    ) => (
                    <Tag key={index} color="blue">
                      {[
                        spec?.custom_name || spec?.subject?.name || 'Специализация не указана',
                        spec?.hourly_rate ? `${Number(spec.hourly_rate).toLocaleString('ru-RU')} ₽/час` : null,
                        spec?.experience_years ? `${spec.experience_years} лет` : null,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </Tag>
                  ))}
                </div>
              </SurfaceCard>
            )}

            
            {userData.role === 'expert' && (
              <Card 
                title={`Отзывы (${reviews.length})`} 
                className={styles.reviewsCard}
              >
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
                        className={styles.reviewItem}
                      >
                        <div className={styles.reviewHeader}>
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
                              size={32}
                              src={getMediaUrl(review.client.avatar)}
                              icon={<UserOutlined className={styles.reviewAvatarIcon} />}
                            />
                            <div>
                              <Text strong className={styles.reviewUserName}>
                                @{review.client.username || `user${review.client.id}`}
                              </Text>
                              <br />
                              <Text type="secondary" className={styles.reviewUserMeta}>
                                {review.client.first_name} {review.client.last_name}
                              </Text>
                            </div>
                          </div>
                          <div className={styles.reviewDate}>
                            <Rate disabled value={review.rating} className={styles.reviewRate} />
                            <br />
                            <Text type="secondary" className={styles.reviewUserMeta}>
                              {dayjs(review.created_at).format('DD.MM.YYYY')}
                            </Text>
                          </div>
                        </div>
                        <Text type="secondary" className={styles.reviewOrderTitle}>
                          {review.order?.title}
                        </Text>
                        <Paragraph className={styles.reviewText}>
                          {review.text || review.comment}
                        </Paragraph>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;
