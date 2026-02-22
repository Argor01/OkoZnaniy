import { Tag, Modal, Alert } from 'antd';
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

type ClaimUser = { username?: string; email?: string };
type ClaimAdmin = { username?: string } | null | undefined;
type ClaimOrder = { id: number; title?: string | null };
type ClaimMessage = {
  id: number;
  author: { username?: string };
  createdAt?: string;
  isInternal?: boolean;
  message?: string;
};
type ClaimRecord = {
  id: number;
  user: ClaimUser;
  claimType: string;
  priority: string;
  subject?: string;
  description?: string;
  relatedOrder?: ClaimOrder | null;
  messages?: ClaimMessage[] | null;
  status?: string;
  resolution?: string;
};

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
      render: (user: ClaimUser) => (
        <div>
          <div><strong>{user.username}</strong></div>
          <div className="claimUserEmail">{user.email}</div>
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
      render: (admin: ClaimAdmin) => admin?.username || 'Не назначен',
    },
  };
};

export const renderClaimDetailModal = (record: ClaimRecord) => {
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
            {record.messages.map((msg) => (
              <div key={msg.id} className="claimMessageItem">
                <div className="claimMessageMeta">
                  {msg.author.username} - {dayjs(msg.createdAt).format('DD.MM.YYYY HH:mm')}
                  {msg.isInternal && <Tag color="orange" className="claimInternalTag">Внутренняя</Tag>}
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
            className="claimWarningSpacing"
          />
        )}
        {record.resolution && (
          <>
            <p><strong>Решение:</strong></p>
            <p className="claimResolution">{record.resolution}</p>
          </>
        )}
      </div>
    ),
    width: 700,
  });
};
