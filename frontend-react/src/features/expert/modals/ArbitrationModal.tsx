import React, { useMemo, useState } from 'react';
import { Modal, Typography, Tag, Spin } from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HourglassOutlined,
  CalendarOutlined,
  EyeOutlined,
  BookOutlined,
  NumberOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supportRequestsApi } from '@/features/support/api/requests';
import type { SupportConversation } from '@/features/support/types/requests';
import { AppButton } from '@/components/ui';
import styles from './ArbitrationModal.module.css';

const { Text, Paragraph, Title } = Typography;

interface ArbitrationModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  submitted: { color: 'blue', icon: <HourglassOutlined />, label: 'Подано' },
  under_review: { color: 'processing', icon: <ClockCircleOutlined />, label: 'На рассмотрении' },
  in_arbitration: { color: 'orange', icon: <ExclamationCircleOutlined />, label: 'В арбитраже' },
  decision_made: { color: 'cyan', icon: <CheckCircleOutlined />, label: 'Решение принято' },
  closed: { color: 'default', icon: <CloseCircleOutlined />, label: 'Закрыто' },
  rejected: { color: 'red', icon: <CloseCircleOutlined />, label: 'Отклонено' },
};

const ArbitrationModal: React.FC<ArbitrationModalProps> = ({ visible, onClose, isMobile }) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');

  const { data: items = [], isLoading } = useQuery<SupportConversation[]>({
    queryKey: ['support-center-arbitration'],
    queryFn: async () => {
      const response = await supportRequestsApi.listAll();
      return response.filter((item) => item.type === 'arbitration_case' || item.type === 'claim');
    },
    enabled: visible,
  });

  const filteredItems = useMemo(
    () => items.filter((item) => statusFilter === 'all' || item.status === statusFilter),
    [items, statusFilter]
  );

  const hasActiveItems = items.some((item) =>
    ['submitted', 'under_review', 'in_arbitration'].includes(item.status)
  );

  const openSupportCenter = () => {
    onClose();
    navigate('/support');
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
            onClick={() => setStatusFilter('all')}
            className={`${styles.arbitrationModalTab} ${statusFilter === 'all' ? styles.arbitrationModalTabActiveAll : styles.arbitrationModalTabInactive}`}
          >
            <TrophyOutlined className={`${styles.arbitrationModalTabIcon} ${statusFilter === 'all' ? styles.arbitrationModalTabIconAll : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${statusFilter === 'all' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Все
            </Text>
          </div>
          <div
            onClick={() => setStatusFilter('submitted')}
            className={`${styles.arbitrationModalTab} ${statusFilter === 'submitted' ? styles.arbitrationModalTabActivePending : styles.arbitrationModalTabInactive}`}
          >
            <HourglassOutlined className={`${styles.arbitrationModalTabIcon} ${statusFilter === 'submitted' ? styles.arbitrationModalTabIconPending : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${statusFilter === 'submitted' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Новые
            </Text>
          </div>
          <div
            onClick={() => setStatusFilter('under_review')}
            className={`${styles.arbitrationModalTab} ${statusFilter === 'under_review' ? styles.arbitrationModalTabActiveInReview : styles.arbitrationModalTabInactive}`}
          >
            <ClockCircleOutlined className={`${styles.arbitrationModalTabIcon} ${statusFilter === 'under_review' ? styles.arbitrationModalTabIconInReview : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${statusFilter === 'under_review' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              В работе
            </Text>
          </div>
          <div
            onClick={() => setStatusFilter('decision_made')}
            className={`${styles.arbitrationModalTab} ${statusFilter === 'decision_made' ? styles.arbitrationModalTabActiveResolved : styles.arbitrationModalTabInactive}`}
          >
            <CheckCircleOutlined className={`${styles.arbitrationModalTabIcon} ${statusFilter === 'decision_made' ? styles.arbitrationModalTabIconResolved : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${statusFilter === 'decision_made' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Решены
            </Text>
          </div>
          <div
            onClick={() => setStatusFilter('closed')}
            className={`${styles.arbitrationModalTab} ${statusFilter === 'closed' ? styles.arbitrationModalTabActiveRejected : styles.arbitrationModalTabInactive}`}
          >
            <CloseCircleOutlined className={`${styles.arbitrationModalTabIcon} ${statusFilter === 'closed' ? styles.arbitrationModalTabIconRejected : styles.arbitrationModalTabIconInactive}`} />
            <Text className={`${styles.arbitrationModalTabLabel} ${statusFilter === 'closed' ? styles.arbitrationModalTabLabelActive : styles.arbitrationModalTabLabelInactive}`}>
              Закрытые
            </Text>
          </div>
        </div>

        {hasActiveItems ? (
          <div className={styles.arbitrationModalNotice}>
            <HourglassOutlined className={styles.arbitrationModalNoticeIcon} />
            <Text>Показываются актуальные арбитражные обращения из центра обращений.</Text>
          </div>
        ) : null}

        <div className={styles.arbitrationModalList}>
          {isLoading ? (
            <div className={styles.arbitrationModalEmpty}>
              <Spin size="large" tip="Загрузка претензий..." />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className={styles.arbitrationModalListInner}>
              {filteredItems.map((item) => {
                const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.closed;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`${styles.arbitrationModalCard} ${isMobile ? styles.arbitrationModalCardMobile : styles.arbitrationModalCardDesktop}`}
                  >
                    <div className={`${styles.arbitrationModalCardHeader} ${isMobile ? styles.arbitrationModalCardHeaderMobile : styles.arbitrationModalCardHeaderDesktop}`}>
                      <div className={`${styles.arbitrationModalCardHeaderInfo} ${isMobile ? styles.arbitrationModalCardHeaderInfoMobile : styles.arbitrationModalCardHeaderInfoDesktop}`}>
                        <Text strong className={`${styles.arbitrationModalCardTitle} ${isMobile ? styles.arbitrationModalCardTitleMobile : styles.arbitrationModalCardTitleDesktop}`}>
                          Обращение №{item.ticket_number}
                        </Text>
                        <Text type="secondary" className={`${styles.arbitrationModalCardMeta} ${isMobile ? styles.arbitrationModalCardMetaMobile : styles.arbitrationModalCardMetaDesktop}`}>
                          {item.order?.id ? `Заказ №${item.order.id}` : 'Без привязки к заказу'}
                        </Text>
                      </div>
                      <Tag
                        icon={statusMeta.icon}
                        color={statusMeta.color}
                        className={`${styles.arbitrationModalStatusBadge} ${isMobile ? styles.arbitrationModalStatusBadgeMobile : styles.arbitrationModalStatusBadgeDesktop}`}
                      >
                        {statusMeta.label}
                      </Tag>
                    </div>

                    <div className={styles.arbitrationModalGrid}>
                      <div className={styles.arbitrationModalGridItem}>
                        <div className={styles.arbitrationModalGridIcon}>
                          <NumberOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Объект спора</div>
                          <div className={styles.arbitrationModalGridValue}>
                            {item.order?.id ? `Заказ №${item.order.id}` : 'Не указан'}
                          </div>
                        </div>
                      </div>

                      <div className={styles.arbitrationModalGridItem}>
                        <div className={`${styles.arbitrationModalGridIcon} ${styles.arbitrationModalGridIconPurple}`}>
                          <BookOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Тема</div>
                          <div className={styles.arbitrationModalGridValue}>{item.subject}</div>
                        </div>
                      </div>

                      <div className={styles.arbitrationModalGridItem}>
                        <div className={`${styles.arbitrationModalGridIcon} ${styles.arbitrationModalGridIconOrange}`}>
                          <CalendarOutlined />
                        </div>
                        <div>
                          <div className={styles.arbitrationModalGridLabel}>Дата подачи</div>
                          <div className={styles.arbitrationModalGridValue}>
                            {new Date(item.created_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.arbitrationModalDescriptionWrapper}>
                      <Text strong className={styles.arbitrationModalDescriptionTitle}>Описание:</Text>
                      <Paragraph className={styles.arbitrationModalDescription}>
                        {item.description}
                      </Paragraph>
                    </div>

                    <div className={`${styles.arbitrationModalFooter} ${isMobile ? styles.arbitrationModalFooterMobile : styles.arbitrationModalFooterDesktop}`}>
                      <AppButton variant="secondary" icon={<EyeOutlined />} onClick={openSupportCenter}>
                        Открыть в центре обращений
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
                {statusFilter === 'all' ? 'Нет претензий' : 'Нет претензий в этом статусе'}
              </Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ArbitrationModal;
