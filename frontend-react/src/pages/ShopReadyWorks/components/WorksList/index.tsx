import React from 'react';
import { Row, Col, Empty, Spin } from 'antd';
import WorkCard from '../WorkCard';
import { Work } from '../../types';
import styles from './WorksList.module.css';

interface WorksListProps {
  works: Work[];
  loading?: boolean;
  onWorkClick: (id: number) => void;
  onFavorite: (id: number) => void;
  onPurchase: (id: number) => void;
  onDelete?: (id: number) => void;
  currentUserId?: number;
}

const WorksList: React.FC<WorksListProps> = ({
  works,
  loading,
  onWorkClick,
  onFavorite,
  onPurchase,
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
          <WorkCard
            work={work}
            onView={onWorkClick}
            onFavorite={onFavorite}
            onPurchase={onPurchase}
            onDelete={onDelete}
            allowDelete={!!currentUserId && work.author.id === currentUserId}
          />
        </Col>
      ))}
    </Row>
  );
};

export default WorksList;
