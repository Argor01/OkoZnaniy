import React from 'react';
import { Card, Table, Button, Tag, Space, Tooltip } from 'antd';
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PartnerEarning } from '../../types';
import { TABLE_CONSTANTS, EARNING_TYPE_LABELS } from '../../constants';
import styles from './EarningsSection.module.css';

interface EarningsSectionProps {
  earnings: PartnerEarning[];
  loading: boolean;
  onMarkAsPaid: (earningId: number) => void;
  isMarkingPaid?: boolean;
}


export const EarningsSection: React.FC<EarningsSectionProps> = ({
  earnings,
  loading,
  onMarkAsPaid,
  isMarkingPaid = false,
}) => {
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
          order: 'blue',
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
      width: 100,
      render: (record: PartnerEarning) => (
        <Space size="small">
          {!record.is_paid && (
            <Tooltip title="Отметить как выплаченное">
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
          )}
        </Space>
      ),
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