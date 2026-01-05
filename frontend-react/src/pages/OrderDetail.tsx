import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Descriptions, List, Divider, Empty, Badge } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, CheckCircleOutlined, MessageOutlined, StarOutlined } from '@ant-design/icons';
import { ordersApi, Bid } from '../api/orders';
import { chatApi } from '../api/chat';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(Number(orderId)),
    enabled: !!orderId,
  });

  const { data: bids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ['order-bids', orderId],
    queryFn: () => ordersApi.getBids(Number(orderId)),
    enabled: !!orderId,
  });

  const acceptBidMutation = useMutation({
    mutationFn: ({ orderId, bidId }: { orderId: number; bidId: number }) => 
      ordersApi.acceptBid(orderId, bidId),
    onSuccess: () => {
      message.success('Отклик принят! Эксперт назначен на заказ');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-bids', orderId] });
    },
    onError: () => {
      message.error('Не удалось принять отклик');
    },
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
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{order.title}</Title>
                <Tag color={getStatusColor(order.status)} style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? '2px 8px' : '4px 12px' }}>
                  {getStatusText(order.status)}
                </Tag>
              </Space>
            </div>

            {/* Основная информация */}
            <Descriptions bordered column={isMobile ? 1 : 2} size={isMobile ? 'small' : 'default'}>
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

            {/* Отклики экспертов */}
            {bids.length > 0 && (
              <div>
                <Divider />
                <Title level={4}>
                  <Badge count={bids.length} style={{ backgroundColor: '#52c41a' }}>
                    <span style={{ marginRight: 8 }}>Отклики экспертов</span>
                  </Badge>
                </Title>
                {bidsLoading ? (
                  <Spin />
                ) : (
                  <List
                    dataSource={bids}
                    renderItem={(bid: Bid) => (
                      <List.Item
                        key={bid.id}
                        style={{
                          background: order.expert?.id === bid.expert.id ? '#f6ffed' : '#fff',
                          border: order.expert?.id === bid.expert.id ? '2px solid #52c41a' : '1px solid #f0f0f0',
                          borderRadius: 8,
                          padding: isMobile ? 12 : 16,
                          marginBottom: 12
                        }}
                        actions={
                          order.expert?.id === bid.expert.id ? [
                            <Tag color="success" icon={<CheckCircleOutlined />}>Выбран</Tag>
                          ] : order.expert ? [] : [
                            <Button
                              type="primary"
                              size={isMobile ? 'small' : 'middle'}
                              onClick={() => acceptBidMutation.mutate({ orderId: order.id, bidId: bid.id })}
                              loading={acceptBidMutation.isPending}
                            >
                              Принять
                            </Button>,
                            <Button
                              size={isMobile ? 'small' : 'middle'}
                              icon={<MessageOutlined />}
                              onClick={async () => {
                                try {
                                  const chat = await chatApi.getOrCreateByOrder(order.id);
                                  navigate(`/messages?chat=${chat.id}`);
                                } catch (error) {
                                  message.error('Не удалось открыть чат');
                                }
                              }}
                            >
                              Написать
                            </Button>
                          ]
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              size={isMobile ? 48 : 64} 
                              src={bid.expert.avatar} 
                              icon={<UserOutlined />}
                            />
                          }
                          title={
                            <Space direction="vertical" size={4}>
                              <Button 
                                type="link" 
                                onClick={() => navigate(`/expert/${bid.expert.id}`)}
                                style={{ padding: 0, height: 'auto', fontSize: isMobile ? 14 : 16 }}
                              >
                                <Text strong>{bid.expert.username}</Text>
                              </Button>
                              {bid.expert.bio && (
                                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
                                  {bid.expert.bio}
                                </Text>
                              )}
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                              <Space wrap>
                                <Tag color="blue" style={{ fontSize: isMobile ? 11 : 13 }}>
                                  <DollarOutlined /> {bid.amount} ₽
                                </Tag>
                                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                                  {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: ru })}
                                </Text>
                              </Space>
                              {bid.comment && (
                                <Paragraph 
                                  style={{ 
                                    margin: 0, 
                                    fontSize: isMobile ? 12 : 14,
                                    whiteSpace: 'pre-wrap' 
                                  }}
                                >
                                  {bid.comment}
                                </Paragraph>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </div>
            )}

            {/* Эксперт (если назначен) */}
            {order.expert && (
              <div>
                <Divider />
                <Title level={4}>Исполнитель</Title>
                <Space>
                  <Avatar 
                    size={isMobile ? 48 : 64} 
                    src={order.expert.avatar} 
                    icon={<UserOutlined />}
                  />
                  <div>
                    <Button 
                      type="link" 
                      onClick={() => navigate(`/expert/${order.expert.id}`)}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>{order.expert.username}</Text>
                    </Button>
                    <br />
                    <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Эксперт</Text>
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
