import React from 'react';
import { Space, Button, Avatar, Typography, Dropdown } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  CustomerServiceOutlined,
  UserOutlined,
  FileTextOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { getMediaUrl } from '../../../../config/api';
import { getDisplayUsername } from '@/utils/formatters';
import type { ChatDetail, WorkOfferData } from './types';
import styles from '../MessageModalNew.module.css';

const { Text } = Typography;

interface ChatHeaderProps {
  selectedChat: ChatDetail | null;
  isSupportChatSelected: boolean;
  isMobile: boolean;
  effectiveOrderId: number | null;
  isClosedOrder: boolean;
  headerOrder: { id: number | null; title: string | null };
  order: { title?: string | null; status?: string | null } | null;
  headerContextTitle: string | null;
  canUseExpertOfferButtons: boolean;
  isChatInitiator: boolean;
  uploadableWorkOffer: { id: number } | null;
  workOfferUploading: boolean;
  workOfferFileInputRef: React.RefObject<HTMLInputElement | null>;
  deletingChat: boolean;
  hasActiveOffersInSelectedChat: boolean;
  onClose: () => void;
  onBack: () => void;
  onSetWorkOfferModalOpen: (open: boolean) => void;
  onSetOfferModalOpen: (open: boolean) => void;
  onDeleteSelectedChat: () => void;
  supportAvatarSrc: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedChat,
  isSupportChatSelected,
  isMobile,
  effectiveOrderId,
  isClosedOrder,
  headerOrder,
  order,
  headerContextTitle,
  canUseExpertOfferButtons,
  isChatInitiator,
  uploadableWorkOffer,
  workOfferUploading,
  workOfferFileInputRef,
  deletingChat,
  hasActiveOffersInSelectedChat,
  onClose,
  onBack,
  onSetWorkOfferModalOpen,
  onSetOfferModalOpen,
  onDeleteSelectedChat,
  supportAvatarSrc,
}) => {
  const navigate = useNavigate();

  if (!selectedChat && !isSupportChatSelected) {
    return (
      <div className={`${styles.chatHeader} ${styles.chatHeaderEmpty} ${isMobile ? styles.chatHeaderPaddingMobileEmpty : styles.chatHeaderPaddingDesktopEmpty}`}>
        <Space>
          <Text className={`${styles.chatHeaderEmptyText} ${isMobile ? styles.chatHeaderEmptyTextMobile : ''}`}>
            Выберите чат
          </Text>
        </Space>
      </div>
    );
  }

  return (
    <div
      className={`${styles.chatHeader} ${styles.chatHeaderActive} ${
        isMobile ? styles.chatHeaderPaddingMobileActive : styles.chatHeaderPaddingDesktopActive
      }`}
    >
      <Space>
        {isMobile && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            size="small"
          />
        )}
        <Avatar
          size={isMobile ? 32 : 36}
          icon={isSupportChatSelected ? <CustomerServiceOutlined /> : <UserOutlined />}
          src={isSupportChatSelected ? supportAvatarSrc : getMediaUrl(selectedChat?.other_user?.avatar)}
          className={isSupportChatSelected ? 'support-avatar' : styles.chatHeaderAvatar}
          style={!isSupportChatSelected ? { cursor: 'pointer' } : undefined}
          onClick={() => {
            if (!isSupportChatSelected && selectedChat?.other_user?.username) {
              onClose();
              const role = selectedChat.other_user.role || 'user';
              const profilePath = role === 'expert'
                ? `/expert/${selectedChat.other_user.username}`
                : `/user/${selectedChat.other_user.username}`;
              navigate(profilePath);
            }
          }}
        />
        <div>
          <Text
            className={`${styles.chatHeaderTitle} ${isMobile ? styles.chatHeaderTitleMobile : ''}`}
            style={!isSupportChatSelected ? { cursor: 'pointer' } : undefined}
            onClick={() => {
              if (!isSupportChatSelected && selectedChat?.other_user?.username) {
                onClose();
                const role = selectedChat.other_user.role || 'user';
                const profilePath = role === 'expert'
                  ? `/expert/${selectedChat.other_user.username}`
                  : `/user/${selectedChat.other_user.username}`;
                navigate(profilePath);
              }
            }}
          >
            {isSupportChatSelected ? 'Центр обращений' : getDisplayUsername(selectedChat?.other_user || {})}
          </Text>
          {!isSupportChatSelected ? (
            effectiveOrderId && !isClosedOrder ? (
              <Text className={`${styles.chatHeaderSubtitle} ${isMobile ? styles.chatHeaderSubtitleMobile : ''}`}>
                {headerOrder.title || order?.title || `Заказ #${effectiveOrderId}`}
              </Text>
            ) : headerContextTitle ? (
              <Text className={`${styles.chatHeaderTitle} ${isMobile ? styles.chatHeaderTitleMobile : ''}`}>
                {headerContextTitle}
              </Text>
            ) : (
              <Text className={`${styles.chatHeaderSubtitle} ${isMobile ? styles.chatHeaderSubtitleMobile : ''}`}>
                Без заказа
              </Text>
            )
          ) : null}
        </div>
      </Space>
      <input
        ref={workOfferFileInputRef}
        type="file"
        className={styles.hiddenInput}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            // Trigger callback from parent through ref
          }
        }}
      />
      {canUseExpertOfferButtons && !isSupportChatSelected ? (
        headerContextTitle ? (
          <Button
            type="primary"
            size={isMobile ? 'small' : 'middle'}
            icon={uploadableWorkOffer ? <UploadOutlined /> : <FileTextOutlined />}
            loading={workOfferUploading}
            onClick={() => {
              if (uploadableWorkOffer) {
                workOfferFileInputRef.current?.click();
              } else {
                onSetWorkOfferModalOpen(true);
              }
            }}
            className={styles.buttonSuccess}
          >
            {(() => {
              if (uploadableWorkOffer) return isMobile ? 'Работа' : 'Отправить работу';
              return isMobile ? 'Работа' : 'Предложить работу';
            })()}
          </Button>
        ) : !isChatInitiator ? (
          <Button
            type="primary"
            size={isMobile ? 'small' : 'middle'}
            icon={<FileTextOutlined />}
            className={styles.buttonSuccess}
            onClick={() => onSetOfferModalOpen(true)}
          >
            {isMobile ? 'Предложение' : 'Индивидуальное предложение'}
          </Button>
        ) : null
      ) : null}
      {isSupportChatSelected ? (
        <Button
          key={`support-claim-${selectedChat?.id || 'none'}`}
          type="text"
          danger
          icon={<ExclamationCircleOutlined />}
          size={isMobile ? 'middle' : 'large'}
          onClick={() => {
            onClose();
            navigate('/support/claim-form?mode=support');
          }}
          className={`${styles.chatClaimButton} ${isMobile ? styles.chatClaimButtonMobile : ''}`}
          title="Подать претензию"
        />
      ) : null}
    </div>
  );
};

export default ChatHeader;
