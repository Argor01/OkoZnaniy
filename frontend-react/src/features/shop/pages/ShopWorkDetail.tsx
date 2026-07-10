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
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, List, Modal, Popconfirm, Rate, Space, Spin, Tag, Typography, message } from 'antd';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useDashboard } from '@/contexts/DashboardContext';
import { shopApi } from '@/features/shop/api/shop';
import type { WorkFile } from '@/features/shop/types';
import { useCurrentUser } from '@/hooks/queries';
import { formatCurrency, getDisplayUsername, isEmailLike } from '@/utils/formatters';
import styles from './ShopWorkDetail.module.css';

const { Title, Text } = Typography;

const READY_WORK_PURCHASE_WARNING = '\u0413\u043e\u0442\u043e\u0432\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b \u0432\u043e\u0437\u0432\u0440\u0430\u0442\u0443 \u043d\u0435 \u043f\u043e\u0434\u043b\u0435\u0436\u0430\u0442, \u0434\u0430\u043b\u044c\u043d\u0435\u0439\u0448\u0438\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0438 \u0438 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0438 \u0431\u0443\u0434\u0443\u0442 \u0437\u0430 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0443\u044e \u043f\u043b\u0430\u0442\u0443';

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
    const sellerId = work.author?.id;
    if (!sellerId) {
      message.error('Не удалось оформить покупку: неизвестен продавец');
      return;
    }

    shopApi
      .purchaseWork(work.id)
      .then((createdPurchase) => {
        queryClient.invalidateQueries({ queryKey: ['shop-purchases'] });
        if (createdPurchase.order) {
          navigate(`/orders/${createdPurchase.order}`);
          return;
        }
        dashboard.openContextChat(sellerId, work.title, work.id);
      })
      .catch((error: unknown) => {
        const detail = (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.error ||
          (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.detail;
        message.error(detail || 'Не удалось купить работу');
      });
  };

  const handlePurchase = () => {
    Modal.confirm({
      title: '\u0412\u0430\u0436\u043d\u043e\u0435 \u043f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435',
      content: READY_WORK_PURCHASE_WARNING,
      okText: '\u042f \u0441\u043e\u0433\u043b\u0430\u0441\u0435\u043d',
      cancelText: '\u041e\u0442\u043c\u0435\u043d\u0430',
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
                    <Text type="secondary" className={styles.infoLabel}>Срок выполнения</Text>
                    <Text className={styles.createdValue}>{work.execution_days || 0} дн.</Text>
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

            {work.files && work.files.length > 0 && (
              <div>
                <Title level={4}>Прикрепленные файлы</Title>
                <List
                  dataSource={work.files}
                  renderItem={(file: WorkFile) => (
                    <List.Item
                      actions={[
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
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FileOutlined className={styles.fileIcon} />}
                        title={file.name}
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
                <AppButton
                  variant="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  disabled={!purchase.delivered_file_available}
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
