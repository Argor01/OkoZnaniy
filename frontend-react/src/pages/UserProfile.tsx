import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Spin, Alert, Button, Rate, Tag, Space } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { expertsApi } from '../api/experts';
import { apiClient } from '../api/client';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const UserProfile: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Загружаем данные пользователя
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${userId}/`);
      return response.data;
    },
    enabled: !!userId,
  });

  // Загружаем статистику заказов пользователя
  const { data: ordersStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-orders-stats', userId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/orders/orders/?client=${userId}`);
        const orders = response.data as { results?: Array<{ status?: string }> };
        const total = orders.results?.length || 0;
        const completed = orders.results?.filter((order) => order.status === 'completed').length || 0;
        const success_rate = total > 0 ? (completed / total) * 100 : 0;
        return { total, completed, success_rate };
      } catch (_error: unknown) {
        return { total: 0, completed: 0, success_rate: 0 };
      }
    },
    enabled: !!userId,
  });

  // Загружаем статистику эксперта (если это эксперт)
  const { data: expertStats, isLoading: expertStatsLoading } = useQuery({
    queryKey: ['expert-stats', userId],
    queryFn: () => expertsApi.getExpertStatistics(Number(userId)),
    enabled: !!userId && userData?.role === 'expert',
  });

  // Загружаем отзывы эксперта (если это эксперт)
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['expert-reviews', userId],
    queryFn: () => expertsApi.getReviews(Number(userId)),
    enabled: !!userId && userData?.role === 'expert',
  });

  if (userLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div style={{ padding: '24px' }}>
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Кнопка назад */}
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
          size="large"
        >
          Назад
        </Button>

        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Основная информация о пользователе */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Аватар и ник - большая плашка на всю ширину */}
              <Card 
                style={{ 
                  background: 'linear-gradient(135deg, #f9f0ff 0%, #f0e6ff 100%)', 
                  border: '2px solid #d3adf7',
                  borderRadius: 16,
                  boxShadow: '0 4px 12px rgba(114, 46, 209, 0.15)',
                  padding: '8px 16px'
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}>
                      ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
                    </Text>
                    <Tag 
                      style={{ 
                        fontSize: 11, 
                        padding: '2px 8px',
                        backgroundColor: 'rgba(114, 46, 209, 0.1)',
                        color: '#722ed1',
                        border: '1px solid rgba(114, 46, 209, 0.2)',
                        borderRadius: 12
                      }}
                    >
                      {userData.role === 'client' ? 'Заказчик' : userData.role === 'expert' ? 'Эксперт' : 'Пользователь'}
                    </Tag>
                  </div>
                  <Space align="center" size={20}>
                    {userData.avatar ? (
                      <img 
                        src={userData.avatar.startsWith('http') ? userData.avatar : `http://localhost:8000${userData.avatar}`}
                        alt="Аватар" 
                        style={{ 
                          width: 72, 
                          height: 72, 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '3px solid #722ed1',
                          boxShadow: '0 2px 8px rgba(114, 46, 209, 0.2)'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="avatar-fallback"
                      style={{ 
                        width: 72, 
                        height: 72, 
                        borderRadius: '50%', 
                        backgroundColor: 'white',
                        display: userData.avatar ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        color: '#722ed1',
                        border: '3px solid #722ed1',
                        boxShadow: '0 2px 8px rgba(114, 46, 209, 0.2)'
                      }}
                    >
                      <UserOutlined />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 20, fontWeight: 700, color: '#722ed1', margin: 0 }}>
                          {userData.first_name && userData.last_name 
                            ? `${userData.first_name} ${userData.last_name}`
                            : userData.username
                          }
                        </Text>
                        {userData.is_verified && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
                      </div>
                      <Text style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 6 }}>@{userData.username}</Text>
                    </div>
                  </Space>
                </Space>
              </Card>

              {/* Рейтинг и статистика - блок на всю ширину */}
              <Card 
                title={
                  <Text style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
                    РЕЙТИНГ И СТАТИСТИКА
                  </Text>
                }
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
              >
                {(statsLoading || expertStatsLoading) ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : userData.role === 'expert' && expertStats ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 24 
                  }}>
                    {/* Рейтинг */}
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: 48, fontWeight: 600, color: '#faad14', marginBottom: 8 }}>
                        {expertStats.average_rating ? Number(expertStats.average_rating).toFixed(1) : 'Н/Д'}
                      </div>
                      <Rate disabled value={Number(expertStats.average_rating) || 0} style={{ fontSize: 20, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, color: '#666' }}>
                        Средний рейтинг
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        на основе {expertStats.completed_orders} заказов
                      </div>
                    </div>

                    {/* Статистика заказов */}
                    <div style={{ padding: '16px' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 32, fontWeight: 600, color: '#1890ff' }}>
                          {expertStats.total_orders}
                        </div>
                        <div style={{ fontSize: 14, color: '#666' }}>Всего заказов</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Завершено:</Text>
                        <Text strong style={{ color: '#52c41a' }}>{expertStats.completed_orders}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Успешность:</Text>
                        <Text strong style={{ color: '#52c41a' }}>{(expertStats.success_rate * 100).toFixed(1)}%</Text>
                      </div>
                    </div>

                    {/* Заработок */}
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: 32, fontWeight: 600, color: '#52c41a', marginBottom: 8 }}>
                        {expertStats.total_earnings?.toLocaleString('ru-RU', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })} ₽
                      </div>
                      <div style={{ fontSize: 14, color: '#666' }}>
                        Общий заработок
                      </div>
                    </div>
                  </div>
                ) : ordersStats ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 24 
                  }}>
                    {/* Успешность */}
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: 48, fontWeight: 600, color: '#1890ff', marginBottom: 8 }}>
                        {ordersStats.success_rate.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 14, color: '#666' }}>
                        Успешность заказов
                      </div>
                    </div>

                    {/* Статистика заказов */}
                    <div style={{ padding: '16px' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 32, fontWeight: 600, color: '#1890ff' }}>
                          {ordersStats.total}
                        </div>
                        <div style={{ fontSize: 14, color: '#666' }}>Всего заказов</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Завершено:</Text>
                        <Text strong style={{ color: '#52c41a' }}>{ordersStats.completed}</Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Text type="secondary" style={{ fontSize: 16 }}>Статистика недоступна</Text>
                  </div>
                )}
              </Card>
            </div>

            {/* Описание и дополнительная информация */}
            <div>
              {/* О себе */}
              {userData.bio && (
                <Card 
                  title="О себе" 
                  style={{ 
                    marginBottom: 16,
                    borderRadius: 12
                  }}
                >
                  <Paragraph>{userData.bio}</Paragraph>
                </Card>
              )}

              {/* Образование (для экспертов) */}
              {userData.role === 'expert' && userData.education && (
                <Card 
                  title="Образование" 
                  style={{ 
                    marginBottom: 16,
                    borderRadius: 12
                  }}
                >
                  <Paragraph>{userData.education}</Paragraph>
                </Card>
              )}

              {/* Навыки (для экспертов) */}
              {userData.role === 'expert' && userData.skills && (
                <Card 
                  title="Навыки" 
                  style={{ 
                    marginBottom: 16,
                    borderRadius: 12
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {userData.skills.split(',').map((skill: string, index: number) => (
                      <Tag key={index} color="green">
                        {skill.trim()}
                      </Tag>
                    ))}
                  </div>
                </Card>
              )}

              {/* Портфолио (для экспертов) */}
              {userData.role === 'expert' && userData.portfolio_url && (
                <Card 
                  title="Портфолио" 
                  style={{ 
                    marginBottom: 16,
                    borderRadius: 12
                  }}
                >
                  <Button 
                    type="link" 
                    href={userData.portfolio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Посмотреть портфолио
                  </Button>
                </Card>
              )}
            </div>

            {/* Блок специализации */}
            {userData.role === 'expert' && userData.specializations && Array.isArray(userData.specializations) && userData.specializations.length > 0 && (
              <Card 
                title="Специализации" 
                style={{ 
                  borderRadius: 12
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {userData.specializations.map(
                    (spec: { custom_name?: string; subject?: { name?: string } }, index: number) => (
                    <Tag key={index} color="blue">
                      {spec?.custom_name || spec?.subject?.name || 'Специализация не указана'}
                    </Tag>
                  ))}
                </div>
              </Card>
            )}

            {/* Отзывы (только для экспертов) */}
            {userData.role === 'expert' && (
              <Card 
                title={`Отзывы (${reviews.length})`} 
                style={{ 
                  borderRadius: 12
                }}
              >
                {reviewsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin />
                  </div>
                ) : reviews.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    Нет отзывов
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {reviews.map((review: {
                      id: number;
                      rating?: number;
                      created_at?: string;
                      text?: string;
                      comment?: string;
                      order?: { title?: string | null } | null;
                      order_title?: string | null;
                      client?: { first_name?: string; last_name?: string } | null;
                    }) => (
                      <div 
                        key={review.id}
                        style={{
                          padding: 16,
                          background: '#fafafa',
                          borderRadius: 8,
                          border: '1px solid #f0f0f0'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <Text strong style={{ fontSize: 15 }}>{review.client?.first_name} {review.client?.last_name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {review.order?.title || review.order_title}
                            </Text>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(review.created_at).format('DD.MM.YYYY')}
                            </Text>
                          </div>
                        </div>
                        <Paragraph style={{ margin: 0, fontSize: 14 }}>
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
