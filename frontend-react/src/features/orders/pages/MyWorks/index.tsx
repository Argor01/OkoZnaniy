import React, { useEffect, useMemo, useState } from 'react';
import { Typography, Tag, Avatar, Space } from 'antd';
import { StarFilled, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ordersApi, Order } from '@/features/orders/api/orders';
import { expertsApi } from '@/features/expert/api/experts';
import { BREAKPOINTS, ORDER_STATUS_LABELS } from '@/utils/constants';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import styles from './MyWorks.module.css';
import { useCurrentUser, useSubjects, useWorkTypes } from '@/hooks/queries';
import { formatUserName } from '@/utils/formatters';
import { OrdersTabsBar, type OrdersTabItem } from '@/features/orders/components/OrdersTabsBar';
import { OrdersFilters } from '@/features/orders/components/OrdersFilters';
import { OrdersResponsiveList } from '@/features/orders/components/OrdersResponsiveList';

const { Title } = Typography;

const isInProgressGroup = (order: Order) => {
  const status = String(order?.status ?? '');
  return status === 'in_progress';
};

const isReviewGroup = (order: Order) => {
  const status = String(order?.status ?? '');
  return status === 'review' || status === 'under_review';
};

const isAllTabGroup = (order: Order) => {
  const status = String(order?.status ?? '');
  if (status === 'new') return true;
  if (status === 'confirming') return true;
  if (isInProgressGroup(order)) return true;
  if (status === 'revision') return true;
  if (status === 'waiting_payment') return true;
  if (isReviewGroup(order)) return true;
  if (status === 'download') return true;
  if (status === 'closed') return true;
  if (status === 'completed') return true;
  if (status === 'cancelled' || status === 'canceled') return true;
  return false;
};

type WorksTab =
  | 'new'
  | 'confirming'
  | 'in_progress'
  | 'revision'
  | 'waiting_payment'
  | 'review'
  | 'download'
  | 'closed'
  | 'completed'
  | 'inactive'
  | 'all';

const isValidTab = (value: string | null): value is WorksTab => {
  if (!value) return false;
  return [
    'new',
    'confirming',
    'in_progress',
    'revision',
    'waiting_payment',
    'review',
    'download',
    'closed',
    'completed',
    'inactive',
    'all',
  ].includes(value);
};

const isExpertHiddenTab = (tab: WorksTab) =>
  tab === 'new' || tab === 'download' || tab === 'inactive' || tab === 'closed';

const MyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedWorkType, setSelectedWorkType] = useState<number | undefined>();
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 100000]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const rawInitialTab = searchParams.get('tab');
  const initialTab: WorksTab = isValidTab(rawInitialTab) ? rawInitialTab : 'in_progress';
  const [activeTab, setActiveTab] = useState<WorksTab>(initialTab);
  const isMobile = viewportWidth <= BREAKPOINTS.MOBILE;
  const isCompact = viewportWidth <= BREAKPOINTS.TABLET;

  const {data: fetchedSubjects = []} = useSubjects();

  const {data: workTypes = []} = useWorkTypes();

  const {data: userProfile} = useCurrentUser();

  const { data: expertStats } = useQuery({
    queryKey: ['expert-statistics', userProfile?.id],
    queryFn: () => expertsApi.getExpertStatistics(userProfile!.id),
    enabled: userProfile?.role === 'expert' && typeof userProfile?.id === 'number' && userProfile.id > 0,
  });

  const { data: myOrdersData, isLoading: myOrdersLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders({ ordering: '-created_at' }),
    enabled: userProfile?.role === 'expert',
  });

  const { data: clientOrdersData, isLoading: clientOrdersLoading } = useQuery({
    queryKey: ['client-orders-overview'],
    queryFn: () => ordersApi.getClientOrders({ ordering: '-created_at' }),
    enabled: userProfile?.role === 'client',
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: inactiveClientOrdersData, isLoading: inactiveOrdersLoading } = useQuery({
    queryKey: ['client-orders-overview-inactive'],
    queryFn: () => ordersApi.getClientOrders({ inactive: true, ordering: '-created_at' }),
    enabled: userProfile?.role === 'client',
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const orders: Order[] = useMemo(() => {
    const source = userProfile?.role === 'client' ? clientOrdersData : myOrdersData;
    const raw =
      source && typeof source === 'object' && 'results' in source
        ? (source as { results?: unknown }).results
        : source;
    return Array.isArray(raw) ? (raw as Order[]) : [];
  }, [clientOrdersData, myOrdersData, userProfile?.role]);

  const inactiveOrders: Order[] = useMemo(() => {
    const raw =
      inactiveClientOrdersData && typeof inactiveClientOrdersData === 'object' && 'results' in inactiveClientOrdersData
        ? (inactiveClientOrdersData as { results?: unknown }).results
        : inactiveClientOrdersData;
    return Array.isArray(raw) ? (raw as Order[]) : [];
  }, [inactiveClientOrdersData]);

  const isLoading = userProfile?.role === 'client'
    ? (clientOrdersLoading || inactiveOrdersLoading)
    : myOrdersLoading;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (isValidTab(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (userProfile?.role !== 'expert') return;
    if (!isExpertHiddenTab(activeTab)) return;
    const fallbackTab: WorksTab = 'in_progress';
    setActiveTab(fallbackTab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', fallbackTab);
    setSearchParams(params, { replace: true });
  }, [activeTab, searchParams, setSearchParams, userProfile?.role]);

  const handleTabChange = (tab: WorksTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params, { replace: true });
  };

  const isOverdueOrder = (order: Order) => {
    if (order?.is_frozen) return false;
    if (order?.is_overdue === true) return true;
    const status = String(order?.status ?? '');
    if (!(status === 'in_progress' || status === 'revision')) return false;
    const deadlineRaw = order?.deadline;
    if (typeof deadlineRaw !== 'string') return false;
    const d = dayjs(deadlineRaw);
    if (!d.isValid()) return false;
    return d.valueOf() <= dayjs().valueOf();
  };

  const counts = useMemo(() => {
    const newCount = orders.filter((o) => String(o?.status ?? '') === 'new').length;
    const confirming = orders.filter((o) => String(o?.status ?? '') === 'confirming').length;
    const inProgress = orders.filter((o) => isInProgressGroup(o)).length;
    const revision = orders.filter((o) => String(o?.status ?? '') === 'revision').length;
    const waitingPayment = orders.filter((o) => String(o?.status ?? '') === 'waiting_payment').length;
    const review = orders.filter((o) => isReviewGroup(o)).length;
    const download = orders.filter((o) => String(o?.status ?? '') === 'download').length;
    const closed = orders.filter((o) => String(o?.status ?? '') === 'closed').length;
    const completed = orders.filter((o) => o?.status === 'completed').length;
    const all = orders.filter((o) => isAllTabGroup(o)).length;
    return {
      new: newCount,
      confirming,
      in_progress: inProgress,
      revision,
      waiting_payment: waitingPayment,
      review,
      download,
      closed,
      completed,
      inactive: inactiveOrders.length,
      all,
    };
  }, [orders, inactiveOrders]);

  const tabs = useMemo<OrdersTabItem<WorksTab>[]>(() => {
    const items: Array<OrdersTabItem<WorksTab> | null> = [
      userProfile?.role !== 'expert' ? {
        key: 'new',
        label: 'Открытые',
        shortLabel: 'Открыт.',
        count: counts.new,
        countTone: 'green',
      } : null,
      {
        key: 'confirming',
        label: 'На подтверждении',
        shortLabel: 'Подтв.',
        count: counts.confirming,
        countTone: 'orange',
      },
      {
        key: 'in_progress',
        label: 'В работе',
        shortLabel: 'В работе',
        count: counts.in_progress,
        countTone: 'green',
      },
      {
        key: 'review',
        label: 'На проверке',
        shortLabel: 'Проверка',
        count: counts.review,
        countTone: 'orange',
      },
      {
        key: 'revision',
        label: 'На доработке',
        shortLabel: 'Дораб.',
        count: counts.revision,
        countTone: 'orange',
      },
      {
        key: 'waiting_payment',
        label: 'Ожидает оплаты',
        shortLabel: 'Оплата',
        count: counts.waiting_payment,
        countTone: 'orange',
      },
      {
        key: 'completed',
        label: 'Выполнено',
        shortLabel: 'Готово',
        count: counts.completed,
        countTone: 'gray',
      },
      userProfile?.role !== 'expert' ? {
        key: 'download',
        label: 'Ожидает скачивания',
        shortLabel: 'Скачать',
        count: counts.download,
        countTone: 'gray',
      } : null,
      userProfile?.role !== 'expert' ? {
        key: 'closed',
        label: 'Закрыт',
        shortLabel: 'Закрыт',
        count: counts.closed,
        countTone: 'gray',
      } : null,
      userProfile?.role !== 'expert' ? {
        key: 'inactive',
        label: 'Неактивные',
        shortLabel: 'Архив',
        count: counts.inactive,
        countTone: 'gray',
      } : null,
      {
        key: 'all',
        label: 'Все',
        shortLabel: 'Все',
        count: counts.all,
        countTone: 'gray',
      },
    ];

    return items.filter(Boolean) as OrdersTabItem<WorksTab>[];
  }, [counts, userProfile?.role]);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const orderIdQuery = orderIdSearch.trim();
    const source = activeTab === 'inactive' ? inactiveOrders : orders;
    return source.filter((order) => {
      if (activeTab !== 'all') {
        if (activeTab === 'review') {
          if (!isReviewGroup(order)) return false;
        } else if (activeTab === 'inactive') {
          // pass
        } else if (activeTab === 'revision') {
          if (String(order?.status ?? '') !== 'revision') return false;
        } else if (activeTab === 'in_progress') {
          if (!isInProgressGroup(order)) return false;
        } else if (order.status !== activeTab) {
          return false;
        }
      } else {
        if (!isAllTabGroup(order)) return false;
      }

      if (orderIdQuery && String(order.id) !== orderIdQuery) return false;

      if (selectedSubject) {
        const subjectId = Number(order?.subject?.id);
        if (subjectId !== selectedSubject) return false;
      }
      if (selectedWorkType) {
        const workTypeId = Number(order?.work_type?.id);
        if (workTypeId !== selectedWorkType) return false;
      }
      const orderBudget = Number(order?.budget);
      if (Number.isFinite(orderBudget) && orderBudget > 0) {
        if (orderBudget < budgetRange[0] || orderBudget > budgetRange[1]) return false;
      }

      if (!query) return true;
      const title = String(order?.title ?? '').toLowerCase();
      const description = String(order?.description ?? '').toLowerCase();
      const buyer = String(order?.client?.username ?? order?.client_name ?? '').toLowerCase();
      return title.includes(query) || description.includes(query) || buyer.includes(query);
    });
  }, [
    orders,
    inactiveOrders,
    activeTab,
    searchText,
    orderIdSearch,
    selectedSubject,
    selectedWorkType,
    budgetRange,
  ]);

  const averageRatingText =
    typeof expertStats?.average_rating === 'number' && Number.isFinite(expertStats.average_rating)
      ? expertStats.average_rating.toFixed(1)
      : '0.0';

  const getStatusLabel = (status: string) => {
    if (status === 'in_progress') return 'В работе';
    if (status === 'completed') return 'Выполнено';
    if (status === 'review' || status === 'under_review') return 'На проверке';
    return ORDER_STATUS_LABELS[status] || status;
  };

  const formatOrderDate = (value: unknown) => {
    if (typeof value !== 'string') return '—';
    const d = dayjs(value);
    if (!d.isValid()) return '—';
    return d.locale('ru').format('D MMMM, HH:mm');
  };

  const formatRemaining = (value: unknown, status?: unknown) => {
    if (typeof value !== 'string') return '—';
    const baseEnd = dayjs(value);
    const end = String(status ?? '') === 'review' ? baseEnd.add(5, 'day') : baseEnd;
    if (!end.isValid()) return '—';
    const now = dayjs();
    const hours = end.diff(now, 'hour');
    if (hours <= 0) return '0 ч.';
    const days = Math.floor(hours / 24);
    const restHours = hours % 24;
    if (days <= 0) return `${restHours} ч.`;
    if (restHours <= 0) return `${days} д.`;
    return `${days} д. ${restHours} ч.`;
  };

  const formatBudget = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(num)} ₽`;
  };

  const columns: ColumnsType<Order> = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      render: (title: unknown, record: Order) => (
        <div className={styles.titleCell}>
          <div className={styles.titleText}>{String(title ?? 'Без названия')}</div>
          {record?.work_type?.name || record?.subject?.name ? (
            <div className={styles.titleMeta}>
              {[record?.work_type?.name, record?.subject?.name].filter(Boolean).join(' • ')}
            </div>
          ) : null}
        </div>
      ),
      sorter: (a: Order, b: Order) => String(a?.title ?? '').localeCompare(String(b?.title ?? '')),
    },
    {
      title: userProfile?.role === 'client' ? 'Эксперт' : 'Покупатель',
      key: 'buyer',
      render: (_: unknown, record: Order) => {
      const isClient = userProfile?.role === 'client';
      const counterpartyUsername = isClient
        ? record?.expert?.username
        : record?.client?.username;
      const username = isClient
        ? (record?.expert ? formatUserName(record.expert) : 'Не назначен')
        : (record?.client ? formatUserName(record.client) : record?.client_name ?? '—');
      const avatarSrc = isClient ? record?.expert?.avatar : record?.client?.avatar;
      const handleOpenProfile = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (counterpartyUsername) {
          navigate(`/user/${counterpartyUsername}`);
        }
      };
        return (
          <Space size={8}>
            <Avatar size={24} src={avatarSrc} icon={<UserOutlined />} />
            {counterpartyUsername ? (
              <a
                onClick={handleOpenProfile}
                style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {username}
              </a>
            ) : (
              <span>{username}</span>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Заказан',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: unknown) => formatOrderDate(value),
      sorter: (a: Order, b: Order) => {
        const ta = typeof a?.created_at === 'string' ? dayjs(a.created_at).valueOf() : 0;
        const tb = typeof b?.created_at === 'string' ? dayjs(b.created_at).valueOf() : 0;
        return ta - tb;
      },
    },
    {
      title: 'Осталось',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (value: unknown, record: Order) => (isOverdueOrder(record) ? 'Просрочено' : formatRemaining(value, record?.status)),
      sorter: (a: Order, b: Order) => {
        const ta =
          typeof a?.deadline === 'string'
            ? (String(a?.status ?? '') === 'review' ? dayjs(a.deadline).add(5, 'day').valueOf() : dayjs(a.deadline).valueOf())
            : 0;
        const tb =
          typeof b?.deadline === 'string'
            ? (String(b?.status ?? '') === 'review' ? dayjs(b.deadline).add(5, 'day').valueOf() : dayjs(b.deadline).valueOf())
            : 0;
        return ta - tb;
      },
    },
    {
      title: 'Стоимость',
      dataIndex: 'budget',
      key: 'budget',
      render: (value: unknown) => formatBudget(value),
      sorter: (a: Order, b: Order) => Number(a?.budget ?? 0) - Number(b?.budget ?? 0),
    },
    {
      title: 'Заметка',
      key: 'note',
      render: () => <span className={styles.muted}>—</span>,
      width: 90,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: unknown, record: Order) => (
        <Tag className={styles.statusTag} color={isOverdueOrder(record) ? 'red' : undefined}>
          {isOverdueOrder(record) ? 'Просрочен' : getStatusLabel(String(status ?? ''))}
        </Tag>
      ),
      width: 140,
    },
  ];

  return (
    <div className={styles.contentContainer}>
      <div className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          Мои заказы
        </Title>
        {userProfile?.role === 'expert' && (
          <div className={styles.pageHeaderRight}>
            <span className={styles.rating}>
              <StarFilled className={styles.ratingStar} /> {averageRatingText}
            </span>
          </div>
        )}
      </div>

      <div className={styles.controlsRow}>
        <OrdersTabsBar
          tabs={tabs}
          activeTab={activeTab}
          isMobile={isMobile}
          onTabChange={handleTabChange}
        />

        <OrdersFilters
          searchText={searchText}
          orderIdSearch={orderIdSearch}
          selectedSubject={selectedSubject}
          selectedWorkType={selectedWorkType}
          budgetRange={budgetRange}
          showFilters={showFilters}
          subjects={fetchedSubjects}
          workTypes={workTypes}
          isCompact={isCompact}
          onSearchTextChange={setSearchText}
          onOrderIdSearchChange={setOrderIdSearch}
          onSelectedSubjectChange={setSelectedSubject}
          onSelectedWorkTypeChange={setSelectedWorkType}
          onBudgetRangeChange={setBudgetRange}
          onShowFiltersChange={setShowFilters}
        />
      </div>

      <OrdersResponsiveList
        orders={filteredOrders}
        loading={isLoading}
        columns={columns}
        isCompact={isCompact}
        isMobile={isMobile}
        onOpenOrder={(record) => navigate(`/orders/${record.id}`)}
        getCounterparty={(order) => {
          const isClient = userProfile?.role === 'client';
          return {
            label: isClient ? 'Эксперт' : 'Покупатель',
            name: isClient
              ? (order?.expert ? formatUserName(order.expert) : 'Не назначен')
              : (order?.client ? formatUserName(order.client) : order?.client_name ?? '—'),
            avatar: isClient ? order?.expert?.avatar : order?.client?.avatar,
          };
        }}
        getStatusLabel={getStatusLabel}
        isOverdueOrder={isOverdueOrder}
        formatOrderDate={formatOrderDate}
        formatRemaining={formatRemaining}
        formatBudget={formatBudget}
      />
    </div>
  );
};

export default MyWorks;
