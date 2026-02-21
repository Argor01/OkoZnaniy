import React from 'react';
import { Card, Table, Button, Tag, Space, Tooltip, Modal, Select, Alert } from 'antd';
import { 
  EyeOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dispute, Arbitrator } from '../../types';
import { TABLE_CONSTANTS } from '../../constants';
import styles from './DisputesSection.module.css';

interface DisputesSectionProps {
  disputes: Dispute[];
  arbitrators: Arbitrator[];
  loading: boolean;
  error?: any;
  onViewDispute: (dispute: Dispute) => void;
  onAssignArbitrator: (disputeId: number, arbitratorId: number) => void;
  isAssigningArbitrator?: boolean;
}


export const DisputesSection: React.FC<DisputesSectionProps> = ({
  disputes,
  arbitrators,
  loading,
  error,
  onViewDispute,
  onAssignArbitrator,
  isAssigningArbitrator = false,
}) => {
  const handleViewDispute = (dispute: Dispute) => {
    Modal.info({
      title: `Спор по заказу #${dispute.order.id}`,
      content: (
        <div className={styles.disputeModal}>
          <p><strong>Клиент:</strong> {dispute.order.client.username}</p>
          {dispute.order.expert && (
            <p><strong>Эксперт:</strong> {dispute.order.expert.username}</p>
          )}
          <p><strong>Причина спора:</strong></p>
          <p className={styles.disputeReason}>{dispute.reason}</p>
          {dispute.arbitrator && (
            <p><strong>Арбитр:</strong> {dispute.arbitrator.username}</p>
          )}
          {dispute.resolved && dispute.result && (
            <div className={styles.disputeResult}>
              <p><strong>Решение:</strong></p>
              <p>{dispute.result}</p>
            </div>
          )}
        </div>
      ),
      width: 600,
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
    });
  };

  const handleAssignArbitrator = (dispute: Dispute) => {
    if (!arbitrators || arbitrators.length === 0) {
      Modal.warning({
        title: 'Нет доступных арбитров',
        content: 'В системе нет зарегистрированных арбитров для назначения.',
      });
      return;
    }

    let selectedArbitratorId: number | null = null;

    Modal.confirm({
      title: 'Назначить арбитра',
      content: (
        <div className={styles.assignModal}>
          <p>Выберите арбитра для спора #{dispute.id}:</p>
          <Select
            placeholder="Выберите арбитра"
            style={{ width: '100%', marginTop: 8 }}
            onChange={(value) => {
              selectedArbitratorId = value;
            }}
          >
            {arbitrators.map((arbitrator) => (
              <Select.Option key={arbitrator.id} value={arbitrator.id}>
                {arbitrator.username} ({arbitrator.first_name} {arbitrator.last_name})
              </Select.Option>
            ))}
          </Select>
        </div>
      ),
      okText: 'Назначить',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        if (!selectedArbitratorId) {
          Modal.error({
            title: 'Ошибка',
            content: 'Выберите арбитра для назначения',
          });
          return;
        }
        onAssignArbitrator(dispute.id, selectedArbitratorId);
      },
    });
  };

  const columns = [
    {
      title: 'Заказ',
      key: 'order',
      render: (record: Dispute) => (
        <div className={styles.orderInfo}>
          <div className={styles.orderId}>#{record.order.id}</div>
          <div className={styles.orderTitle}>
            {record.order.title || 'Без названия'}
          </div>
        </div>
      ),
    },
    {
      title: 'Участники',
      key: 'participants',
      width: 250,
      render: (record: Dispute) => (
        <div className={styles.participants}>
          <div className={styles.participant}>
            <UserOutlined /> Клиент: {record.order.client.username}
          </div>
          {record.order.expert && (
            <div className={styles.participant}>
              <UserOutlined /> Эксперт: {record.order.expert.username}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Причина спора',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <div className={styles.reasonContainer}>
          <Tooltip title={reason}>
            <span className={styles.reason}>
              {reason.length > 50 ? `${reason.substring(0, 50)}...` : reason}
            </span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Арбитр',
      key: 'arbitrator',
      render: (record: Dispute) => (
        <span className={styles.arbitrator}>
          {record.arbitrator?.username || 'Не назначен'}
        </span>
      ),
      filters: [
        { text: 'Назначен', value: 'assigned' },
        { text: 'Не назначен', value: 'unassigned' },
      ],
      onFilter: (value: string | number | boolean, record: Dispute) => {
        if (value === 'assigned') return !!record.arbitrator;
        if (value === 'unassigned') return !record.arbitrator;
        return true;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'resolved',
      key: 'resolved',
      render: (resolved: boolean) => (
        <Tag 
          color={resolved ? 'green' : 'orange'} 
          icon={resolved ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          className={styles.statusTag}
        >
          {resolved ? 'Решен' : 'В рассмотрении'}
        </Tag>
      ),
      filters: [
        { text: 'Решен', value: true },
        { text: 'В рассмотрении', value: false },
      ],
      onFilter: (value: boolean | string | number, record: Dispute) => 
        record.resolved === value,
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div className={styles.dateInfo}>
          <div>{dayjs(date).format('DD.MM.YYYY')}</div>
          <div className={styles.timeInfo}>{dayjs(date).format('HH:mm')}</div>
        </div>
      ),
      sorter: (a: Dispute, b: Dispute) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (record: Dispute) => (
        <Space size="small">
          <Tooltip title="Подробно">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDispute(record)}
              className={styles.actionButton}
            />
          </Tooltip>
          {!record.resolved && !record.arbitrator && (
            <Tooltip title="Назначить арбитра">
              <Button 
                size="small" 
                type="primary"
                icon={<UserOutlined />}
                onClick={() => handleAssignArbitrator(record)}
                loading={isAssigningArbitrator}
                className={styles.assignButton}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  
  const totalDisputes = disputes.length;
  const resolvedDisputes = disputes.filter(d => d.resolved).length;
  const pendingDisputes = totalDisputes - resolvedDisputes;
  const unassignedDisputes = disputes.filter(d => !d.arbitrator && !d.resolved).length;

  return (
    <div className={styles.disputesContainer}>
      <div className={styles.statsContainer}>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Всего споров</span>
            <span className={styles.statValue}>{totalDisputes}</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Решено</span>
            <span className={`${styles.statValue} ${styles.resolvedValue}`}>
              {resolvedDisputes}
            </span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>В рассмотрении</span>
            <span className={`${styles.statValue} ${styles.pendingValue}`}>
              {pendingDisputes}
            </span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Без арбитра</span>
            <span className={`${styles.statValue} ${styles.unassignedValue}`}>
              {unassignedDisputes}
            </span>
          </div>
        </Card>
      </div>

      
      <Card className={styles.disputesCard}>
        {error ? (
          <Alert
            message="Ошибка загрузки споров"
            description={error?.message || 'Не удалось загрузить данные о спорах'}
            type="error"
            showIcon
            style={{ margin: 16 }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={disputes}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: TABLE_CONSTANTS.DEFAULT_PAGE_SIZE,
              showSizeChanger: true,
              showQuickJumper: false,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} из ${total} споров`,
              position: ['bottomCenter'],
            }}
            scroll={{ x: 900 }}
            locale={{ emptyText: 'Споры не найдены' }}
            className={styles.disputesTable}
          />
        )}
      </Card>
    </div>
  );
};