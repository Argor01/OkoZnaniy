import React, { useMemo } from 'react';
import { Card, Table, Button, Tag, Space, Tooltip, Popconfirm } from 'antd';
import { CheckOutlined, ClockCircleOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PartnerEarning } from '@/features/admin/types';
import { TABLE_CONSTANTS, EARNING_TYPE_LABELS } from '@/features/admin/constants';
import styles from './EarningsSection.module.css';

interface EarningsSectionProps {
  earnings: PartnerEarning[];
  loading: boolean;
  onMarkAsPaid: (earningId: number) => void;
  onPayPartner?: (partnerName: string, earningIds: number[]) => void;
  isMarkingPaid?: boolean;
}


export const EarningsSection: React.FC<EarningsSectionProps> = ({
  earnings,
  loading,
  onMarkAsPaid,
  onPayPartner,
  isMarkingPaid = false,
}) => {
  const unpaidByPartner = useMemo(() => {
    const map = new Map<string, { ids: number[]; total: number }>();
    earnings.filter(e => !e.is_paid).forEach(e => {
      const entry = map.get(e.partner) || { ids: [], total: 0 };
      entry.ids.push(e.id);
      entry.total += e.amount;
      map.set(e.partner, entry);
    });
    return map;
  }, [earnings]);
  const columns = [
    {
      title: 'Партнер',
      dataIndex: 'partner',
      key: 'partner',
      render: (partner: string) => (
        <span className={styles.partnerName}>{partner}</span>
      ),
    },
    {
      title: 'Реферал',
      dataIndex: 'referral',
      key: 'referral',
      render: (referral: string) => (
        <span className={styles.referralName}>{referral}</span>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className={styles.amount}>
          {amount.toLocaleString()} ₽
        </span>
      ),
      sorter: (a: PartnerEarning, b: PartnerEarning) => a.amount - b.amount,
    },
    {
      title: 'Тип',
      dataIndex: 'earning_type',
      key: 'earning_type',
      render: (type: string) => {
        const typeColors = {
          order: 'purple',
          registration: 'green',
          bonus: 'purple',
        };
        
        return (
          <Tag 
            color={typeColors[type as keyof typeof typeColors] || 'default'}
            className={styles.typeTag}
          >
            {EARNING_TYPE_LABELS[type as keyof typeof EARNING_TYPE_LABELS] || type}
          </Tag>
        );
      },
      filters: [
        { text: 'Заказ', value: 'order' },
        { text: 'Регистрация', value: 'registration' },
        { text: 'Бонус', value: 'bonus' },
      ],
      onFilter: (value: string | number | boolean, record: PartnerEarning) => 
        record.earning_type === value,
    },
    {
      title: 'Статус',
      dataIndex: 'is_paid',
      key: 'is_paid',
      render: (isPaid: boolean) => (
        <Tag 
          color={isPaid ? 'green' : 'orange'}
          icon={isPaid ? <CheckOutlined /> : <ClockCircleOutlined />}
          className={styles.statusTag}
        >
          {isPaid ? 'Выплачено' : 'Ожидает'}
        </Tag>
      ),
      filters: [
        { text: 'Выплачено', value: true },
        { text: 'Ожидает', value: false },
      ],
      onFilter: (value: boolean | string | number, record: PartnerEarning) => 
        record.is_paid === value,
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div className={styles.dateInfo}>
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <div className={styles.timeInfo}>{dayjs(date).format('HH:mm')}</div>
        </div>
      ),
      sorter: (a: PartnerEarning, b: PartnerEarning) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (record: PartnerEarning) => {
        const partnerPending = unpaidByPartner.get(record.partner);
        const canPayAll = partnerPending && partnerPending.ids.length > 1 && partnerPending.ids[0] === record.id;
        return (
          <Space size="small">
            {!record.is_paid && (
              <>
                <Tooltip title="Выплатить это начисление">
                  <Button 
                    size="small" 
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => onMarkAsPaid(record.id)}
                    loading={isMarkingPaid}
                    className={styles.payButton}
                  >
                    Выплатить
                  </Button>
                </Tooltip>
                {canPayAll && onPayPartner && (
                  <Popconfirm
                    title={`Выплатить все невыплаченные начисления партнёру «${record.partner}»?`}
                    description={`Сумма: ${partnerPending.total.toLocaleString()} ₽ (${partnerPending.ids.length} шт.)`}
                    onConfirm={() => onPayPartner(record.partner, partnerPending.ids)}
                    okText="Выплатить"
                    cancelText="Отмена"
                  >
                    <Tooltip title={`Выплатить все (${partnerPending.ids.length} шт.)`}>
                      <Button 
                        size="small" 
                        type="default"
                        icon={<WalletOutlined />}
                        className={styles.payButton}
                      >
                        Всё
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  
  const totalAmount = earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const paidAmount = earnings
    .filter(e => e.is_paid)
    .reduce((sum, earning) => sum + earning.amount, 0);
  const unpaidAmount = totalAmount - paidAmount;
  const unpaidCount = earnings.filter(e => !e.is_paid).length;

  return (
    <div className={styles.earningsContainer}>
      <div className={styles.statsContainer}>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Всего начислений</span>
            <span className={styles.statValue}>{totalAmount.toLocaleString()} ₽</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Выплачено</span>
            <span className={`${styles.statValue} ${styles.paidValue}`}>
              {paidAmount.toLocaleString()} ₽
            </span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Ожидает выплаты</span>
            <span className={`${styles.statValue} ${styles.unpaidValue}`}>
              {unpaidAmount.toLocaleString()} ₽
            </span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Невыплаченных</span>
            <span className={`${styles.statValue} ${styles.countValue}`}>
              {unpaidCount}
            </span>
          </div>
        </Card>
      </div>

      <Card className={styles.earningsCard}>
        <Table
          columns={columns}
          dataSource={earnings}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: TABLE_CONSTANTS.DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showQuickJumper: false,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} начислений`,
            position: ['bottomCenter'],
          }}
          scroll={{ x: 800 }}
          locale={{ emptyText: 'Начисления не найдены' }}
          className={styles.earningsTable}
        />
      </Card>
    </div>
  );
};