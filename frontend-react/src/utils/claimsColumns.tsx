import React from 'react';
import { Tag, Button, Space, Modal, message, Alert } from 'antd';
import { EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  ClaimType,
  ClaimPriority,
  ClaimStatus,
  getClaimTypeLabel,
  getClaimPriorityLabel,
  getClaimPriorityColor,
  getClaimStatusLabel,
  getClaimStatusColor,
} from '../types/claims';

export const getCommonClaimColumns = () => {
  return {
    id: {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => `#${id}`,
    },
    user: {
      title: 'Пользователь',
      dataIndex: 'user',
      key: 'user',
      render: (user: any) => (
        <div>
          <div><strong>{user.username}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
        </div>
      ),
    },
    claimType: {
      title: 'Тип',
      dataIndex: 'claimType',
      key: 'claimType',
      render: (type: string) => getClaimTypeLabel(type as ClaimType),
    },
    priority: {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getClaimPriorityColor(priority as ClaimPriority)}>
          {getClaimPriorityLabel(priority as ClaimPriority)}
        </Tag>
      ),
    },
    status: {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getClaimStatusColor(status as ClaimStatus)}>
          {getClaimStatusLabel(status as ClaimStatus)}
        </Tag>
      ),
    },
    subject: {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    createdAt: {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    assignedAdmin: {
      title: 'Администратор',
      dataIndex: 'assignedAdmin',
      key: 'assignedAdmin',
      render: (admin: any) => admin?.username || 'Не назначен',
    },
  };
};

export const renderClaimDetailModal = (record: any) => {
  Modal.info({
    title: `Обращение #${record.id}`,
    content: (
      <div>
        <p><strong>От:</strong> {record.user.username} ({record.user.email})</p>
        <p><strong>Тип:</strong> {getClaimTypeLabel(record.claimType as ClaimType)}</p>
        <p><strong>Приоритет:</strong> {getClaimPriorityLabel(record.priority as ClaimPriority)}</p>
        <p><strong>Тема:</strong> {record.subject}</p>
        <p><strong>Описание:</strong></p>
        <p>{record.description}</p>
        {record.relatedOrder && (
          <p><strong>Связанный заказ:</strong> #{record.relatedOrder.id} - {record.relatedOrder.title}</p>
        )}
        {record.messages && record.messages.length > 0 && (
          <>
            <p><strong>Сообщения:</strong></p>
            {record.messages.map((msg: any) => (
              <div key={msg.id} style={{ marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {msg.author.username} - {dayjs(msg.createdAt).format('DD.MM.YYYY HH:mm')}
                  {msg.isInternal && <Tag color="orange" style={{ marginLeft: 8 }}>Внутренняя</Tag>}
                </div>
                <div>{msg.message}</div>
              </div>
            ))}
          </>
        )}
        {record.status === ClaimStatus.PENDING_DIRECTOR && (
          <Alert
            message="Обращение эскалировано в дирекцию"
            description="Ожидается решение от дирекции. Проверьте раздел 'Коммуникация с дирекцией' для получения обновлений."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
        {record.resolution && (
          <>
            <p><strong>Решение:</strong></p>
            <p style={{ background: '#f0f9ff', padding: 12, borderRadius: 4 }}>{record.resolution}</p>
          </>
        )}
      </div>
    ),
    width: 700,
    maskStyle: {
      backdropFilter: 'blur(4px)',
    },
  });
};
