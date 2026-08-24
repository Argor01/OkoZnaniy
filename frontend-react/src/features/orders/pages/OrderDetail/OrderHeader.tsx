import React from 'react';
import { Typography, Space, Avatar, Modal, Dropdown, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  UserOutlined,
  StarFilled,
  BookOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  NumberOutlined,
  ReadOutlined,
  DatabaseOutlined,
  EditOutlined,
  CloseOutlined,
  DownOutlined,
  MessageOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ordersApi, type Order } from '@/features/orders/api/orders';
import { formatCurrency } from '@/utils/formatters';
import { AppButton, AppCard } from '@/components/ui';
import { logger } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import styles from '../OrderDetail.module.css';

const { Title, Text } = Typography;

interface OrderHeaderProps {
  order: Order;
  availableActions?: Order['available_actions'];
  orderId: string;
  isMobile: boolean;
  isOrderOwner: boolean;
  isOrderExpert: boolean;
  clientDisplayName: string;
  clientRoleLabel: string;
  clientRating: number | null;
  onBack: () => void;
  onEditOrder: () => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  availableActions,
  orderId,
  isMobile,
  isOrderOwner,
  isOrderExpert,
  clientDisplayName,
  clientRoleLabel,
  clientRating,
  onBack,
  onEditOrder,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEditOrder = (availableActions?.can_edit ?? (!(!!order.expert && order.status !== 'new'))) && order.status !== 'expired';
  const canCancelOrder = (availableActions?.can_delete ?? order.status === 'new') && order.status === 'new';
  const isExpired = order.status === 'expired';

  return (
    <>
      <div className={styles.sectionBlock}>
        <Space align="start" className={`${styles.fullWidth} ${styles.headerRow}`}>
          <div className={styles.orderHeaderInfo}>
            <Title level={isMobile ? 3 : 2} className={styles.orderTitle}>{order.title}</Title>
          </div>
        </Space>
      </div>

      <div className={`${styles.sectionStack} ${styles.sectionBlock}`}>
        <AppCard className={styles.clientGlassCard}>
          <div className={styles.clientGlassInner}>
            <Avatar
              size={56}
              src={order.client?.avatar}
              icon={<UserOutlined />}
              className={styles.clientAvatar}
            />
            <div className={styles.clientMeta}>
              <AppButton
                variant="link"
                onClick={() => {
                  const username = order.client?.username;
                  if (username) {
                    navigate(`/user/${username}`);
                  } else {
                    logger.error('Client username not available:', order.client);
                    message.error('Не удалось открыть профиль пользователя');
                  }
                }}
                className={styles.clientNameLink}
              >
                {clientDisplayName}
              </AppButton>
              <div className={styles.clientSubline}>
                <span className={styles.clientRolePill}>{clientRoleLabel}</span>
                <span className={styles.clientRatingPill}>
                  <StarFilled className={styles.clientRatingIcon} />
                  {clientRating ? clientRating.toFixed(1) : 'Нет отзывов'}
                </span>
              </div>
            </div>
          </div>
        </AppCard>

        <div className={styles.expertOfferGrid}>
          <div className={styles.expertOfferGridItem}>
            <div className={styles.expertOfferGridIcon}><NumberOutlined /></div>
            <div>
              <div className={styles.expertOfferLabel}>Номер заказа</div>
              <div className={styles.expertOfferValue}>
                <Text copyable={{ text: `${window.location.origin}/orders/${order.id}` }}>
                  {order.id}
                </Text>
              </div>
            </div>
          </div>
          <div className={styles.expertOfferGridItem}>
            <div className={styles.expertOfferGridIcon}><BookOutlined /></div>
            <div className={styles.expertOfferGridText}>
              <div className={styles.expertOfferLabel}>Предмет</div>
              <div className={styles.expertOfferValue}>{order.subject?.name || 'Не указан'}</div>
            </div>
          </div>
          <div className={styles.expertOfferGridItem}>
            <div className={styles.expertOfferGridIcon}><ReadOutlined /></div>
            <div className={styles.expertOfferGridText}>
              <div className={styles.expertOfferLabel}>Тип работы</div>
              <div className={styles.expertOfferValue}>{order.work_type?.name || 'Не указан'}</div>
            </div>
          </div>
          <div className={styles.expertOfferGridItem}>
            <div className={styles.expertOfferGridIcon}><ClockCircleOutlined /></div>
            <div className={styles.expertOfferGridText}>
              <div className={styles.expertOfferLabel}>Срок сдачи</div>
              <div className={styles.expertOfferValue}>{order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</div>
            </div>
          </div>
          <div className={styles.expertOfferGridItem}>
            <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconGreen}`}><DollarOutlined /></div>
            <div className={styles.expertOfferGridText}>
              <div className={styles.expertOfferLabel}>Цена</div>
              <div className={styles.expertOfferValue}>
                {(() => {
                  const budgetNum = Number(order.budget);
                  if (!Number.isFinite(budgetNum) || budgetNum === 0) return 'Договорная';
                  return formatCurrency(budgetNum);
                })()}
              </div>
            </div>
          </div>
          <div className={styles.expertOfferGridItem}>
            <div className={styles.expertOfferGridIcon}><DatabaseOutlined /></div>
            <div className={styles.expertOfferGridText}>
              <div className={styles.expertOfferLabel}>Дата публикации</div>
              <div className={styles.expertOfferValue}>
                <Text>
                  {order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU') : 'Не указана'}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOrderExpert && ['cancelled', 'canceled'].includes(order.status) ? (
        <div className={`${styles.orderActionsSection} ${styles.sectionBlock}`}>
          <AppButton
            variant="secondary"
            icon={<MessageOutlined />}
            size={isMobile ? 'middle' : 'large'}
            onClick={() => navigate(`/orders/${orderId}/complaint`)}
          >
            Подать жалобу в арбитраж
          </AppButton>
        </div>
      ) : null}

      {isOrderOwner && (
        <div className={`${styles.orderActionsSection} ${styles.sectionBlock}`}>
          <Space wrap size={isMobile ? 8 : 16} className={styles.orderActionsRow}>
            {isExpired ? (
              <AppButton
                icon={<SyncOutlined />}
                size={isMobile ? 'middle' : 'large'}
                onClick={async () => {
                  try {
                    await ordersApi.reactivateOrder(Number(orderId));
                    message.success('Заказ снова опубликован в ленте');
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['user-orders'] }),
                      queryClient.invalidateQueries({ queryKey: ['inactive-user-orders'] }),
                      queryClient.invalidateQueries({ queryKey: ['available-orders'] }),
                      queryClient.invalidateQueries({ queryKey: ['orders-feed'] }),
                      queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
                    ]);
                    navigate('/orders-feed');
                  } catch (e: any) {
                    message.error(e?.response?.data?.detail || 'Не удалось активировать заказ');
                  }
                }}
              >
                Переопубликовать
              </AppButton>
            ) : (
              <>
                <AppButton
                  icon={<EditOutlined />}
                  size={isMobile ? 'middle' : 'large'}
                  onClick={onEditOrder}
                  disabled={!canEditOrder}
                >
                  Редактировать заказ
                </AppButton>
                {canCancelOrder && (
                <AppButton
                  variant="secondary"
                  icon={<CloseOutlined />}
                  size={isMobile ? 'middle' : 'large'}
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: 'Отмена заказа',
                      content: 'Вы уверены, что хотите отменить этот заказ?',
                      okText: 'Отменить',
                      cancelText: 'Назад',
                      okType: 'danger',
                      onOk: async () => {
                        try {
                          await ordersApi.deleteOrder(Number(orderId));
                          message.success('Заказ отменен');
                          navigate('/orders-feed');
                        } catch (e: any) {
                          message.error(e?.response?.data?.detail || 'Не удалось отменить заказ');
                        }
                      },
                    });
                  }}
                >
                  Отменить заказ
                </AppButton>
                )}
                <Dropdown
                  menu={{
                    items: [
                      ...(!['cancelled', 'awaiting_expert_acceptance'].includes(order.status)
                        ? [{
                            key: 'complaint',
                            label: 'Подать жалобу',
                            icon: <MessageOutlined />,
                            onClick: () => navigate(`/orders/${orderId}/complaint`),
                          }]
                        : []),
                    ],
                  }}
                  trigger={['click']}
                >
                  <AppButton
                    variant="secondary"
                    size={isMobile ? 'middle' : 'large'}
                    disabled={!order.expert}
                  >
                    Ещё <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                  </AppButton>
                </Dropdown>
              </>
            )}
          </Space>
        </div>
      )}
    </>
  );
};

export default OrderHeader;
