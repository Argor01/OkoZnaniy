import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Rate } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, StarOutlined, ShoppingCartOutlined, EyeOutlined } from '@ant-design/icons';
import { shopApi } from '../api/shop';
import { authApi } from '../api/auth';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;

const ShopWorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: works } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  // Находим работу по ID
  const work = React.useMemo(() => {
    if (!works || !workId) return null;
    return works.find((w: any) => w.id === Number(workId));
  }, [works, workId]);

  const purchaseMutation = useMutation({
    mutationFn: (workId: number) => {
      // TODO: Реализовать API для покупки
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      message.success('Работа успешно куплена!');
      queryClient.invalidateQueries({ queryKey: ['purchased-works'] });
      navigate('/shop/purchased');
    },
    onError: () => {
      message.error('Ошибка при покупке работы');
    },
  });

  if (!works) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!work) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Title level={3}>Работа не найдена</Title>
        <Button type="primary" onClick={() => navigate('/shop/ready-works')}>
          Вернуться к магазину
        </Button>
      </div>
    );
  }

  const handlePurchase = () => {
    purchaseMutation.mutate(work.id);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: isMobile ? '16px' : '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </Button>

        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Заголовок и превью */}
            <div>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{work.title}</Title>
                <Tag color="blue" style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? '2px 8px' : '4px 12px' }}>
                  {work.category}
                </Tag>
              </Space>
            </div>

            {/* Превью изображение */}
            {work.preview && (
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={work.preview} 
                  alt={work.title}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300, 
                    borderRadius: 8,
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}

            {/* Основная информация */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: 16 
            }}>
              {/* Автор */}
              <Card 
                size="small" 
                style={{ 
                  background: '#f9f0ff', 
                  border: '1px solid #efdbff',
                  borderRadius: 12
                }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Автор
                  </Text>
                  <Space align="center">
                    <Avatar 
                      size={32} 
                      src={work.author?.avatar} 
                      icon={<UserOutlined />}
                      style={{ border: '2px solid #d3adf7' }}
                    />
                    <Text style={{ 
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#722ed1'
                    }}>
                      {work.author?.name || work.author?.username || 'Автор'}
                    </Text>
                  </Space>
                </Space>
              </Card>

              {/* Просмотры */}
              <Card 
                size="small" 
                style={{ 
                  background: '#f6f6f6', 
                  border: '1px solid #d9d9d9',
                  borderRadius: 12,
                  padding: '8px 12px'
                }}
                bodyStyle={{ padding: '8px 0' }}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Просмотры
                  </Text>
                  <Space align="center">
                    <EyeOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#595959' }}>
                      {work.viewsCount || 0}
                    </Text>
                  </Space>
                </Space>
              </Card>

              {/* Предмет */}
              <Card 
                size="small" 
                style={{ 
                  background: '#f8f9ff', 
                  border: '1px solid #e6f0ff',
                  borderRadius: 12
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Предмет
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                    {work.subject || 'Не указан'}
                  </Text>
                </Space>
              </Card>

              {/* Цена */}
              <Card 
                size="small" 
                style={{ 
                  background: '#f0f9f0', 
                  border: '1px solid #d9f7be',
                  borderRadius: 12
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Цена
                  </Text>
                  <Space align="center">
                    <DollarOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    <Space direction="vertical" size={0}>
                      {work.discount && work.originalPrice && (
                        <Text delete type="secondary" style={{ fontSize: 12 }}>
                          {work.originalPrice} ₽
                        </Text>
                      )}
                      <Text style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>
                        {work.price} ₽
                      </Text>
                    </Space>
                    {work.discount && (
                      <Tag color="red" style={{ marginLeft: 8 }}>
                        -{work.discount}%
                      </Tag>
                    )}
                  </Space>
                </Space>
              </Card>

              {/* Рейтинг */}
              <Card 
                size="small" 
                style={{ 
                  background: '#fff7e6', 
                  border: '1px solid #ffd591',
                  borderRadius: 12
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Рейтинг
                  </Text>
                  <Space align="center">
                    <StarOutlined style={{ color: '#faad14', fontSize: 16 }} />
                    <Rate disabled value={work.rating} style={{ fontSize: 14 }} />
                    <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
                      ({work.reviewsCount || 0})
                    </Text>
                  </Space>
                </Space>
              </Card>

              {/* Дата создания */}
              <Card 
                size="small" 
                style={{ 
                  background: '#f6f6f6', 
                  border: '1px solid #d9d9d9',
                  borderRadius: 12
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Создана
                  </Text>
                  <Space align="center">
                    <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#595959' }}>
                      {work.createdAt ? formatDistanceToNow(new Date(work.createdAt), { addSuffix: true, locale: ru }) : 'Недавно'}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </div>

            {/* Описание */}
            <div>
              <Title level={4}>Описание работы</Title>
              <div 
                style={{ 
                  background: '#fafafa', 
                  padding: 16, 
                  borderRadius: 8,
                  border: '1px solid #f0f0f0'
                }}
                dangerouslySetInnerHTML={{ __html: work.description || 'Описание отсутствует' }}
              />
            </div>

            {/* Кнопка покупки */}
            {userProfile?.id !== work.author?.id && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ShoppingCartOutlined />}
                  onClick={handlePurchase}
                  loading={purchaseMutation.isPending}
                  style={{ 
                    minWidth: isMobile ? '100%' : 200,
                    height: 48,
                    fontSize: 16
                  }}
                >
                  Купить за {work.price} ₽
                </Button>
              </div>
            )}

            {userProfile?.id === work.author?.id && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Tag color="blue" style={{ fontSize: 14, padding: '8px 16px' }}>
                  Это ваша работа
                </Tag>
              </div>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ShopWorkDetail;