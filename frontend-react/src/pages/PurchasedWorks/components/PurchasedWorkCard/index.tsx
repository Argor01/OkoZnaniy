import React from 'react';
import { Card, Button, Tag, Typography, Space } from 'antd';
import { DownloadOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PurchasedWork } from '../../types';
import styles from './PurchasedWorkCard.module.css';

const { Text, Title } = Typography;

interface PurchasedWorkCardProps {
  work: PurchasedWork;
  onDownload: (id: number) => void;
}

const PurchasedWorkCard: React.FC<PurchasedWorkCardProps> = ({ work, onDownload }) => {
  return (
    <Card className={styles.card} hoverable>
      {/* Заголовок с тегами */}
      <div className={styles.header}>
        <Tag color="blue" className={styles.typeTag}>
          {work.type}
        </Tag>
        {work.isDownloaded ? (
          <Tag icon={<CheckCircleOutlined />} color="success" className={styles.statusTag}>
            Скачано
          </Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="default" className={styles.statusTag}>
            Не скачано
          </Tag>
        )}
      </div>

      {/* Название */}
      <Title level={5} className={styles.title}>
        {work.title}
      </Title>

      {/* Описание */}
      <div className={styles.description}>{work.description}</div>

      {/* Информация */}
      <div className={styles.info}>
        <div className={styles.infoRow}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Предмет:
          </Text>
          <Text strong style={{ fontSize: 13 }}>
            {work.subject}
          </Text>
        </div>
        <div className={styles.infoRow}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Куплено:
          </Text>
          <Text strong style={{ fontSize: 13 }}>
            {dayjs(work.purchaseDate).format('DD.MM.YYYY')}
          </Text>
        </div>
        {work.downloadCount > 0 && (
          <div className={styles.infoRow}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Скачиваний:
            </Text>
            <Text strong style={{ fontSize: 13 }}>
              {work.downloadCount}
            </Text>
          </div>
        )}
      </div>

      {/* Футер с ценой и кнопкой */}
      <div className={styles.footer}>
        <div className={styles.priceBlock}>
          {work.originalPrice && work.originalPrice > work.price && (
            <div className={styles.originalPrice}>{work.originalPrice} ₽</div>
          )}
          <div className={styles.currentPrice}>{work.price} ₽</div>
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => onDownload(work.id)}
          className={styles.downloadButton}
        >
          Скачать
        </Button>
      </div>
    </Card>
  );
};

export default PurchasedWorkCard;
