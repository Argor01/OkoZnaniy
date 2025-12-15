import React from 'react';
import { Card, Tag, Button, Space, Typography, Rate, Popconfirm } from 'antd';
import { EyeOutlined, ShoppingCartOutlined, HeartOutlined, HeartFilled, DeleteOutlined } from '@ant-design/icons';
import { Work } from '../../types';
import styles from './WorkCard.module.css';

const { Text, Title } = Typography;

interface WorkCardProps {
  work: Work;
  onView: (id: number) => void;
  onFavorite: (id: number) => void;
  onPurchase: (id: number) => void;
  onDelete?: (id: number) => void;
  allowDelete?: boolean;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, onView, onFavorite, onPurchase, onDelete, allowDelete }) => {
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
        <Space size={4}>
          <Button
            type="text"
            icon={work.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(work.id);
            }}
          />
          {allowDelete && onDelete && (
            <Popconfirm
              title="Удалить работу?"
              okText="Да"
              cancelText="Нет"
              onConfirm={() => onDelete(work.id)}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </Space>
      </div>

      <Title level={5} className={styles.title} ellipsis={{ rows: 2 }}>
        {work.title}
      </Title>

      <div
        className={styles.description}
        dangerouslySetInnerHTML={{ __html: work.description }}
      />

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
