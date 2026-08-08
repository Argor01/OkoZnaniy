import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, List, Modal, Popconfirm, Rate, Space, Spin, Tag, Tooltip, Typography, message } from 'antd';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useDashboard } from '@/contexts/DashboardContext';
import { shopApi } from '@/features/shop/api/shop';
import type { WorkFile } from '@/features/shop/types';
import { useCurrentUser } from '@/hooks/queries';
import { formatCurrency, getDisplayUsername, isEmailLike, truncateFileName } from '@/utils/formatters';
import styles from './ShopWorkDetail.module.css';

const { Title, Text } = Typography;

const READY_WORK_PURCHASE_WARNING = 'Файл будет доступен для скачивания сразу после покупки. В течение 7 дней можно открыть спор, если работа не устраивает.';

const ShopWorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { data: userProfile, isLoading: isUserLoading } = useCurrentUser();

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: work, isLoading: isWorkLoading, isError } = useQuery({
    queryKey: ['shop-work', workId],
    queryFn: () => shopApi.getWork(Number(workId)),
    enabled: !!workId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['shop-purchases'],
    queryFn: () => shopApi.getPurchases(),
  });

  const purchase = React.useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    const id = Number(workId);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    return list.find((p) => p.work === id);
  }, [purchases, workId]);

  const deleteMutation = useMutation({
    mutationFn: (targetWorkId: number) => shopApi.deleteWork(targetWorkId),
    onSuccess: () => {
      message.success('Работа успешно удалена');
      queryClient.invalidateQueries({ queryKey: ['shop-works'] });
      queryClient.invalidateQueries({ queryKey: ['shop-work', Number(workId)] });
      navigate('/shop/ready-works');
    },
    onError: () => {
      message.error('Ошибка при удалении работы');
    },
  });

  const rateMutation = useMutation({
    mutationFn: ({ purchaseId, rating }: { purchaseId: number; rating: number }) =>
      shopApi.ratePurchase(purchaseId, rating),
    onSuccess: () => {
      message.success('Оценка сохранена');
      queryClient.invalidateQueries({ queryKey: ['shop-purchases'] });
    },
    onError: () => {
      message.error('Не удалось сохранить оценку');
    },
  });

  const disputeMutation = useMutation({
    mutationFn: (purchaseId: number) => shopApi.disputePurchase(purchaseId),
    onSuccess: () => {
      message.success('Спор открыт. Средства заморожены до разрешения.');
      queryClient.invalidateQueries({ queryKey: ['shop-purchases'] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      message.error(detail || 'Не удалось открыть спор');
    },
  });

  const handleDispute = () => {
    if (!purchase) return;
    Modal.confirm({
      title: 'Открыть спор?',
      content: 'Вы уверены, что хотите открыть спор? Доступ к файлу будет отозван до разрешения спора.',
      okText: 'Да, открыть спор',
      cancelText: 'Отмена',
      okType: 'danger',
      centered: true,
      onOk: () => disputeMutation.mutate(purchase.id),
    });
  };

  if (isWorkLoading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !work) {
    return (
      <div className={styles.notFound}>
        <Title level={3}>Работа не найдена</Title>
        <AppButton variant="primary" onClick={() => navigate('/shop/ready-works')}>
          Вернуться к магазину
        </AppButton>
      </div>
    );
  }

  const authorName = work.author?.name?.trim();
  const fallbackAuthorName = work.author_name?.trim();
  const authorDisplayName = work.author
    ? getDisplayUsername(work.author)
    : authorName && !isEmailLike(authorName)
      ? authorName
      : fallbackAuthorName && !isEmailLike(fallbackAuthorName)
        ? fallbackAuthorName
        : 'Неизвестен';

  const handleDelete = () => {
    deleteMutation.mutate(work.id);
  };

  const processPurchase = () => {
    shopApi
      .purchaseWork(work.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['shop-purchases'] });
        message.success('Работа куплена! Файл доступен для скачивания.');
      })
      .catch((error: unknown) => {
        const detail = (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.error ||
          (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.detail;
        message.error(detail || 'Не удалось купить работу');
      });
  };

  const handlePurchase = () => {
    Modal.confirm({
      title: 'Покупка готовой работы',
      content: READY_WORK_PURCHASE_WARNING,
      okText: 'Купить',
      cancelText: 'Отмена',
      centered: true,
      onOk: processPurchase,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <AppButton
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className={styles.backButton}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </AppButton>

        <AppCard className={styles.mainCard}>
          <Space direction="vertical" size="large" className={styles.fullWidth}>
            <div>
              <Space align="start" className={`${styles.fullWidth} ${styles.headerRow}`}>
                <Title level={isMobile ? 3 : 2} className={styles.workTitle}>{work.title}</Title>
                <Tag color="purple" className={styles.typeTag}>
                  {work.work_type_name || work.category || 'Тип работы'}
                </Tag>
              </Space>
            </div>

            {work.preview && (
              <div className={styles.preview}>
                <img src={work.preview} alt={work.title} className={styles.previewImage} />
              </div>
            )}

            <div className={styles.sectionStack}>
              <div className={styles.clientInfo}>
                <Space
                  size={12}
                  style={{ cursor: work.author?.username ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (work.author?.username) {
                      navigate(`/user/${work.author.username}`);
                    }
                  }}
                >
                  <Avatar
                    size={48}
                    src={work.author?.avatar || work.author_avatar}
                    icon={<UserOutlined />}
                    className={styles.clientAvatar}
                  />
                  <div>
                    <Text strong className={styles.clientName} style={{ cursor: work.author?.username ? 'pointer' : 'default' }}>
                      {authorDisplayName}
                    </Text>
                    <Text type="secondary" className={styles.clientOrders} style={{ display: 'block' }}>
                      Рейтинг: {work.author?.rating || 0}
                    </Text>
                  </div>
                </Space>
              </div>

              <div className={styles.infoGrid}>
                <AppCard size="small" className={styles.infoCard}>
                  <div className={styles.centeredStat}>
                    <Text type="secondary" className={styles.statLabel}>Просмотры</Text>
                    <Space align="center" className={styles.centeredRow}>
                      <EyeOutlined className={styles.mutedIcon} />
                      <Text className={styles.mutedValue}>{work.viewsCount || 0}</Text>
                    </Space>
                  </div>
                </AppCard>

                <AppCard size="small" className={styles.infoCard}>
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>Предмет</Text>
                    <Text className={styles.subjectValue}>
                      {work.subject_name || work.subject || 'Не указан'}
                    </Text>
                  </Space>
                </AppCard>

                <AppCard size="small" className={styles.infoCard}>
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>Цена</Text>
                    <Space align="center">
                      <DollarOutlined className={styles.priceIcon} />
                      <Text className={styles.priceValue}>{formatCurrency(work.price)}</Text>
                    </Space>
                  </Space>
                </AppCard>

                <AppCard size="small" className={styles.infoCard}>
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>Рейтинг</Text>
                    <Space align="center" wrap className={styles.ratingRow}>
                      <StarOutlined className={styles.ratingIcon} />
                      <Rate disabled value={work.rating} className={styles.rateSmall} />
                      <Text className={styles.ratingCount}>({work.reviewsCount || 0})</Text>
                    </Space>
                  </Space>
                </AppCard>

                <AppCard size="small" className={styles.infoCard}>
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>Создана</Text>
                    <Space align="center">
                      <CalendarOutlined className={styles.createdIcon} />
                      <Text className={styles.createdValue}>
                        {work.created_at ? format(new Date(work.created_at), 'dd.MM.yyyy', { locale: ru }) : 'Недавно'}
                      </Text>
                    </Space>
                  </Space>
                </AppCard>
              </div>
            </div>

            <div>
              <Title level={4}>Описание работы</Title>
              <div
                className={styles.description}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(work.description || 'Описание отсутствует') }}
              />
            </div>

            {purchase && purchase.delivered_file_available && (
              <div>
                <Title level={4}>Ваша оценка</Title>
                {purchase.rating ? (
                  <Rate disabled value={purchase.rating} />
                ) : (
                  <Rate
                    value={0}
                    onChange={(value) => {
                      if (purchase) {
                        rateMutation.mutate({ purchaseId: purchase.id, rating: value });
                      }
                    }}
                  />
                )}
              </div>
            )}

            {purchase && purchase.status === 'paid' && purchase.seconds_until_hold_end && purchase.seconds_until_hold_end > 0 && (
              <AppCard size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
                <Space>
                  <WarningOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                  <Text>
                    Возврат возможен ещё{' '}
                    <Text strong style={{ color: '#fa8c16' }}>
                      {Math.floor(purchase.seconds_until_hold_end / 86400)}д {Math.floor((purchase.seconds_until_hold_end % 86400) / 3600)}ч
                    </Text>
                  </Text>
                </Space>
              </AppCard>
            )}

            {work.files && work.files.length > 0 && (
              <div>
                <Title level={4}>Прикрепленные файлы</Title>
                <List
                  dataSource={work.files}
                  renderItem={(file: WorkFile) => (
                    <List.Item
                      actions={
                        purchase && purchase.delivered_file_available
                          ? [
                              <AppButton
                                key={`open-${file.id}`}
                                variant="link"
                                icon={<DownloadOutlined />}
                                onClick={() => {
                                  const fileWithLinks = file as WorkFile & { view_url?: string; file_url?: string };
                                  const url = fileWithLinks.view_url || fileWithLinks.file_url || file.file;
                                  if (url) {
                                    window.open(url, '_blank');
                                  }
                                }}
                              >
                                Открыть
                              </AppButton>,
                            ]
                          : []
                      }
                    >
                      <List.Item.Meta
                        avatar={<FileOutlined className={styles.fileIcon} />}
                        title={truncateFileName(file.name)}
                        description={`${file.file_type || 'Неизвестный тип'} • ${formatFileSize(file.file_size || 0)}`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}

            <div className={styles.actionRow}>
              {isUserLoading ? (
                <div className={styles.centered}>
                  <Spin />
                </div>
              ) : userProfile?.id === work.author?.id ? (
                <Popconfirm
                  title="Удалить работу?"
                  description="Вы уверены, что хотите удалить эту работу? Это действие нельзя отменить."
                  onConfirm={handleDelete}
                  okText="Да"
                  cancelText="Нет"
                >
                  <AppButton
                    variant="danger"
                    size="large"
                    icon={<DeleteOutlined />}
                    loading={deleteMutation.isPending}
                    className={styles.actionButton}
                  >
                    Удалить работу
                  </AppButton>
                </Popconfirm>
              ) : purchase ? (
                <Space>
                  {purchase.status === 'paid' && purchase.seconds_until_hold_end && purchase.seconds_until_hold_end > 0 && (
                    <AppButton
                      variant="outline"
                      danger
                      size="large"
                      onClick={handleDispute}
                      loading={disputeMutation.isPending}
                      className={styles.actionButton}
                    >
                      Спор
                    </AppButton>
                  )}
                  <AppButton
                    variant="primary"
                    size="large"
                    disabled={!purchase.delivered_file_available || purchase.status === 'disputed'}
                    onClick={async () => {
                      if (!purchase.delivered_file_available) return;
                      try {
                        const blob = await shopApi.downloadPurchaseFile(purchase.id);
                        const blobUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = purchase.delivered_file_name || 'file';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(blobUrl);
                      } catch (e: unknown) {
                        const status = (e as { response?: { status?: number } })?.response?.status;
                        if (status === 401) {
                          message.error('Не авторизовано для скачивания файла');
                        } else {
                          message.error('Ошибка при скачивании файла');
                        }
                      }
                    }}
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                  >
                    Скачать
                  </AppButton>
                </Space>
              ) : (
                <AppButton
                  variant="primary"
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  onClick={handlePurchase}
                  className={styles.actionButton}
                >
                  Купить за {formatCurrency(work.price)}
                </AppButton>
              )}
            </div>
          </Space>
        </AppCard>
      </div>
    </div>
  );
};

export default ShopWorkDetail;
