import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Descriptions, List, Divider, Empty, Badge, Rate } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, CheckCircleOutlined, MessageOutlined, StarOutlined } from '@ant-design/icons';
import { ordersApi, Bid, Order } from '../api/orders';
import { authApi } from '../api/auth';
import BidModal from './OrdersFeed/BidModal';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useDashboard } from '../contexts/DashboardContext';
import { formatCurrency } from '../utils/formatters';

const ALLOWED_FORMATS_TEXT = 'Текстовые документы: .doc, .docx, .pdf, .rtf, .txt\nПрезентации: .ppt, .pptx, .pdf\nТаблицы: .xls, .xlsx, .csv\nЧертежи и работы: .dwg, .dxf, .cdr, .cdw, .bak, .pdf\nГрафика/изображения: .jpg, .png, .bmp, .svg';

const { Title, Text, Paragraph } = Typography;

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const dashboard = useDashboard();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [bidModalVisible, setBidModalVisible] = useState(false);

  const removeOrderFromCaches = React.useCallback((id: number) => {
    const filterOut = (data: any) => {
      if (!data) return data;
      if (Array.isArray(data)) return data.filter((o) => o?.id !== id);
      if (Array.isArray(data.results)) return { ...data, results: data.results.filter((o: any) => o?.id !== id) };
      return data;
    };

    queryClient.setQueryData(['orders-feed'], filterOut);
    queryClient.setQueryData(['available-orders'], filterOut);
    queryClient.setQueryData(['user-orders'], filterOut);
  }, [queryClient]);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: order, isLoading, error: orderError } = useQuery<Order, any>({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(Number(orderId)),
    enabled: !!orderId,
    retry: (failureCount: number, error: any) => {
      const status = error?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  React.useEffect(() => {
    const status = orderError?.response?.status;
    if (status === 404 && orderId) {
      const idNum = Number(orderId);
      if (!Number.isNaN(idNum)) {
        removeOrderFromCaches(idNum);
      }
      message.warning('Заказ был удалён и больше недоступен');
      navigate('/orders-feed');
    }
  }, [orderError, orderId, navigate, removeOrderFromCaches]);

  const { data: bids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ['order-bids', orderId],
    queryFn: () => ordersApi.getBids(Number(orderId)),
    enabled: !!orderId,
  });

  const userHasBid = React.useMemo(() => {
    return Array.isArray(bids) && bids.some((bid: Bid) => bid.expert.id === userProfile?.id);
  }, [bids, userProfile]);

  const handleDownloadFile = React.useCallback(async (file: any) => {
    try {
      const orderIdNum = Number(orderId);
      const fileIdNum = Number(file?.id);
      const filename = file?.filename || file?.file_name || 'file';

      if (!orderIdNum || Number.isNaN(orderIdNum) || !fileIdNum || Number.isNaN(fileIdNum)) {
        const url = file?.view_url || file?.file_url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
        message.error('Не удалось скачать файл');
        return;
      }

      const blob = await (ordersApi as any).downloadOrderFile(orderIdNum, fileIdNum);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        message.error('Не авторизовано для скачивания файла');
      } else {
        message.error('Ошибка при скачивании файла');
      }
    }
  }, [orderId]);

  

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

  const isOrderOwner = order.client?.id === userProfile?.id;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: isMobile ? '16px' : '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => {
            const from = (location.state as any)?.from;
            if (typeof from === 'string' && from.length > 0) {
              navigate(from);
              return;
            }
            navigate(-1);
          }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Заказчик - большая плашка на всю ширину */}
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
                  <Text type="secondary" style={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}>
                    ЗАКАЗЧИК
                  </Text>
                  <Space align="center" size={16}>
                    <Avatar 
                      size={48} 
                      src={order.client?.avatar} 
                      icon={<UserOutlined />}
                      style={{ 
                        border: '3px solid #722ed1',
                        boxShadow: '0 2px 8px rgba(114, 46, 209, 0.2)'
                      }}
                    />
                    <div>
                      <Button 
                        type="link" 
                        onClick={() => navigate(`/user/${order.client?.id}`)}
                        style={{ 
                          padding: 0, 
                          height: 'auto',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#722ed1'
                        }}
                      >
                        {order.client?.username || order.client_name || 'Неизвестен'}
                      </Button>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        Нажмите, чтобы посмотреть профиль
                      </div>
                    </div>
                  </Space>
                </Space>
              </Card>

              {/* Остальные плашки в сетке */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16 
              }}>
                {/* Дедлайн */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                  styles={{ body: { padding: '12px 16px' } }}
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
                    borderRadius: 12
                  }}
                  styles={{ body: { padding: '12px 16px' } }}
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
                    borderRadius: 12
                  }}
                  styles={{ body: { padding: '12px 16px' } }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Цена
                    </Text>
                    <Space align="center">
                      <DollarOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                      <Text style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>
                        {formatCurrency(order.budget)}
                      </Text>
                    </Space>
                  </Space>
                </Card>

                {/* Тип работы */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                  styles={{ body: { padding: '12px 16px' } }}
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
                    borderRadius: 12
                  }}
                  styles={{ body: { padding: '12px 16px' } }}
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
                      key={file.id ?? index}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownloadFile(file);
                      }}
                    >
                      {file.filename || `Файл ${index + 1}`}
                    </a>
                  ))}
                </Space>
              </div>
            )}

            <Card title="Допустимые форматы файлов" style={{ borderRadius: 12 }}>
              <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>
                {ALLOWED_FORMATS_TEXT}
              </Paragraph>
            </Card>

            {/* Кнопка отклика для эксперта */}
            {userProfile?.role === 'expert' && 
             !order.expert && 
             !userHasBid && 
             order.client?.id !== userProfile?.id && (
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
            
            {/* Сообщение для автора заказа */}
            {order.client?.id === userProfile?.id && (
                <div style={{ marginTop: 24 }}>
                    <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                        Это ваш заказ
                    </Tag>
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
            {isOrderOwner && Array.isArray(bids) && (
              <div>
                <Divider />
                <Title level={4}>
                  <Badge
                    count={bids.length}
                    size="small"
                    style={{
                      backgroundColor: '#52c41a',
                      fontSize: 10,
                      height: 16,
                      minWidth: 16,
                      lineHeight: '16px'
                    }}
                  >
                    <span style={{ marginRight: 8 }}>Отклики экспертов</span>
                  </Badge>
                </Title>

                {bidsLoading ? (
                  <Spin />
                ) : bids.length === 0 ? (
                  <Empty description="Пока нет откликов" />
                ) : (
                  <>
                    <List
                      dataSource={Array.isArray(bids) ? bids.filter((bid: Bid) => (bid.status || 'active') === 'active') : []}
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
                            order.expert?.id === bid.expert.id
                              ? [<Tag color="success" icon={<CheckCircleOutlined />}>Выбран</Tag>]
                              : isOrderOwner
                                ? [
                                    <Button
                                      size={isMobile ? 'small' : 'middle'}
                                      icon={<MessageOutlined />}
                                      onClick={async () => {
                                        dashboard.openOrderChat(order.id, bid.expert.id);
                                      }}
                                    >
                                      Написать
                                    </Button>
                                  ]
                                : []
                          }
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar 
                                size={isMobile ? 48 : 64} 
                                src={bid.expert.avatar} 
                                icon={<UserOutlined />}
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/expert/${bid.expert.id}`)}
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
                                    <DollarOutlined /> {formatCurrency(bid.amount)}
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
                  </>
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
