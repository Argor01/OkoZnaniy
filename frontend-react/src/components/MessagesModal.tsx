import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Tabs, List, Avatar, Badge, Input, Button, Empty, message as antMessage, Spin, Card, Typography } from 'antd';
import { MessageOutlined, SendOutlined, ArrowLeftOutlined, UserOutlined, PaperClipOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UploadOutlined } from '@ant-design/icons';
import './MessagesModal.css';
import { chatApi, ChatListItem as ApiChat, Message as ApiMessage } from '../api/chat';
import IndividualOfferModal from './modals/IndividualOfferModal';
import { ordersApi } from '../api/orders';

const { Text } = Typography;

interface Chat {
  id: number;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  orderId: number | null;
}

type OfferData = {
  description?: string;
  work_type?: string;
  subject?: string;
  cost?: number;
  deadline?: string | null;
  status?: 'new' | 'accepted' | 'rejected';
  order_id?: number;
} & Record<string, unknown>;

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMine: boolean;
  file_name?: string | null;
  file_url?: string | null;
  message_type?: 'text' | 'offer';
  offer_data?: OfferData | null;
  created_at?: string;
}

type OrderForChat = {
  id: number;
  title?: string | null;
  description?: string | null;
  budget?: string | number | null;
  deadline?: string | null;
  status?: string | null;
  subject?: { name?: string | null } | null;
  work_type?: { name?: string | null } | null;
  custom_subject?: string | null;
  custom_work_type?: string | null;
};

const getErrorDetail = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('response' in error)) return undefined;
  const resp = (error as { response?: { data?: { detail?: string } } }).response;
  return resp?.data?.detail;
};

const formatTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) {
    return 'Вчера';
  }
  if (days < 7) {
    return `${days} дн. назад`;
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

interface MessagesModalProps {
  open: boolean;
  onClose: () => void;
  userProfile?: {
    role?: string;
  };
}

const MessagesModal: React.FC<MessagesModalProps> = ({ open, onClose, userProfile }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [order, setOrder] = useState<OrderForChat | null>(null);
  const [workUploading, setWorkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
  const currentRole =
    userProfile?.role ||
    (() => {
      try {
        const raw = localStorage.getItem('user');
        if (!raw) return undefined;
        return JSON.parse(raw)?.role;
      } catch {
        return undefined;
      }
    })();

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const apiChats = await chatApi.getChats();
      const formattedChats: Chat[] = apiChats.map((chat: ApiChat) => {
        const other = chat.other_user;
        const participantName = other
          ? `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.username
          : 'Неизвестный';
        const lastText = chat.last_message?.text || 'Нет сообщений';
        return {
          id: chat.id,
          name: participantName,
          lastMessage: lastText,
          time: formatTime(chat.last_message?.created_at),
          unreadCount: chat.unread_count || 0,
          orderId: (chat.order_id ?? chat.order) || null,
        };
      });
      setChats(formattedChats);
    } catch (error: unknown) {
      console.error('Ошибка загрузки чатов:', error);
      antMessage.error('Не удалось загрузить чаты');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: number) => {
    setLoading(true);
    try {
      const apiMessages = await chatApi.getMessages(chatId);
      const formattedMessages: Message[] = apiMessages.map((msg: ApiMessage) => ({
        id: msg.id,
        sender: msg.sender_id === currentUserId
          ? 'Вы'
          : `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || msg.sender?.username || '',
        text: msg.text || '',
        time: formatTime(msg.created_at),
        isMine: msg.sender_id === currentUserId,
        file_name: msg.file_name ?? undefined,
        file_url: msg.file_url ?? undefined,
        message_type: msg.message_type,
        offer_data: msg.offer_data ?? undefined,
        created_at: msg.created_at,
      }));
      setMessages(formattedMessages.reverse());
    } catch (error: unknown) {
      console.error('Ошибка загрузки сообщений:', error);
      antMessage.error('Не удалось загрузить сообщения');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка чатов при открытии модалки
  useEffect(() => {
    if (open) {
      loadChats();
    }
  }, [open, loadChats]);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
    }
    setOrderPanelOpen(false);
  }, [selectedChat, loadMessages]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !attachedFile) || !selectedChat) return;

    setSending(true);
    try {
      await chatApi.sendMessage(selectedChat, messageText.trim(), attachedFile ?? undefined);
      setMessageText('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMessages(selectedChat);
      await loadChats();
    } catch (error: unknown) {
      console.error('Ошибка отправки сообщения:', error);
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase())
  );
  const activeChat = chats.find((chat) => chat.id === selectedChat);
  const activeOrderId = typeof activeChat?.orderId === 'number' && activeChat.orderId > 0 ? activeChat.orderId : null;
  const effectiveOrderId = (() => {
    if (activeOrderId) return activeOrderId;
    const fromAcceptedOffer = messages.find(
      (m) => m.message_type === 'offer' && m.offer_data?.status === 'accepted' && typeof m.offer_data?.order_id === 'number'
    )?.offer_data?.order_id;
    return typeof fromAcceptedOffer === 'number' && fromAcceptedOffer > 0 ? fromAcceptedOffer : null;
  })();

  useEffect(() => {
    if (!open) return;
    if (!effectiveOrderId) {
      setOrder(null);
      setOrderLoading(false);
      return;
    }
    let cancelled = false;
    setOrderLoading(true);
    ordersApi
      .getById(effectiveOrderId)
      .then((data) => {
        if (!cancelled) setOrder(data as OrderForChat);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, effectiveOrderId]);

  const formatRemaining = (deadline?: string) => {
    if (!deadline) return '';
    const end = new Date(deadline).getTime();
    if (Number.isNaN(end)) return '';
    const diff = end - Date.now();
    if (diff <= 0) return 'Срок истёк';
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  };

  const formatOrderStatus = (status?: string) => {
    if (!status) return '';
    const map: Record<string, string> = {
      new: 'Новый',
      waiting_payment: 'Ожидает оплаты',
      in_progress: 'В работе',
      review: 'На проверке',
      revision: 'На доработке',
      completed: 'Выполнен',
      cancelled: 'Отменён',
    };
    return map[status] || status;
  };

  const handleOfferSubmit = async (data: OfferData) => {
    if (!selectedChat) return;
    try {
      await chatApi.sendMessage(selectedChat, '', undefined, 'offer', data);
      setOfferModalOpen(false);
      await loadMessages(selectedChat);
      await loadChats();
      antMessage.success('Предложение отправлено');
    } catch {
      antMessage.error('Не удалось отправить предложение');
    }
  };

  const handleAcceptOffer = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      const result = await chatApi.acceptOffer(selectedChat, messageId);
      const createdOrderIdRaw = (result as { order_id?: unknown } | undefined)?.order_id;
      const createdOrderId =
        typeof createdOrderIdRaw === 'number'
          ? createdOrderIdRaw
          : typeof createdOrderIdRaw === 'string'
            ? Number(createdOrderIdRaw)
            : NaN;

      if (Number.isFinite(createdOrderId) && createdOrderId > 0) {
        setChats((prev) =>
          prev.map((chat) => (chat.id === selectedChat ? { ...chat, orderId: chat.orderId ?? createdOrderId } : chat))
        );
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const nextOfferData: OfferData = {
              ...(m.offer_data ?? {}),
              status: 'accepted',
              order_id: createdOrderId,
            };
            return { ...m, offer_data: nextOfferData };
          })
        );
      }
      await loadMessages(selectedChat);
      await loadChats();
      antMessage.success('Предложение принято');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка принятия предложения');
    }
  };

  const handleRejectOffer = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      await chatApi.rejectOffer(selectedChat, messageId);
      await loadMessages(selectedChat);
      await loadChats();
      antMessage.success('Предложение отклонено');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка отклонения предложения');
    }
  };

  const refreshOrder = async () => {
    if (!effectiveOrderId) return;
    try {
      setOrderLoading(true);
      const data = await ordersApi.getById(effectiveOrderId);
      setOrder(data as OrderForChat);
    } catch {
      setOrder(null);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleUploadWork = async (file: File) => {
    if (!selectedChat || !effectiveOrderId) return;
    setWorkUploading(true);
    try {
      await chatApi.sendMessage(selectedChat, 'Работа загружена', file);
      await ordersApi.submitOrder(effectiveOrderId);
      await Promise.all([loadMessages(selectedChat), loadChats(), refreshOrder()]);
      antMessage.success('Работа отправлена на проверку');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить работу');
    } finally {
      setWorkUploading(false);
      if (workFileInputRef.current) workFileInputRef.current.value = '';
    }
  };

  const handleApproveOrder = async () => {
    if (!effectiveOrderId) return;
    try {
      await ordersApi.approveOrder(effectiveOrderId);
      await Promise.all([loadChats(), refreshOrder()]);
      antMessage.success('Заказ принят');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось принять заказ');
    }
  };

  const handleRequestRevision = async () => {
    if (!effectiveOrderId) return;
    try {
      await ordersApi.requestRevision(effectiveOrderId);
      await Promise.all([loadChats(), refreshOrder()]);
      antMessage.success('Отправлено на доработку');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить на доработку');
    }
  };

  return (
    <Modal
      title="Сообщения"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1400}
      className="messages-modal"
      styles={{
        body: { padding: 0 }
      }}
    >
      <div className="messages-container">
        {/* Список чатов */}
        <div className={`chats-list ${isMobile && selectedChat ? 'hidden' : ''}`}>
          <div className="chats-header">
            <Input.Search
              placeholder="Поиск друзей..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
              allowClear
            />
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'all', label: 'Все' },
              { key: 'unread', label: 'Непрочитанные' },
            ]}
            className="chats-tabs"
          />

          {loading && !selectedChat ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : (
            <List
              dataSource={filteredChats}
              renderItem={(chat) => (
                <List.Item
                  className={`chat-item ${selectedChat === chat.id ? 'active' : ''} ${
                    chat.unreadCount > 0 ? 'unread' : ''
                  }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={chat.unreadCount} offset={[-5, 5]}>
                        <Avatar size={40} icon={<UserOutlined />}>{chat.name[0]}</Avatar>
                      </Badge>
                    }
                    title={<div className="chat-name">{chat.name}</div>}
                    description={
                      <div className="chat-preview">
                        <span className="last-message">{chat.lastMessage}</span>
                        <span className="chat-time">{chat.time}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="Нет сообщений" /> }}
            />
          )}
        </div>

        {/* Окно чата */}
        <div className={`chat-window ${isMobile && selectedChat ? 'visible' : ''}`}>
          {selectedChat ? (
            <>
              {isMobile ? (
                <div className="chat-header-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setSelectedChat(null)}
                      className="back-button"
                    />
                    <div className="chat-header-info">
                      <Avatar size={40} icon={<UserOutlined />}>
                        {activeChat?.name?.[0]}
                      </Avatar>
                      <span className="chat-header-name">
                        {activeChat?.name}
                      </span>
                    </div>
                  </div>
                  {currentRole === 'expert' && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<FileTextOutlined />}
                      style={{ background: '#10B981', borderColor: '#10B981' }}
                      onClick={() => setOfferModalOpen(true)}
                    >
                      Предложение
                    </Button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size={72} icon={<UserOutlined />}>
                      {activeChat?.name?.[0]}
                    </Avatar>
                    <span style={{ fontWeight: 500 }}>{activeChat?.name}</span>
                  </div>
                  {currentRole === 'expert' && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<FileTextOutlined />}
                      style={{ background: '#10B981', borderColor: '#10B981' }}
                      onClick={() => setOfferModalOpen(true)}
                    >
                      Индивидуальное предложение
                    </Button>
                  )}
                </div>
              )}
              {effectiveOrderId ? (
                <>
                  <div style={{ padding: isMobile ? '8px 12px' : '8px 16px', borderBottom: '1px solid #f0f0f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Button
                      size="small"
                      icon={<ClockCircleOutlined />}
                      onClick={() => setOrderPanelOpen((v) => !v)}
                      style={{ borderRadius: 999 }}
                    >
                      {`Заказ #${effectiveOrderId}`}{order?.deadline ? ` • ${formatRemaining(order.deadline)}` : ''}
                    </Button>
                    {currentRole === 'expert' ? (
                      <>
                        <input
                          ref={workFileInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadWork(f);
                          }}
                        />
                        <Button
                          type="primary"
                          size="small"
                          icon={<UploadOutlined />}
                          loading={workUploading}
                          disabled={!order || !['in_progress', 'revision'].includes(order?.status)}
                          onClick={() => workFileInputRef.current?.click()}
                        >
                          Выгрузить работу
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {orderPanelOpen ? (
                    <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
                      {orderLoading ? (
                        <div style={{ textAlign: 'center', padding: 8 }}>
                          <Spin size="small" />
                        </div>
                      ) : order ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <Text strong>{order.title || `Заказ #${order.id}`}</Text>
                            <Text type="secondary">{formatOrderStatus(order.status)}</Text>
                          </div>
                          <Text type="secondary">
                            Дедлайн: {order.deadline ? new Date(order.deadline).toLocaleString('ru-RU') : 'не указан'}{order.deadline ? ` • осталось ${formatRemaining(order.deadline)}` : ''}
                          </Text>
                          <Text>
                            Предмет: {order.subject?.name || order.custom_subject || '—'} · Тип: {order.work_type?.name || order.custom_work_type || '—'}
                          </Text>
                          <Text>
                            Стоимость: <Text strong style={{ color: '#10B981' }}>{order.budget ? `${Number(order.budget).toLocaleString('ru-RU')} ₽` : '—'}</Text>
                          </Text>
                          {order.description ? <Text style={{ whiteSpace: 'pre-wrap' }}>{order.description}</Text> : null}
                        </div>
                      ) : (
                        <Text type="secondary">Не удалось загрузить данные заказа</Text>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="messages-list">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin />
                  </div>
                ) : messages.length === 0 ? (
                  <Empty description="Нет сообщений" />
                ) : (
                  messages.map((msg, idx) => {
                    const offerExpired = msg.message_type === 'offer' && msg.created_at
                      ? new Date(msg.created_at).getTime() + 2 * 24 * 60 * 60 * 1000 < Date.now()
                      : false;
                    const isLast = idx === messages.length - 1;
                    const showWorkActions =
                      isLast &&
                      currentRole === 'client' &&
                      !!effectiveOrderId &&
                      order?.status === 'review' &&
                      !msg.isMine &&
                      !!msg.file_url;
                    return (
                    <div
                      key={msg.id}
                      className={`message ${msg.isMine ? 'own' : 'other'}`}
                    >
                      <div className="message-content">
                        <div className="message-sender">{msg.sender}</div>
                        {msg.message_type === 'offer' && msg.offer_data ? (
                          <Card size="small" style={{ width: 320, marginTop: 8 }}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Индивидуальное предложение</div>
                            <div style={{ marginBottom: 6 }}>
                              <Text type="secondary">Тип работы</Text>
                              <div>{msg.offer_data.work_type}</div>
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <Text type="secondary">Предмет</Text>
                              <div>{msg.offer_data.subject}</div>
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <Text type="secondary">Описание</Text>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.offer_data.description}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div>
                                <Text type="secondary">Стоимость</Text>
                                <div style={{ fontWeight: 600, color: '#10B981' }}>
                                  {msg.offer_data.cost?.toLocaleString('ru-RU')} ₽
                                </div>
                              </div>
                              <div>
                                <Text type="secondary">Срок</Text>
                                <div>
                                  {msg.offer_data.deadline ? new Date(msg.offer_data.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                                </div>
                              </div>
                            </div>
                            {msg.offer_data.status === 'accepted' ? (
                              <div style={{ color: '#10B981', fontWeight: 500 }}>
                                <CheckCircleOutlined /> Предложение принято
                              </div>
                            ) : msg.offer_data.status === 'rejected' ? (
                              <div style={{ color: '#EF4444', fontWeight: 500 }}>
                                <CloseCircleOutlined /> Предложение отклонено
                              </div>
                            ) : offerExpired ? (
                              <div style={{ color: '#9CA3AF' }}>Срок предложения истек</div>
                            ) : userProfile?.role === 'client' && !msg.isMine ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button
                                  type="primary"
                                  style={{ background: '#10B981', borderColor: '#10B981' }}
                                  onClick={() => handleAcceptOffer(msg.id)}
                                  block
                                >
                                  Принять
                                </Button>
                                <Button danger onClick={() => handleRejectOffer(msg.id)} block>
                                  Отказаться
                                </Button>
                              </div>
                            ) : (
                              <div style={{ color: '#9CA3AF' }}>Ожидает решения клиента</div>
                            )}
                          </Card>
                        ) : (
                          <>
                            {msg.text ? <div className="message-text">{msg.text}</div> : null}
                            {msg.file_url && msg.file_name ? (
                              <div className="message-file" style={{ marginTop: msg.text ? 8 : 0 }}>
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#1890ff' }}
                                >
                                  📎 {msg.file_name}
                                </a>
                              </div>
                            ) : null}
                            {showWorkActions ? (
                              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <Button
                                  type="primary"
                                  style={{ background: '#10B981', borderColor: '#10B981' }}
                                  onClick={handleApproveOrder}
                                  block
                                >
                                  Принять заказ
                                </Button>
                                <Button danger onClick={handleRequestRevision} block>
                                  На доработку
                                </Button>
                              </div>
                            ) : null}
                          </>
                        )}
                        <div className="message-time">{msg.time}</div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

              <div className="message-input-container">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAttachedFile(f);
                  }}
                />
                {attachedFile && (
                  <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                    📎 {attachedFile.name}
                    <Button type="link" size="small" onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                      Убрать
                    </Button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <Input.TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="message-input"
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="default"
                    icon={<PaperClipOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    className="attach-button"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !attachedFile) || sending}
                    loading={sending}
                    className="send-button"
                  >
                    Отправить
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <MessageOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999' }}>Выберите чат</div>
            </div>
          )}
        </div>
      </div>
      <IndividualOfferModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        onSubmit={handleOfferSubmit}
      />
    </Modal>
  );
};

export default MessagesModal;
