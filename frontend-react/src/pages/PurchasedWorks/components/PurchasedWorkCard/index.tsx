
import React from 'react';
import { Card, Tag, Button, Space, Typography, Rate, Badge } from 'antd';
import { EyeOutlined, DownloadOutlined, HeartOutlined, HeartFilled, CheckOutlined, CalendarOutlined } from '@ant-design/icons';
import { PurchasedWork } from '../../types';
import styles from './PurchasedWorkCard.module.css'; 

const { Text, Title } = Typography;

interface PurchasedWorkCardProps {
  work: PurchasedWork;
  onDownload: (id: number) => void;
  onFavorite?: (id: number) => void;
  onView?: (workId: number) => void;
}

const PurchasedWorkCard: React.FC<PurchasedWorkCardProps> = ({
  work,
  onDownload,
  onFavorite,
  onView,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <Card
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
          <Tag color="blue">{work.category}</Tag>
          {work.isDownloaded && (
            <Badge 
              count={<CheckOutlined className={styles.badgeIcon} />} 
              className={styles.downloadedBadge}
              size="small"
            />
          )}
        </div>
        <Button
          type="text"
          icon={work.isFavorite ? <HeartFilled className={styles.favoriteIcon} /> : <HeartOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(work.id);
          }}
        />
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

      <div className={styles.footer}>
        <div className={styles.price}>
          <Text type="secondary" className={styles.priceLabel}>
            Вы заплатили:
          </Text>
          <Text strong className={styles.currentPrice}>
            {work.price} ₽
          </Text>
          
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          disabled={!work.deliveredFileAvailable}
          onClick={(e) => {
            e.stopPropagation();
            onDownload(work.id);
          }}
          className={work.isDownloaded ? styles.downloadedButton : styles.downloadButton}
        >
          {work.isDownloaded ? 'Скачать снова' : 'Скачать'}
        </Button>
      </div>
    </Card>
  );
};

export default PurchasedWorkCard;
