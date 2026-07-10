import React from 'react';
import DOMPurify from 'dompurify';
import { Tag, Space, Typography, Rate, Popconfirm, Avatar } from 'antd';
import { EyeOutlined, ShoppingCartOutlined, DeleteOutlined, UserOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Work } from '@/features/shop/types';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { getDisplayUsername, isEmailLike } from '@/utils/formatters';
import styles from './WorkCard.module.css';

const { Text, Title } = Typography;

const getAuthorDisplayName = (work: Work): string => {
  if (work.author) {
    return getDisplayUsername(work.author);
  }

  const authorName = work.author?.name?.trim();
  if (authorName && !isEmailLike(authorName)) {
    return authorName;
  }

  const fallbackAuthorName = work.author_name?.trim();
  if (fallbackAuthorName && !isEmailLike(fallbackAuthorName)) {
    return fallbackAuthorName;
  }

  return 'Неизвестен';
};

interface WorkCardProps {
  work: Work;
  onView: (id: number) => void;
  onPurchase: (id: number) => void;
  onDownload?: (id: number) => void;
  isPurchased?: boolean;
  canDownload?: boolean;
  onDelete?: (id: number) => void;
  allowDelete?: boolean;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, onView, onPurchase, onDownload, isPurchased, canDownload, onDelete, allowDelete }) => {
  const [imageError, setImageError] = React.useState(false);
  const navigate = useNavigate();

  return (
    <AppCard
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
        <Tag color="purple">{work.category}</Tag>
        <Space size={4}>
          {allowDelete && onDelete && (
            <Popconfirm
              title="Удалить работу?"
              okText="Да"
              cancelText="Нет"
              onConfirm={() => onDelete(work.id)}
              onCancel={(e) => e?.stopPropagation()}
            >
              <AppButton
                variant="text"
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
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(work.description || '') }}
      />

      {work.author && (
        <div className={styles.author}>
          <Space size={8} align="center">
            <Avatar 
              size="small" 
              src={work.author.avatar || work.author_avatar} 
              icon={<UserOutlined />} 
              className={styles.authorAvatar}
            />
            <AppButton 
              variant="link" 
              className={styles.authorLink}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${work.author.username}`);
              }}
            >
              {getAuthorDisplayName(work)}
            </AppButton>
          </Space>
        </div>
      )}

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
          <Text strong className={styles.currentPrice}>
            {work.price} ₽
          </Text>
        </div>
        {!allowDelete && (
          <AppButton
            variant="primary"
            icon={isPurchased ? <DownloadOutlined /> : <ShoppingCartOutlined />}
            disabled={isPurchased ? !canDownload : false}
            onClick={(e) => {
              e.stopPropagation();
              if (isPurchased) {
                onDownload?.(work.id);
                return;
              }
              onPurchase(work.id);
            }}
          >
            {isPurchased ? 'Скачать' : 'Купить'}
          </AppButton>
        )}
      </div>
    </AppCard>
  );
};

export default WorkCard;
