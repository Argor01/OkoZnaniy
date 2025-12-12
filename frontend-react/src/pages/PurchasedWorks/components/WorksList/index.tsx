import React from 'react';
import { Row, Col, Empty, Spin } from 'antd';
import PurchasedWorkCard from '../PurchasedWorkCard';
import { PurchasedWork } from '../../types';
import styles from './WorksList.module.css';

interface WorksListProps {
  works: PurchasedWork[];
  loading?: boolean;
  onDownload: (id: number) => void;
}

const WorksList: React.FC<WorksListProps> = ({ works, loading, onDownload }) => {
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
          <PurchasedWorkCard work={work} onDownload={onDownload} />
        </Col>
      ))}
    </Row>
  );
};

export default WorksList;
