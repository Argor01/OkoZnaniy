import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Tag, Spin, Alert, Button, Rate, Divider, Avatar } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { expertsApi, type ExpertStatistics, type ExpertReview } from '../api/experts';
import dayjs from 'dayjs';
import { getMediaUrl } from '../config/api';

const { Title, Text, Paragraph } = Typography;

// Тестовые данные для демонстрации удалены

const ExpertProfile: React.FC = () => {
  const { expertId } = useParams<{ expertId: string }>();
  const navigate = useNavigate();
  const [expertStats, setExpertStats] = React.useState<ExpertStatistics | null>(null);
  const [expert, setExpert] = React.useState<any>(null);

  // Загружаем данные эксперта
  const { data: expertData, isLoading: expertLoading, error: expertError } = useQuery({
    queryKey: ['expert', expertId],
    queryFn: async () => {
      // Получаем данные эксперта через API пользователей
      const response = await fetch(`http://localhost:8000/api/users/${expertId}/`);
      if (!response.ok) throw new Error('Эксперт не найден');
      return response.json();
    },
    enabled: !!expertId,
  });

  // Загружаем статистику эксперта
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['expert-stats', expertId],
    queryFn: () => expertsApi.getExpertStatistics(Number(expertId)),
    enabled: !!expertId,
  });

  // Загружаем отзывы эксперта
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
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (expertError || !expert) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Эксперт не найден"
          description="Профиль эксперта не существует или был удален."
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
    <div style={{ maxWidth: 800, margin: '24px auto', padding: '0 24px' }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Назад
        </Button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            {expert.avatar ? (
              <img 
                src={`http://localhost:8000${expert.avatar}`} 
                alt="Аватар" 
                style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '2px solid #f0f0f0'
                }} 
              />
            ) : (
              <div style={{ 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: '#999'
              }}>
                <UserOutlined />
              </div>
            )}
            <div>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {expert.first_name} {expert.last_name}
                {expert.is_verified && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
              </Title>
              <Text type="secondary">@{expert.username}</Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Основная информация */}
        <div>
          {/* О себе */}
          {expert.bio && (
            <Card title="О себе" style={{ marginBottom: 16 }}>
              <Paragraph>{expert.bio}</Paragraph>
            </Card>
          )}

          {/* Образование */}
          {expert.education && (
            <Card title="Образование" style={{ marginBottom: 16 }}>
              <Paragraph>{expert.education}</Paragraph>
            </Card>
          )}

          {/* Навыки */}
          {expert.skills && (
            <Card title="Навыки" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {expert.skills.split(',').map((skill: string, index: number) => (
                  <Tag key={index} color="blue">
                    {skill.trim()}
                  </Tag>
                ))}
              </div>
            </Card>
          )}

          {/* Портфолио */}
          {expert.portfolio_url && (
            <Card title="Портфолио" style={{ marginBottom: 16 }}>
              <Button 
                type="link" 
                href={expert.portfolio_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Посмотреть портфолио
              </Button>
            </Card>
          )}
        </div>

        {/* Боковая панель */}
        <div>
          {/* Рейтинг и статистика */}
          <Card title="Рейтинг и статистика" style={{ marginBottom: 16 }}>
            {statsLoading ? (
              <Spin />
            ) : expertStats ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                    {expertStats.average_rating ? Number(expertStats.average_rating).toFixed(1) : 'Н/Д'}
                  </div>
                  <Rate disabled value={Number(expertStats.average_rating) || 0} style={{ fontSize: 16 }} />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    на основе {expertStats.completed_orders} заказов
                  </div>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Всего заказов:</Text>
                  <Text strong>{expertStats.total_orders}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Завершено:</Text>
                  <Text strong>{expertStats.completed_orders}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Успешность:</Text>
                  <Text strong>{(expertStats.success_rate * 100).toFixed(1)}%</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Заработано:</Text>
                  <Text strong>
                    {expertStats.total_earnings?.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    })} ₽
                  </Text>
                </div>
              </div>
            ) : (
              <Text type="secondary">Статистика недоступна</Text>
            )}
          </Card>

          {/* Контактная информация */}
          <Card title="Контактная информация">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          </Card>

          {/* Дополнительная информация */}
          <Card title="Дополнительно" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          </Card>
        </div>
      </div>

      {/* Отзывы */}
      <Card title={`Отзывы (${reviews.length})`} style={{ marginTop: 24 }}>
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
            {reviews.map((review: ExpertReview) => (
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
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/user/${review.client.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/user/${review.client.id}`);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  >
                    <Avatar
                      size={16}
                      src={getMediaUrl(review.client.avatar)}
                      icon={<UserOutlined style={{ fontSize: 10 }} />}
                    />
                    <div>
                      <Text strong style={{ fontSize: 15, lineHeight: 1.2 }}>
                        @{review.client.username || `user${review.client.id}`}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {review.client.first_name} {review.client.last_name}
                      </Text>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(review.created_at).format('DD.MM.YYYY')}
                    </Text>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  {review.order?.title}
                </Text>
                <Paragraph style={{ margin: 0, fontSize: 14 }}>
                  {review.text || review.comment}
                </Paragraph>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExpertProfile;
