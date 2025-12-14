import React from 'react';
import { Card, Tag, Button, Space, Typography, Rate } from 'antd';
import { EyeOutlined, ShoppingCartOutlined, HeartOutlined, HeartFilled, StarFilled } from '@ant-design/icons';
import { Work } from '../../types';
import styles from './WorkCard.module.css';

const { Text, Title } = Typography;

interface WorkCardProps {
  work: Work;
  onView: (id: number) => void;
  onFavorite: (id: number) => void;
  onPurchase: (id: number) => void;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, onView, onFavorite, onPurchase }) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <Card
      hoverable
      className={styles.card}
      onClick={() => onView(work.id)}
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
          <div className={styles.noPreview}>Нет превью</div>
        )
      }
    >
      <div className={styles.header}>
        <Tag color="blue">{work.category}</Tag>
        <Button
          type="text"
          icon={work.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(work.id);
          }}
        />
      </div>

      <Title level={5} className={styles.title} ellipsis={{ rows: 2 }}>
        {work.title}
      </Title>

      <Text type="secondary" className={styles.description} ellipsis={{ rows: 2 }}>
        {work.description}
      </Text>

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
          {work.discount && (
            <Text delete type="secondary" className={styles.originalPrice}>
              {work.originalPrice} ₽
            </Text>
          )}
          <Text strong className={styles.currentPrice}>
            {work.price} ₽
          </Text>
          {work.discount && (
            <Tag color="red" className={styles.discount}>
              -{work.discount}%
            </Tag>
          )}
        </div>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onPurchase(work.id);
          }}
        >
          Купить
        </Button>
      </div>
    </Card>
  );
};

export default WorkCard;
