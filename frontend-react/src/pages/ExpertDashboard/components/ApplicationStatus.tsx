import React from 'react';
import { Button, Spin, Typography, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ExpertApplication } from '../../../api/experts';
import type { UserProfile } from '../types';
import styles from '../ExpertDashboard.module.css';

const { Text } = Typography;

interface ApplicationStatusProps {
  application: ExpertApplication | null;
  applicationLoading: boolean;
  userProfile?: UserProfile;
  onEditApplication: () => void;
  onCreateApplication: () => void;
}

export const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  application,
  applicationLoading,
  userProfile,
  onEditApplication,
  onCreateApplication,
}) => {
  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined />;
      case 'approved':
        return <CheckCircleOutlined />;
      case 'rejected':
        return <CloseCircleOutlined />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      default:
        return '';
    }
  };

  if (applicationLoading) {
    return (
      <div className={`${styles.card} ${styles.applicationLoadingCard}`}>
        <Spin size="large" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className={styles.emptyApplicationCard}>
        <Space direction="vertical" className={styles.applicationEmptyStack} size="large">
          <Text className={styles.applicationEmptyText}>
            У вас ещё нет анкеты. Заполните анкету для работы на платформе.
          </Text>
          <Button
            type="primary"
            size="large"
            onClick={onCreateApplication}
            className={`${styles.buttonPrimary} ${styles.applicationEmptyButton}`}
          >
            Заполнить анкету
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div className={styles.applicationCard}>
      <div className={styles.applicationHeader}>
        <div>
          <h3 className={styles.applicationTitle}>Анкета</h3>
          <p className={styles.applicationSubtitle}>Статус рассмотрения</p>
        </div>
        <div className={`${styles.statusBadge} ${getStatusClass(application.status)}`}>
          {getApplicationStatusIcon(application.status)}
          <span>{application.status_display}</span>
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
          <Button type="primary" className={styles.buttonPrimary} size="large" onClick={onEditApplication}>
            Подать анкету заново
          </Button>
        </div>
      )}
    </div>
  );
};
