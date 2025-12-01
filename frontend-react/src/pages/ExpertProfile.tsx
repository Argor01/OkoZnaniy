import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Tag, Spin, Alert, Button, Rate, Divider } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { expertsApi, type ExpertStatistics } from '../api/experts';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

// Тестовые данные для демонстрации
const mockExpertData = {
  id: 1,
  username: 'expert_ivanov',
  email: 'ivanov@example.com',
  first_name: 'Иван',
  last_name: 'Иванов',
  role: 'expert',
  phone: '+7 (999) 123-45-67',
  avatar: undefined,
  bio: 'Опытный преподаватель математики и физики с 10-летним стажем. Помогаю студентам разобраться в сложных темах и успешно сдать экзамены. Индивидуальный подход к каждому ученику.',
  experience_years: 10,
  hourly_rate: 1500,
  education: 'МГУ им. М.В. Ломоносова, факультет вычислительной математики и кибернетики, магистр математики (2013). Аспирантура по специальности "Математическое моделирование" (2016).',
  skills: 'Высшая математика, Линейная алгебра, Математический анализ, Теория вероятностей, Физика, Python, MATLAB',
  portfolio_url: 'https://github.com/expert_ivanov',
  is_verified: true,
  date_joined: '2023-01-15T10:00:00Z'
};

const mockReviews = [
  {
    id: 1,
    client_name: 'Мария Петрова',
    rating: 5,
    comment: 'Отличный эксперт! Помог разобраться с высшей математикой. Все объяснил понятно и доступно. Работа выполнена качественно и в срок. Рекомендую!',
    order_title: 'Решение задач по высшей математике',
    created_at: '2024-11-10T14:30:00Z'
  },
  {
    id: 2,
    client_name: 'Алексей Смирнов',
    rating: 5,
    comment: 'Профессионал своего дела. Быстро и качественно выполнил курсовую работу по физике. Все требования были учтены. Спасибо!',
    order_title: 'Курсовая работа по физике',
    created_at: '2024-11-05T16:20:00Z'
  },
  {
    id: 3,
    client_name: 'Елена Козлова',
    rating: 4,
    comment: 'Хороший эксперт, но немного задержал сдачу работы. В остальном все отлично, работа выполнена качественно.',
    order_title: 'Лабораторная работа по математическому анализу',
    created_at: '2024-10-28T11:15:00Z'
  },
  {
    id: 4,
    client_name: 'Дмитрий Волков',
    rating: 5,
    comment: 'Очень доволен работой! Эксперт помог с подготовкой к экзамену по теории вероятностей. Все понятно объяснил, дал дополнительные материалы.',
    order_title: 'Подготовка к экзамену по теории вероятностей',
    created_at: '2024-10-20T09:45:00Z'
  },
  {
    id: 5,
    client_name: 'Анна Сидорова',
    rating: 5,
    comment: 'Отличная работа! Быстро, качественно, профессионально. Буду обращаться еще!',
    order_title: 'Контрольная работа по линейной алгебре',
    created_at: '2024-10-15T13:00:00Z'
  }
];

const mockStatsData: ExpertStatistics = {
  id: 1,
  expert: 1,
  total_orders: 156,
  completed_orders: 142,
  average_rating: 4.8,
  success_rate: 0.91,
  total_earnings: 234500,
  response_time_avg: 120, // в минутах
  last_updated: new Date().toISOString()
};

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

  React.useEffect(() => {
    // Используем данные с API или моковые данные для демонстрации
    if (expertData) {
      setExpert(expertData);
    } else if (!expertLoading && !expertData) {
      // Если API не вернул данные, используем моковые
      setExpert(mockExpertData);
    }
    
    if (statsData) {
      setExpertStats(statsData);
    } else if (!statsLoading && !statsData) {
      // Если API не вернул статистику, используем моковую
      setExpertStats(mockStatsData);
    }
  }, [expertData, statsData, expertLoading, statsLoading]);

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
                  <Text strong>{expertStats.total_earnings} ₽</Text>
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
      <Card title={`Отзывы (${mockReviews.length})`} style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mockReviews.map((review) => (
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
                  <Text strong style={{ fontSize: 15 }}>{review.client_name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {review.order_title}
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
                {review.comment}
              </Paragraph>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ExpertProfile;
