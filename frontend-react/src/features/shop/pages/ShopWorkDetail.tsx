import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Space, Tag, Avatar, Spin, message, Rate, List, Popconfirm } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, StarOutlined, ShoppingCartOutlined, EyeOutlined, FileOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { shopApi } from '@/features/shop/api/shop';
import { authApi } from '@/features/auth/api/auth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { WorkFile } from '@/features/shop/types';
import { useDashboard } from '@/contexts/DashboardContext';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import styles from './ShopWorkDetail.module.css';

const { Title, Text } = Typography;

const ShopWorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const queryClient = useQueryClient();
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

  const { data: works } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['shop-purchases'],
    queryFn: () => shopApi.getPurchases(),
  });

  const work = React.useMemo(() => {
    if (!works || !workId) return null;
    return works.find((w) => w.id === Number(workId));
  }, [works, workId]);

  const purchase = React.useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    const id = Number(workId);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    return list.find((p) => p.work === id);
  }, [purchases, workId]);

  const deleteMutation = useMutation({
    mutationFn: (workId: number) => shopApi.deleteWork(workId),
    onSuccess: () => {
      message.success('Работа успешно удалена!');
      queryClient.invalidateQueries({ queryKey: ['shop-works'] });
      navigate('/shop/ready-works');
    },
    onError: () => {
      message.error('Ошибка при удалении работы');
    },
  });

  if (!works) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
      </div>
    );
  }

  if (!work) {
    return (
      <div className={styles.notFound}>
        <Title level={3}>Работа не найдена</Title>
        <AppButton variant="primary" onClick={() => navigate('/shop/ready-works')}>
          Вернуться к магазину
        </AppButton>
      </div>
    );
  }

  const handleDelete = () => {
    deleteMutation.mutate(work.id);
  };

  const handlePurchase = () => {
    const sellerId = work?.author?.id;
    if (!sellerId) {
      message.error('Не удалось открыть чат: неизвестен продавец');
      return;
    }
    shopApi
      .purchaseWork(work.id)
      .then(() => {
        dashboard.openContextChat(sellerId, work.title, work.id);
      })
      .catch((error: unknown) => {
        const detail = (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.error || 
                       (error as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.detail;
        message.error(detail || 'Не удалось купить работу');
      });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <AppButton 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          className={styles.backButton}
          variant="default"
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </AppButton>

        <AppCard className={styles.mainCard}>
          <Space direction="vertical" size="large" className={styles.fullWidth}>
            <div>
              <Space align="start" className={`${styles.fullWidth} ${styles.headerRow}`}>
                <Title level={isMobile ? 3 : 2} className={styles.workTitle}>{work.title}</Title>
                <Tag color="blue" className={styles.typeTag}>
                  {work.work_type_name || work.category || 'Тип работы'}
                </Tag>
              </Space>
            </div>

            {work.preview && (
              <div className={styles.preview}>
                <img 
                  src={work.preview} 
                  alt={work.title}
                  className={styles.previewImage}
                />
              </div>
            )}

            <div className={styles.sectionStack}>
              <AppCard 
                className={styles.authorCard}
              >
                <Space direction="vertical" size={12} className={styles.fullWidth}>
                  <Text type="secondary" className={styles.authorLabel}>
                    АВТОР
                  </Text>
                  <Space align="center" size={16}>
                    <Avatar 
                      size={48} 
                      src={work.author?.avatar} 
                      icon={<UserOutlined />}
                      className={styles.authorAvatar}
                    />
                    <div>
                      <AppButton 
                        variant="link" 
                        onClick={() => navigate(`/user/${work.author?.id}`)}
                        className={styles.authorLink}
                      >
                        {work.author_name || work.author?.name || work.author?.username || 'Автор'}
                      </AppButton>
                      <div className={styles.authorHint}>
                        Нажмите, чтобы посмотреть профиль
                      </div>
                    </div>
                  </Space>
                </Space>
              </AppCard>

              <div className={styles.infoGrid}>

                <AppCard 
                  size="small" 
                  className={styles.infoCard}
                >
                  <div className={styles.centeredStat}>
                    <Text type="secondary" className={styles.statLabel}>
                      Просмотры
                    </Text>
                    <Space align="center" className={styles.centeredRow}>
                      <EyeOutlined className={styles.mutedIcon} />
                      <Text className={styles.mutedValue}>
                        {work.viewsCount || 0}
                      </Text>
                    </Space>
                  </div>
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
                      {work.subject_name || work.subject || 'Не указан'}
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
                        {formatCurrency(work.price)}
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
                      Рейтинг
                    </Text>
                    <Space align="center">
                      <StarOutlined className={styles.ratingIcon} />
                      <Rate disabled value={work.rating} className={styles.rateSmall} />
                      <Text className={styles.ratingCount}>
                        ({work.reviewsCount || 0})
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
                      Создана
                    </Text>
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

            <AppCard 
              title="Описание работы"
              className={styles.contentCard}
            >
              <div 
                className={styles.description}
                dangerouslySetInnerHTML={{ __html: work.description || 'Описание отсутствует' }}
              />
            </AppCard>

            
            {work.files && work.files.length > 0 && (
              <AppCard 
                title="Прикрепленные файлы"
                className={styles.contentCard}
              >
                <List
                  dataSource={work.files}
                  renderItem={(file: WorkFile) => (
                    <List.Item
                      actions={[
                        <AppButton
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
                        </AppButton>
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
              </AppCard>
            )}

            
            <div className={styles.actionRow}>
              {userProfile?.id === work.author?.id ? (

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
