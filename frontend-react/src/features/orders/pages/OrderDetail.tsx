import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, Space, Tag, Avatar, Spin, message, List, Divider, Empty, Badge } from 'antd';
import { ArrowLeftOutlined, UserOutlined, DollarOutlined, CheckCircleOutlined, MessageOutlined, StarOutlined, StarFilled, BookOutlined, ClockCircleOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FileZipOutlined, DownloadOutlined, ReadOutlined } from '@ant-design/icons';
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

  const getOrderFileIcon = React.useCallback((filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined className={styles.fileIconPdf} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined className={styles.fileIconDoc} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <FileImageOutlined className={styles.fileIconImage} />;
    if (['zip', 'rar', '7z'].includes(ext || '')) return <FileZipOutlined className={styles.fileIconArchive} />;
    return <FileOutlined className={styles.fileIconDefault} />;
  }, []);

  const formatOrderFileTileName = React.useCallback((filename: string, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;
    const extIndex = filename.lastIndexOf('.');
    if (extIndex <= 0) return `${filename.slice(0, maxLength - 1)}…`;
    const ext = filename.slice(extIndex);
    const base = filename.slice(0, extIndex);
    const allowedBaseLength = Math.max(6, maxLength - ext.length - 1);
    return `${base.slice(0, allowedBaseLength)}…${ext}`;
  }, []);

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
          <Space direction="vertical" size={0} className={`${styles.fullWidth} ${styles.orderContent}`}>
            <div className={styles.sectionBlock}>
              <Space align="start" className={`${styles.fullWidth} ${styles.headerRow}`}>
                <Title level={isMobile ? 3 : 2} className={styles.orderTitle}>{order.title}</Title>
                {!isOrderOwner && (
                  <Tag color={getStatusColor(order.status)} className={styles.statusTag}>
                    {getStatusText(order.status)}
                  </Tag>
                )}
              </Space>
            </div>

            <div className={`${styles.sectionStack} ${styles.sectionBlock}`}>
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
                        {clientRating ? clientRating.toFixed(1) : 'Нет отзывов'}
                      </span>
                    </div>
                  </div>
                </div>
              </AppCard>

              <div className={styles.expertOfferGrid}>
                <div className={styles.expertOfferGridItem}>
                  <div className={styles.expertOfferGridIcon}><BookOutlined /></div>
                  <div>
                    <div className={styles.expertOfferLabel}>Предмет</div>
                    <div className={styles.expertOfferValue}>{order.subject?.name || 'Не указан'}</div>
                  </div>
                </div>
                <div className={styles.expertOfferGridItem}>
                  <div className={styles.expertOfferGridIcon}><ReadOutlined /></div>
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
            </div>

            <div className={styles.sectionBlock}>
              <Title level={4} className={styles.sectionTitle}>Описание заказа</Title>
              <Paragraph className={styles.description}>
                {order.description || 'Описание отсутствует'}
              </Paragraph>
            </div>

            {canSeeDeliveredWorkBlock ? (
              <div className={`${styles.deliveredWorkSection} ${styles.sectionBlock}`}>
                <Title level={4} className={styles.sectionTitle}>Готовая работа</Title>
                {latestDeliveredWork ? (
                  <>
                    <div className={styles.orderFilesGrid}>
                      <button
                        type="button"
                        className={styles.orderFileTile}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(latestDeliveredWork);
                        }}
                      >
                        <div className={styles.orderFileIconBox}>
                          {getOrderFileIcon(latestDeliveredWork.filename || `Файл #${latestDeliveredWork.id}`)}
                        </div>
                        <div className={styles.orderFileName}>
                          {formatOrderFileTileName(latestDeliveredWork.filename || `Файл #${latestDeliveredWork.id}`)}
                        </div>
                        <DownloadOutlined className={styles.orderFileDownloadIcon} />
                      </button>
                    </div>
                    <Text type="secondary" className={styles.deliveredWorkMeta}>
                      Загружено: {new Date(latestDeliveredWork.created_at).toLocaleString('ru-RU')}
                    </Text>
                  </>
                ) : (
                  <Text type="secondary" className={styles.readyWorkEmptyText}>
                    Работа еще не выгружена.
                  </Text>
                )}
              </div>
            ) : null}

            {order.files && order.files.length > 0 && (
              <div className={`${styles.orderFilesSection} ${styles.sectionBlock}`}>
                <Title level={4} className={styles.sectionTitle}>Прикрепленные файлы</Title>
                <div className={styles.orderFilesGrid}>
                  {order.files.map((file: any, index: number) => (
                    <button
                      type="button"
                      className={styles.orderFileTile}
                      key={file.id ?? index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(file);
                      }}
                    >
                      <div className={styles.orderFileIconBox}>
                        {getOrderFileIcon(file.filename || file.file_name || `Файл ${index + 1}`)}
                      </div>
                      <div className={styles.orderFileName}>
                        {formatOrderFileTileName(file.filename || file.file_name || `Файл ${index + 1}`)}
                      </div>
                      <DownloadOutlined className={styles.orderFileDownloadIcon} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isOrderOwner && order.status === 'review' ? (
              <Space className={`${styles.reviewActionsRow} ${styles.sectionBlock}`} wrap>
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
                <div className={`${styles.bidAction} ${styles.sectionBlock}`}>
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
            
            
            {userHasBid && (
                 <div className={`${styles.statusTagWrap} ${styles.sectionBlock}`}>
                    <Tag color="success" className={styles.statusTagLarge}>
                        Вы уже откликнулись на этот заказ
                    </Tag>
                </div>
            )}

            
            {isOrderOwner && !openedFromChat && Array.isArray(bids) && (
              <div className={styles.sectionBlock}>
                <Divider />
                <Title level={4} className={`${styles.sectionTitle} ${styles.bidsTitle}`}>
                  <span>Отклики экспертов</span>
                  <Badge
                    count={bids.length}
                    size="small"
                    className={styles.bidsBadge}
                  />
                </Title>

                {bidsLoading ? (
                  <Spin />
                ) : bids.length === 0 ? (
                  <Empty description="Пока нет откликов" />
                ) : (
                  <>
                    <List
                      className={styles.bidsList}
                      dataSource={Array.isArray(bids) ? bids.filter((bid: Bid) => (bid.status || 'active') === 'active') : []}
                      renderItem={(bid: Bid) => {
                        const bidAmount = Number(bid.amount ?? 0);
                        const prepaymentPercent = Number(bid.prepayment_percent ?? 0);
                        const prepaymentAmount = Number.isFinite(bidAmount) && Number.isFinite(prepaymentPercent)
                          ? Math.max(0, (bidAmount * prepaymentPercent) / 100)
                          : 0;

                        return <List.Item
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
                              <Space direction="vertical" size={4} className={styles.bidHeader}>
                                <Space className={styles.bidIdentityRow} wrap>
                                  <AppButton 
                                    variant="link" 
                                    onClick={() => navigate(`/user/${bid.expert.id}`)}
                                    className={styles.bidUserLink}
                                  >
                                    <Text strong>{bid.expert.username}</Text>
                                  </AppButton>
                                  <Space size={4} className={styles.bidRatingRow}>
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
                                <div className={styles.bidChipsRow}>
                                  <Tag color="blue" className={styles.bidAmountTag}>
                                    <DollarOutlined /> {formatCurrency(bid.amount)}
                                  </Tag>
                                  <Tag color="gold" className={styles.bidPrepaymentTag}>
                                    Предоплата: {formatCurrency(prepaymentAmount)}
                                  </Tag>
                                  <span className={styles.bidTimeWrap}>
                                    <Text type="secondary" className={styles.bidMetaText}>
                                      {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: ru })}
                                    </Text>
                                  </span>
                                </div>
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
                        </List.Item>;
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {order.expert && (
              <div className={styles.sectionBlock}>
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
