import React from 'react';
import { Button, Typography, Spin, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ExpertApplication } from '../../../../api/experts';
import type { UserProfile } from '../../types';
import styles from '../../ExpertDashboard.module.css';

const { Text } = Typography;

export interface ApplicationStatusProps {
  application: ExpertApplication | null;
  applicationLoading: boolean;
  userProfile: UserProfile | null | undefined;
  onOpenApplicationModal: () => void;
}

const getApplicationStatusIcon = (status: ExpertApplication['status']) => {
  switch (status) {
    case 'pending': return <ClockCircleOutlined />;
    case 'approved': return <CheckCircleOutlined />;
    case 'rejected': return <CloseCircleOutlined />;
    default: return null;
  }
};

const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  application,
  applicationLoading,
  userProfile,
  onOpenApplicationModal,
}) => {
  if (applicationLoading) {
    return (
      <div className={`${styles.card} ${styles.applicationLoadingCard}`}>
        <Spin size="large" />
      </div>
    );
  }

  
  const hasValidApplication = application && 
    typeof application === 'object' && 
    !Array.isArray(application) &&
    'status' in application;

  if (hasValidApplication) {
    const isDeactivated = (() => {
      try {
        const raw = localStorage.getItem('director_deactivated_employees');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) && userProfile?.id ? arr.includes(userProfile.id) : false;
      } catch {
        return false;
      }
    })();

    const statusClass = isDeactivated ? styles.statusRejected :
      application.status === 'pending' ? styles.statusPending :
      application.status === 'approved' ? styles.statusApproved :
      styles.statusRejected;

    const statusIcon = isDeactivated ? <CloseCircleOutlined /> : getApplicationStatusIcon(application.status);
    const statusText = isDeactivated ? 'Деактивирован' : application.status_display;

    return (
      <div className={styles.applicationCard}>
        <div className={styles.applicationHeader}>
          <div>
            <h3 className={styles.applicationTitle}>Анкета</h3>
            <p className={styles.applicationSubtitle}>Статус рассмотрения</p>
          </div>
          <div className={`${styles.statusBadge} ${statusClass}`}>
            {statusIcon}
            <span>{statusText}</span>
          </div>
        </div>
        {application.status === 'rejected' && application.rejection_reason && (
          <div className={styles.applicationRejectBox}>
            <Text type="danger" className={styles.applicationRejectText}>
              <strong>Причина отклонения:</strong> {application.rejection_reason}
            </Text>
          </div>
        )}
        {application.status === 'rejected' && (
          <div className={styles.applicationActionRow}>
            <Button
              type="primary"
              className={styles.buttonPrimary}
              size="large"
              onClick={onOpenApplicationModal}
            >
              Подать анкету заново
            </Button>
          </div>
        )}
      </div>
    );
  }


  
  return (
    <div className={`${styles.emptyApplicationCard} ${styles.applicationEmptyCard}`}>
      <Space direction="vertical" className={styles.applicationEmptyStack} size="large">
        <Text className={styles.applicationEmptyText}>
          У вас ещё нет анкеты. Заполните анкету для работы на платформе.
        </Text>
        <Button 
          type="primary" 
          size="large"
          onClick={onOpenApplicationModal}
          className={`${styles.buttonPrimary} ${styles.applicationEmptyButton}`}
        >
          Заполнить анкету
        </Button>
      </Space>
    </div>
  );
};

export default ApplicationStatus;
