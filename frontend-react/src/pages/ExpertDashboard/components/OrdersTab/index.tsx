import React, { useState } from 'react';
import { Typography, Card, Tag, Button, Space, Empty, Spin, Radio, Tooltip, message, Popconfirm } from 'antd';
import { ClockCircleOutlined, UserOutlined, FilterOutlined, ShareAltOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../../../api/orders';
import { authApi } from '../../../../api/auth';
import { ORDER_STATUS_COLORS, ORDER_STATUS_TEXTS } from '../../../../config/orderStatuses';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from '../../ExpertDashboard.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

interface OrdersTabProps {
  isMobile: boolean;
}

type OrdersListItem = {
  id: number;
  title: string;
  status: string;
  description?: string | null;
  budget?: string | number | null;
  deadline?: string | null;
  responses_count?: number;
  subject_name?: string | null;
  work_type_name?: string | null;
  is_active?: boolean;
  deleted?: boolean;
};

const isOrdersListItem = (o: unknown): o is OrdersListItem => {
  if (!o || typeof o !== 'object') return false;
  const obj = o as Record<string, unknown>;
  return typeof obj.id === 'number' && typeof obj.title === 'string' && typeof obj.status === 'string';
};

const OrdersTab: React.FC<OrdersTabProps> = ({ isMobile }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderFilter, setOrderFilter] = useState<'my' | 'available'>('my');

  
  const { data: userProfile, isLoading: userProfileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const showAvailableTab = userProfile?.role === 'expert';

  
  React.useEffect(() => {
    if (userProfile?.role === 'client') {
      setOrderFilter('my');
    } else if (userProfile?.role === 'expert') {
      setOrderFilter('available');
    } else {
      setOrderFilter('my');
    }
  }, [userProfile?.role]);

  
  const { data: myOrdersData, isLoading: myOrdersLoading } = useQuery({
    queryKey: ['user-orders'],
    queryFn: () => ordersApi.getClientOrders(),
    enabled: !!userProfile,
  });

  
  const { data: availableOrdersData, isLoading: availableOrdersLoading } = useQuery({
    queryKey: ['available-orders'],
    queryFn: () => ordersApi.getAvailableOrders({ ordering: '-created_at' }),
    enabled: !!userProfile && showAvailableTab,
  });

  const effectiveOrderFilter: 'my' | 'available' = showAvailableTab ? orderFilter : 'my';

  
  const currentOrdersData = effectiveOrderFilter === 'my' ? myOrdersData : availableOrdersData;
  const isLoading = effectiveOrderFilter === 'my' ? myOrdersLoading : availableOrdersLoading;

  const sanitizeOrders = (items: unknown): OrdersListItem[] => {
    const results = (items && typeof items === 'object' && 'results' in items)
      ? (items as { results?: unknown }).results
      : undefined;
    const raw = Array.isArray(results) ? results : (Array.isArray(items) ? items : []);
    return raw.filter(isOrdersListItem).filter((order) => {
      if (order.is_active === false) return false;
      if (order.deleted === true) return false;
      return true;
    });
  };

  const orders = sanitizeOrders(currentOrdersData);

  const availableOrders = Array.isArray(availableOrdersData?.results)
    ? availableOrdersData.results
    : (Array.isArray(availableOrdersData) ? availableOrdersData : []);

  const availableOrdersSanitized = sanitizeOrders(availableOrders);

  const freshOrders = availableOrdersSanitized.slice(0, 5);

  
  const displayOrders = effectiveOrderFilter === 'available' ? freshOrders : orders;

  const getStatusColor = (status: string) => ORDER_STATUS_COLORS[status] || 'default';
  const getStatusText = (status: string) => ORDER_STATUS_TEXTS[status] || status;

  const handleDeleteOrder = async (orderId: number) => {
    try {
      await ordersApi.deleteOrder(orderId);
      message.success('Заказ удален');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['available-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders-feed'] }),
      ]);
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Ошибка при удалении заказа';
      message.error(errorMessage);
    }
  };

  if (userProfileLoading || isLoading) {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.ordersLoading}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionCard}>
        <div className={`${styles.sectionCardHeader} ${styles.ordersHeader}`}>
          <h2 className={styles.sectionTitle}>
            Заказы
          </h2>
          <Button 
            type="primary"
            onClick={() => navigate('/create-order')}
            className={styles.ordersCreateButton}
          >
            Создать заказ
          </Button>
        </div>

        {showAvailableTab && (
          <div className={styles.ordersFilterRow}>
            <Radio.Group 
              value={orderFilter} 
              onChange={(e) => setOrderFilter(e.target.value)}
              className={styles.ordersFilterGroup}
            >
              <Radio.Button 
                value="my" 
                className={`${styles.ordersFilterButton} ${styles.ordersFilterButtonLeft} ${isMobile ? styles.ordersFilterButtonMobile : styles.ordersFilterButtonDesktop}`}
              >
                <Space>
                  <UserOutlined />
                  Мои размещенные заказы
                </Space>
              </Radio.Button>
              <Radio.Button 
                value="available" 
                className={`${styles.ordersFilterButton} ${styles.ordersFilterButtonRight} ${isMobile ? styles.ordersFilterButtonMobile : styles.ordersFilterButtonDesktop}`}
              >
                <Space>
                  <FilterOutlined />
                  Доступные заказы
                </Space>
              </Radio.Button>
            </Radio.Group>
          </div>
        )}

        {displayOrders.length === 0 ? (
          <Empty
            description={
              <div>
                <Text className={styles.ordersEmptyText}>
                  {effectiveOrderFilter === 'my' 
                    ? 'У вас пока нет размещенных заказов'
                    : 'Нет доступных заказов для отклика'}
                </Text>
              </div>
            }
            className={styles.ordersEmpty}
          />
        ) : (
          <div className={styles.ordersGrid}>
            {displayOrders.map((order) => (
              <Card
                key={order.id}
                hoverable
                className={styles.orderCard}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className={styles.orderCardHeader}>
                  <div className={styles.orderCardHeaderInfo}>
                    <Text strong className={styles.orderTitle}>
                      {order.title}
                    </Text>
                    <Space size={8} wrap>
                      <Tag color={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Tag>
                      {order.subject_name && (
                        <Tag color="blue">{order.subject_name}</Tag>
                      )}
                      {order.work_type_name && (
                        <Tag>{order.work_type_name}</Tag>
                      )}
                    </Space>
                  </div>
                  <div className={styles.orderCardActions}>
                    <div className={styles.orderCardActionsRow}>
                      <Tooltip title="Скопировать ссылку на заказ">
                        <Button
                          type="text"
                          size="small"
                          icon={<ShareAltOutlined />}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/orders/${order.id}`;
                            try {
                              await navigator.clipboard.writeText(url);
                              message.success('Ссылка скопирована');
                            } catch {
                              message.error('Не удалось скопировать ссылку');
                            }
                          }}
                        />
                      </Tooltip>
                      {effectiveOrderFilter === 'my' && userProfile?.role === 'client' && (
                        <Popconfirm
                          title="Удалить заказ?"
                          okText="Удалить"
                          cancelText="Отмена"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      )}
                    </div>
                    <div className={styles.orderBudget}>
                      {order.budget ? `${order.budget} ₽` : 'Договорная'}
                    </div>
                  </div>
                </div>

                {order.description && (
                  <Paragraph 
                    ellipsis={{ rows: 2 }}
                    className={styles.orderDescription}
                  >
                    {order.description}
                  </Paragraph>
                )}

                <div className={styles.orderMetaRow}>
                  <Space size={16} wrap>
                    {order.deadline && (
                      <Space size={4}>
                        <ClockCircleOutlined className={styles.orderMetaIcon} />
                        <Text type="secondary" className={styles.orderMetaText}>
                          {dayjs(order.deadline).fromNow()}
                        </Text>
                      </Space>
                    )}
                    {order.responses_count !== undefined && (
                      <Space size={4}>
                        <UserOutlined className={styles.orderMetaIcon} />
                        <Text type="secondary" className={styles.orderMetaText}>
                          {order.responses_count} откликов
                        </Text>
                      </Space>
                    )}
                  </Space>
                  {effectiveOrderFilter === 'available' && userProfile?.role === 'expert' && (
                    (() => {
                      const hasMyBid =
                        typeof (order as unknown as { user_has_bid?: unknown }).user_has_bid === 'boolean'
                          ? (order as unknown as { user_has_bid: boolean }).user_has_bid
                          : Array.isArray((order as unknown as { bids?: unknown }).bids) && typeof userProfile?.id === 'number'
                            ? (order as unknown as { bids: Array<{ expert?: { id?: number } | null }> }).bids.some(
                                (bid) => bid?.expert?.id === userProfile.id
                              )
                            : false;

                      return (
                    <Button 
                      type={hasMyBid ? 'default' : 'primary'}
                      size="small"
                      disabled={hasMyBid}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasMyBid) return;
                        navigate(`/orders/${order.id}`);
                      }}
                      className={`${styles.orderBidButton} ${hasMyBid ? styles.orderBidButtonDisabled : styles.orderBidButtonActive}`}
                    >
                      {hasMyBid ? 'Вы уже откликнулись' : 'Откликнуться'}
                    </Button>
                      );
                    })()
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
