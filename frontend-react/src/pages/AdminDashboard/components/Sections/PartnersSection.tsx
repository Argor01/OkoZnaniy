import React from 'react';
import { Card, Table, Button, Space, Tag, Tooltip } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Partner } from '../../types';
import { TABLE_CONSTANTS } from '../../constants';
import styles from './PartnersSection.module.css';

interface PartnersSectionProps {
  partners: Partner[];
  loading: boolean;
  onEdit: (partner: Partner) => void;
  onView: (partner: Partner) => void;
}


export const PartnersSection: React.FC<PartnersSectionProps> = ({
  partners,
  loading,
  onEdit,
  onView,
}) => {
  const columns = [
    {
      title: 'Партнер',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: Partner) => (
        <div className={styles.partnerInfo}>
          <div className={styles.partnerName}>{username}</div>
          <div className={styles.partnerEmail}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Реферальный код',
      dataIndex: 'referral_code',
      key: 'referral_code',
      render: (code: string) => (
        <Tag color="blue" className={styles.referralCode}>
          {code}
        </Tag>
      ),
    },
    {
      title: 'Процент',
      dataIndex: 'partner_commission_rate',
      key: 'partner_commission_rate',
      render: (rate: number) => (
        <span className={styles.commissionRate}>{rate}%</span>
      ),
      sorter: (a: Partner, b: Partner) => a.partner_commission_rate - b.partner_commission_rate,
    },
    {
      title: 'Рефералы',
      key: 'referrals',
      render: (record: Partner) => (
        <div className={styles.referralsInfo}>
          <div>Всего: <strong>{record.total_referrals}</strong></div>
          <div className={styles.activeReferrals}>
            Активных: <strong>{record.active_referrals}</strong>
          </div>
        </div>
      ),
      sorter: (a: Partner, b: Partner) => a.total_referrals - b.total_referrals,
    },
    {
      title: 'Доходы',
      dataIndex: 'total_earnings',
      key: 'total_earnings',
      render: (amount: number) => (
        <span className={styles.earnings}>
          {amount.toLocaleString()} ₽
        </span>
      ),
      sorter: (a: Partner, b: Partner) => a.total_earnings - b.total_earnings,
    },
    {
      title: 'Статус',
      dataIndex: 'is_verified',
      key: 'is_verified',
      render: (isVerified: boolean) => (
        <Tag 
          color={isVerified ? 'green' : 'orange'}
          className={styles.statusTag}
        >
          {isVerified ? 'Верифицирован' : 'Не верифицирован'}
        </Tag>
      ),
      filters: [
        { text: 'Верифицирован', value: true },
        { text: 'Не верифицирован', value: false },
      ],
      onFilter: (value: boolean | string, record: Partner) => record.is_verified === value,
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => (
        <span className={styles.date}>
          {dayjs(date).format('DD.MM.YYYY')}
        </span>
      ),
      sorter: (a: Partner, b: Partner) => dayjs(a.date_joined).unix() - dayjs(b.date_joined).unix(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Partner) => (
        <Space size="small">
          <Tooltip title="Редактировать">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              className={styles.actionButton}
            />
          </Tooltip>
          <Tooltip title="Подробно">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => onView(record)}
              className={styles.actionButton}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.partnersContainer}>
      <Card className={styles.partnersCard}>
        <Table
          columns={columns}
          dataSource={partners}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: TABLE_CONSTANTS.DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} партнеров`,
          }}
          scroll={{ x: 800 }}
          locale={{ emptyText: 'Партнеры не найдены' }}
          className={styles.partnersTable}
        />
      </Card>
    </div>
  );
};