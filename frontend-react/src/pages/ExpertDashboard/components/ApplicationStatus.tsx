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
      <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className={styles.emptyApplicationCard}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Text style={{ fontSize: 16, color: '#6b7280' }}>
            У вас ещё нет анкеты. Заполните анкету для работы на платформе.
          </Text>
          <Button
            type="primary"
            size="large"
            className={styles.buttonPrimary}
            onClick={onCreateApplication}
            style={{ marginTop: 8 }}
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
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 }}>
          <Text type="danger" style={{ fontSize: 14 }}>
            <strong>Причина отклонения:</strong> {application.rejection_reason}
          </Text>
        </div>
      )}
      {application.status === 'rejected' && (
        <div style={{ marginTop: 16 }}>
          <Button type="primary" className={styles.buttonPrimary} size="large" onClick={onEditApplication}>
            Подать анкету заново
          </Button>
        </div>
      )}
    </div>
  );
};
