import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, Space, Tag, Avatar, Spin, message, List, Divider, Empty, Badge, Dropdown, Modal, Input } from 'antd';
import { ArrowLeftOutlined, UserOutlined, DollarOutlined, CheckCircleOutlined, MessageOutlined, StarOutlined, StarFilled, BookOutlined, ClockCircleOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FileZipOutlined, DownloadOutlined, ReadOutlined, EllipsisOutlined, NumberOutlined, DatabaseOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { ordersApi, Bid, Order, OrderFile } from '@/features/orders/api/orders';
import { authApi } from '@/features/auth/api/auth';
import { chatApi } from '@/features/support/api/chat';
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
    const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
    const [assigningExpertId, setAssigningExpertId] = useState<number | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [openingBidModal, setOpeningBidModal] = useState(false);

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
    const deliveredCandidates = order.files.filter((file: any) => {
      const fileType = String(file?.file_type || '').toLowerCase();
      const description = String(file?.description || '');
      if (fileType === 'solution' || fileType === 'revision') return true;
      if (description.includes('chat_delivery_message_id:')) return true;
      return false;
    });

    const extractDeliveryBatchId = (descriptionRaw: unknown): string => {
      const description = String(descriptionRaw || '');
      const match = description.match(/chat_delivery_batch_id:([^\s;]+)/);
      return match?.[1] || '';
    };

    const deliveredWithMeta = deliveredCandidates.map((file: any) => ({
      file,
      batchId: extractDeliveryBatchId(file?.description),
      createdAt: new Date(file?.created_at || 0).getTime(),
    }));

    const latestBatched = deliveredWithMeta
      .filter((item) => !!item.batchId)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestBatched?.batchId) {
      return deliveredWithMeta
        .filter((item) => item.batchId === latestBatched.batchId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((item) => item.file);
    }

    const sortedByDate = deliveredCandidates.sort((a: any, b: any) => {
      const left = new Date(a?.created_at || 0).getTime();
      const right = new Date(b?.created_at || 0).getTime();
      return right - left;
    });
    const latestTime = new Date(sortedByDate[0]?.created_at || 0).getTime();
    const fallbackBatchWindowMs = 2 * 60 * 1000;
    return sortedByDate.filter((file: any) => {
      const createdAt = new Date(file?.created_at || 0).getTime();
      return latestTime - createdAt <= fallbackBatchWindowMs;
    });
  }, [order?.files]);
  const attachedOrderFiles = React.useMemo(() => {
    if (!Array.isArray(order?.files)) return [];
    const deliveredIds = new Set(deliveredWorkFiles.map((file: any) => Number(file?.id)));
    const orderClientIdFromOrder = Number(order?.client?.id ?? (order as any)?.client_id ?? 0);
    return order.files.filter((file: any) => {
      if (deliveredIds.has(Number(file?.id))) return false;
      const fileType = String(file?.file_type || '').toLowerCase();
      if (fileType !== 'task') return false;
      const description = String(file?.description || '').trim().toLowerCase();
      const isInitialTaskFile = description === 'файл задания' || description === '';
      if (!isInitialTaskFile) return false;
      const uploadedById = Number(file?.uploaded_by?.id ?? 0);
      return orderClientIdFromOrder > 0 ? uploadedById === orderClientIdFromOrder : true;
    });
  }, [order?.files, deliveredWorkFiles]);

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
    setRevisionModalOpen(true);
  }, []);

  const handleConfirmRevisionFromCard = React.useCallback(async () => {
    if (!orderId) return;
    const comment = revisionComment.trim();
    if (!comment) {
      message.warning('Добавьте комментарий для доработки');
      return;
    }
    try {
      setRevisionSubmitting(true);
      setReviewActionLoading('revision');
      await ordersApi.requestRevision(Number(orderId), comment);
      await refreshOrderWithLists();
      setRevisionModalOpen(false);
      setRevisionComment('');
      message.success('Работа отправлена на доработку');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отправить на доработку');
    } finally {
      setRevisionSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists, revisionComment]);

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

    const handleAssignExpert = React.useCallback(async (bidId: number, expertId: number, expertUsername: string) => {
      if (!orderId) return;
      try {
        setAssigningExpertId(expertId);
        // Принимаем ставку - это назначит эксперта, создаст чат и вернет chat_id
        const response = await ordersApi.acceptBid(Number(orderId), bidId);
        await refreshOrderWithLists();
        message.success(`Эксперт ${expertUsername} назначен исполнителем`);
    
        // Открываем чат напрямую через DashboardContext с переданным chat_id
        const chatId = response?.chat_id;
        if (chatId) {
          setTimeout(() => {
            dashboard.openOrderChat(Number(orderId), expertId, chatId);
          }, 300);
        } else {
          // Фолбэк: если chat_id не вернулся, используем старую логику с событием
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openChatById', {
              detail: { userId: expertId }
            }));
          }, 500);
        }
      } catch (e: any) {
        message.error(e?.response?.data?.detail || 'Не удалось назначить исполнителя');
      } finally {
        setAssigningExpertId(null);
      }
    }, [orderId, refreshOrderWithLists, dashboard]);

  const handleFileUpload = React.useCallback(async (files: File[]) => {
    if (!orderId || files.length === 0) return;
    
    try {
      setUploadingFiles(true);
      const uploadPromises = files.map(file => 
        ordersApi.uploadOrderFile(Number(orderId), file, {
          file_type: 'solution',
          description: 'Готовая работа загружена экспертом'
        })
      );
      
      await Promise.all(uploadPromises);
      await refreshOrderWithLists();
      message.success(`Загружено файлов: ${files.length}`);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка при загрузке файлов');
    } finally {
      setUploadingFiles(false);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleDrag = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileInput = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

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

  const currentUserId = Number(userProfile?.id ?? 0);
  const orderClientId = Number(order.client?.id ?? (order as any)?.client_id ?? 0);
  const orderExpertId = Number(order.expert?.id ?? (order as any)?.expert_id ?? 0);
  const isOrderOwner = currentUserId > 0 && currentUserId === orderClientId;
  const isOrderExpert = currentUserId > 0 && currentUserId === orderExpertId;
  const canSubmitComplaint = isOrderOwner || isOrderExpert;
  const openedFromChat = (location.state as any)?.source === 'order-chat';
  const canSeeDeliveredWorkBlock =
    currentUserId > 0 && (isOrderOwner || currentUserId === orderExpertId);
  const expertReview = (() => {
    const raw = (order as any)?.rating ?? (order as any)?.expert_rating;
    const rating = Number((raw as any)?.rating);
    if (!raw || typeof raw !== 'object' || !Number.isFinite(rating) || rating <= 0) return null;
    return {
      rating,
      comment: typeof (raw as any)?.comment === 'string' ? (raw as any).comment : '',
      created_at: (raw as any)?.created_at,
    };
  })();
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

  const makePrefilledComplaintText = () => {
    const title = order.title || `Заказ #${order.id}`;
    const deadlineText = order.deadline ? new Date(order.deadline).toLocaleString('ru-RU') : 'не указан';
    const expertName = order.expert?.username || 'не назначен';
    const clientName = order.client?.username || order.client_name || 'не указан';
    return [
      `Заказ #${order.id}`,
      `Название: ${title}`,
      `Статус: ${getStatusText(String(order.status || ''))}`,
      `Заказчик: ${clientName}`,
      `Исполнитель: ${expertName}`,
      `Срок сдачи: ${deadlineText}`,
      '',
      'Описание жалобы:',
      ''
    ].join('\n');
  };

  const handleOpenComplaintInSupport = async () => {
    try {
      const rawSupportId = localStorage.getItem('support_user_id');
      let supportUserId = rawSupportId ? Number(rawSupportId) : null;
      if (!supportUserId || !Number.isFinite(supportUserId) || supportUserId <= 0) {
        const supportUser = await authApi.getSupportUser();
        supportUserId = Number(supportUser?.id ?? 0);
        if (supportUserId > 0) {
          localStorage.setItem('support_user_id', String(supportUserId));
        }
      }
      if (!supportUserId || !Number.isFinite(supportUserId) || supportUserId <= 0) {
        message.error('Поддержка не настроена');
        return;
      }
      const draft = {
        category: 'Другое',
        text: makePrefilledComplaintText(),
      };
      localStorage.setItem('support_claim_draft', JSON.stringify(draft));
      dashboard.openOrderChat(order.id, supportUserId);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось открыть чат поддержки');
    }
  };

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
                <div className={styles.orderHeaderInfo}>
                  <Title level={isMobile ? 3 : 2} className={styles.orderTitle}>{order.title}</Title>
                </div>
                <Space className={styles.headerRightControls}>
                  {canSubmitComplaint && (
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: [{ key: 'complaint', label: 'Жалоба администрации' }],
                        onClick: ({ key }) => {
                          if (key === 'complaint') void handleOpenComplaintInSupport();
                        },
                      }}
                    >
                      <button type="button" className={styles.orderActionsButton}>
                        <EllipsisOutlined />
                      </button>
                    </Dropdown>
                  )}
                </Space>
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
                  <div className={styles.expertOfferGridIcon}><NumberOutlined /></div>
                  <div>
                    <div className={styles.expertOfferLabel}>Номер заказа</div>
                    <div className={styles.expertOfferValue}>
                      <Text copyable={{ text: `${window.location.origin}/orders/${order.id}` }}>
                        {order.id}
                      </Text>
                    </div>
                  </div>
                </div>
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
                    <div className={styles.expertOfferLabel}>Срок сдачи</div>
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
                  <div className={styles.expertOfferGridItem}>
                  <div className={styles.expertOfferGridIcon}><DatabaseOutlined /></div>
                  <div>
                    <div className={styles.expertOfferLabel}>Дата публикации</div>
                    <div className={styles.expertOfferValue}>
                      <Text>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU') : 'Не указана'}
                      </Text>
                    </div>
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
                
                {/* Блок загрузки файлов для эксперта */}
                {isOrderExpert && order.status === 'in_progress' && (
                  <div
                    className={`${styles.uploadDropzone} ${dragActive ? styles.uploadDropzoneActive : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      className={styles.fileInput}
                      onChange={handleFileInput}
                      disabled={uploadingFiles}
                      accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak"
                    />
                    <label htmlFor="file-upload" className={styles.uploadLabel}>
                      <div className={styles.uploadContent}>
                        {uploadingFiles ? (
                          <Spin size="large" />
                        ) : (
                          <>
                            <InboxOutlined className={styles.uploadIcon} />
                            <Text strong className={styles.uploadTitle}>
                              Перетащите файлы сюда или нажмите для загрузки
                            </Text>
                            <Text type="secondary" className={styles.uploadSubtitle}>
                              Поддерживаются: PDF, DOC, DOCX, изображения, архивы и другие форматы
                            </Text>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}
                
                {deliveredWorkFiles.length > 0 ? (
                  <>
                    <div className={styles.orderFilesGrid}>
                      {deliveredWorkFiles.map((file: any, index: number) => (
                        <button
                          type="button"
                          className={styles.orderFileTile}
                          key={file.id ?? `delivered-${index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                        >
                          <div className={styles.orderFileIconBox}>
                            {getOrderFileIcon(file.filename || file.file_name || `Файл #${file.id || index + 1}`)}
                          </div>
                          <div className={`${styles.orderFileName} ${styles.deliveredFileName}`}>
                            {formatOrderFileTileName(file.filename || file.file_name || `Файл #${file.id || index + 1}`)}
                          </div>
                          <DownloadOutlined className={styles.orderFileDownloadIcon} />
                        </button>
                      ))}
                    </div>
                    <Text type="secondary" className={styles.deliveredWorkMeta}>
                      Файлов выгружено: {deliveredWorkFiles.length}
                    </Text>
                  </>
                ) : (
                  <Text type="secondary" className={styles.readyWorkEmptyText}>
                    {isOrderExpert ? 'Загрузите готовую работу' : 'Работа еще не выгружена.'}
                  </Text>
                )}
              </div>
            ) : null}

            {attachedOrderFiles.length > 0 && (
              <div className={`${styles.orderFilesSection} ${styles.sectionBlock}`}>
                <Title level={4} className={styles.sectionTitle}>Прикрепленные файлы</Title>
                <div className={styles.orderFilesGrid}>
                  {attachedOrderFiles.map((file: any, index: number) => (
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
                        onClick={() => {
                          setOpeningBidModal(true);
                          setBidModalVisible(true);
                        }}
                        className={styles.bidButton}
                        loading={openingBidModal}
                        disabled={openingBidModal}
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

            
                        {!openedFromChat && Array.isArray(bids) && bids.length > 0 && (
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
                    {!isOrderOwner && (
                      <Text type="secondary" className={styles.bidsNotice}>
                        Вы просматриваете заказы других клиентов. Отклики доступны только владельцу заказа.
                      </Text>
                    )}
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
                                    </AppButton>,
                                    <AppButton
                                      key="assign"
                                      size={isMobile ? 'small' : 'middle'}
                                      type="primary"
                                      className={styles.assignButton}
                                      loading={assigningExpertId === bid.expert.id}
                                      onClick={async () => {
                                        handleAssignExpert(bid.id, bid.expert.id, bid.expert.username);
                                      }}
                                    >
                                      Назначить исполнителем
                                    </AppButton>
                                  ]
                                : []
                          }
                          // Клиенты, не являющиеся владельцами, не видят кнопки действий
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
                <Space align="start" size={6} className={styles.expertRow}>
                  <Avatar 
                    size={isMobile ? 48 : 64} 
                    src={order.expert.avatar} 
                    icon={<UserOutlined />}
                  />
                  <div className={styles.expertMeta}>
                    <AppButton 
                      variant="link" 
                      onClick={() => navigate(`/user/${order.expert.id}`)}
                      className={styles.expertLink}
                    >
                      <Text strong className={styles.expertName}>{order.expert.username}</Text>
                    </AppButton>
                    <br />
                    <Text type="secondary" className={styles.expertRole}>Эксперт</Text>
                    {expertReview ? (
                      <div className={styles.expertReviewBlock}>
                        <span className={styles.expertReviewRating}>
                          <StarFilled className={styles.clientRatingIcon} />
                          {expertReview.rating.toFixed(1)}
                        </span>
                        <Text type="secondary" className={styles.expertReviewText}>
                          {expertReview.comment?.trim()
                            ? `Отзыв по работе: ${expertReview.comment.trim()}`
                            : 'Отзыв по работе оставлен без комментария'}
                        </Text>
                      </div>
                    ) : null}
                  </div>
                  {isOrderOwner && (
                    <AppButton
                      className={styles.expertWriteButton}
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
         onClose={() => {
           setBidModalVisible(false);
           setOpeningBidModal(false);
         }}
         onBidSubmitted={() => {
           setOpeningBidModal(false);
         }}
         orderId={order.id}
         orderTitle={order.title}
         orderBudget={order.budget ? Number(order.budget) : undefined}
       />
      <Modal
        open={revisionModalOpen}
        centered
        onCancel={() => {
          setRevisionModalOpen(false);
          setRevisionComment('');
        }}
        onOk={handleConfirmRevisionFromCard}
        okButtonProps={{ loading: revisionSubmitting || reviewActionLoading === 'revision' }}
        okText="Отправить"
        cancelText="Отмена"
        title="Комментарий для доработки"
        destroyOnHidden
      >
        <div className={styles.revisionModalSpacing}>
          <Input.TextArea
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            placeholder="Опишите, что нужно исправить"
            autoSize={{ minRows: 4, maxRows: 8 }}
            maxLength={1500}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;
