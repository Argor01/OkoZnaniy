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
    bids, bidsLoading,
    userHasBid,
    refreshOrderWithLists,
    handleConfirmReviewAndApprove,
    handleApproveWithoutReview,
    handleConfirmRevisionFromCard,
    handleRejectFromCard,
    handleAssignExpert,
    handleDownloadFile,
    handleDeleteOrderFile,
    handleDrag,
    handleDrop,
    handleFileInput,
    navigate,
    location,
  } = useOrderDetail(orderId);

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
      new: 'Новый', in_progress: 'В работе', review: 'На проверке',
      revision: 'Доработка', completed: 'Завершен', cancelled: 'Отменен',
    };
    return texts[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'purple', in_progress: 'orange', review: 'purple',
      revision: 'gold', completed: 'green', cancelled: 'red',
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
              onDownloadFile={handleDownloadFile}
              onDeleteOrderFile={handleDeleteOrderFile}
            />

            {isOrderOwner && order.status === 'review' ? (
              <Space className={`${styles.reviewActionsRow} ${styles.sectionBlock}`} wrap>
                <AppButton
                  variant="success"
                  loading={reviewActionLoading === 'approve'}
                  onClick={() => setReviewModalOpen(true)}
                >
                  Принять
                </AppButton>
                <AppButton
                  variant="secondary"
                  loading={reviewActionLoading === 'revision'}
                  onClick={() => setRevisionModalOpen(true)}
                >
                  На доработку
                </AppButton>
                <AppButton
                  variant="danger"
                  loading={reviewActionLoading === 'reject'}
                  onClick={handleRejectFromCard}
                >
                  Отклонить
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
                <Tag color="success" className={styles.statusTagLarge}>
                  Вы уже откликнулись на этот заказ
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
          setRevisionModalOpen(false);
          setRevisionComment('');
        }}
        onOk={handleConfirmRevisionFromCard}
        okButtonProps={{ loading: revisionSubmitting || reviewActionLoading === 'revision' }}
        okText="Отправить"
        cancelText="Отмена"
        title="Комментарий для доработки"
        destroyOnHidden
      >
        <div className={styles.revisionModalSpacing}>
          <Input.TextArea
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            placeholder="Опишите, что нужно исправить"
            autoSize={{ minRows: 4, maxRows: 8 }}
            maxLength={1500}
            showCount
          />
        </div>
      </Modal>

      <EditOrderModal
        visible={editOrderModalVisible}
        onClose={() => setEditOrderModalVisible(false)}
        order={order}
        onSuccess={() => {
          refreshOrderWithLists();
        }}
      />

      <Modal
        open={reviewModalOpen}
        centered
        onCancel={() => {
          setReviewModalOpen(false);
          setReviewRating(5);
          setReviewComment('');
        }}
        title="Принять работу"
        destroyOnHidden
        footer={[
          <Button
            key="approve-only"
            onClick={handleApproveWithoutReview}
            loading={reviewSubmitting && reviewActionLoading === 'approve'}
          >
            Принять без отзыва
          </Button>,
          <Button
            key="approve-with-review"
            type="primary"
            onClick={handleConfirmReviewAndApprove}
            loading={reviewSubmitting && reviewActionLoading === 'approve'}
          >
            Принять и оставить отзыв
          </Button>,
        ]}
      >
        <div className={styles.revisionModalSpacing}>
          <div className={styles.reviewModalContent}>
            <div className={styles.reviewRatingSection}>
              <Text strong className={styles.reviewRatingLabel}>Оценка работы:</Text>
              <div className={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarFilled
                    key={star}
                    className={star <= reviewRating ? styles.reviewStarFilled : styles.reviewStarEmpty}
                    onClick={() => setReviewRating(star)}
                    style={{ fontSize: '32px', cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>
            <div className={styles.reviewCommentSection}>
              <Text strong>Комментарий (необязательно):</Text>
              <Input.TextArea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Поделитесь впечатлениями о работе эксперта"
                autoSize={{ minRows: 4, maxRows: 6 }}
                maxLength={1000}
                showCount
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;
