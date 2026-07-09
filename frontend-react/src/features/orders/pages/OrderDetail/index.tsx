import React from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Space, Tag, Spin, Modal, Input, Button } from 'antd';
import {
  ArrowLeftOutlined,
  StarFilled,
  MessageOutlined,
} from '@ant-design/icons';
import BidModal from '../../components/BidModal';
import EditOrderModal from '../../components/Modals/EditOrderModal';
import { AppButton, AppCard } from '@/components/ui';
import { useOrderDetail } from './hooks/useOrderDetail';
import OrderHeader from './OrderHeader';
import OrderContent from './OrderContent';
import { formatUserName } from '@/utils/formatters';
import OrderBids from './OrderBids';
import styles from '../OrderDetail.module.css';

const { Title, Text } = Typography;

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const {
    isMobile,
    bidModalVisible, setBidModalVisible,
    reviewActionLoading,
    revisionModalOpen, setRevisionModalOpen,
    revisionComment, setRevisionComment,
    revisionSubmitting,
    reviewModalOpen, setReviewModalOpen,
    reviewRating, setReviewRating,
    reviewComment, setReviewComment,
    reviewSubmitting,
    assigningExpertId,
    uploadingFiles,
    dragActive,
    openingBidModal, setOpeningBidModal,
    editOrderModalVisible, setEditOrderModalVisible,
    userProfile,
    order, isLoading,
    currentUserBid,
    bids, bidsLoading,
    userHasBid,
    refreshOrderWithLists,
    handleConfirmReviewAndApprove,
    handleApproveWithoutReview,
    handleConfirmRevisionFromCard,
    handleRejectFromCard,
    handleAssignExpert,
    handleAcceptAssignment,
    handleDeclineAssignment,
    handleDownloadFile,
    handleDeleteOrderFile,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleTaskFileDrop,
    handleTaskFileInput,
    navigate,
    location,
  } = useOrderDetail(orderId);

  const [deliveredFileIds, setDeliveredFileIds] = React.useState<number[]>([]);
  const [viewedDeliveredIds, setViewedDeliveredIds] = React.useState<Set<number>>(new Set());
  const handleDeliveredFilesResolved = React.useCallback((ids: number[]) => {
    setDeliveredFileIds((prev) => (
      prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids
    ));
  }, []);
  const handleDeliveredFileViewed = React.useCallback((id: number) => {
    setViewedDeliveredIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.notFound}>
        <Title level={3}>Заказ не найден</Title>
        <AppButton variant="primary" onClick={() => navigate('/orders')}>
          Вернуться к заказам
        </AppButton>
      </div>
    );
  }

  const currentUserId = Number(userProfile?.id ?? 0);
  const orderClientId = Number(order.client?.id ?? (order as any)?.client_id ?? 0);
  const orderExpertId = Number(order.expert?.id ?? (order as any)?.expert_id ?? 0);
  const isOrderOwner = currentUserId > 0 && currentUserId === orderClientId;
  const isOrderExpert = currentUserId > 0 && currentUserId === orderExpertId;
  const openedFromChat = (location.state as any)?.source === 'order-chat';
  const canSeeDeliveredWorkBlock = currentUserId > 0 && (isOrderOwner || currentUserId === orderExpertId);
  const isAwaitingExpertDecision = order.status === 'awaiting_expert_acceptance';
  const canRespondToAssignment = isOrderExpert && isAwaitingExpertDecision && currentUserBid?.status === 'invited';
  const deliveredWorkReviewed = deliveredFileIds.length === 0
    ? true
    : deliveredFileIds.every((id) => viewedDeliveredIds.has(id));

  const expertReview = (() => {
    const raw = (order as any)?.rating ?? (order as any)?.expert_rating;
    const rating = Number((raw as any)?.rating);
    if (!raw || typeof raw !== 'object' || !Number.isFinite(rating) || rating <= 0) return null;
    return {
      rating,
      comment: typeof (raw as any)?.comment === 'string' ? (raw as any).comment : '',
      created_at: (raw as any)?.created_at,
    };
  })();

  const clientRating = (() => {
    const raw = (order.client as any)?.rating ?? (order.client as any)?.average_rating;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  })();

  const clientDisplayName =
    order.client
      ? formatUserName(order.client)
      : order.client_name || 'Неизвестен';

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      new: 'Новый',
      awaiting_expert_acceptance: 'Ожидает ответа эксперта',
      in_progress: 'В работе',
      review: 'На проверке',
      revision: 'Доработка',
      completed: 'Завершен',
      cancelled: 'Отменен',
    };
    return texts[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'purple',
      awaiting_expert_acceptance: 'blue',
      in_progress: 'orange',
      review: 'purple',
      revision: 'gold',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <AppButton
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            const from = (location.state as any)?.from;
            if (typeof from === 'string' && from.length > 0) {
              navigate(from);
              return;
            }
            navigate(-1);
          }}
          className={styles.backButton}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </AppButton>

        <AppCard className={styles.mainCard}>
          <Space direction="vertical" size={0} className={`${styles.fullWidth} ${styles.orderContent}`}>
            <OrderHeader
              order={order}
              orderId={orderId!}
              isMobile={isMobile}
              isOrderOwner={isOrderOwner}
              clientDisplayName={clientDisplayName}
              clientRoleLabel="Заказчик"
              clientRating={clientRating}
              onBack={() => navigate(-1)}
              onEditOrder={() => setEditOrderModalVisible(true)}
            />

            <OrderContent
              order={order}
              isMobile={isMobile}
              isOrderOwner={isOrderOwner}
              isOrderExpert={isOrderExpert}
              canSeeDeliveredWorkBlock={canSeeDeliveredWorkBlock}
              uploadingFiles={uploadingFiles}
              dragActive={dragActive}
              userProfileId={currentUserId}
              onDrag={handleDrag}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
              onTaskFileDrop={handleTaskFileDrop}
              onTaskFileInput={handleTaskFileInput}
              onDownloadFile={handleDownloadFile}
              onDeleteOrderFile={handleDeleteOrderFile}
              onDeliveredFilesResolved={handleDeliveredFilesResolved}
              onDeliveredFileViewed={handleDeliveredFileViewed}
            />

            {isOrderOwner && order.status === 'review' ? (
              <div className={styles.sectionBlock}>
                {!deliveredWorkReviewed && (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Скачайте и просмотрите готовую работу, чтобы принять, отправить на доработку или отклонить заказ.
                  </Text>
                )}
                <Space className={styles.reviewActionsRow} wrap>
                  <AppButton
                    variant="success"
                    loading={reviewActionLoading === 'approve'}
                    disabled={!deliveredWorkReviewed}
                    onClick={() => setReviewModalOpen(true)}
                  >
                    Принять
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    loading={reviewActionLoading === 'revision'}
                    disabled={!deliveredWorkReviewed}
                    onClick={() => setRevisionModalOpen(true)}
                  >
                    На доработку
                  </AppButton>
                  <AppButton
                    variant="danger"
                    loading={reviewActionLoading === 'reject'}
                    disabled={!deliveredWorkReviewed}
                    onClick={handleRejectFromCard}
                  >
                    Отклонить
                  </AppButton>
                </Space>
              </div>
            ) : null}

            {canRespondToAssignment ? (
              <Space className={`${styles.reviewActionsRow} ${styles.sectionBlock}`} wrap>
                <AppButton
                  variant="success"
                  loading={reviewActionLoading === 'accept_assignment'}
                  onClick={handleAcceptAssignment}
                >
                  Принять заказ
                </AppButton>
                <AppButton
                  variant="danger"
                  loading={reviewActionLoading === 'decline_assignment'}
                  onClick={handleDeclineAssignment}
                >
                  Отклонить заказ
                </AppButton>
              </Space>
            ) : null}

            {userProfile?.role === 'expert' &&
             !order.expert &&
             !userHasBid &&
             order.client?.id !== userProfile?.id && (
              <div className={`${styles.bidAction} ${styles.sectionBlock}`}>
                <AppButton
                  variant="primary"
                  size="large"
                  onClick={() => {
                    setOpeningBidModal(true);
                    setBidModalVisible(true);
                  }}
                  className={styles.bidButton}
                  loading={openingBidModal}
                  disabled={openingBidModal}
                >
                  Откликнуться на заказ
                </AppButton>
              </div>
            )}

            {userHasBid && (
              <div className={`${styles.statusTagWrap} ${styles.sectionBlock}`}>
                <Tag
                  color={currentUserBid?.status === 'invited' ? 'blue' : currentUserBid?.status === 'accepted' ? 'green' : 'success'}
                  className={styles.statusTagLarge}
                >
                  {currentUserBid?.status === 'invited'
                    ? 'Заказчик выбрал вас'
                    : currentUserBid?.status === 'accepted'
                      ? 'Вы приняты исполнителем по этому заказу'
                      : 'Вы уже откликнулись на этот заказ'}
                </Tag>
              </div>
            )}

            <OrderBids
              order={order}
              bids={bids}
              bidsLoading={bidsLoading}
              isMobile={isMobile}
              isOrderOwner={isOrderOwner}
              openedFromChat={openedFromChat}
              assigningExpertId={assigningExpertId}
              expertReview={expertReview}
              onAssignExpert={handleAssignExpert}
            />
          </Space>
        </AppCard>
      </div>

      <BidModal
        visible={bidModalVisible}
        onClose={() => {
          setBidModalVisible(false);
          setOpeningBidModal(false);
        }}
        onBidSubmitted={() => {
          setOpeningBidModal(false);
        }}
        orderId={order.id}
        orderTitle={order.title}
        orderBudget={order.budget ? Number(order.budget) : undefined}
      />

      <Modal
        open={revisionModalOpen}
        centered
        onCancel={() => {
          if (revisionSubmitting) return;
          setRevisionModalOpen(false);
          setRevisionComment('');
        }}
        title="Отправить на доработку"
        okText="Отправить"
        cancelText="Отмена"
        onOk={handleConfirmRevisionFromCard}
        okButtonProps={{ loading: revisionSubmitting, disabled: !revisionComment.trim() }}
      >
        <Input.TextArea
          rows={4}
          placeholder="Опишите, что нужно исправить"
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
          maxLength={2000}
        />
      </Modal>

      <Modal
        open={reviewModalOpen}
        centered
        onCancel={() => {
          if (reviewSubmitting) return;
          setReviewModalOpen(false);
          setReviewRating(5);
          setReviewComment('');
        }}
        title="Принять работу и оставить отзыв"
        footer={null}
      >
        <Space direction="vertical" size={16} className={styles.fullWidth}>
          <div>
            <Text strong>Ваша оценка</Text>
            <div className={styles.reviewStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  type="text"
                  icon={<StarFilled style={{ color: star <= reviewRating ? '#faad14' : '#d9d9d9' }} />}
                  onClick={() => setReviewRating(star)}
                />
              ))}
            </div>
          </div>
          <div>
            <Text strong>Комментарий</Text>
            <Input.TextArea
              rows={4}
              placeholder="Напишите пару слов о работе исполнителя"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              maxLength={2000}
            />
          </div>
          <Space>
            <AppButton variant="primary" onClick={handleConfirmReviewAndApprove} loading={reviewSubmitting}>
              Принять и оставить отзыв
            </AppButton>
            <AppButton variant="secondary" onClick={handleApproveWithoutReview} loading={reviewSubmitting}>
              Принять без отзыва
            </AppButton>
          </Space>
        </Space>
      </Modal>

      <EditOrderModal
        open={editOrderModalVisible}
        onClose={() => setEditOrderModalVisible(false)}
        order={order}
        onSaved={async () => {
          await refreshOrderWithLists();
          setEditOrderModalVisible(false);
        }}
      />
    </div>
  );
};

export default OrderDetail;
