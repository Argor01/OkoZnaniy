import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Space, Tag, Avatar, Spin, message, List, Divider, Empty, Badge } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { Bid, Order } from '@/features/orders/api/orders';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { AppButton } from '@/components/ui';
import { useDashboard } from '@/contexts/DashboardContext';
import { logger } from '@/utils/logger';
import styles from '../OrderDetail.module.css';

const { Title, Text, Paragraph } = Typography;

interface OrderBidsProps {
  order: Order;
  bids: Bid[];
  bidsLoading: boolean;
  isMobile: boolean;
  isOrderOwner: boolean;
  openedFromChat: boolean;
  assigningExpertId: number | null;
  expertReview: { rating: number; comment: string; created_at?: string } | null;
  onAssignExpert: (bidId: number, expertId: number, expertUsername: string) => void;
}

const OrderBids: React.FC<OrderBidsProps> = ({
  order,
  bids,
  bidsLoading,
  isMobile,
  isOrderOwner,
  openedFromChat,
  assigningExpertId,
  expertReview,
  onAssignExpert,
}) => {
  const navigate = useNavigate();
  const dashboard = useDashboard();

  return (
    <>
      {!openedFromChat && Array.isArray(bids) && bids.length > 0 && (
        <div className={styles.sectionBlock}>
          <Divider />
          <Title level={4} className={`${styles.sectionTitle} ${styles.bidsTitle}`}>
            <span>Отклики экспертов</span>
            <Badge count={bids.length} size="small" className={styles.bidsBadge} />
          </Title>

          {bidsLoading ? (
            <Spin />
          ) : bids.length === 0 ? (
            <Empty description="Пока нет откликов" />
          ) : (
            <>
              {!isOrderOwner && (
                <Text type="secondary" className={styles.bidsNotice}>
                  Вы просматриваете заказы других клиентов. Отклики доступны только владельцу заказа.
                </Text>
              )}
              <List
                className={styles.bidsList}
                dataSource={Array.isArray(bids) ? bids.filter((bid: Bid) => (bid.status || 'active') === 'active') : []}
                renderItem={(bid: Bid) => {
                  const bidAmount = Number(bid.amount ?? 0);
                  const prepaymentPercent = Number(bid.prepayment_percent ?? 0);
                  const bidAmountText = !Number.isFinite(bidAmount) || bidAmount === 0
                    ? 'Договорная'
                    : formatCurrency(bidAmount);
                  const prepaymentText = !Number.isFinite(bidAmount) || bidAmount === 0
                    ? `${prepaymentPercent}%`
                    : formatCurrency((bidAmount * prepaymentPercent) / 100);
                  const hasValidPrice = Number.isFinite(bidAmount) && bidAmount > 0;

                  return (
                    <List.Item
                      key={bid.id}
                      className={order.expert?.id === bid.expert.id ? styles.bidItemSelected : styles.bidItem}
                      actions={
                        order.expert?.id === bid.expert.id
                          ? [<Tag color="success" icon={<CheckCircleOutlined />}>Выбран</Tag>]
                          : isOrderOwner && hasValidPrice
                            ? [
                                <AppButton
                                  size={isMobile ? 'small' : 'middle'}
                                  icon={<MessageOutlined />}
                                  onClick={async () => {
                                    dashboard.openOrderChat(order.id, bid.expert.id);
                                  }}
                                >
                                  Написать
                                </AppButton>,
                                <AppButton
                                  key="assign"
                                  size={isMobile ? 'small' : 'middle'}
                                  type="primary"
                                  className={styles.assignButton}
                                  loading={assigningExpertId === bid.expert.id}
                                  onClick={async () => {
                                    onAssignExpert(bid.id, bid.expert.id, bid.expert.username);
                                  }}
                                >
                                  Назначить исполнителем
                                </AppButton>
                              ]
                            : isOrderOwner && !hasValidPrice
                              ? [
                                  <AppButton
                                    size={isMobile ? 'small' : 'middle'}
                                    icon={<MessageOutlined />}
                                    onClick={async () => {
                                      dashboard.openOrderChat(order.id, bid.expert.id);
                                    }}
                                  >
                                    Написать
                                  </AppButton>
                                ]
                              : []
                      }
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            size={isMobile ? 48 : 64}
                            src={bid.expert.avatar}
                            icon={<UserOutlined />}
                            className={styles.bidAvatar}
                            onClick={() => {
                              const username = bid.expert.username;
                              if (username) {
                                navigate(`/user/${username}`);
                              } else {
                                logger.error('Expert username not available:', bid.expert);
                                message.error('Не удалось открыть профиль эксперта');
                              }
                            }}
                          />
                        }
                        title={
                          <Space direction="vertical" size={4} className={styles.bidHeader}>
                            <Space className={styles.bidIdentityRow} wrap>
                              <AppButton
                                variant="link"
                                onClick={() => {
                                  const username = bid.expert.username;
                                  if (username) {
                                    navigate(`/user/${username}`);
                                  } else {
                                    logger.error('Expert username not available:', bid.expert);
                                    message.error('Не удалось открыть профиль эксперта');
                                  }
                                }}
                                className={styles.bidUserLink}
                              >
                                <Text strong>{bid.expert.username}</Text>
                              </AppButton>
                              <Space size={4} className={styles.bidRatingRow}>
                                <StarOutlined className={styles.ratingStar} />
                                <Text>{bid.expert_rating || 0}</Text>
                              </Space>
                            </Space>
                            {bid.expert.bio && (
                              <Text type="secondary" className={styles.bidBio}>
                                {bid.expert.bio}
                              </Text>
                            )}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={8} className={styles.bidMeta}>
                            <div className={styles.bidChipsRow}>
                              <Tag color="blue" className={styles.bidAmountTag}>
                                <DollarOutlined /> {bidAmountText}
                              </Tag>
                              <Tag color="gold" className={styles.bidPrepaymentTag}>
                                Предоплата: {prepaymentText}
                              </Tag>
                              <span className={styles.bidTimeWrap}>
                                <Text type="secondary" className={styles.bidMetaText}>
                                  {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: ru })}
                                </Text>
                              </span>
                            </div>
                            {bid.comment && (
                              <Paragraph className={styles.bidComment}>
                                {bid.comment}
                              </Paragraph>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </>
          )}
        </div>
      )}

      {order.expert && (
        <div className={styles.sectionBlock}>
          <Divider />
          <Title level={4}>Исполнитель</Title>
          <div className={styles.expertRow}>
            <Avatar
              size={isMobile ? 48 : 64}
              src={order.expert.avatar}
              icon={<UserOutlined />}
              className={styles.expertAvatar}
            />
            <div className={styles.expertMeta}>
              <AppButton
                variant="link"
                onClick={() => {
                  const username = order.expert?.username;
                  if (username) {
                    navigate(`/user/${username}`);
                  } else {
                    logger.error('Expert username not available:', order.expert);
                    message.error('Не удалось открыть профиль эксперта');
                  }
                }}
                className={styles.expertLink}
              >
                <Text strong className={styles.expertName}>{order.expert.username}</Text>
              </AppButton>
              <br />
              <Text type="secondary" className={styles.expertRole}>Эксперт</Text>
              {expertReview ? (
                <div className={styles.expertReviewBlock}>
                  <span className={styles.expertReviewRating}>
                    <StarFilled className={styles.clientRatingIcon} />
                    {expertReview.rating.toFixed(1)}
                  </span>
                  <Text type="secondary" className={styles.expertReviewText}>
                    {expertReview.comment?.trim()
                      ? `Отзыв по работе: ${expertReview.comment.trim()}`
                      : 'Отзыв по работе оставлен без комментария'}
                  </Text>
                </div>
              ) : null}
            </div>
            {isOrderOwner && (
              <AppButton
                className={styles.expertWriteButton}
                size={isMobile ? 'small' : 'middle'}
                icon={<MessageOutlined />}
                onClick={() => dashboard.openOrderChat(order.id, order.expert.id)}
              >
                Написать
              </AppButton>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderBids;
