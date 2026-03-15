import React from 'react';
import { Typography, Tag, Space, Tooltip, Avatar, message } from 'antd';
import { 
  ClockCircleOutlined, 
  UserOutlined, 
  DeleteOutlined, 
  FileOutlined, 
  FilePdfOutlined, 
  FileWordOutlined, 
  FileImageOutlined, 
  FileZipOutlined, 
  DownloadOutlined, 
  ShareAltOutlined,
  ReadOutlined
} from '@ant-design/icons';
import { Order, OrderFile } from '@/features/orders/types/orders';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
import { AppButton, AppCard } from '@/components/ui';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from './OrderCard.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

export type OrderCardData = Order & {
  subject_id?: number;
  work_type_id?: number;
  responses_count?: number;
  user_has_bid?: boolean;
  is_active?: boolean;
  deleted?: boolean;
  subject_name?: string;
  work_type_name?: string;
  client_avatar?: string;
  client_orders_count?: number;
  custom_subject?: string;
  custom_work_type?: string;
  files?: Array<
    Partial<OrderFile> & {
      id?: number | string;
      filename?: string;
      file_name?: string;
      file_size?: string;
      file_url?: string | null;
      view_url?: string | null;
      download_url?: string | null;
      file?: string | null;
      file_type?: string;
    }
  >;
};

interface OrderCardProps {
  order: OrderCardData;
  userProfile?: {
    id: number;
    role: string;
    username?: string;
    avatar?: string;
  } | null;
  onDelete?: (id: number) => void;
  onBid?: (order: OrderCardData) => void;
  onClick?: (id: number) => void;
  onDownloadFile?: (orderId: number, file: any) => void;
  hasMyBid?: boolean;
  checkingMyBid?: boolean;
  isMobile?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  userProfile,
  onDelete,
  onBid,
  onClick,
  onDownloadFile,
  hasMyBid = false,
  checkingMyBid = false,
  isMobile = false,
}) => {
  const getStatusColor = (status: string) => ORDER_STATUS_COLORS[status] || 'default';
  const getStatusText = (status: string) => ORDER_STATUS_LABELS[status] || status;
  const subjectText = order.custom_subject || order.subject?.name || order.subject_name || 'Не указан';
  const workTypeText = order.custom_work_type || order.work_type?.name || order.work_type_name || 'Не указан';
  const responsesText = `${order.bids?.length || order.responses_count || 0} откликов`;

  const isOrderOwner = (order: OrderCardData) => {
    return order.client?.id === userProfile?.id || 
           order.client_id === userProfile?.id;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/orders/${order.id}`;
    try {
      await navigator.clipboard.writeText(url);
      message.success('Ссылка скопирована');
    } catch {
      message.error('Не удалось скопировать ссылку');
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined className={styles.fileIconPdf} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined className={styles.fileIconDoc} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return <FileImageOutlined className={styles.fileIconImage} />;
    if (['zip', 'rar', '7z'].includes(ext || '')) return <FileZipOutlined className={styles.fileIconArchive} />;
    return <FileOutlined className={styles.fileIconDefault} />;
  };

  return (
    <AppCard
      hoverable
      className={styles.orderCard}
      onClick={() => onClick?.(order.id)}
    >
      <div className={styles.orderCardHeader}>
        <div className={styles.orderCardHeaderInfo}>
          <Text strong className={styles.orderTitle}>
            {order.title}
          </Text>
          <Space size={8} wrap>
            <Tag className={styles.statusTag} color={getStatusColor(order.status)}>
              {getStatusText(order.status)}
            </Tag>
            {(order.custom_subject || order.subject?.name || order.subject_name) && (
              <Tag className={styles.subjectTag}>
                {subjectText}
              </Tag>
            )}
            {(order.custom_work_type || order.work_type?.name || order.work_type_name) && (
              <Tag className={styles.workTypeTag}>
                {workTypeText}
              </Tag>
            )}
            {order.topic?.name && (
              <Tag className={styles.topicTag}>
                Тема: {order.topic.name}
              </Tag>
            )}
          </Space>
        </div>
        <div className={styles.orderCardActions}>
          <div className={styles.orderCardActionsRow}>
            <Tooltip title="Скопировать ссылку на заказ">
              <AppButton
                variant="text"
                size="small"
                icon={<ShareAltOutlined />}
                onClick={handleShare}
              />
            </Tooltip>
          </div>
          <div className={styles.orderBudget}>
            {Number.isFinite(Number(order.budget)) ? formatCurrency(Number(order.budget)) : 'Договорная'}
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
      
      {order.files && order.files.length > 0 && (
        <div className={styles.filesBlock}>
          <Text type="secondary" className={styles.filesLabel}>
            Прикрепленные файлы ({order.files.length}):
          </Text>
          <Space size={8} wrap>
            {order.files.map((file) => {
              const fileName = file.filename || 'file';
              return (
                <Tooltip
                  key={String(file.id ?? fileName)}
                  title={`Открыть ${fileName} (${file.file_size || 'размер неизвестен'})`}
                >
                  <Tag 
                    icon={getFileIcon(fileName)}
                    className={styles.fileTag}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadFile?.(order.id, file);
                    }}
                  >
                    {fileName} <DownloadOutlined className={styles.fileDownloadIcon} />
                  </Tag>
                </Tooltip>
              );
            })}
          </Space>
        </div>
      )}

      <div className={styles.clientInfo}>
        <Space size={12}>
          <Avatar 
            size={48}
            src={order.client?.avatar || order.client_avatar}
            icon={<UserOutlined />}
            className={styles.clientAvatar}
          />
          <div>
            <Text strong className={styles.clientName}>
              {order.client?.username || order.client_name || 
                (order.client?.first_name && order.client?.last_name 
                  ? `${order.client.first_name} ${order.client.last_name}` 
                  : 'Заказчик')}
            </Text>
            <Text type="secondary" className={styles.clientOrders} style={{ display: 'block' }}>
              Заказов: {order.client_orders_count || 1}
            </Text>
          </div>
        </Space>
      </div>

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
          <Space size={4}>
            <UserOutlined className={styles.orderMetaIcon} />
            <Text type="secondary" className={styles.orderMetaText}>
              {responsesText}
            </Text>
          </Space>
        </Space>
        
        {isOrderOwner(order) ? (
          <AppButton 
            variant="danger"
            icon={<DeleteOutlined />}
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(order.id);
            }}
          >
            Удалить
          </AppButton>
        ) : userProfile?.role === 'expert' ? (
          <AppButton 
            variant={hasMyBid ? 'secondary' : 'primary'}
            disabled={hasMyBid || checkingMyBid}
            size={isMobile ? 'middle' : 'large'}
            className={`${styles.orderBidButton} ${hasMyBid ? styles.orderBidButtonDisabled : styles.orderBidButtonActive}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasMyBid || checkingMyBid) return;
              onBid?.(order);
            }}
          >
            {hasMyBid ? 'Вы уже откликнулись' : 'Откликнуться'}
          </AppButton>
        ) : null}
      </div>
    </AppCard>
  );
};
