import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, Divider } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, StarOutlined } from '@ant-design/icons';
import { ordersApi } from '../api/orders';
import { authApi } from '../api/auth';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;

const WorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
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

  const { data: work, isLoading } = useQuery({
    queryKey: ['work', workId],
    queryFn: () => ordersApi.getById(Number(workId)),
    enabled: !!workId,
  });

  if (isLoading) {
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
        <Button type="primary" onClick={() => navigate('/works')}>
          Вернуться к работам
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      in_progress: 'orange',
      review: 'purple',
      revision: 'gold',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      new: 'Новая',
      in_progress: 'В работе',
      review: 'На проверке',
      revision: 'Доработка',
      completed: 'Завершена',
      cancelled: 'Отменена',
    };
    return texts[status] || status;
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
            {/* Заголовок и статус */}
            <div>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{work.title}</Title>
                <Tag color={getStatusColor(work.status)} style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? '2px 8px' : '4px 12px' }}>
                  {getStatusText(work.status)}
                </Tag>
              </Space>
            </div>

            {/* Основная информация */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: 16 
            }}>
              {/* Заказчик */}
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
                    Заказчик
                  </Text>
                  <Space align="center">
                    <Avatar 
                      size={32} 
                      src={work.client?.avatar} 
                      icon={<UserOutlined />}
                      style={{ border: '2px solid #d3adf7' }}
                    />
                    <Button 
                      type="link" 
                      onClick={() => navigate(`/expert/${work.client?.id}`)}
                      style={{ 
                        padding: 0, 
                        height: 'auto',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#722ed1'
                      }}
                    >
                      {work.client?.username || work.client_name || 'Неизвестен'}
                    </Button>
                  </Space>
                </Space>
              </Card>

              {/* Дедлайн */}
              <Card 
                size="small" 
                style={{ 
                  background: '#fff7e6', 
                  border: '1px solid #ffd591',
                  borderRadius: 12,
                  padding: '8px 12px'
                }}
                bodyStyle={{ padding: '8px 0' }}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                    Дедлайн
                  </Text>
                  <Space align="center">
                    <CalendarOutlined style={{ color: '#fa8c16', fontSize: 14 }} />
                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#d46b08' }}>
                      {work.deadline ? new Date(work.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
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
                    {work.subject?.name || 'Не указан'}
                  </Text>
                </Space>
              </Card>

              {/* Стоимость */}
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
                    Стоимость
                  </Text>
                  <Space align="center">
                    <DollarOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    <Text style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>
                      {work.budget} ₽
                    </Text>
                  </Space>
                </Space>
              </Card>

              {/* Тип работы */}
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
                    Тип работы
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                    {work.work_type?.name || 'Не указан'}
                  </Text>
                </Space>
              </Card>

              {/* Выполнена */}
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
                    Выполнена
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: '#595959' }}>
                    {formatDistanceToNow(new Date(work.updated_at || work.created_at), { addSuffix: true, locale: ru })}
                  </Text>
                </Space>
              </Card>
            </div>

            {/* Описание */}
            <div>
              <Title level={4}>Описание работы</Title>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {work.description || 'Описание отсутствует'}
              </Paragraph>
            </div>

            {/* Файлы */}
            {work.files && work.files.length > 0 && (
              <div>
                <Title level={4}>Прикрепленные файлы</Title>
                <Space direction="vertical">
                  {work.files.map((file: any, index: number) => (
                    <a 
                      key={index} 
                      href={file.file || file} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Файл {index + 1}
                    </a>
                  ))}
                </Space>
              </div>
            )}

            {/* Рейтинг работы */}
            {work.expert_rating && (
              <div>
                <Divider />
                <Title level={4}>Оценка работы</Title>
                <Space direction="vertical" size={12}>
                  <Space align="center">
                    <StarOutlined style={{ color: '#faad14', fontSize: 18 }} />
                    <Text style={{ fontSize: 16, fontWeight: 600 }}>
                      {work.expert_rating.rating} из 5
                    </Text>
                  </Space>
                  {work.expert_rating.comment && (
                    <Paragraph style={{ 
                      background: '#f9f9f9', 
                      padding: 16, 
                      borderRadius: 8,
                      margin: 0 
                    }}>
                      {work.expert_rating.comment}
                    </Paragraph>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Оценка от {formatDistanceToNow(new Date(work.expert_rating.created_at), { addSuffix: true, locale: ru })}
                  </Text>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default WorkDetail;