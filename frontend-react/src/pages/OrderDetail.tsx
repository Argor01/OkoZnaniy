import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Descriptions, List, Divider, Empty, Badge, Tabs, Rate } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, CheckCircleOutlined, MessageOutlined, StarOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { ordersApi, Bid } from '../api/orders';
import { chatApi } from '../api/chat';
import { authApi } from '../api/auth';
import BidModal from './OrdersFeed/BidModal';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('active');
  const [bidModalVisible, setBidModalVisible] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

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

  const userHasBid = React.useMemo(() => {
    return Array.isArray(bids) && bids.some((bid: Bid) => bid.expert.id === userProfile?.id);
  }, [bids, userProfile]);

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

  const rejectBidMutation = useMutation({
    mutationFn: ({ orderId, bidId }: { orderId: number; bidId: number }) => 
      ordersApi.rejectBid(orderId, bidId),
    onSuccess: () => {
      message.success('Отклик отклонен');
      queryClient.invalidateQueries({ queryKey: ['order-bids', orderId] });
    },
    onError: () => {
      message.error('Не удалось отклонить отклик');
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
                      src={order.client?.avatar} 
                      icon={<UserOutlined />}
                      style={{ border: '2px solid #d3adf7' }}
                    />
                    <Button 
                      type="link" 
                      onClick={() => navigate(`/expert/${order.client?.id}`)}
                      style={{ 
                        padding: 0, 
                        height: 'auto',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#722ed1'
                      }}
                    >
                      {order.client?.username || order.client_name || 'Неизвестен'}
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
                      {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
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
                    {order.subject?.name || 'Не указан'}
                  </Text>
                </Space>
              </Card>

              {/* Бюджет */}
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
                    <Text style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>
                      {order.budget} ₽
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
                    {order.work_type?.name || 'Не указан'}
                  </Text>
                </Space>
              </Card>

              {/* Создан */}
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
                    Размещен
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: '#595959' }}>
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ru })}
                  </Text>
                </Space>
              </Card>
            </div>

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

            {/* Кнопка отклика для эксперта */}
            {userProfile?.role === 'expert' && !order.expert && !userHasBid && (
                <div style={{ marginTop: 24 }}>
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={() => setBidModalVisible(true)}
                        style={{ width: isMobile ? '100%' : 'auto' }}
                    >
                        Откликнуться на заказ
                    </Button>
                </div>
            )}
            
            {userHasBid && (
                 <div style={{ marginTop: 24 }}>
                    <Tag color="success" style={{ fontSize: 16, padding: '8px 16px' }}>
                        Вы уже откликнулись на этот заказ
                    </Tag>
                </div>
            )}

            {/* Отклики экспертов */}
            {Array.isArray(bids) && bids.length > 0 && (
              <div>
                <Divider />
                <Title level={4}>
                  <Badge count={bids.length} style={{ backgroundColor: '#52c41a' }}>
                    <span style={{ marginRight: 8 }}>Отклики экспертов</span>
                  </Badge>
                </Title>

                <Tabs 
                  activeKey={activeTab} 
                  onChange={setActiveTab}
                  items={[
                    { key: 'active', label: 'Активные' },
                    { key: 'rejected', label: 'Отклоненные' },
                    { key: 'cancelled', label: 'Отмененные' },
                  ]}
                  style={{ marginBottom: 16 }}
                />

                {bidsLoading ? (
                  <Spin />
                ) : (
                  <List
                    dataSource={Array.isArray(bids) ? bids.filter((bid: Bid) => (bid.status || 'active') === activeTab) : []}
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
                            </Button>,
                            activeTab === 'active' && (
                              <Button
                                danger
                                size={isMobile ? 'small' : 'middle'}
                                icon={<CloseCircleOutlined />}
                                onClick={() => rejectBidMutation.mutate({ orderId: order.id, bidId: bid.id })}
                                loading={rejectBidMutation.isPending}
                              >
                                Отклонить
                              </Button>
                            )
                          ].filter(Boolean)
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
                              <Space>
                                <Button 
                                  type="link" 
                                  onClick={() => navigate(`/expert/${bid.expert.id}`)}
                                  style={{ padding: 0, height: 'auto', fontSize: isMobile ? 14 : 16 }}
                                >
                                  <Text strong>{bid.expert.username}</Text>
                                </Button>
                                <Space size={4}>
                                    <StarOutlined style={{ color: '#faad14' }} />
                                    <Text>{bid.expert_rating || 0}</Text>
                                </Space>
                              </Space>
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
      
      <BidModal
         visible={bidModalVisible}
         onClose={() => setBidModalVisible(false)}
         orderId={order.id}
         orderTitle={order.title}
         orderBudget={order.budget ? Number(order.budget) : undefined}
         onOpenChat={(chatId) => navigate(`/messages?chat=${chatId}`)}
       />
    </div>
  );
};

export default OrderDetail;
