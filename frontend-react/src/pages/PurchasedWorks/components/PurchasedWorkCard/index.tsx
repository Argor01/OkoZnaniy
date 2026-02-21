
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tag color="blue">{work.category}</Tag>
          {work.isDownloaded && (
            <Badge 
              count={<CheckOutlined style={{ fontSize: 10, color: '#fff' }} />} 
              style={{ backgroundColor: '#52c41a' }}
              size="small"
            />
          )}
        </div>
        <Button
          type="text"
          icon={work.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
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

      <div style={{ 
        padding: '8px 0', 
        margin: '12px 0', 
        borderTop: '1px solid #f0f0f0',
        borderBottom: '1px solid #f0f0f0' 
      }}>
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Space size={8}>
            <CalendarOutlined style={{ color: '#8b5cf6' }} />
            <Text type="secondary">Куплено: {formatDate(work.purchaseDate)}</Text>
          </Space>
          
        </Space>
      </div>

      <div className={styles.meta}>
        <Space size={4}>
          <Rate disabled value={work.rating} style={{ fontSize: 14 }} />
          <Text type="secondary">({work.reviewsCount})</Text>
        </Space>
        <Space size={8}>
          <EyeOutlined />
          <Text type="secondary">{work.viewsCount}</Text>
        </Space>
      </div>

      <div className={styles.footer}>
        <div className={styles.price}>
          <Text type="secondary" style={{ fontSize: 12 }}>
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
          style={{
            background: work.isDownloaded ? '#10b981' : '#3b82f6'
          }}
        >
          {work.isDownloaded ? 'Скачать снова' : 'Скачать'}
        </Button>
      </div>
    </Card>
  );
};

export default PurchasedWorkCard;
