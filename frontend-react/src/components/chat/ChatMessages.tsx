import React, { useRef, useEffect } from 'react';
import { Typography, Tag, Tooltip, Empty } from 'antd';
import { PushpinOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ChatMessage } from './types';

const { Text } = Typography;

interface ChatMessagesProps {
  messages: ChatMessage[];
  selectedRoomName?: string;
  allowReportMessage?: boolean;
  onReportMessage?: (messageId: number, senderName: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  selectedRoomName,
  allowReportMessage,
  onReportMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('HH:mm');
  };

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={selectedRoomName ? 'Нет сообщений' : 'Выберите чат'} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {messages.map((msg) => {
        const senderName = `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim();
        const text = msg.message ?? msg.text ?? '';
        const time = formatTime(msg.sent_at || msg.created_at);

        if (msg.is_system) {
          return (
            <div key={msg.id} style={{ textAlign: 'center', padding: '4px 0' }}>
              <Tag color="default">{text}</Tag>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.is_mine ? 'row-reverse' : 'row',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <div style={{ maxWidth: '70%' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2, textAlign: msg.is_mine ? 'right' : 'left' }}>
                {senderName}
                {msg.is_pinned && (
                  <Tooltip title="Закреплено">
                    <PushpinOutlined style={{ marginLeft: 4, color: '#faad14' }} />
                  </Tooltip>
                )}
              </div>
              <div
                style={{
                  background: msg.is_mine ? '#6435a5' : 'var(--color-bg-spotlight, #f0f0f0)',
                  color: msg.is_mine ? '#fff' : 'var(--color-text-base, #000)',
                  padding: '8px 12px',
                  borderRadius: msg.is_mine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: 14,
                  wordBreak: 'break-word',
                }}
              >
                {text}
              </div>
              <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2, display: 'flex', justifyContent: msg.is_mine ? 'flex-end' : 'flex-start', gap: 8 }}>
                <span>{time}</span>
                {allowReportMessage && !msg.is_mine && onReportMessage && (
                  <Tooltip title="Пожаловаться">
                    <WarningOutlined
                      style={{ cursor: 'pointer', color: '#ff4d4f' }}
                      onClick={() => onReportMessage(msg.id, senderName)}
                    />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
