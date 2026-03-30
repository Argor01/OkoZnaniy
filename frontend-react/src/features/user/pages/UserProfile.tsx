import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Spin, Alert, Button, Rate, Tag, Space, Avatar, message as antMessage } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { expertsApi, type ExpertReview } from '@/features/expert/api/experts';
import { apiClient } from '@/api/client';
import { chatApi } from '@/features/support/api/chat';
import dayjs from 'dayjs';
import { getMediaUrl } from '@/config/api';
import { SectionHeader, SurfaceCard } from '@/features/common';
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
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
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
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });

  const { data: liveSpecializations = [] } = useQuery({
    queryKey: ['expert-specializations-public', userId],
    queryFn: async () => {
      const all = await expertsApi.getSpecializations();
      const currentId = Number(userId);
      if (!Number.isFinite(currentId) || currentId <= 0) return [];
      return all.filter((spec: any) => {
        const expertIdRaw = typeof spec?.expert === 'object' ? spec?.expert?.id : spec?.expert;
        const expertId = Number(expertIdRaw);
        return Number.isFinite(expertId) && expertId === currentId;
      });
    },
    enabled: !!userId && userData?.role === 'expert',
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

    const profileSpecializations =
    liveSpecializations.length > 0
      ? liveSpecializations
      : (Array.isArray(userData?.specializations) ? userData.specializations : []);

  const handleWriteMessage = async () => {
    if (!userId) {
      antMessage.error('ID пользователя не найден');
      return;
    }

    try {
      // Создаем или получаем чат с этим пользователем
      const chatData = await chatApi.getOrCreateByUser(Number(userId));
      
      // Открываем модальное окно чата с этим чатом
      const event = new CustomEvent('openChatById', {
        detail: { chatId: chatData.id, userId: Number(userId) }
      });
      window.dispatchEvent(event);
      
      antMessage.success('Чат открыт');
    } catch (error: any) {
      console.error('Ошибка создания чата:', error);
      antMessage.error(error.response?.data?.detail || 'Не удалось создать чат');
    }
  };

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
              
                            <Card className={styles.headerCard}>
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
                  <div className={styles.profileIdentityCard}>
                    <Avatar
                      size={72}
                      src={userData.avatar ? getMediaUrl(userData.avatar) : undefined}
                      icon={<UserOutlined />}
                      className={styles.profileIdentityAvatar}
                    />
                    <div className={styles.profileIdentityMeta}>
                      <div className={styles.nameRow}>
                        <Text className={styles.nameText}>@{userData.username || 'user'}</Text>
                        {userData.is_verified && <CheckCircleOutlined className={styles.verifiedIcon} />}
                      </div>
                      {userData.first_name && userData.last_name ? (
                        <Text className={styles.usernameText}>
                          {`${userData.first_name} ${userData.last_name}`}
                        </Text>
                      ) : null}
                    </div>
                    <Button
                      type="primary"
                      icon={<MessageOutlined />}
                      onClick={handleWriteMessage}
                      className={styles.writeMessageButton}
                      size="large"
                    >
                      Написать
                    </Button>
                  </div>
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

              
              {userData.role === 'expert' && (
                <SurfaceCard title="Профиль эксперта" className={styles.sectionMargin}>
                  <div className={styles.expertInfoGrid}>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">О себе</Text>
                      <Text>{userData.bio || 'Не указано'}</Text>
                    </div>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">Образование</Text>
                      <Text>{userData.education || 'Не указано'}</Text>
                    </div>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">Опыт</Text>
                      <Text>{userData.experience_years ? `${userData.experience_years} лет` : 'Не указано'}</Text>
                    </div>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">Ставка</Text>
                      <Text>{userData.hourly_rate ? `${Number(userData.hourly_rate).toLocaleString('ru-RU')} ₽/час` : 'Не указано'}</Text>
                    </div>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">Навыки</Text>
                      {userData.skills ? (
                        <div className={styles.tagList}>
                          {userData.skills.split(',').map((skill: string, index: number) => (
                            <Tag key={index} color="green">
                              {skill.trim()}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <Text>Не указано</Text>
                      )}
                    </div>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">Специализации</Text>
                      {Array.isArray(profileSpecializations) && profileSpecializations.length > 0 ? (
                        <div className={styles.tagList}>
                          {profileSpecializations.map(
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
                      ) : (
                        <Text>Не указано</Text>
                      )}
                    </div>
                    <div className={styles.expertInfoRow}>
                      <Text type="secondary">Портфолио</Text>
                      {userData.portfolio_url ? (
                        <Button
                          type="link"
                          href={userData.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Посмотреть портфолио
                        </Button>
                      ) : (
                        <Text>Не указано</Text>
                      )}
                    </div>
                  </div>
                </SurfaceCard>
              )}
            </div>

            
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
