import React from 'react';
import { Typography, Button } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SupportCenterPanel } from '@/features/support/components/SupportCenterPanel';
import MessageBubble from './MessageBubble';
import type { ChatDetail, GroupedMessage } from './types';
import styles from '../MessageModalNew.module.css';

const { Text } = Typography;

interface MessageListProps {
  visible: boolean;
  selectedChat: ChatDetail | null;
  isSupportChatSelected: boolean;
  isChatFrozen: boolean;
  isMobile: boolean;
  isDragOverChat: boolean;
  groupedMessages: GroupedMessage[];
  orderIntroByChatId: Record<number, string>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isOrderClient: boolean;
  isOrderExpert: boolean;
  effectiveOrderId: number | null;
  orderStatus?: string | null;
  headerContextTitle: string | null;
  workOfferUploading: boolean;
  workOfferFileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onApproveOrder: () => void;
  onRequestRevision: () => void;
  onAcceptOffer: (messageId: number) => void;
  onRejectOffer: (messageId: number) => void;
  onAcceptWorkOffer: (messageId: number) => void;
  onRejectWorkOffer: (messageId: number) => void;
  onAcceptWorkDelivery: (messageId: number) => void;
  onRejectWorkDelivery: (messageId: number) => void;
  onContactSupport: () => void;
  onClose: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  visible,
  selectedChat,
  isSupportChatSelected,
  isChatFrozen,
  isMobile,
  isDragOverChat,
  groupedMessages,
  orderIntroByChatId,
  messagesEndRef,
  isOrderClient,
  isOrderExpert,
  effectiveOrderId,
  orderStatus,
  headerContextTitle,
  workOfferUploading,
  workOfferFileInputRef,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onApproveOrder,
  onRequestRevision,
  onAcceptOffer,
  onRejectOffer,
  onAcceptWorkOffer,
  onRejectWorkOffer,
  onAcceptWorkDelivery,
  onRejectWorkDelivery,
  onContactSupport,
  onClose,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`${styles.chatMessages} ${isMobile ? styles.chatMessagesMobile : ''} ${isDragOverChat ? styles.chatMessagesDragOver : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isSupportChatSelected ? (
        <div className={`${styles.chatMessagesContent} ${isMobile ? styles.chatMessagesContentMobile : ''}`}>
          <SupportCenterPanel
            active={visible && isSupportChatSelected}
            compact
            onNavigateToForm={(mode) => {
              onClose();
              navigate(`/support/claim-form?mode=${mode}`);
            }}
          />
        </div>
      ) : selectedChat ? (
        <div className={`${styles.chatMessagesContent} ${isMobile ? styles.chatMessagesContentMobile : ''}`}>
          {isChatFrozen ? (
            <div className={styles.chatFrozenNotice}>
              <Text className={styles.chatFrozenTitle}>Переписка временно недоступна</Text>
              <Text className={styles.chatFrozenReason}>Обнаружен обмен контактами</Text>
              <Button size="small" onClick={onContactSupport} className={styles.chatFrozenSupportButton}>
                Написать в поддержку
              </Button>
            </div>
          ) : (
            <>
              {orderIntroByChatId[selectedChat.id] ? (
                <div className={styles.chatIntroWrapper}>
                  <div className={`${styles.chatIntroBubble} ${isMobile ? styles.chatIntroBubbleMobile : ''}`}>
                    {orderIntroByChatId[selectedChat.id]}
                  </div>
                </div>
              ) : null}
              {groupedMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMobile={isMobile}
                  isOrderClient={isOrderClient}
                  isOrderExpert={isOrderExpert}
                  effectiveOrderId={effectiveOrderId}
                  orderStatus={orderStatus}
                  headerContextTitle={headerContextTitle}
                  workOfferUploading={workOfferUploading}
                  workOfferFileInputRef={workOfferFileInputRef}
                  onApproveOrder={onApproveOrder}
                  onRequestRevision={onRequestRevision}
                  onAcceptOffer={onAcceptOffer}
                  onRejectOffer={onRejectOffer}
                  onAcceptWorkOffer={onAcceptWorkOffer}
                  onRejectWorkOffer={onRejectWorkOffer}
                  onAcceptWorkDelivery={onAcceptWorkDelivery}
                  onRejectWorkDelivery={onRejectWorkDelivery}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      ) : (
        <div className={`${styles.chatEmptyState} ${isMobile ? styles.chatEmptyStateMobile : ''}`}>
          <MessageOutlined className={`${styles.chatEmptyStateIcon} ${isMobile ? styles.chatEmptyStateIconMobile : ''}`} />
          Выберите чат для начала общения
        </div>
      )}
    </div>
  );
};

export default MessageList;
