import React from 'react';
import { Card, Button, Typography } from 'antd';
import {
  FileOutlined,
  FileTextOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { truncateFileName, getFileIconByName } from './utils/fileHelpers';
import { formatMessageTime } from './utils/messageHelpers';
import type { GroupedMessage, WorkOfferData } from './types';
import styles from '../MessageModalNew.module.css';

const { Text } = Typography;

interface MessageBubbleProps {
  msg: GroupedMessage;
  isMobile: boolean;
  isOrderClient: boolean;
  isOrderExpert: boolean;
  effectiveOrderId: number | null;
  orderStatus?: string | null;
  headerContextTitle: string | null;
  workOfferUploading: boolean;
  workOfferFileInputRef: React.RefObject<HTMLInputElement | null>;
  onApproveOrder: () => void;
  onRequestRevision: () => void;
  onAcceptOffer: (messageId: number) => void;
  onRejectOffer: (messageId: number) => void;
  onAcceptWorkOffer: (messageId: number) => void;
  onRejectWorkOffer: (messageId: number) => void;
  onAcceptWorkDelivery: (messageId: number) => void;
  onRejectWorkDelivery: (messageId: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMobile,
  isOrderClient,
  isOrderExpert,
  effectiveOrderId,
  orderStatus,
  headerContextTitle,
  workOfferUploading,
  workOfferFileInputRef,
  onApproveOrder,
  onRequestRevision,
  onAcceptOffer,
  onRejectOffer,
  onAcceptWorkOffer,
  onRejectWorkOffer,
  onAcceptWorkDelivery,
  onRejectWorkDelivery,
}) => {
  const isOffer = msg.message_type === 'offer' && !!msg.offer_data;
  const isWorkOffer = msg.message_type === 'work_offer' && !!msg.offer_data;
  const workDeliveryFiles = Array.isArray(msg.offer_data?.files) ? msg.offer_data.files : [];
  const isWorkDelivery = msg.message_type === 'work_delivery' && (!!msg.file_url || workDeliveryFiles.length > 0);
  const isSystemMessage = msg.message_type === 'system';
  const revisionSystemPrefix = 'Клиент вернул работу на доработку';
  const isRevisionSystemMessage = String(msg.text || '').startsWith(revisionSystemPrefix);
  const revisionCommentText = isRevisionSystemMessage
    ? (() => {
        const structuredComment = String(msg.offer_data?.revision_comment || '').trim();
        if (structuredComment) return structuredComment;
        const rawText = String(msg.text || '').replace(/\r\n/g, '\n').trim();
        const explicitCommentMatch = rawText.match(/Комментарий:\s*([\s\S]*)$/);
        if (explicitCommentMatch?.[1]) return explicitCommentMatch[1].trim();
        const withoutPrefix = rawText.replace(revisionSystemPrefix, '').replace(/^[:\s\n-]+/, '').trim();
        return withoutPrefix;
      })()
    : '';

  const canReviewOrder = isOrderClient;
  const showWorkActions =
    isWorkDelivery &&
    canReviewOrder &&
    !!effectiveOrderId &&
    orderStatus === 'review' &&
    !msg.is_mine &&
    (!!msg.file_url || workDeliveryFiles.length > 0);
  const isCardMessage = isOffer || isWorkOffer || isWorkDelivery || showWorkActions;
  const offerExpired = isOffer
    ? new Date(msg.created_at).getTime() + 2 * 24 * 60 * 60 * 1000 < Date.now()
    : false;
  const offerStatus = isOffer ? (msg.offer_data?.status || 'new') : 'new';
  const showOfferActions = isOffer && !msg.is_mine && offerStatus === 'new' && !offerExpired;
  const workOfferStatus = isWorkOffer ? ((msg.offer_data as WorkOfferData | null)?.status || 'new') : 'new';
  const workDeliveryStatus = isWorkOffer
    ? ((msg.offer_data as WorkOfferData | null)?.delivery_status || 'pending')
    : 'pending';
  const showWorkOfferActions = isWorkOffer && !msg.is_mine && isOrderClient && workOfferStatus === 'new';
  const showWorkDeliveryActions =
    isWorkOffer &&
    !msg.is_mine &&
    isOrderClient &&
    workOfferStatus === 'accepted' &&
    workDeliveryStatus === 'delivered';
  const showExpertUploadForWorkOffer =
    isWorkOffer &&
    msg.is_mine &&
    isOrderExpert &&
    workOfferStatus === 'accepted' &&
    workDeliveryStatus === 'awaiting_upload';

  // System messages
  if (isSystemMessage || isRevisionSystemMessage) {
    if (isRevisionSystemMessage) {
      const revisionRowClass = `${styles.messageRow} ${msg.is_mine ? styles.messageRowMine : styles.messageRowOther}`;
      const revisionBubbleClass = `${styles.messageBubble} ${styles.messageBubbleCard} ${msg.is_mine ? styles.messageBubbleMine : styles.messageBubbleOther}`;
      return (
        <div className={revisionRowClass}>
          <div className={revisionBubbleClass}>
            <Card
              size="small"
              className={`${styles.messageCard} ${isMobile ? styles.messageCardMobile : styles.messageCardDesktop} ${styles.offerCard}`}
            >
              <div className={styles.offerCardHeader}>
                <div className={styles.offerCardHeaderIcon}><ExclamationCircleOutlined /></div>
                <div className={styles.offerCardTitle}>Доработка по заказу</div>
              </div>
              <div className={styles.offerCardBody}>
                <div className={styles.offerDescription}>
                  {revisionCommentText || 'Комментарий не указан'}
                </div>
                <div className={styles.messageCardTime}>
                  <Text type="secondary" className={styles.messageCardTimeText}>
                    {formatMessageTime(msg.created_at)}
                  </Text>
                </div>
              </div>
            </Card>
          </div>
        </div>
      );
    }
    const systemText = String(msg.text || '');
    const systemTextLower = systemText.toLowerCase();
    const isDangerSystemEvent = /наруш|контакт|заморож|нельзя|блок|violation|blocked/.test(systemTextLower);
    const isSuccessSystemEvent = /принят|разморож|заверш|оплачен|назнач|accepted|completed|paid/.test(systemTextLower);
    const SystemEventIcon = isDangerSystemEvent
      ? ExclamationCircleOutlined
      : isSuccessSystemEvent
        ? CheckCircleOutlined
        : FileTextOutlined;
    return (
      <div className={styles.messageRowSystem}>
        <div className={styles.messageBubbleSystem}>
          <div className={`${styles.messageSystemCard} ${styles.messageSystemCardEvent} ${isDangerSystemEvent ? styles.messageSystemCardDanger : isSuccessSystemEvent ? styles.messageSystemCardSuccess : styles.messageSystemCardInfo}`}>
            <SystemEventIcon className={styles.messageSystemIcon} />
            <Text className={`${styles.messageSystemText} ${isMobile ? styles.messageSystemTextMobile : ''}`}>
              {systemText}
            </Text>
            <div className={styles.messageSystemTime}>
              Событие заказа • {formatMessageTime(msg.created_at)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const messageRowClass = `${styles.messageRow} ${msg.is_mine ? styles.messageRowMine : styles.messageRowOther}`;
  const messageBubbleClass = `${styles.messageBubble} ${
    isCardMessage ? styles.messageBubbleCard : styles.messageBubbleRegular
  } ${
    isCardMessage
      ? (isMobile ? styles.messageBubbleCardMobile : styles.messageBubbleCardDesktop)
      : (isMobile ? styles.messageBubbleRegularMobile : styles.messageBubbleRegularDesktop)
  } ${
    !isCardMessage ? (msg.is_mine ? styles.messageBubbleMine : styles.messageBubbleOther) : ''
  }`;
  const messageCardClass = `${styles.messageCard} ${isMobile ? styles.messageCardMobile : styles.messageCardDesktop}`;

  return (
    <div className={messageRowClass}>
      <div className={messageBubbleClass}>
        {isWorkDelivery ? (
          <Card size="small" className={messageCardClass}>
            <div className={styles.messageCardTitle}>Готовая работа</div>
            <div className={styles.messageCardSection}>
              <Text type="secondary">Файлы</Text>
              <div className={styles.attachedFilesGrid}>
                {(workDeliveryFiles.length > 0
                  ? workDeliveryFiles
                  : [{ name: msg.file_name || 'Скачать файл', url: msg.file_url }])
                  .filter((file: any) => !!file?.url)
                  .map((file: any, fileIdx: number) => (
                    <a
                      key={`${msg.id}-work-file-${fileIdx}`}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.messageFileBlock} ${!msg.is_mine ? styles.messageFileBlockOther : ''}`}
                      title={file.name}
                    >
                      <div className={`${styles.messageFileIconBox} ${!msg.is_mine ? styles.messageFileIconBoxOther : ''}`}>
                        {getFileIconByName(file.name)}
                      </div>
                      <div className={`${styles.messageFileName} ${msg.is_mine ? styles.messageFileNameMine : styles.messageFileNameOther}`}>
                        {truncateFileName(file.name || 'Скачать файл')}
                      </div>
                    </a>
                  ))}
              </div>
            </div>
            <div className={styles.messageCardInfo}>
              {msg.is_mine ? 'Вы отправили работу на проверку' : 'Эксперт отправил работу на проверку'}
            </div>
            {showWorkActions ? (
              <div className={styles.messageCardActions}>
                <Button type="primary" className={styles.buttonSuccess} onClick={onApproveOrder} block>Принять</Button>
                <Button danger onClick={onRequestRevision} block>На доработку</Button>
              </div>
            ) : null}
            <div className={styles.messageCardTime}>
              <Text type="secondary" className={styles.messageCardTimeText}>{formatMessageTime(msg.created_at)}</Text>
            </div>
          </Card>
        ) : showWorkActions ? (
          <Card size="small" className={messageCardClass}>
            <div className={styles.messageCardTitle}>Работа по заказу</div>
            <div className={styles.messageCardSection}>
              <Text type="secondary">Файл</Text>
              <div className={styles.messageCardSectionTop}>
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`${styles.messageCardLink} ${isMobile ? styles.messageCardLinkMobile : ''}`}>
                  📎 {msg.file_name || 'Скачать файл'}
                </a>
              </div>
            </div>
            <div className={styles.messageCardInfo}>Работа отправлена, ожидает решения заказчика</div>
            <div className={styles.messageCardActions}>
              <Button type="primary" className={styles.buttonSuccess} onClick={onApproveOrder} block>Принять</Button>
              <Button danger onClick={onRequestRevision} block>На доработку</Button>
            </div>
            <div className={styles.messageCardTime}>
              <Text type="secondary" className={styles.messageCardTimeText}>{formatMessageTime(msg.created_at)}</Text>
            </div>
          </Card>
        ) : isOffer ? (
          <Card size="small" className={`${messageCardClass} ${styles.offerCard}`}>
            <div className={styles.offerCardHeader}>
              <div className={styles.offerCardHeaderIcon}><FileTextOutlined /></div>
              <div className={styles.offerCardTitle}>Индивидуальное предложение</div>
            </div>
            <div className={styles.offerCardBody}>
              <div className={styles.offerGrid}>
                <div className={styles.offerGridItem}>
                  <div className={styles.offerGridIcon}><BookOutlined /></div>
                  <div>
                    <div className={styles.offerLabel}>Предмет</div>
                    <div className={styles.offerValue}>{msg.offer_data?.subject}</div>
                  </div>
                </div>
                <div className={styles.offerGridItem}>
                  <div className={styles.offerGridIcon}><FileTextOutlined /></div>
                  <div>
                    <div className={styles.offerLabel}>Тип работы</div>
                    <div className={styles.offerValue}>{msg.offer_data?.work_type}</div>
                  </div>
                </div>
                <div className={styles.offerGridItem}>
                  <div className={styles.offerGridIcon}><ClockCircleOutlined /></div>
                  <div>
                    <div className={styles.offerLabel}>Срок выполнения</div>
                    <div className={styles.offerValue}>
                      {msg.offer_data?.deadline ? new Date(msg.offer_data.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                    </div>
                  </div>
                </div>
                <div className={styles.offerGridItem}>
                  <div className={`${styles.offerGridIcon} ${styles.offerGridIconGreen}`}><DollarOutlined /></div>
                  <div>
                    <div className={styles.offerLabel}>Стоимость</div>
                    <div className={styles.offerValue}>
                      {typeof msg.offer_data?.cost === 'number' ? msg.offer_data.cost.toLocaleString('ru-RU') : msg.offer_data?.cost} ₽
                    </div>
                  </div>
                </div>
                <div className={styles.offerGridItem}>
                  <div className={styles.offerGridIcon}><PercentageOutlined /></div>
                  <div>
                    <div className={styles.offerLabel}>Предоплата</div>
                    <div className={styles.offerValue}>{Number(msg.offer_data?.prepayment_percent ?? 0)}%</div>
                  </div>
                </div>
              </div>
              <div className={styles.offerDescription}>{msg.offer_data?.description}</div>
              {offerStatus === 'accepted' ? (
                <div className={`${styles.messageStatusSuccess} ${styles.messageCardActionsTop}`}><CheckCircleOutlined /> Предложение принято</div>
              ) : offerStatus === 'rejected' ? (
                <div className={`${styles.messageStatusDanger} ${styles.messageCardActionsTop}`}><CloseCircleOutlined /> Предложение отклонено</div>
              ) : offerExpired ? (
                <div className={`${styles.messageStatusMuted} ${styles.messageCardActionsTop}`}>Срок предложения истек</div>
              ) : showOfferActions ? (
                <div className={`${styles.messageCardActions} ${styles.messageCardActionsTop}`}>
                  <Button type="primary" className={styles.buttonSuccess} onClick={() => onAcceptOffer(msg.id)} block>Принять</Button>
                  <Button danger onClick={() => onRejectOffer(msg.id)} block>Отказаться</Button>
                </div>
              ) : (
                <div className={`${styles.messageStatusMuted} ${styles.messageCardActionsTop}`}>Ожидает решения получателя</div>
              )}
            </div>
          </Card>
        ) : isWorkOffer ? (
          <Card size="small" className={messageCardClass}>
            <div className={styles.messageCardTitle}>Предложение готовой работы</div>
            <div className={styles.messageCardSection}>
              <Text type="secondary">Название</Text>
              <div className={styles.messageCardDescription}>
                {(msg.offer_data as WorkOfferData | null)?.title || headerContextTitle || 'Готовая работа'}
              </div>
            </div>
            {(msg.offer_data as WorkOfferData | null)?.description ? (
              <div className={styles.messageCardSection}>
                <Text type="secondary">Описание</Text>
                <div className={styles.messageCardDescription}>{(msg.offer_data as WorkOfferData | null)?.description}</div>
              </div>
            ) : null}
            {typeof (msg.offer_data as WorkOfferData | null)?.cost === 'number' ? (
              <div className={styles.messageCardSection}>
                <Text type="secondary">Стоимость</Text>
                <div>
                  <Text strong className={styles.textSuccess}>
                    {Number((msg.offer_data as WorkOfferData | null)?.cost).toLocaleString('ru-RU')} ₽
                  </Text>
                </div>
              </div>
            ) : null}
            {workOfferStatus === 'rejected' ? (
              <div className={styles.messageStatusDanger}><CloseCircleOutlined /> Предложение отклонено</div>
            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'accepted' ? (
              <div className={styles.messageStatusSuccess}><CheckCircleOutlined /> Работа принята</div>
            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'rejected' ? (
              <div className={styles.messageStatusDanger}><CloseCircleOutlined /> Работа отклонена</div>
            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'delivered' ? (
              <div className={styles.messageStatusInfo}>Работа отправлена, ожидает решения покупателя</div>
            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'awaiting_upload' ? (
              <div className={styles.messageStatusInfo}>Ожидается отправка работы экспертом</div>
            ) : (
              <div className={styles.messageStatusMuted}>Ожидает решения покупателя</div>
            )}
            {showWorkOfferActions ? (
              <div className={`${styles.messageCardActions} ${styles.messageCardActionsTop}`}>
                <Button type="primary" className={styles.buttonSuccess} onClick={() => onAcceptWorkOffer(msg.id)} block>Принять</Button>
                <Button danger onClick={() => onRejectWorkOffer(msg.id)} block>Отказаться</Button>
              </div>
            ) : null}
            {showExpertUploadForWorkOffer ? (
              <div className={styles.messageCardActionsTop}>
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  className={styles.buttonSuccess}
                  onClick={() => workOfferFileInputRef.current?.click()}
                  loading={workOfferUploading}
                  block
                >
                  Отправить работу
                </Button>
              </div>
            ) : null}
            {showWorkDeliveryActions ? (
              <div className={`${styles.messageCardActions} ${styles.messageCardActionsTop}`}>
                <Button type="primary" className={styles.buttonSuccess} onClick={() => onAcceptWorkDelivery(msg.id)} block>Принять</Button>
                <Button danger onClick={() => onRejectWorkDelivery(msg.id)} block>Отказаться</Button>
              </div>
            ) : null}
            <div className={styles.messageCardTime}>
              <Text type="secondary" className={styles.messageCardTimeText}>{formatMessageTime(msg.created_at)}</Text>
            </div>
          </Card>
        ) : (
          <>
            {msg.text ? (
              <Text className={`${styles.messageText} ${isMobile ? styles.messageTextMobile : ''} ${msg.is_mine ? styles.messageTextMine : styles.messageTextOther}`}>
                {msg.text}
              </Text>
            ) : null}
            {msg.attached_files && msg.attached_files.length > 0 ? (
              <div className={styles.attachedFilesGrid}>
                {msg.attached_files.map((file: any, fIdx: number) => (
                  <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer"
                    className={`${styles.messageFileBlock} ${!msg.is_mine ? styles.messageFileBlockOther : ''}`}
                    title={file.name}
                  >
                    <div className={`${styles.messageFileIconBox} ${!msg.is_mine ? styles.messageFileIconBoxOther : ''}`}>
                      <FileOutlined />
                    </div>
                    <div className={`${styles.messageFileName} ${msg.is_mine ? styles.messageFileNameMine : styles.messageFileNameOther}`}>
                      {truncateFileName(file.name)}
                    </div>
                  </a>
                ))}
              </div>
            ) : msg.file_url && msg.file_name ? (
              <div className={`${styles.messageFile} ${msg.text ? styles.messageFileWithText : ''}`}>
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                  className={`${styles.messageFileBlock} ${!msg.is_mine ? styles.messageFileBlockOther : ''}`}
                  title={msg.file_name}
                >
                  <div className={`${styles.messageFileIconBox} ${!msg.is_mine ? styles.messageFileIconBoxOther : ''}`}>
                    <FileOutlined />
                  </div>
                  <div className={`${styles.messageFileName} ${msg.is_mine ? styles.messageFileNameMine : styles.messageFileNameOther}`}>
                    {truncateFileName(msg.file_name)}
                  </div>
                </a>
              </div>
            ) : null}
            {showWorkActions ? (
              <div className={styles.messageActions}>
                <Button type="primary" className={styles.buttonSuccess} onClick={onApproveOrder} block>Принять заказ</Button>
                <Button danger onClick={onRequestRevision} block>На доработку</Button>
              </div>
            ) : null}
            <Text className={`${styles.messageTime} ${isMobile ? styles.messageTimeMobile : ''} ${msg.is_mine ? styles.messageTimeMine : styles.messageTimeOther}`}>
              {formatMessageTime(msg.created_at)}
              {msg.is_mine && (
                <span className={`${styles.messageReadStatus} ${msg.is_read ? styles.messageReadStatusRead : styles.messageReadStatusUnread}`}>
                  {msg.is_read ? (
                    <span className={`${styles.messageReadIcons} ${isMobile ? styles.messageReadIconsMobile : styles.messageReadIconsDesktop}`}>
                      <CheckOutlined className={`${styles.messageReadCheck} ${styles.messageReadCheckFirst} ${isMobile ? styles.messageReadCheckMobile : styles.messageReadCheckDesktop}`} />
                      <CheckOutlined className={`${styles.messageReadCheck} ${styles.messageReadCheckSecond} ${isMobile ? styles.messageReadCheckSecondMobile : styles.messageReadCheckSecondDesktop} ${isMobile ? styles.messageReadCheckMobile : styles.messageReadCheckDesktop}`} />
                    </span>
                  ) : (
                    <CheckOutlined className={`${styles.messageReadCheckSingle} ${isMobile ? styles.messageReadCheckMobile : styles.messageReadCheckDesktop}`} />
                  )}
                </span>
              )}
            </Text>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
