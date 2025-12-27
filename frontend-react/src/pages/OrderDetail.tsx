import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Descriptions } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { ordersApi } from '../api/orders';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(Number(orderId)),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Title level={3}>Заказ не найден</Title>
        <Button type="primary" onClick={() => navigate('/orders')}>
          Вернуться к заказам
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
      new: 'Новый',
      in_progress: 'В работе',
      review: 'На проверке',
      revision: 'Доработка',
      completed: 'Завершен',
      cancelled: 'Отменен',
    };
    return texts[status] || status;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
        >
          Назад
        </Button>

        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Заголовок и статус */}
            <div>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Title level={2} style={{ margin: 0 }}>{order.title}</Title>
                <Tag color={getStatusColor(order.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {getStatusText(order.status)}
                </Tag>
              </Space>
            </div>

            {/* Основная информация */}
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Предмет">
                {order.subject_name || 'Не указан'}
              </Descriptions.Item>
              <Descriptions.Item label="Тип работы">
                {order.work_type_name || 'Не указан'}
              </Descriptions.Item>
              <Descriptions.Item label="Бюджет">
                <Space>
                  <DollarOutlined />
                  <Text strong>{order.budget} ₽</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Дедлайн">
                <Space>
                  <CalendarOutlined />
                  {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Создан">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ru })}
              </Descriptions.Item>
              <Descriptions.Item label="Заказчик">
                <Space>
                  <Avatar 
                    size="small" 
                    src={order.client?.avatar} 
                    icon={<UserOutlined />}
                  />
                  <Button 
                    type="link" 
                    onClick={() => navigate(`/expert/${order.client?.id}`)}
                    style={{ padding: 0 }}
                  >
                    {order.client?.username || order.client_name || 'Неизвестен'}
                  </Button>
                </Space>
              </Descriptions.Item>
            </Descriptions>

            {/* Описание */}
            <div>
              <Title level={4}>Описание заказа</Title>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {order.description || 'Описание отсутствует'}
              </Paragraph>
            </div>

            {/* Файлы */}
            {order.files && order.files.length > 0 && (
              <div>
                <Title level={4}>Прикрепленные файлы</Title>
                <Space direction="vertical">
                  {order.files.map((file: any, index: number) => (
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

            {/* Эксперт (если назначен) */}
            {order.expert && (
              <div>
                <Title level={4}>Исполнитель</Title>
                <Space>
                  <Avatar 
                    size={48} 
                    src={order.expert.avatar} 
                    icon={<UserOutlined />}
                  />
                  <div>
                    <Button 
                      type="link" 
                      onClick={() => navigate(`/expert/${order.expert.id}`)}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      <Text strong>{order.expert.username}</Text>
                    </Button>
                    <br />
                    <Text type="secondary">Эксперт</Text>
                  </div>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default OrderDetail;
