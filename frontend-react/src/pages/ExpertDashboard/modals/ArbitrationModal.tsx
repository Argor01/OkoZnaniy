import React, { useState } from 'react';
import { Modal, Typography } from 'antd';
import { 
  TrophyOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import { ArbitrationCase } from '../types';
import styles from '../ExpertDashboard.module.css';

const { Text, Paragraph } = Typography;

interface ArbitrationModalProps {
  visible: boolean;
  onClose: () => void;
  cases: ArbitrationCase[];
  isMobile: boolean;
}

const ArbitrationModal: React.FC<ArbitrationModalProps> = ({
  visible,
  onClose,
  cases,
  isMobile
}) => {
  const [arbitrationStatusFilter, setArbitrationStatusFilter] = useState<string>('all');
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
        <Text strong className={`${styles.arbitrationModalTitle} ${isMobile ? styles.arbitrationModalTitleMobile : styles.arbitrationModalTitleDesktop}`}>
          Арбитраж
        </Text>

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
            onClick={() => setArbitrationStatusFilter('pending')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'pending' ? styles.arbitrationModalTabActivePending : styles.arbitrationModalTabInactive}`}
          >
            <ClockCircleOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'pending' ? styles.arbitrationModalTabIconPending : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'pending' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Ожидает
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('in_review')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'in_review' ? styles.arbitrationModalTabActiveInReview : styles.arbitrationModalTabInactive}`}
          >
            <FileDoneOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'in_review' ? styles.arbitrationModalTabIconInReview : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'in_review' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              На рассмотрении
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('resolved')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'resolved' ? styles.arbitrationModalTabActiveResolved : styles.arbitrationModalTabInactive}`}
          >
            <CheckCircleOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'resolved' ? styles.arbitrationModalTabIconResolved : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'resolved' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Решено
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('rejected')}
            className={`${styles.arbitrationModalTab} ${arbitrationStatusFilter === 'rejected' ? styles.arbitrationModalTabActiveRejected : styles.arbitrationModalTabInactive}`}
          >
            <CloseCircleOutlined className={`${styles.arbitrationModalTabIcon} ${arbitrationStatusFilter === 'rejected' ? styles.arbitrationModalTabIconRejected : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${arbitrationStatusFilter === 'rejected' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Отклонено
            </Text>
          </div>
        </div>

        <div className={styles.arbitrationModalList}>
          {(cases || []).filter(arbitration => {
            if (arbitrationStatusFilter === 'all') return true;
            return arbitration.status === arbitrationStatusFilter;
          }).length > 0 ? (
            <div className={styles.arbitrationModalListInner}>
              {(cases || [])
                .filter(arbitration => {
                  if (arbitrationStatusFilter === 'all') return true;
                  return arbitration.status === arbitrationStatusFilter;
                })
                .map((arbitration) => {
                const statusConfig = statusConfigMap[arbitration.status as keyof typeof statusConfigMap] || statusConfigMap.default;
                const StatusIcon = statusConfig.Icon;

                return (
                  <div
                    key={arbitration.id}
                    className={`${styles.arbitrationModalCard} ${isMobile ? styles.arbitrationModalCardMobile : styles.arbitrationModalCardDesktop}`}
                  >
                    <div className={`${styles.arbitrationModalCardHeader} ${isMobile ? styles.arbitrationModalCardHeaderMobile : styles.arbitrationModalCardHeaderDesktop}`}>
                      <div className={`${styles.arbitrationModalCardHeaderInfo} ${isMobile ? styles.arbitrationModalCardHeaderInfoMobile : styles.arbitrationModalCardHeaderInfoDesktop}`}>
                        <Text strong className={`${styles.arbitrationModalCardTitle} ${isMobile ? styles.arbitrationModalCardTitleMobile : styles.arbitrationModalCardTitleDesktop}`}>
                          Заказ #{arbitration.orderId}: {arbitration.orderTitle}
                        </Text>
                        <Text type="secondary" className={`${styles.arbitrationModalCardMeta} ${isMobile ? styles.arbitrationModalCardMetaMobile : styles.arbitrationModalCardMetaDesktop}`}>
                          Заказчик: {arbitration.clientName}
                        </Text>
                      </div>
                      <div className={`${styles.arbitrationModalStatusBadge} ${statusConfig.badge} ${isMobile ? styles.arbitrationModalStatusBadgeMobile : styles.arbitrationModalStatusBadgeDesktop}`}>
                        <span className={`${styles.arbitrationModalStatusIcon} ${statusConfig.icon} ${isMobile ? styles.arbitrationModalStatusIconMobile : styles.arbitrationModalStatusIconDesktop}`}>
                          <StatusIcon />
                        </span>
                        <Text className={`${styles.arbitrationModalStatusText} ${statusConfig.text} ${isMobile ? styles.arbitrationModalStatusTextMobile : styles.arbitrationModalStatusTextDesktop}`}>
                          {statusConfig.label}
                        </Text>
                      </div>
                    </div>

                    <div className={styles.arbitrationModalReason}>
                      <Text strong className={styles.arbitrationModalReasonTitle}>
                        Причина претензии:
                      </Text>
                      <Text className={styles.arbitrationModalReasonText}>
                        {arbitration.reason}
                      </Text>
                    </div>

                    <Paragraph 
                      ellipsis={{ rows: 2, expandable: true, symbol: 'Показать больше' }}
                      className={styles.arbitrationModalDescription}
                    >
                      {arbitration.description}
                    </Paragraph>

                    {arbitration.decision && (
                      <div className={`${styles.arbitrationModalDecision} ${arbitration.status === 'resolved' ? styles.arbitrationModalDecisionResolved : styles.arbitrationModalDecisionRejected}`}>
                        <Text strong className={`${styles.arbitrationModalDecisionTitle} ${arbitration.status === 'resolved' ? styles.arbitrationModalDecisionTitleResolved : styles.arbitrationModalDecisionTitleRejected}`}>
                          Решение арбитража:
                        </Text>
                        <Text className={`${styles.arbitrationModalDecisionText} ${arbitration.status === 'resolved' ? styles.arbitrationModalDecisionTextResolved : styles.arbitrationModalDecisionTextRejected}`}>
                          {arbitration.decision}
                        </Text>
                      </div>
                    )}

                    {arbitration.documents && arbitration.documents.length > 0 && (
                      <div className={styles.arbitrationModalDocuments}>
                        <Text type="secondary" className={styles.arbitrationModalDocumentsTitle}>
                          Прикрепленные документы:
                        </Text>
                        <div className={styles.arbitrationModalDocumentsList}>
                          {arbitration.documents.map((doc, index) => (
                            <div
                              key={index}
                              className={styles.arbitrationModalDocumentItem}
                            >
                              <PaperClipOutlined className={styles.arbitrationModalDocumentIcon} />
                              {doc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    
                    <div className={`${styles.arbitrationModalFooter} ${isMobile ? styles.arbitrationModalFooterMobile : styles.arbitrationModalFooterDesktop}`}>
                      <div className={`${styles.arbitrationModalFooterMeta} ${isMobile ? styles.arbitrationModalFooterMetaMobile : styles.arbitrationModalFooterMetaDesktop}`}>
                        <Text type="secondary" className={`${styles.arbitrationModalFooterText} ${isMobile ? styles.arbitrationModalFooterTextMobile : styles.arbitrationModalFooterTextDesktop}`}>
                          <CalendarOutlined className={styles.arbitrationModalFooterIcon} />
                          Создано: {arbitration.createdAt}
                        </Text>
                        <Text type="secondary" className={`${styles.arbitrationModalFooterText} ${isMobile ? styles.arbitrationModalFooterTextMobile : styles.arbitrationModalFooterTextDesktop}`}>
                          <ClockCircleOutlined className={styles.arbitrationModalFooterIcon} />
                          Обновлено: {arbitration.updatedAt}
                        </Text>
                      </div>
                      <Text strong className={`${styles.arbitrationModalAmount} ${isMobile ? styles.arbitrationModalAmountMobile : styles.arbitrationModalAmountDesktop}`}>
                        <DollarOutlined className={styles.arbitrationModalAmountIcon} />
                        {arbitration.amount.toLocaleString('ru-RU')} ₽
                      </Text>
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
                  ? 'У вас нет арбитражей' 
                  : `Нет арбитражей со статусом "${
                      arbitrationStatusFilter === 'pending' ? 'Ожидает рассмотрения' :
                      arbitrationStatusFilter === 'in_review' ? 'На рассмотрении' :
                      arbitrationStatusFilter === 'resolved' ? 'Решено' :
                      arbitrationStatusFilter === 'rejected' ? 'Отклонено' : ''
                    }"`
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
