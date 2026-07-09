import React, { useCallback, useEffect, useMemo } from 'react';
import { Typography, Spin, Tag } from 'antd';
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileZipOutlined,
  DownloadOutlined,
  InboxOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { Order } from '@/features/orders/api/orders';
import styles from '../OrderDetail.module.css';

const { Title, Text, Paragraph } = Typography;

interface OrderContentProps {
  order: Order;
  isMobile: boolean;
  isOrderOwner: boolean;
  isOrderExpert: boolean;
  canSeeDeliveredWorkBlock: boolean;
  uploadingFiles: boolean;
  dragActive: boolean;
  userProfileId: number;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTaskFileDrop: (e: React.DragEvent) => void;
  onTaskFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadFile: (file: any) => void;
  onDeleteOrderFile: (file: any) => void;
  onDeliveredFilesResolved?: (ids: number[]) => void;
  onDeliveredFileViewed?: (id: number) => void;
}

const OrderContent: React.FC<OrderContentProps> = ({
  order,
  isOrderOwner,
  isOrderExpert,
  canSeeDeliveredWorkBlock,
  uploadingFiles,
  dragActive,
  userProfileId,
  onDrag,
  onDrop,
  onFileInput,
  onTaskFileDrop,
  onTaskFileInput,
  onDownloadFile,
  onDeleteOrderFile,
  onDeliveredFilesResolved,
  onDeliveredFileViewed,
}) => {
  const getOrderFileIcon = useCallback((filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined className={styles.fileIconPdf} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined className={styles.fileIconDoc} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <FileImageOutlined className={styles.fileIconImage} />;
    if (['zip', 'rar', '7z'].includes(ext || '')) return <FileZipOutlined className={styles.fileIconArchive} />;
    return <FileOutlined className={styles.fileIconDefault} />;
  }, []);

  const formatOrderFileTileName = useCallback((filename: string, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;
    const extIndex = filename.lastIndexOf('.');
    if (extIndex <= 0) return `${filename.slice(0, maxLength - 3)}...`;
    const ext = filename.slice(extIndex);
    const base = filename.slice(0, extIndex);
    const allowedBaseLength = Math.max(6, maxLength - ext.length - 3);
    return `${base.slice(0, allowedBaseLength)}...${ext}`;
  }, []);

  const formatFileDateTime = useCallback((value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const canDeleteOrderFile = useCallback((file: any) => {
    const uploaderId = Number(file?.uploaded_by?.id ?? 0);
    return userProfileId > 0 && uploaderId === userProfileId;
  }, [userProfileId]);

  const deliveredWorkFiles = useMemo(() => {
    if (!Array.isArray(order?.files)) return [];
    const deliveredCandidates = order.files.filter((file: any) => {
      const fileType = String(file?.file_type || '').toLowerCase();
      const description = String(file?.description || '');
      if (fileType === 'solution' || fileType === 'revision') return true;
      if (description.includes('chat_delivery_message_id:')) return true;
      return false;
    });

    const extractDeliveryBatchId = (descriptionRaw: unknown): string => {
      const description = String(descriptionRaw || '');
      const match = description.match(/chat_delivery_batch_id:([^\s;]+)/);
      return match?.[1] || '';
    };

    const deliveredWithMeta = deliveredCandidates.map((file: any) => ({
      file,
      batchId: extractDeliveryBatchId(file?.description),
      createdAt: new Date(file?.created_at || 0).getTime(),
    }));

    const latestBatched = deliveredWithMeta
      .filter((item) => !!item.batchId)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestBatched?.batchId) {
      return deliveredWithMeta
        .filter((item) => item.batchId === latestBatched.batchId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((item) => item.file);
    }

    const sortedByDate = [...deliveredCandidates].sort((a: any, b: any) => {
      const left = new Date(a?.created_at || 0).getTime();
      const right = new Date(b?.created_at || 0).getTime();
      return right - left;
    });

    const latestTime = new Date(sortedByDate[0]?.created_at || 0).getTime();
    const fallbackBatchWindowMs = 2 * 60 * 1000;

    return sortedByDate.filter((file: any) => {
      const createdAt = new Date(file?.created_at || 0).getTime();
      return latestTime - createdAt <= fallbackBatchWindowMs;
    });
  }, [order?.files]);

  const canUploadDeliveredWork = useMemo(() => {
    if (!isOrderExpert) return false;
    if (order.status === 'in_progress' || order.status === 'revision') return true;
    if (order.status === 'review' && deliveredWorkFiles.length === 0) return true;
    return false;
  }, [deliveredWorkFiles.length, isOrderExpert, order.status]);

  const attachedOrderFiles = useMemo(() => {
    if (!Array.isArray(order?.files)) return [];
    const deliveredIds = new Set(deliveredWorkFiles.map((file: any) => Number(file?.id)));
    const orderClientIdFromOrder = Number(order?.client?.id ?? (order as any)?.client_id ?? 0);

    return order.files.filter((file: any) => {
      if (deliveredIds.has(Number(file?.id))) return false;
      const fileType = String(file?.file_type || '').toLowerCase();
      if (fileType !== 'task') return false;
      const description = String(file?.description || '').trim().toLowerCase();
      const isInitialTaskFile = description === 'файл задания' || description === '';
      if (!isInitialTaskFile) return false;
      const uploadedById = Number(file?.uploaded_by?.id ?? 0);
      return orderClientIdFromOrder > 0 ? uploadedById === orderClientIdFromOrder : true;
    });
  }, [order?.files, deliveredWorkFiles]);

  const canUploadTaskFiles = useMemo(() => {
    if (!isOrderOwner) return false;
    return !['completed', 'cancelled', 'canceled'].includes(String(order.status || '').toLowerCase());
  }, [isOrderOwner, order.status]);

  const handleTileDownload = useCallback((file: any, keyPrefix: string) => {
    onDownloadFile(file);
    if (keyPrefix === 'delivered' && onDeliveredFileViewed && file?.id != null) {
      onDeliveredFileViewed(Number(file.id));
    }
  }, [onDownloadFile, onDeliveredFileViewed]);

  useEffect(() => {
    if (!onDeliveredFilesResolved) return;
    const ids = deliveredWorkFiles
      .map((f: any) => Number(f?.id))
      .filter((n: number) => Number.isFinite(n));
    onDeliveredFilesResolved(ids);
  }, [deliveredWorkFiles, onDeliveredFilesResolved]);

  const renderFileTile = (file: any, index: number, keyPrefix: string) => (
    <div
      className={styles.orderFileTile}
      key={file.id ?? `${keyPrefix}-${index}`}
      onClick={(e) => { e.stopPropagation(); handleTileDownload(file, keyPrefix); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTileDownload(file, keyPrefix);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.orderFileIconBox}>
        {getOrderFileIcon(file.filename || file.file_name || '')}
      </div>
      <div className={styles.orderFileTileBody}>
        <Text className={styles.orderFileName} title={file.filename || file.file_name || 'Файл'}>
          {formatOrderFileTileName(file.filename || file.file_name || 'Файл')}
        </Text>
        <Text type="secondary" className={styles.orderFileMeta}>
          {formatFileDateTime(file.created_at)}
        </Text>
      </div>
      <div className={styles.orderFileTileActions}>
        <DownloadOutlined className={styles.orderFileDownloadIcon} />
        {canDeleteOrderFile(file) && (
          <DeleteOutlined
            className={styles.orderFileDeleteIcon}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteOrderFile(file);
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.sectionBlock}>
        <Title level={4} className={styles.sectionTitle}>Описание заказа</Title>
        <Paragraph className={styles.description}>
          {order.description || 'Описание отсутствует'}
        </Paragraph>
      </div>

      {isOrderOwner && order.client_note && order.client_note.trim() && (
        <div className={`${styles.clientNoteSection} ${styles.sectionBlock}`}>
          <Title level={4} className={styles.sectionTitle}>
            <span>Поле, которое видите только Вы</span>
          </Title>
          <div className={styles.clientNoteBox}>
            <Paragraph className={styles.clientNoteText}>{order.client_note}</Paragraph>
          </div>
        </div>
      )}

      {canSeeDeliveredWorkBlock ? (
        <div className={`${styles.deliveredWorkSection} ${styles.sectionBlock}`}>
          <Title level={4} className={styles.sectionTitle}>Готовая работа</Title>
          {canUploadDeliveredWork && (
            <div
              className={`${styles.uploadDropzone} ${dragActive ? styles.uploadDropzoneActive : ''}`}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
            >
              <input
                type="file"
                id="file-upload"
                multiple
                className={styles.fileInput}
                onChange={onFileInput}
                disabled={uploadingFiles}
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak"
              />
              <label htmlFor="file-upload" className={styles.uploadLabel}>
                <div className={styles.uploadContent}>
                  {uploadingFiles ? (
                    <Spin size="large" />
                  ) : (
                    <>
                      <InboxOutlined className={styles.uploadIcon} />
                      <Text strong className={styles.uploadTitle}>
                        Перетащите файлы сюда или нажмите для загрузки
                      </Text>
                      <Text type="secondary" className={styles.uploadSubtitle}>
                        Поддерживаются: PDF, DOC, DOCX, изображения, архивы и другие форматы
                      </Text>
                    </>
                  )}
                </div>
              </label>
            </div>
          )}
          {deliveredWorkFiles.length > 0 ? (
            <>
              <div className={styles.orderFilesGrid}>
                {deliveredWorkFiles.map((file: any, index: number) => renderFileTile(file, index, 'delivered'))}
              </div>
              {isOrderOwner && order.status === 'review' && (
                <div className={styles.deliveredTagWrap}>
                  <Tag color="purple" className={styles.deliveredTag}>На проверке</Tag>
                </div>
              )}
            </>
          ) : (
            <Text type="secondary" className={styles.deliveredEmpty}>
              {isOrderExpert ? 'Вы еще не загрузили работу' : 'Работа еще не сдана'}
            </Text>
          )}
        </div>
      ) : null}

      {(canUploadTaskFiles || attachedOrderFiles.length > 0) && (
        <div className={`${styles.orderFilesSection} ${styles.sectionBlock}`}>
          <Title level={4} className={styles.sectionTitle}>Файлы задания</Title>
          {canUploadTaskFiles && (
            <div
              className={`${styles.uploadDropzone} ${dragActive ? styles.uploadDropzoneActive : ''}`}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onTaskFileDrop}
            >
              <input
                type="file"
                id="task-file-upload"
                multiple
                className={styles.fileInput}
                onChange={onTaskFileInput}
                disabled={uploadingFiles}
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak"
              />
              <label htmlFor="task-file-upload" className={styles.uploadLabel}>
                <div className={styles.uploadContent}>
                  {uploadingFiles ? (
                    <Spin size="large" />
                  ) : (
                    <>
                      <InboxOutlined className={styles.uploadIcon} />
                      <Text strong className={styles.uploadTitle}>
                        Перетащите файлы задания сюда или нажмите для загрузки
                      </Text>
                      <Text type="secondary" className={styles.uploadSubtitle}>
                        После удаления файла можно сразу добавить новый
                      </Text>
                    </>
                  )}
                </div>
              </label>
            </div>
          )}
          {attachedOrderFiles.length > 0 && (
            <div className={styles.orderFilesGrid}>
              {attachedOrderFiles.map((file: any, index: number) => renderFileTile(file, index, 'attached'))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default OrderContent;
