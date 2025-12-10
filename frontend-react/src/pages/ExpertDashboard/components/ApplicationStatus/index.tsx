import React from 'react';
import { Button, Typography, Spin, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styles from '../../ExpertDashboard.module.css';

const { Text } = Typography;

export interface ApplicationStatusProps {
  application: any;
  applicationLoading: boolean;
  userProfile: any;
  isMobile: boolean;
  onOpenApplicationModal: () => void;
}

const getApplicationStatusIcon = (status: string) => {
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
  isMobile,
  onOpenApplicationModal,
}) => {
  if (applicationLoading) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Проверяем, что application это объект с полем status
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
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 }}>
            <Text type="danger" style={{ fontSize: 14 }}>
              <strong>Причина отклонения:</strong> {application.rejection_reason}
            </Text>
          </div>
        )}
        {application.status === 'rejected' && (
          <div style={{ marginTop: 16 }}>
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
    <div className={styles.emptyApplicationCard} style={{ position: 'relative', zIndex: 1 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Text style={{ fontSize: 16, color: '#6b7280' }}>
          У вас ещё нет анкеты. Заполните анкету для работы на платформе.
        </Text>
        <Button 
          type="primary" 
          size="large"
          className={styles.buttonPrimary}
          onClick={onOpenApplicationModal}
          style={{ marginTop: 8, position: 'relative', zIndex: 10 }}
        >
          Заполнить анкету
        </Button>
      </Space>
    </div>
  );
};

export default ApplicationStatus;
