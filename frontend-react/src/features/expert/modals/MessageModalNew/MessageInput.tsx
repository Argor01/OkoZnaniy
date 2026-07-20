import React from 'react';
import { Input, Button, Upload, Popover, Typography } from 'antd';
import {
  SmileOutlined,
  PaperClipOutlined,
  SendOutlined,
  FileOutlined,
} from '@ant-design/icons';
import EmojiPicker, { type EmojiClickData, Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from '@/contexts/ThemeContext';
import { hasVisibleMessageContent } from './utils/messageHelpers';
import type { EmojiVersionLevel } from './types';
import styles from '../MessageModalNew.module.css';

const { Text } = Typography;

interface MessageInputProps {
  isMobile: boolean;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  messageInputRef: React.RefObject<any>;
  sending: boolean;
  onSendMessage: () => void;
  onEmojiClick: (emojiData: EmojiClickData) => void;
  emojiPickerOpen: boolean;
  onEmojiPickerOpenChange: (open: boolean) => void;
  emojiVersion: EmojiVersionLevel;
  onFileSelect: (file: File) => boolean;
  attachedFiles: File[];
  onRemoveAttachedFile: (file: File) => void;
  isSupportChatSelected: boolean;
  claimCategories: string[];
  onClaimCategorySelect: (category: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  isMobile,
  messageText,
  onMessageTextChange,
  messageInputRef,
  sending,
  onSendMessage,
  onEmojiClick,
  emojiPickerOpen,
  onEmojiPickerOpenChange,
  emojiVersion,
  onFileSelect,
  attachedFiles,
  onRemoveAttachedFile,
  isSupportChatSelected,
  claimCategories,
  onClaimCategorySelect,
}) => {
  const { isDark } = useTheme();

  return (
    <>
      {isSupportChatSelected && (
        <div className={`${styles.claimCarouselWrapper} ${isMobile ? styles.claimCarouselWrapperMobile : ''}`}>
          <div className={styles.claimCarouselTrack}>
            {[...claimCategories, ...claimCategories].map((category, index) => (
              <Button
                key={index}
                type="default"
                size="small"
                onClick={() => onClaimCategorySelect(category)}
                className={`${styles.claimCarouselButton} ${isMobile ? styles.claimCarouselButtonMobile : ''}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className={`${styles.chatInputRow} ${isMobile ? styles.chatInputRowMobile : ''}`}>
        <div className={styles.chatInputField}>
          <Input.TextArea
            ref={messageInputRef}
            value={messageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            placeholder="Введите сообщение..."
            autoSize={{ minRows: isMobile ? 1 : 1, maxRows: isMobile ? 4 : 4 }}
            className={`${styles.chatInput} ${isMobile ? styles.chatInputMobile : ''}`}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={sending}
          />
        </div>

        <div className={`${styles.chatInputActions} ${isMobile ? styles.chatInputActionsMobile : ''}`}>
          <Popover
            overlayClassName={styles.chatEmojiPopover}
            content={
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                width={isMobile && typeof window !== 'undefined' ? Math.min(336, Math.max(280, window.innerWidth - 32)) : 320}
                height={isMobile ? 320 : 380}
                emojiVersion={emojiVersion as any}
                theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
              />
            }
            trigger="click"
            open={emojiPickerOpen}
            onOpenChange={onEmojiPickerOpenChange}
            placement={isMobile ? 'top' : 'topRight'}
            getPopupContainer={() => document.body}
            zIndex={1060}
          >
            <Button
              type="default"
              icon={<SmileOutlined />}
              className={`${styles.chatEmojiButton} ${isMobile ? styles.chatEmojiButtonMobile : ''}`}
              disabled={sending}
              title="Добавить эмодзи"
            />
          </Popover>

          <Upload
            beforeUpload={onFileSelect}
            showUploadList={false}
            multiple
            accept=".doc,.docx,.pdf,.rtf,.txt,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z"
          >
            <Button
              type="default"
              icon={<PaperClipOutlined />}
              className={`${styles.chatAttachButton} ${isMobile ? styles.chatAttachButtonMobile : ''}`}
              disabled={sending}
              title="Прикрепить файл"
            />
          </Upload>

          <Button
            type="primary"
            icon={<SendOutlined />}
            className={`${styles.chatSendButton} ${isMobile ? styles.chatSendButtonMobile : ''} ${
              (!hasVisibleMessageContent(messageText) && attachedFiles.length === 0) ? styles.chatSendButtonDisabled : ''
            }`}
            onClick={onSendMessage}
            loading={sending}
            disabled={!hasVisibleMessageContent(messageText) && attachedFiles.length === 0}
          />
        </div>
      </div>

      {attachedFiles.length > 0 && (
        <div className={styles.attachedFiles}>
          {attachedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className={styles.attachedFileItem}
            >
              <FileOutlined className={styles.attachedFileIcon} />
              <Text
                className={`${styles.attachedFileName} ${isMobile ? styles.attachedFileNameMobile : ''}`}
                ellipsis
              >
                {file.name}
              </Text>
              <Text className={styles.attachedFileSize}>
                {(file.size / 1024 / 1024).toFixed(2)} МБ
              </Text>
              <Button
                type="text"
                size="small"
                onClick={() => onRemoveAttachedFile(file)}
                icon={<span className={styles.attachedFileRemoveIcon}>×</span>}
                className={styles.attachedFileRemoveButton}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MessageInput;
