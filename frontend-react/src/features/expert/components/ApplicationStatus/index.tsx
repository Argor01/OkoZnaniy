import React, { useMemo } from 'react';
import { Button, Typography, Spin, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import type { ExpertApplication } from '@/features/expert/api/experts';
import type { UserProfile } from '../../types';
import styles from './ApplicationStatus.module.css';

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
    case 'needs_revision': return <EditOutlined />;
    default: return null;
  }
};

const getStatusText = (status: ExpertApplication['status'], display?: string) => {
  if (display) return display;
  switch (status) {
    case 'pending': return 'На рассмотрении';
    case 'approved': return 'Одобрено';
    case 'rejected': return 'Отклонено';
    case 'needs_revision': return 'Требуется доработка';
    default: return 'Неизвестный статус';
  }
};

const ApplicationStatus: React.FC<ApplicationStatusProps> = React.memo(({
  application,
  applicationLoading,
  userProfile,
  onOpenApplicationModal,
}) => {
  if (applicationLoading) {
    return (
      <div className={`${styles.applicationCard} ${styles.applicationLoadingCard}`}>
        <Spin size="large" />
      </div>
    );
  }

  const hasValidApplication = application && 
    typeof application === 'object' && 
    !Array.isArray(application) &&
    'status' in application;

  const isDeactivated = useMemo(() => {
    try {
      const raw = localStorage.getItem('director_deactivated_employees');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) && userProfile?.id ? arr.includes(userProfile.id) : false;
    } catch {
      return false;
    }
  }, [userProfile?.id]);

  if (hasValidApplication) {
    const statusClass = isDeactivated ? styles.statusRejected :
      application.status === 'pending' ? styles.statusPending :
      application.status === 'approved' ? styles.statusApproved :
      application.status === 'needs_revision' ? styles.statusWarning :
      styles.statusRejected;

    const statusIcon = isDeactivated ? <CloseCircleOutlined /> : getApplicationStatusIcon(application.status);
    const statusText = isDeactivated ? 'Деактивирован' : getStatusText(application.status, application.status_display);

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
        {(application.status === 'rejected' || application.status === 'needs_revision') && (application.rejection_reason || application.comment) && (
          <div className={styles.applicationRejectBox}>
            <Text type="danger" className={styles.applicationRejectText}>
              <strong>{application.status === 'needs_revision' ? 'Комментарий:' : 'Причина отклонения:'}</strong> {application.rejection_reason || application.comment}
            </Text>
          </div>
        )}
        {(application.status === 'rejected' || application.status === 'needs_revision') && (
          <div className={styles.applicationActionRow}>
            <Button
              type="primary"
              className={styles.buttonPrimary}
              size="large"
              onClick={onOpenApplicationModal}
            >
              {application.status === 'needs_revision' ? 'Исправить анкету' : 'Подать анкету заново'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.applicationCard} ${styles.applicationEmptyCard}`}>
      <Space direction="vertical" className={styles.applicationEmptyStack} size="large">
        <Text className={styles.applicationEmptyText}>
          У вас ещё нет анкеты. Заполните анкету для работы на платформе.
        </Text>
        <Button 
          type="primary" 
          size="large"
          onClick={onOpenApplicationModal}
          className={styles.buttonPrimary}
        >
          Заполнить анкету
        </Button>
      </Space>
    </div>
  );
});

export default ApplicationStatus;
