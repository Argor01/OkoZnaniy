
import React from 'react';
import { Tag, Space, Typography, Rate, Badge, Tooltip, Modal } from 'antd';
import { EyeOutlined, DownloadOutlined, CheckOutlined, CalendarOutlined, WarningOutlined } from '@ant-design/icons';
import { PurchasedWork } from '@/features/shop/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import styles from './PurchasedWorkCard.module.css'; 

const { Text, Title } = Typography;

interface PurchasedWorkCardProps {
  work: PurchasedWork;
  onDownload: (id: number) => void;
  onRate?: (purchaseId: number, rating: number) => void;
  onDispute?: (purchaseId: number) => void;
  onView?: (workId: number) => void;
}

const formatTimeLeft = (seconds: number): string => {
  if (seconds <= 0) return 'Истёк';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}д ${hours}ч`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
};

const PurchasedWorkCard: React.FC<PurchasedWorkCardProps> = ({
  work,
  onDownload,
  onRate,
  onDispute,
  onView,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const canDispute = work.status === 'paid' && work.secondsUntilHoldEnd && work.secondsUntilHoldEnd > 0;
  const isDisputed = work.status === 'disputed';

  const handleDispute = (e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: 'Открыть спор?',
      content: 'Вы уверены, что хотите открыть спор? Доступ к файлу будет отозван до разрешения спора.',
      okText: 'Да, открыть спор',
      cancelText: 'Отмена',
      okType: 'danger',
      centered: true,
      onOk: () => onDispute?.(work.purchaseId),
    });
  };

  return (
    <AppCard
      hoverable
      className={styles.card}
      onClick={() => onView && onView(work.workId)}
      cover={
        work.preview && !imageError ? (
          <img 
            alt={work.title} 
            src={work.preview} 
            className={styles.preview}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className={styles.noPreview}>
            <div>📄</div>
            <div>Нет превью</div>
          </div>
        )
      }
    >
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Tag color={isDisputed ? 'red' : work.status === 'completed' ? 'green' : 'purple'}>
            {isDisputed ? 'Спор' : work.status === 'completed' ? 'Завершена' : work.category}
          </Tag>
          {work.isDownloaded && (
            <Badge 
              count={<CheckOutlined className={styles.badgeIcon} />} 
              className={styles.downloadedBadge}
              size="small"
            />
          )}
        </div>
      </div>

      <Title level={5} className={styles.title}>
        {work.title}
      </Title>

      <Text type="secondary" className={styles.description}>
        {work.description}
      </Text>

      <div className={styles.purchaseInfo}>
        <Space direction="vertical" size={2} className={styles.fullWidth}>
          <Space size={8}>
            <CalendarOutlined className={styles.calendarIcon} />
            <Text type="secondary">Куплено: {formatDate(work.purchaseDate)}</Text>
          </Space>
          {work.holdUntil && work.status === 'paid' && work.secondsUntilHoldEnd && work.secondsUntilHoldEnd > 0 && (
            <Text type="secondary" className={styles.holdInfo}>
              Возврат возможен ещё: {formatTimeLeft(work.secondsUntilHoldEnd)}
            </Text>
          )}
        </Space>
      </div>

      <div className={styles.meta}>
        <Space size={4}>
          <Rate disabled value={work.rating} className={styles.rating} />
          <Text type="secondary">({work.reviewsCount})</Text>
        </Space>
        <Space size={8}>
          <EyeOutlined />
          <Text type="secondary">{work.viewsCount}</Text>
        </Space>
      </div>

      {work.deliveredFileAvailable && !isDisputed && (
        <div className={styles.ratingSection}>
          <Text type="secondary" className={styles.ratingLabel}>Ваша оценка:</Text>
          {work.userRating ? (
            <Rate disabled value={work.userRating} className={styles.userRating} />
          ) : (
            <Rate
              value={0}
              onChange={(value) => onRate?.(work.purchaseId, value)}
              className={styles.userRating}
            />
          )}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.price}>
          <Text type="secondary" className={styles.priceLabel}>
            Вы заплатили:
          </Text>
          <Text strong className={styles.currentPrice}>
            {work.price} ₽
          </Text>
        </div>
        <Space>
          {canDispute && (
            <AppButton
              variant="outline"
              danger
              icon={<WarningOutlined />}
              onClick={handleDispute}
            >
              Спор
            </AppButton>
          )}
          <AppButton
            variant="primary"
            icon={<DownloadOutlined />}
            disabled={!work.deliveredFileAvailable || isDisputed}
            onClick={(e) => {
              e.stopPropagation();
              onDownload(work.id);
            }}
            className={work.isDownloaded ? styles.downloadedButton : styles.downloadButton}
          >
            {work.isDownloaded ? 'Скачать снова' : 'Скачать'}
          </AppButton>
        </Space>
      </div>
    </AppCard>
  );
};

export default PurchasedWorkCard;
