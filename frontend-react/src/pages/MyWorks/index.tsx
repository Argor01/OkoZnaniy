import React, { useMemo, useState } from 'react';
import { Typography, Input, Table, Tag, Avatar, Space } from 'antd';
import { SearchOutlined, StarFilled, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders';
import { authApi } from '../../api/auth';
import { expertsApi } from '../../api/experts';
import { ORDER_STATUS_TEXTS } from '../../config/orderStatuses';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import styles from './MyWorks.module.css';

const { Title } = Typography;

const MyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'in_progress' | 'review' | 'completed' | 'all'>('in_progress');

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: expertStats } = useQuery({
    queryKey: ['expert-statistics', userProfile?.id],
    queryFn: () => expertsApi.getExpertStatistics(userProfile!.id),
    enabled: userProfile?.role === 'expert' && typeof userProfile?.id === 'number' && userProfile.id > 0,
  });

  const { data: myOrdersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders({ ordering: '-created_at' }),
  });

  const orders: any[] = useMemo(() => {
    const raw =
      myOrdersData && typeof myOrdersData === 'object' && 'results' in myOrdersData
        ? (myOrdersData as { results?: unknown }).results
        : myOrdersData;
    return Array.isArray(raw) ? (raw as any[]) : [];
  }, [myOrdersData]);

  const counts = useMemo(() => {
    const inProgress = orders.filter((o) => o?.status === 'in_progress').length;
    const review = orders.filter((o) => o?.status === 'review' || o?.status === 'under_review').length;
    const completed = orders.filter((o) => o?.status === 'completed').length;
    return { in_progress: inProgress, review, completed, all: orders.length };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return orders.filter((order) => {
      if (activeTab !== 'all') {
        if (activeTab === 'review') {
          if (!(order.status === 'review' || order.status === 'under_review')) return false;
        } else if (order.status !== activeTab) {
          return false;
        }
      }

      if (!query) return true;
      const title = String(order?.title ?? '').toLowerCase();
      const description = String(order?.description ?? '').toLowerCase();
      const buyer = String(order?.client?.username ?? order?.client_name ?? '').toLowerCase();
      return title.includes(query) || description.includes(query) || buyer.includes(query);
    });
  }, [orders, activeTab, searchText]);

  const averageRatingText =
    typeof expertStats?.average_rating === 'number' && Number.isFinite(expertStats.average_rating)
      ? expertStats.average_rating.toFixed(1)
      : '0.0';

  const getStatusLabel = (status: string) => {
    if (status === 'in_progress') return 'В работе';
    if (status === 'completed') return 'Выполнено';
    if (status === 'review' || status === 'under_review') return 'На проверке';
    return ORDER_STATUS_TEXTS[status] || status;
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

  const columns: ColumnsType<any> = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      render: (title: unknown, record: any) => (
        <div className={styles.titleCell}>
          <div className={styles.titleText}>{String(title ?? 'Без названия')}</div>
          {record?.work_type?.name || record?.subject?.name ? (
            <div className={styles.titleMeta}>
              {[record?.work_type?.name, record?.subject?.name].filter(Boolean).join(' • ')}
            </div>
          ) : null}
        </div>
      ),
      sorter: (a: any, b: any) => String(a?.title ?? '').localeCompare(String(b?.title ?? '')),
    },
    {
      title: 'Покупатель',
      key: 'buyer',
      render: (_: unknown, record: any) => {
        const username = record?.client?.username ?? record?.client_name ?? '—';
        const avatarSrc = record?.client?.avatar;
        return (
          <Space size={8}>
            <Avatar size={24} src={avatarSrc} icon={<UserOutlined />} />
            <span>{username}</span>
          </Space>
        );
      },
    },
    {
      title: 'Заказан',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: unknown) => formatOrderDate(value),
      sorter: (a: any, b: any) => {
        const ta = typeof a?.created_at === 'string' ? dayjs(a.created_at).valueOf() : 0;
        const tb = typeof b?.created_at === 'string' ? dayjs(b.created_at).valueOf() : 0;
        return ta - tb;
      },
    },
    {
      title: 'Осталось',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (value: unknown, record: any) => formatRemaining(value, record?.status),
      sorter: (a: any, b: any) => {
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
      sorter: (a: any, b: any) => Number(a?.budget ?? 0) - Number(b?.budget ?? 0),
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
      render: (status: unknown) => (
        <Tag className={styles.statusTag}>{getStatusLabel(String(status ?? ''))}</Tag>
      ),
      width: 140,
    },
  ];

  return (
    <div className={styles.contentContainer}>
      <div className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          Мои работы
        </Title>
        <div className={styles.pageHeaderRight}>
          <span className={styles.rating}>
            <StarFilled style={{ color: '#fbbf24' }} /> {averageRatingText}
          </span>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'in_progress' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('in_progress')}
          >
            В работе <span className={`${styles.countBadge} ${styles.countGreen}`}>{counts.in_progress}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'review' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('review')}
          >
            На проверке <span className={`${styles.countBadge} ${styles.countOrange}`}>{counts.review}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'completed' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Выполнено <span className={`${styles.countBadge} ${styles.countGray}`}>{counts.completed}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Все <span className={`${styles.countBadge} ${styles.countGray}`}>{counts.all}</span>
          </button>
        </div>

        <Input
          placeholder="Поиск..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          className={styles.searchInput}
        />
      </div>

      <Table
        className={styles.table}
        columns={columns}
        dataSource={filteredOrders}
        rowKey={(record) => record.id}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        onRow={(record) => ({
          onClick: () => navigate(`/works/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  );
};

export default MyWorks;
