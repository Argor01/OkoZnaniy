import React from 'react';
import { Empty } from 'antd';
import styles from '../../ExpertDashboard.module.css';

interface WorksTabProps {
  isMobile: boolean;
  myCompleted: any[];
  myInProgress: any[];
}

const WorksTab: React.FC<WorksTabProps> = ({ isMobile, myCompleted, myInProgress }) => {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Мои работы</h2>
      </div>
      <div style={{ padding: '24px' }}>
        <Empty description="Нет работ для отображения" />
      </div>
    </div>
  );
};

export default WorksTab;
