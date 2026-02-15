import React from 'react';
import { Row, Col, Empty, Spin } from 'antd';
import WorkCard from '../WorkCard';
import { Work } from '../../types';
import type { Purchase } from '../../../../api/shop';
import styles from './WorksList.module.css';

interface WorksListProps {
  works: Work[];
  loading?: boolean;
  onWorkClick: (id: number) => void;
  onFavorite: (id: number) => void;
  onPurchase: (id: number) => void;
  onDownload?: (id: number) => void;
  purchasesByWorkId?: Record<number, Purchase>;
  onDelete?: (id: number) => void;
  currentUserId?: number;
}

const WorksList: React.FC<WorksListProps> = ({
  works,
  loading,
  onWorkClick,
  onFavorite,
  onPurchase,
  onDownload,
  purchasesByWorkId,
  onDelete,
  currentUserId,
}) => {
  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <Empty
        description="Работы не найдены"
        className={styles.empty}
      />
    );
  }

  return (
    <Row gutter={[16, 16]} className={styles.grid}>
      {works.map((work) => (
        <Col key={work.id} xs={24} sm={12} md={8} lg={6}>
          {(() => {
            const purchase = purchasesByWorkId?.[work.id];
            const isPurchased = !!purchase;
            const canDownload = !!purchase?.delivered_file_url;
            return (
          <WorkCard
            work={work}
            onView={onWorkClick}
            onFavorite={onFavorite}
            onPurchase={onPurchase}
            onDownload={onDownload}
            isPurchased={isPurchased}
            canDownload={canDownload}
            onDelete={onDelete}
            allowDelete={!!currentUserId && work.author.id === currentUserId}
          />
            );
          })()}
        </Col>
      ))}
    </Row>
  );
};

export default WorksList;
