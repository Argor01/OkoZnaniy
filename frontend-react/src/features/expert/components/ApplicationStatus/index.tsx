import React from 'react';
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
    case 'deactivated': return <CloseCircleOutlined />;
    default: return null;
  }
};

const getStatusText = (status: ExpertApplication['status'], display?: string) => {
  switch (status) {
    case 'pending': return 'На рассмотрении';
    case 'approved': return 'Одобрено';
    case 'rejected': return 'Отказано';
    case 'needs_revision': return 'На доработке';
    case 'deactivated': return 'Деактивирован';
    default: return display || 'Неизвестный статус';
  }
};

const ApplicationStatus: React.FC<ApplicationStatusProps> = React.memo(({
  application,
  applicationLoading,
  onOpenApplicationModal,
}) => {
  const hasValidApplication = application && 
    typeof application === 'object' && 
    !Array.isArray(application) &&
    'status' in application;

  if (applicationLoading) {
    return (
      <div className={`${styles.applicationCard} ${styles.applicationLoadingCard}`}>
        <Spin size="large" />
      </div>
    );
  }

  if (hasValidApplication) {
    const statusClass =
      application.status === 'pending' ? styles.statusPending :
      application.status === 'approved' ? styles.statusApproved :
      application.status === 'needs_revision' ? styles.statusWarning :
      styles.statusRejected;

    const statusIcon = getApplicationStatusIcon(application.status);
    const statusText = getStatusText(application.status, application.status_display);
    const isNegativeStatus = application.status === 'rejected' || application.status === 'deactivated';
    const rawReviewComment = String(application.rejection_reason || application.comment || '').trim();
    const reviewComment = application.status === 'needs_revision'
      ? rawReviewComment.replace(/^(требуется\s*доработка\s*:\s*)+/i, '').trim()
      : rawReviewComment;

    return (
      <div className={styles.applicationCard}>
        <div className={styles.applicationHeader}>
          <div>
            <h3 className={styles.applicationTitle}>Анкета</h3>
            {!isNegativeStatus && <p className={styles.applicationSubtitle}>Статус рассмотрения</p>}
          </div>
          <div className={isNegativeStatus ? styles.statusContainer : ''}>
            {isNegativeStatus && <span className={styles.statusLabel}>Статус рассмотрения</span>}
            <div className={`${styles.statusBadge} ${statusClass}`}>
              {statusIcon}
              <span>{statusText}</span>
            </div>
          </div>
        </div>
        {(application.status === 'rejected' || application.status === 'needs_revision') && reviewComment && (
          <div className={styles.applicationRejectBox}>
            <Text type="danger" className={styles.applicationRejectText}>
              <strong>{application.status === 'needs_revision' ? 'Требуется доработка:' : 'Причина отказа:'}</strong> {reviewComment}
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
