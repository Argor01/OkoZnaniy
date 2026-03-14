import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, Space, Tag, Avatar, Spin, message, List, Divider, Empty, Badge } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, CheckCircleOutlined, MessageOutlined, StarOutlined, StarFilled, BookOutlined, FileTextOutlined, ClockCircleOutlined, FileOutlined } from '@ant-design/icons';
import { ordersApi, Bid, Order } from '@/features/orders/api/orders';
import { authApi } from '@/features/auth/api/auth';
import BidModal from '../components/BidModal';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useDashboard } from '@/contexts/DashboardContext';
import { formatCurrency } from '@/utils/formatters';
import styles from './OrderDetail.module.css';
import { ROUTES } from '@/utils/constants';
import { AppButton, AppCard } from '@/components/ui';

const { Title, Text, Paragraph } = Typography;

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const dashboard = useDashboard();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [reviewActionLoading, setReviewActionLoading] = useState<'approve' | 'revision' | 'reject' | null>(null);

  const removeOrderFromCaches = React.useCallback((id: number) => {
    const filterOut = (data: any) => {
      if (!data) return data;
      if (Array.isArray(data)) return data.filter((o: any) => o?.id !== id);
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

  const { data: order, isLoading, error: orderError, refetch: refetchOrder } = useQuery<Order, Error>({
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
    const status = (orderError as any)?.response?.status;
    if (status === 404 && orderId) {
      const idNum = Number(orderId);
      if (!Number.isNaN(idNum)) {
        removeOrderFromCaches(idNum);
      }
      message.warning('Заказ был удалён и больше недоступен');
      navigate(ROUTES.orders.feed);
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
        message.error('Не удалось скачать файл');
        return;
      }

      const blob = await ordersApi.downloadOrderFile(orderIdNum, fileIdNum);
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

  const deliveredWorkFiles = React.useMemo(() => {
    if (!Array.isArray(order?.files)) return [];
    const expertId = Number(order?.expert?.id ?? 0);
    return order.files.filter((file: any) => {
      const fileType = String(file?.file_type || '').toLowerCase();
      const description = String(file?.description || '');
      const uploaderId = Number(file?.uploaded_by?.id ?? 0);

      if (fileType === 'solution') return true;
      if (description.includes('chat_delivery_message_id:')) return true;
      if (expertId > 0 && uploaderId === expertId) return true;
      return false;
    }).sort((a: any, b: any) => {
      const left = new Date(a?.created_at || 0).getTime();
      const right = new Date(b?.created_at || 0).getTime();
      return right - left;
    });
  }, [order?.files, order?.expert?.id]);
  const latestDeliveredWork = deliveredWorkFiles[0] || null;

  const refreshOrderWithLists = React.useCallback(async () => {
    await refetchOrder();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['available-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['user-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
    ]);
  }, [orderId, queryClient, refetchOrder]);

  const handleApproveFromCard = React.useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewActionLoading('approve');
      await ordersApi.approveOrder(Number(orderId));
      await refreshOrderWithLists();
      message.success('Работа принята');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось принять работу');
    } finally {
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleRevisionFromCard = React.useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewActionLoading('revision');
      await ordersApi.requestRevision(Number(orderId));
      await refreshOrderWithLists();
      message.success('Работа отправлена на доработку');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отправить на доработку');
    } finally {
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleRejectFromCard = React.useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewActionLoading('reject');
      await ordersApi.rejectOrder(Number(orderId));
      await refreshOrderWithLists();
      message.success('Работа отклонена');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отклонить работу');
    } finally {
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.notFound}>
        <Title level={3}>Заказ не найден</Title>
        <AppButton variant="primary" onClick={() => navigate('/orders')}>
          Вернуться к заказам
        </AppButton>
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
  const openedFromChat = (location.state as any)?.source === 'order-chat';
  const isExpertViewer = userProfile?.role === 'expert';
  const currentUserId = Number(userProfile?.id ?? 0);
  const orderClientId = Number(order.client?.id ?? 0);
  const orderExpertId = Number(order.expert?.id ?? 0);
  const canSeeDeliveredWorkBlock =
    currentUserId > 0 && (currentUserId === orderClientId || currentUserId === orderExpertId);
  const clientRoleLabel = 'Заказчик';
  const clientRating = (() => {
    const raw = (order.client as any)?.rating ?? (order.client as any)?.average_rating;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  })();
  const clientDisplayName =
    order.client?.first_name && order.client?.last_name
      ? `${order.client.first_name} ${order.client.last_name}`
      : order.client?.username || order.client_name || 'Неизвестен';

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <AppButton 
          icon={<ArrowLeftOutlined />} 
          onClick={() => {
            const from = (location.state as any)?.from;
            if (typeof from === 'string' && from.length > 0) {
              navigate(from);
              return;
            }
            navigate(-1);
          }}
          className={styles.backButton}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </AppButton>

        <AppCard className={styles.mainCard}>
          <Space direction="vertical" size="large" className={styles.fullWidth}>
            <div>
              <Space align="start" className={`${styles.fullWidth} ${styles.headerRow}`}>
                <Title level={isMobile ? 3 : 2} className={styles.orderTitle}>{order.title}</Title>
                <Tag color={getStatusColor(order.status)} className={styles.statusTag}>
                  {getStatusText(order.status)}
                </Tag>
              </Space>
            </div>

            <div className={styles.sectionStack}>
              <AppCard className={styles.clientGlassCard}>
                <div className={styles.clientGlassInner}>
                  <Avatar 
                    size={56} 
                    src={order.client?.avatar} 
                    icon={<UserOutlined />}
                    className={styles.clientAvatar}
                  />
                  <div className={styles.clientMeta}>
                    <AppButton 
                      variant="link" 
                      onClick={() => navigate(`/user/${order.client?.id}`)}
                      className={styles.clientNameLink}
                    >
                      {clientDisplayName}
                    </AppButton>
                    <div className={styles.clientSubline}>
                      <span className={styles.clientRolePill}>{clientRoleLabel}</span>
                      <span className={styles.clientRatingPill}>
                        <StarFilled className={styles.clientRatingIcon} />
                        {clientRating ? clientRating.toFixed(1) : 'Н/Д'}
                      </span>
                    </div>
                  </div>
                </div>
              </AppCard>

              {isExpertViewer ? (
                <div className={styles.expertOfferGrid}>
                  <div className={styles.expertOfferGridItem}>
                    <div className={styles.expertOfferGridIcon}><BookOutlined /></div>
                    <div>
                      <div className={styles.expertOfferLabel}>Предмет</div>
                      <div className={styles.expertOfferValue}>{order.subject?.name || 'Не указан'}</div>
                    </div>
                  </div>
                  <div className={styles.expertOfferGridItem}>
                    <div className={styles.expertOfferGridIcon}><FileTextOutlined /></div>
                    <div>
                      <div className={styles.expertOfferLabel}>Тип работы</div>
                      <div className={styles.expertOfferValue}>{order.work_type?.name || 'Не указан'}</div>
                    </div>
                  </div>
                  <div className={styles.expertOfferGridItem}>
                    <div className={styles.expertOfferGridIcon}><ClockCircleOutlined /></div>
                    <div>
                      <div className={styles.expertOfferLabel}>Дедлайн</div>
                      <div className={styles.expertOfferValue}>{order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</div>
                    </div>
                  </div>
                  <div className={styles.expertOfferGridItem}>
                    <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconGreen}`}><DollarOutlined /></div>
                    <div>
                      <div className={styles.expertOfferLabel}>Цена</div>
                      <div className={styles.expertOfferValue}>{formatCurrency(order.budget)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.infoGrid}>
                  <AppCard 
                    size="small" 
                    className={styles.infoCard}
                  >
                    <Space direction="vertical" size={2} className={styles.fullWidth}>
                      <Text type="secondary" className={styles.infoLabel}>
                        Дедлайн
                      </Text>
                      <Space align="center">
                        <CalendarOutlined className={styles.deadlineIcon} />
                        <Text className={styles.deadlineValue}>
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                        </Text>
                      </Space>
                    </Space>
                  </AppCard>

                  <AppCard 
                    size="small" 
                    className={styles.infoCard}
                  >
                    <Space direction="vertical" size={4} className={styles.fullWidth}>
                      <Text type="secondary" className={styles.infoLabel}>
                        Предмет
                      </Text>
                      <Text className={styles.subjectValue}>
                        {order.subject?.name || 'Не указан'}
                      </Text>
                    </Space>
                  </AppCard>

                  <AppCard 
                    size="small" 
                    className={styles.infoCard}
                  >
                    <Space direction="vertical" size={4} className={styles.fullWidth}>
                      <Text type="secondary" className={styles.infoLabel}>
                        Цена
                      </Text>
                      <Space align="center">
                        <DollarOutlined className={styles.priceIcon} />
                        <Text className={styles.priceValue}>
                          {formatCurrency(order.budget)}
                        </Text>
                      </Space>
                    </Space>
                  </AppCard>

                  <AppCard 
                    size="small" 
                    className={styles.infoCard}
                  >
                    <Space direction="vertical" size={4} className={styles.fullWidth}>
                      <Text type="secondary" className={styles.infoLabel}>
                        Тип работы
                      </Text>
                      <Text className={styles.subjectValue}>
                        {order.work_type?.name || 'Не указан'}
                      </Text>
                    </Space>
                  </AppCard>

                  <AppCard 
                    size="small" 
                    className={styles.infoCard}
                  >
                    <Space direction="vertical" size={4} className={styles.fullWidth}>
                      <Text type="secondary" className={styles.infoLabel}>
                        Размещен
                      </Text>
                      <Text className={styles.createdValue}>
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ru })}
                      </Text>
                    </Space>
                  </AppCard>
                </div>
              )}
            </div>

            <div>
              <Title level={4}>Описание заказа</Title>
              <Paragraph className={styles.description}>
                {order.description || 'Описание отсутствует'}
              </Paragraph>
            </div>

            {canSeeDeliveredWorkBlock ? (
              <div className={styles.deliveredWorkSection}>
                <Title level={4}>Выгруженная работа</Title>
                <div className={`${styles.deliveredWorkCard} ${!latestDeliveredWork ? styles.deliveredWorkCardEmpty : ''}`}>
                  {latestDeliveredWork ? (
                    <>
                      <a
                        href="#"
                        className={styles.deliveredWorkLink}
                        onClick={(e) => {
                          e.preventDefault();
                          handleDownloadFile(latestDeliveredWork);
                        }}
                      >
                        <span className={styles.deliveredWorkIconBox}>
                          <FileOutlined />
                        </span>
                        <span className={styles.deliveredWorkFileName}>
                          {latestDeliveredWork.filename || `Файл #${latestDeliveredWork.id}`}
                        </span>
                      </a>
                      <Text type="secondary" className={styles.deliveredWorkMeta}>
                        Загружено: {new Date(latestDeliveredWork.created_at).toLocaleString('ru-RU')}
                      </Text>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

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

            {isOrderOwner && order.status === 'review' ? (
              <Space className={styles.reviewActionsRow} wrap>
                <AppButton
                  variant="success"
                  loading={reviewActionLoading === 'approve'}
                  onClick={handleApproveFromCard}
                >
                  Принять
                </AppButton>
                <AppButton
                  variant="secondary"
                  loading={reviewActionLoading === 'revision'}
                  onClick={handleRevisionFromCard}
                >
                  На доработку
                </AppButton>
                <AppButton
                  variant="danger"
                  loading={reviewActionLoading === 'reject'}
                  onClick={handleRejectFromCard}
                >
                  Отклонить
                </AppButton>
              </Space>
            ) : null}

            
            {userProfile?.role === 'expert' && 
             !order.expert && 
             !userHasBid && 
             order.client?.id !== userProfile?.id && (
                <div className={styles.bidAction}>
                    <AppButton 
                        variant="primary" 
                        size="large" 
                        onClick={() => setBidModalVisible(true)}
                        className={styles.bidButton}
                    >
                        Откликнуться на заказ
                    </AppButton>
                </div>
            )}
            
            
            {order.client?.id === userProfile?.id && (
                <div className={styles.statusTagWrap}>
                    <Tag color="blue" className={styles.statusTagLarge}>
                        Это ваш заказ
                    </Tag>
                </div>
            )}
            
            {userHasBid && (
                 <div className={styles.statusTagWrap}>
                    <Tag color="success" className={styles.statusTagLarge}>
                        Вы уже откликнулись на этот заказ
                    </Tag>
                </div>
            )}

            
            {isOrderOwner && !openedFromChat && Array.isArray(bids) && (
              <div>
                <Divider />
                <Title level={4}>
                  <Badge
                    count={bids.length}
                    size="small"
                    className={styles.bidsBadge}
                  >
                    <span className={styles.bidsBadgeText}>Отклики экспертов</span>
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
                          className={order.expert?.id === bid.expert.id ? styles.bidItemSelected : styles.bidItem}
                          actions={
                            order.expert?.id === bid.expert.id
                              ? [<Tag color="success" icon={<CheckCircleOutlined />}>Выбран</Tag>]
                              : isOrderOwner
                                ? [
                                    <AppButton
                                      size={isMobile ? 'small' : 'middle'}
                                      icon={<MessageOutlined />}
                                      onClick={async () => {
                                        dashboard.openOrderChat(order.id, bid.expert.id);
                                      }}
                                    >
                                      Написать
                                    </AppButton>
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
                                className={styles.bidAvatar}
                                onClick={() => navigate(`/user/${bid.expert.id}`)}
                              />
                            }
                            title={
                              <Space direction="vertical" size={4}>
                                <Space>
                                  <AppButton 
                                    variant="link" 
                                    onClick={() => navigate(`/user/${bid.expert.id}`)}
                                    className={styles.bidUserLink}
                                  >
                                    <Text strong>{bid.expert.username}</Text>
                                  </AppButton>
                                  <Space size={4}>
                                      <StarOutlined className={styles.ratingStar} />
                                      <Text>{bid.expert_rating || 0}</Text>
                                  </Space>
                                </Space>
                                {bid.expert.bio && (
                                  <Text type="secondary" className={styles.bidBio}>
                                    {bid.expert.bio}
                                  </Text>
                                )}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={8} className={styles.bidMeta}>
                                <Space wrap>
                                  <Tag color="blue" className={styles.bidAmountTag}>
                                    <DollarOutlined /> {formatCurrency(bid.amount)}
                                  </Tag>
                                  <Tag color="gold">
                                    Предоплата: {Number(bid.prepayment_percent ?? 0)}%
                                  </Tag>
                                  <Text type="secondary" className={styles.bidMetaText}>
                                    {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: ru })}
                                  </Text>
                                </Space>
                                {bid.comment && (
                                  <Paragraph 
                                    className={styles.bidComment}
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
                    <AppButton 
                      variant="link" 
                      onClick={() => navigate(`/user/${order.expert.id}`)}
                      className={styles.expertLink}
                    >
                      <Text strong className={styles.expertName}>{order.expert.username}</Text>
                    </AppButton>
                    <br />
                    <Text type="secondary" className={styles.expertRole}>Эксперт</Text>
                  </div>
                  {isOrderOwner && (
                    <AppButton
                      size={isMobile ? 'small' : 'middle'}
                      icon={<MessageOutlined />}
                      onClick={() => dashboard.openOrderChat(order.id, order.expert.id)}
                    >
                      Написать
                    </AppButton>
                  )}
                </Space>
              </div>
            )}
          </Space>
        </AppCard>
      </div>

      <BidModal
         visible={bidModalVisible}
         onClose={() => setBidModalVisible(false)}
         orderId={order.id}
         orderTitle={order.title}
         orderBudget={order.budget ? Number(order.budget) : undefined}
       />
    </div>
  );
};

export default OrderDetail;
