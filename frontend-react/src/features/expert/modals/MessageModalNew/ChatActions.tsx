import React from 'react';
import { Tabs, Button, Spin, Typography } from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  UpOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { formatOrderStatus, isDeadlineExpired } from './utils/messageHelpers';
import type { OrderForChat } from './types';
import styles from '../MessageModalNew.module.css';

const { Text } = Typography;

interface ChatActionsProps {
  isMobile: boolean;
  isSupportChatSelected: boolean;
  tabsOrderIds: number[];
  effectiveOrderId: number | null;
  isClosedOrder: boolean;
  order: OrderForChat | null;
  orderLoading: boolean;
  orderPanelOpen: boolean;
  remainingLabel: string;
  showExpertUploadButton: boolean;
  canOverdueClientActions: boolean;
  workUploading: boolean;
  overdueExtending: boolean;
  overdueCancelling: boolean;
  workFileInputRef: React.RefObject<HTMLInputElement | null>;
  onSetActiveOrderId: (id: number) => void;
  onSetOrderPanelOpen: (open: boolean) => void;
  onGoToOrder: () => void;
  onUploadWork: (files: File[]) => void;
  onOpenOverdueExtendModal: () => void;
  onCancelOverdueOrder: () => void;
  onOverdueComplaint: () => void;
}

const ChatActions: React.FC<ChatActionsProps> = ({
  isMobile,
  isSupportChatSelected,
  tabsOrderIds,
  effectiveOrderId,
  isClosedOrder,
  order,
  orderLoading,
  orderPanelOpen,
  remainingLabel,
  showExpertUploadButton,
  canOverdueClientActions,
  workUploading,
  overdueExtending,
  overdueCancelling,
  workFileInputRef,
  onSetActiveOrderId,
  onSetOrderPanelOpen,
  onGoToOrder,
  onUploadWork,
  onOpenOverdueExtendModal,
  onCancelOverdueOrder,
  onOverdueComplaint,
}) => {
  if (tabsOrderIds.length === 0 || isSupportChatSelected) return null;

  return (
    <>
      <input
        ref={workFileInputRef}
        type="file"
        multiple
        className={styles.hiddenInput}
        onChange={(e) => {
          const selectedFiles = Array.from(e.target.files || []);
          if (selectedFiles.length > 0) onUploadWork(selectedFiles);
        }}
      />
      <div className={`${styles.orderTabsHeader} ${isMobile ? styles.orderTabsHeaderMobile : ''}`}>
        <Tabs
          size="small"
          activeKey={
            effectiveOrderId && !isClosedOrder
              ? String(effectiveOrderId)
              : (tabsOrderIds.length > 0 ? String(tabsOrderIds[tabsOrderIds.length - 1]) : undefined)
          }
          onChange={(key) => {
            const next = Number(key);
            if (Number.isFinite(next) && next > 0) onSetActiveOrderId(next);
            onSetOrderPanelOpen(true);
          }}
          className={styles.orderTabs}
          items={tabsOrderIds.map((id) => ({
            key: String(id),
            label: `Заказ #${id}`,
          }))}
        />
      </div>

      {!isClosedOrder && (
        <div className={styles.orderSummaryContainer}>
          {orderLoading ? (
            <div className={styles.orderLoading}>
              <Spin size="small" />
            </div>
          ) : order ? (
            <>
              <div
                className={`${styles.orderSummaryHeader} ${orderPanelOpen ? styles.orderSummaryHeaderOpen : ''}`}
                onClick={() => onSetOrderPanelOpen(!orderPanelOpen)}
              >
                <div className={styles.orderSummaryLeft}>
                  <div className={styles.orderSummaryId}>#{order.id}</div>
                  <div className={`${styles.orderSummaryStatus} ${({'new': styles.statusNew, 'auction': styles.statusAuction, 'in_progress': styles.statusInProgress, 'review': styles.statusReview, 'revision': styles.statusRevision, 'completed': styles.statusCompleted, 'canceled': styles.statusCanceled} as Record<string, string>)[order.status] || ''}`}>
                    {formatOrderStatus(order.status)}
                  </div>
                </div>
                <div className={styles.orderSummaryCenter} />
                <div className={styles.orderSummaryRight}>
                  <ClockCircleOutlined className={remainingLabel === 'Срок истёк' ? styles.iconDanger : styles.iconWarning} />
                  <span className={styles.orderTimerText}>{remainingLabel}</span>
                  <div className={styles.orderToggleIcon}>
                    {orderPanelOpen ? <UpOutlined /> : <DownOutlined />}
                  </div>
                </div>
              </div>

              {orderPanelOpen && (
                <div className={styles.orderSummaryDetails}>
                  <div className={styles.orderGrid}>
                    <div className={styles.orderGridItem}>
                      <div className={styles.gridIcon}><BookOutlined /></div>
                      <div>
                        <div className={styles.gridLabel}>Предмет</div>
                        <div className={styles.gridValue}>{order.subject?.name || order.custom_subject || '—'}</div>
                      </div>
                    </div>
                    <div className={styles.orderGridItem}>
                      <div className={styles.gridIcon}><FileTextOutlined /></div>
                      <div>
                        <div className={styles.gridLabel}>Тип работы</div>
                        <div className={styles.gridValue}>{order.work_type?.name || order.custom_work_type || '—'}</div>
                      </div>
                    </div>
                    <div className={styles.orderGridItem}>
                      <div className={styles.gridIcon}><ClockCircleOutlined /></div>
                      <div>
                        <div className={styles.gridLabel}>Срок сдачи</div>
                        <div className={styles.gridValue}>
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'не указан'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.orderActionsBar}>
                    <div className={styles.primaryActionsRow}>
                      <Button onClick={onGoToOrder} className={styles.goToOrderButton}>
                        Перейти в заказ
                      </Button>
                      {showExpertUploadButton && (
                        <Button
                          type="primary"
                          icon={<UploadOutlined />}
                          loading={workUploading}
                          disabled={isDeadlineExpired(order?.deadline)}
                          onClick={(e) => {
                            e.stopPropagation();
                            workFileInputRef.current?.click();
                          }}
                          className={styles.actionButtonPrimary}
                        >
                          Выгрузить работу
                        </Button>
                      )}
                    </div>

                    {canOverdueClientActions && (
                      <div className={styles.secondaryActions}>
                        <Button
                          size="small"
                          disabled={overdueCancelling}
                          loading={overdueExtending}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenOverdueExtendModal();
                          }}
                        >
                          Продлить срок сдачи
                        </Button>
                        <Button
                          danger
                          size="small"
                          disabled={overdueExtending}
                          loading={overdueCancelling}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelOverdueOrder();
                          }}
                        >
                          Отменить
                        </Button>
                        <Button
                          size="small"
                          disabled={overdueExtending || overdueCancelling}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOverdueComplaint();
                          }}
                          icon={<ExclamationCircleOutlined />}
                        >
                          Жалоба
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.orderError}>Не удалось загрузить данные</div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatActions;
