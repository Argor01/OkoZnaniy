import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Input, Button, message, Spin, Empty, Avatar, Tag } from 'antd';
import { SendOutlined, ArrowLeftOutlined, PaperClipOutlined } from '@ant-design/icons';
import { supportApi, SupportMessage } from '../api/support';
import DashboardLayout from '../components/layout/DashboardLayout';

const { TextArea } = Input;
const isDebugEnabled = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('debug_api') === '1';

const SupportChat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    
    try {
      const data = await supportApi.getMessages(parseInt(chatId));
      setMessages(data);
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка загрузки сообщений:', error);
      message.error('Не удалось загрузить сообщения');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    loadMessages();
    
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatId) return;

    setSending(true);
    try {
      const newMessage = await supportApi.sendMessage(parseInt(chatId), messageText);
      setMessages([...messages, newMessage]);
      setMessageText('');
      message.success('Сообщение отправлено');
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка отправки сообщения:', error);
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="supportChatLoading">
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card
        title={
          <div className="supportChatHeader">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            />
            <span>Чат с технической поддержкой</span>
          </div>
        }
        className="supportChatCard"
      >
        <div
          className="supportChatMessages"
        >
          {messages.length === 0 ? (
            <Empty description="Нет сообщений" />
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`supportChatMessageRow ${msg.is_mine ? 'supportChatMessageRowMine' : ''}`}
              >
                <div
                  className={`supportChatBubble ${msg.is_mine ? 'supportChatBubbleMine' : ''}`}
                >
                  {!msg.is_mine && (
                    <div className="supportChatSender">
                      {msg.sender.first_name} {msg.sender.last_name}
                      {msg.sender.is_admin && (
                        <Tag color="blue" className="supportChatSenderTag">
                          Поддержка
                        </Tag>
                      )}
                    </div>
                  )}
                  <div>{msg.text}</div>
                  {msg.file && (
                    <div className="supportChatFile">
                      <a href={msg.file} target="_blank" rel="noopener noreferrer">
                        <PaperClipOutlined /> Файл
                      </a>
                    </div>
                  )}
                  <div
                    className={`supportChatTimestamp ${msg.is_mine ? 'supportChatTimestampMine' : ''}`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="supportChatInputRow">
          <TextArea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение... (Ctrl+Enter для отправки)"
            rows={3}
            className="supportChatInput"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={sending}
            disabled={!messageText.trim()}
          >
            Отправить
          </Button>
        </div>
      </Card>
    </DashboardLayout>
  );
};

export default SupportChat;
