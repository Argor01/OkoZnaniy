import React, { useState } from 'react';
import { Modal, Typography, Tag, Empty, Spin } from 'antd';
import { 
  TrophyOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HourglassOutlined,
  CalendarOutlined,
  DollarOutlined,
  PaperClipOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  ReadOutlined,
  NumberOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi, Complaint } from '@/features/arbitration/api/complaints';
import { AppButton } from '@/components/ui';
import styles from './ArbitrationModal.module.css';

const { Text, Paragraph, Title } = Typography;

interface ArbitrationModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const STATUS_CONFIG: Record<Complaint['status'], {
  key: string;
  color: string;
  icon: React.ReactNode;
  label: string;
  tabLabel: string;
}> = {
  open: { 
    key: 'open',
    color: 'green', 
    icon: <HourglassOutlined />, 
    label: 'Открыт',
    tabLabel: 'Открытые'
  },
  in_progress: { 
    key: 'in_progress',
    color: 'blue', 
    icon: <ClockCircleOutlined />, 
    label: 'В работе',
    tabLabel: 'В работе'
  },
  resolved: { 
    key: 'resolved',
    color: 'cyan', 
    icon: <CheckCircleOutlined />, 
    label: 'Решён',
    tabLabel: 'Решённые'
  },
  closed: { 
    key: 'closed',
    color: 'default', 
    icon: <CloseCircleOutlined />, 
    label: 'Закрыт',
    tabLabel: 'Закрытые'
  },
};

const ArbitrationModal: React.FC<ArbitrationModalProps> = ({
  visible,
  onClose,
  isMobile
}) => {
  const [arbitrationStatusFilter, setArbitrationStatusFilter] = useState<Complaint['status'] | 'all'>('all');

    const { data: complaints, isLoading } = useQuery<Complaint[]>({
    queryKey: ['complaints'],
    queryFn: async () => {
      const response = await complaintsApi.getAll();
      // Если ответ содержит results (пагинация), используем его
      return Array.isArray(response) ? response : (response as any).results || [];
    },
    enabled: visible,
  });
  const statusConfigMap = {
    pending: {
      badge: styles.arbitrationStatusBadgePending,
      icon: styles.arbitrationStatusIconPending,
      text: styles.arbitrationStatusTextPending,
      label: 'Ожидает рассмотрения',
      Icon: ClockCircleOutlined,
    },
    in_review: {
      badge: styles.arbitrationStatusBadgeInReview,
      icon: styles.arbitrationStatusIconInReview,
      text: styles.arbitrationStatusTextInReview,
      label: 'На рассмотрении',
      Icon: FileDoneOutlined,
    },
    resolved: {
      badge: styles.arbitrationStatusBadgeResolved,
      icon: styles.arbitrationStatusIconResolved,
      text: styles.arbitrationStatusTextResolved,
      label: 'Решено',
      Icon: CheckCircleOutlined,
    },
    rejected: {
      badge: styles.arbitrationStatusBadgeRejected,
      icon: styles.arbitrationStatusIconRejected,
      text: styles.arbitrationStatusTextRejected,
      label: 'Отклонено',
      Icon: CloseCircleOutlined,
    },
    default: {
      badge: styles.arbitrationStatusBadgeDefault,
      icon: styles.arbitrationStatusIconDefault,
      text: styles.arbitrationStatusTextDefault,
      label: 'Неизвестно',
      Icon: QuestionCircleOutlined,
    },
  } as const;

    const filteredComplaints = complaints?.filter(
    (c) => arbitrationStatusFilter === 'all' || c.status === arbitrationStatusFilter
  ) || [];

  const getTabCount = (status: Complaint['status']) => {
    return complaints?.filter((c) => c.status === status).length || 0;
  };

  const handleViewDetails = (complaintId: number) => {
    onClose();
    window.location.href = `/arbitration/complaint/${complaintId}`;
  };

  return (
    <Modal
      title={null}
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 'calc(100vw - 300px)'}
      wrapClassName={`${styles.arbitrationModalWrap} ${isMobile ? styles.arbitrationModalWrapMobile : styles.arbitrationModalWrapDesktop}`}
    >
      <div className={`${styles.arbitrationModalContent} ${isMobile ? styles.arbitrationModalContentMobile : styles.arbitrationModalContentDesktop}`}>
        <Title level={3} className={`${styles.arbitrationModalTitle} ${isMobile ? styles.arbitrationModalTitleMobile : styles.arbitrationModalTitleDesktop}`}>
          <TrophyOutlined className={styles.arbitrationModalTitleIcon} />
          Арбитраж
        </Title>

        <div className={`${styles.arbitrationModalTabs} ${isMobile ? styles.arbitrationModalTabsMobile : styles.arbitrationModalTabsDesktop}`}>
          <div
            onClick={() => setArbitrationStatusFilter('all')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'all' ? styles.arbitrationModalTabActiveAll : styles.arbitrationModalTabInactive}`}
          >
            <TrophyOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'all' ? styles.arbitrationModalTabIconAll : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'all' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Все
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('open')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'open' ? styles.arbitrationModalTabActivePending : styles.arbitrationModalTabInactive}`}
          >
            <HourglassOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'open' ? styles.arbitrationModalTabIconPending : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'open' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Открытые
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('in_progress')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'in_progress' ? styles.arbitrationModalTabActiveInReview : styles.arbitrationModalTabInactive}`}
          >
            <ClockCircleOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'in_progress' ? styles.arbitrationModalTabIconInReview : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'in_progress' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              В работе
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('resolved')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'resolved' ? styles.arbitrationModalTabActiveResolved : styles.arbitrationModalTabInactive}`}
          >
            <CheckCircleOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'resolved' ? styles.arbitrationModalTabIconResolved : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'resolved' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Решённые
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('closed')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'closed' ? styles.arbitrationModalTabActiveRejected : styles.arbitrationModalTabInactive}`}
          >
            <CloseCircleOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'closed' ? styles.arbitrationModalTabIconRejected : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'closed' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Закрытые
            </Text>
          </div>
        </div>

        {complaints?.some(c => c.status === 'open') && (
          <div className={styles.arbitrationModalNotice}>
            <HourglassOutlined className={styles.arbitrationModalNoticeIcon} />
            <Text>
              У вас есть открытые претензии. Заказ автоматически заморожен до изменения статуса по претензии.
            </Text>
          </div>
        )}

                <div className={styles.arbitrationModalList}>
          {isLoading ? (
            <div className={styles.arbitrationModalEmpty}>
              <Spin size="large" tip="Загрузка претензий..." />
            </div>
          ) : filteredComplaints.length > 0 ? (
            <div className={styles.arbitrationModalListInner}>
              {filteredComplaints.map((complaint) => {
                const statusConfig = STATUS_CONFIG[complaint.status];

                return (
                                    <div
                    key={complaint.id}
                    className={`${styles.arbitrationModalCard} ${isMobile ? styles.arbitrationModalCardMobile : styles.arbitrationModalCardDesktop}`}
                  >
                    <div className={`${styles.arbitrationModalCardHeader} ${isMobile ? styles.arbitrationModalCardHeaderMobile : styles.arbitrationModalCardHeaderDesktop}`}>
                      <div className={`${styles.arbitrationModalCardHeaderInfo} ${isMobile ? styles.arbitrationModalCardHeaderInfoMobile : styles.arbitrationModalCardHeaderInfoDesktop}`}>
                        <Text strong className={`${styles.arbitrationModalCardTitle} ${isMobile ? styles.arbitrationModalCardTitleMobile : styles.arbitrationModalCardTitleDesktop}`}>
                          Претензия №{complaint.id}
                        </Text>
                        <Text type="secondary" className={`${styles.arbitrationModalCardMeta} ${isMobile ? styles.arbitrationModalCardMetaMobile : styles.arbitrationModalCardMetaDesktop}`}>
                          Заказ №{complaint.order.id}
                        </Text>
                      </div>
                      <Tag 
                        icon={statusConfig.icon}
                        color={statusConfig.color}
                        className={`${styles.arbitrationModalStatusBadge} ${isMobile ? styles.arbitrationModalStatusBadgeMobile : styles.arbitrationModalStatusBadgeDesktop}`}
                      >
                        {statusConfig.label}
                      </Tag>
                    </div>

                    {/* Сетка характеристик в стиле OrderDetail */}
                    <div className={styles.arbitrationModalGrid}>
                      <div className={styles.arbitrationModalGridItem}>
                        <div className={styles.arbitrationModalGridIcon}>
                          <NumberOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Объект спора</div>
                          <div className={styles.arbitrationModalGridValue}>Заказ №{complaint.order.id}</div>
                        </div>
                      </div>
                      
                                            <div className={styles.arbitrationModalGridItem}>
                        <div className={`${styles.arbitrationModalGridIcon} ${styles.arbitrationModalGridIconPurple}`}>
                          <BookOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Тип претензии</div>
                          <div className={styles.arbitrationModalGridValue}>
                            {complaint.complaint_type === 'not_completed' && 'Заказ не выполнен'}
                            {complaint.complaint_type === 'poor_quality' && 'Заказ выполнен некачественно'}
                            {complaint.complaint_type === 'not_paid' && 'Заказ не оплачен'}
                            {complaint.complaint_type === 'unjustified_review' && 'Необоснованный отзыв'}
                            {complaint.complaint_type === 'ready_works_shop' && 'Магазин готовых работ'}
                            {complaint.complaint_type === 'other' && 'Другое'}
                          </div>
                        </div>
                      </div>
                      
                                            <div className={styles.arbitrationModalGridItem}>
                        <div className={`${styles.arbitrationModalGridIcon} ${styles.arbitrationModalGridIconOrange}`}>
                          <ReadOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Финансовые требования</div>
                          <div className={styles.arbitrationModalGridValue}>
                            {complaint.financial_requirement === 'prepayment_refund' && 'Возврат предоплаты'}
                            {complaint.financial_requirement === 'prepayment_refund_plus_penalty' && 'Возврат предоплаты и неустойка'}
                            {complaint.financial_requirement === 'no_refund' && 'Возврат не требуется'}
                            {complaint.refund_percent && ` (${complaint.refund_percent}%)`}
                          </div>
                        </div>
                      </div>
                      
                                            <div className={styles.arbitrationModalGridItem}>
                        <div className={`${styles.arbitrationModalGridIcon} ${styles.arbitrationModalGridIconDefault}`}>
                          <DatabaseOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Дата подачи</div>
                          <div className={styles.arbitrationModalGridValue}>
                            {new Date(complaint.created_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.arbitrationModalDescriptionWrapper}>
                      <Text strong className={styles.arbitrationModalDescriptionTitle}>Описание:</Text>
                      <Paragraph 
                        ellipsis={{ rows: 2, expandable: true, symbol: 'Показать больше' }}
                        className={styles.arbitrationModalDescription}
                      >
                        {complaint.description}
                      </Paragraph>
                    </div>

                    {complaint.resolution && (
                      <div className={`${styles.arbitrationModalDecision} ${complaint.status === 'resolved' ? styles.arbitrationModalDecisionResolved : styles.arbitrationModalDecisionRejected}`}>
                        <Text strong className={`${styles.arbitrationModalDecisionTitle} ${complaint.status === 'resolved' ? styles.arbitrationModalDecisionTitleResolved : styles.arbitrationModalDecisionTitleRejected}`}>
                          Резолюция:
                        </Text>
                        <Text className={`${styles.arbitrationModalDecisionText} ${complaint.status === 'resolved' ? styles.arbitrationModalDecisionTextResolved : styles.arbitrationModalDecisionTextRejected}`}>
                          {complaint.resolution}
                        </Text>
                      </div>
                    )}

                    <div className={`${styles.arbitrationModalFooter} ${isMobile ? styles.arbitrationModalFooterMobile : styles.arbitrationModalFooterDesktop}`}>
                      <AppButton
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(complaint.id)}
                      >
                        Подробнее
                      </AppButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.arbitrationModalEmpty}>
              <TrophyOutlined className={styles.arbitrationModalEmptyIcon} />
              <Text type="secondary" className={styles.arbitrationModalEmptyText}>
                {arbitrationStatusFilter === 'all' 
                  ? 'У вас нет претензий' 
                  : `Нет претензий со статусом "${STATUS_CONFIG[arbitrationStatusFilter as Complaint['status']]?.label || ''}"`
                }
              </Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ArbitrationModal;
