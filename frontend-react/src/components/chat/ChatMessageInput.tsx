import React from 'react';
import { Input, Button, Upload } from 'antd';
import { SendOutlined, UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ChatMessageInputProps {
  messageText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  allowFileUpload?: boolean;
  onFileUpload?: (file: File) => boolean | Promise<boolean>;
}

const ChatMessageInput: React.FC<ChatMessageInputProps> = ({
  messageText,
  onChangeText,
  onSend,
  allowFileUpload,
  onFileUpload,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div style={{
      borderTop: '1px solid var(--color-border-secondary, #f0f0f0)',
      padding: '12px 16px',
      display: 'flex',
      gap: 8,
      alignItems: 'flex-end',
    }}>
      <TextArea
        value={messageText}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="Написать сообщение... (Enter для отправки)"
        autoSize={{ minRows: 1, maxRows: 4 }}
        onKeyDown={handleKeyDown}
        style={{ flex: 1 }}
      />
      {allowFileUpload && (
        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            if (onFileUpload) return onFileUpload(file as unknown as File);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} />
        </Upload>
      )}
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={onSend}
        disabled={!messageText.trim()}
      />
    </div>
  );
};

export default ChatMessageInput;
