import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Input, Button, Avatar, Badge, Space, Typography, message as antMessage, Spin, Upload, Card, Rate, Tabs } from 'antd';
import ErrorBoundary from '../../../components/ErrorBoundary';
import {
  MessageOutlined,
  BellOutlined,
  SearchOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  SendOutlined,
  PaperClipOutlined,
  FileOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { chatApi, ChatListItem, ChatDetail, Message } from '../../../api/chat';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMediaUrl } from '../../../config/api';
import IndividualOfferModal from '../../../components/modals/IndividualOfferModal';
import { ordersApi } from '../../../api/orders';
import { expertsApi } from '../../../api/experts';

const { Text } = Typography;

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  selectedUserId?: number; // ID пользователя для открытия чата
  selectedOrderId?: number; // ID заказа для открытия чата (чат по заказу+пользователю)
  userProfile?: { role?: string };
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

const MessageModalNew: React.FC<MessageModalProps> = ({ 
  visible, 
  onClose,
  isMobile,
  isTablet,
  isDesktop,
  selectedUserId,
  selectedOrderId,
  userProfile
}) => {
  const [messageTab, setMessageTab] = useState<string>('all');
  const [messageText, setMessageText] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [order, setOrder] = useState<OrderForChat | null>(null);
  const [headerOrder, setHeaderOrder] = useState<{ id: number | null; title: string | null }>({ id: null, title: null });
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [orderIdsByChatId, setOrderIdsByChatId] = useState<Record<number, number[]>>({});
  const [closedOrderIdsByChatId, setClosedOrderIdsByChatId] = useState<Record<number, number[]>>({});
  const [workUploading, setWorkUploading] = useState(false);
  const [deadlineTick, setDeadlineTick] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const toPositiveNumber = useCallback((raw: unknown): number | null => {
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const extractOrderIdsFromChat = useCallback((chat: ChatDetail): number[] => {
    const ids: number[] = [];
    const messages = chat?.messages;
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m?.message_type !== 'offer') continue;
        const id = toPositiveNumber((m as { offer_data?: { order_id?: unknown } }).offer_data?.order_id);
        if (!id) continue;
        if ((m as { offer_data?: { status?: unknown } }).offer_data?.status === 'rejected') continue;
        if (!ids.includes(id)) ids.push(id);
      }
    }
    const chatOrderId = toPositiveNumber((chat as unknown as { order_id?: unknown }).order_id);
    if (chatOrderId && !ids.includes(chatOrderId)) ids.push(chatOrderId);
    const chatOrder = toPositiveNumber((chat as unknown as { order?: unknown }).order);
    if (chatOrder && !ids.includes(chatOrder)) ids.push(chatOrder);
    return ids;
  }, [toPositiveNumber]);

  const hydrateClosedOrdersForChat = useCallback(async (chat: ChatDetail): Promise<void> => {
    const chatId = chat?.id;
    if (!chatId) return;

    const orderIds = extractOrderIdsFromChat(chat);
    if (orderIds.length === 0) {
      setClosedOrderIdsByChatId((prev) => (Object.prototype.hasOwnProperty.call(prev, chatId) ? prev : { ...prev, [chatId]: [] }));
      setOrderIdsByChatId((prev) => (Object.prototype.hasOwnProperty.call(prev, chatId) ? prev : { ...prev, [chatId]: [] }));
      return;
    }

    const closedStatuses = new Set(['completed', 'cancelled', 'canceled', 'done']);
    const results = await Promise.all(
      orderIds.map(async (id) => {
        try {
          const data = await ordersApi.getById(id);
          return { id, status: (data as { status?: unknown } | undefined)?.status };
        } catch {
          return { id, status: undefined };
        }
      })
    );
    const closedIds = results
      .filter((r) => typeof r.status === 'string' && closedStatuses.has(r.status))
      .map((r) => r.id);
    const openIds = closedIds.length === 0 ? orderIds : orderIds.filter((id) => !closedIds.includes(id));

    setClosedOrderIdsByChatId((prev) => ({ ...prev, [chatId]: closedIds }));
    setOrderIdsByChatId((prev) => ({ ...prev, [chatId]: openIds }));
  }, [extractOrderIdsFromChat]);

  const offerToShow = (() => {
    const messages = selectedChat?.messages;
    if (!Array.isArray(messages) || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.message_type === 'offer' && m.offer_data) return m;
    }
    return null;
  })();

  const selectedChatMessages = selectedChat?.messages;
  const selectedChatOrderId = selectedChat?.order_id;
  const selectedChatOrder = (selectedChat as { order?: unknown } | null)?.order;

  const computedOrderIds = useMemo(() => {
    const messages = selectedChatMessages;
    const ids: number[] = [];
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m?.message_type !== 'offer') continue;
        const id = toPositiveNumber(m.offer_data?.order_id);
        if (!id) continue;
        if (m.offer_data?.status === 'rejected') continue;
        if (!ids.includes(id)) ids.push(id);
      }
    }
    const chatOrderId = toPositiveNumber(selectedChatOrderId);
    if (chatOrderId && !ids.includes(chatOrderId)) ids.push(chatOrderId);
    const chatOrder = toPositiveNumber(selectedChatOrder);
    if (chatOrder && !ids.includes(chatOrder)) ids.push(chatOrder);
    return ids;
  }, [selectedChatMessages, selectedChatOrderId, selectedChatOrder, toPositiveNumber]);

  useEffect(() => {
    if (!visible) return;
    if (!selectedChat?.id) return;
    if (computedOrderIds.length === 0) return;
    const closed = closedOrderIdsByChatId[selectedChat.id];
    const closedSet = new Set(Array.isArray(closed) ? closed : []);
    setOrderIdsByChatId((prev) => {
      const prevIds = prev[selectedChat.id] || [];
      let changed = false;
      const nextIds = [...prevIds];
      for (const id of computedOrderIds) {
        if (closedSet.has(id)) continue;
        if (!nextIds.includes(id)) {
          nextIds.push(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      return { ...prev, [selectedChat.id]: nextIds };
    });
  }, [visible, selectedChat?.id, computedOrderIds, closedOrderIdsByChatId]);

  const orderIdsForTabs = useMemo(() => {
    if (!selectedChat?.id) return computedOrderIds;
    if (Object.prototype.hasOwnProperty.call(orderIdsByChatId, selectedChat.id)) {
      const stored = orderIdsByChatId[selectedChat.id];
      return Array.isArray(stored) ? stored : computedOrderIds;
    }
    return computedOrderIds;
  }, [selectedChat?.id, computedOrderIds, orderIdsByChatId]);

  const prevAcceptedOrderIdsRef = useRef<number[]>([]);
  useEffect(() => {
    if (!visible) return;
    const prevIds = prevAcceptedOrderIdsRef.current;
    prevAcceptedOrderIdsRef.current = orderIdsForTabs;
    if (orderIdsForTabs.length === 0) {
      setActiveOrderId(null);
      return;
    }
    const prevLast = prevIds[prevIds.length - 1];
    const nextLast = orderIdsForTabs[orderIdsForTabs.length - 1];
    const hasNewOrder = orderIdsForTabs.length > prevIds.length && nextLast !== prevLast;
    setActiveOrderId((prev) => {
      if (hasNewOrder) return nextLast;
      if (prev && orderIdsForTabs.includes(prev)) return prev;
      return nextLast;
    });
  }, [visible, orderIdsForTabs]);

  const effectiveOrderId = activeOrderId;

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatApi.getAll();
      setChatList(data);
    } catch (error: unknown) {
      antMessage.error('Не удалось загрузить чаты');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChatDetail = useCallback(async (chatId: number) => {
    try {
      const data = await chatApi.getById(chatId);
      await hydrateClosedOrdersForChat(data);
      setSelectedChat(data);
      await chatApi.markAsRead(chatId);
      setChatList((prev) => prev.map((chat) =>
        chat.id === chatId ? { ...chat, unread_count: 0 } : chat
      ));
    } catch (error: unknown) {
      antMessage.error('Не удалось загрузить чат');
    }
  }, [hydrateClosedOrdersForChat]);

  const loadOrCreateChatByOrderAndUser = useCallback(async (orderId: number, userId: number) => {
    setLoading(true);
    try {
      const chatData = await chatApi.getOrCreateByOrderAndUser(orderId, userId);
      await hydrateClosedOrdersForChat(chatData);
      setSelectedChat(chatData);
      await loadChats();
    } catch (error: unknown) {
      antMessage.error('Не удалось открыть чат по заказу');
    } finally {
      setLoading(false);
    }
  }, [hydrateClosedOrdersForChat, loadChats]);

  const loadOrCreateChatWithUser = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const chatData = await chatApi.getOrCreateByUser(userId);
      await hydrateClosedOrdersForChat(chatData);
      setSelectedChat(chatData);
      await loadChats();
      antMessage.success('Чат открыт');
    } catch (error: unknown) {
      antMessage.error('Не удалось открыть чат с пользователем');
    } finally {
      setLoading(false);
    }
  }, [hydrateClosedOrdersForChat, loadChats]);

  useEffect(() => {
    if (visible) {
      loadChats();
      // Если передан orderId+userId, открываем чат по заказу (важно для откликов)
      if (selectedOrderId && selectedUserId) {
        loadOrCreateChatByOrderAndUser(selectedOrderId, selectedUserId);
        return;
      }
      // Если передан selectedUserId, автоматически открываем чат с этим пользователем
      if (selectedUserId) {
        loadOrCreateChatWithUser(selectedUserId);
      }
    }
  }, [visible, selectedUserId, selectedOrderId, loadChats, loadOrCreateChatByOrderAndUser, loadOrCreateChatWithUser]);

  useEffect(() => {
    if (!visible) return;
    const orderId = typeof effectiveOrderId === 'number' && effectiveOrderId > 0 ? effectiveOrderId : null;
    if (!orderId) {
      setHeaderOrder({ id: null, title: null });
      return;
    }
    if (headerOrder.id === orderId) return;
    let cancelled = false;
    ordersApi
      .getById(orderId)
      .then((data) => {
        if (cancelled) return;
        const title = (data as OrderForChat | undefined)?.title ?? null;
        setHeaderOrder({ id: orderId, title });
      })
      .catch(() => {
        if (cancelled) return;
        setHeaderOrder({ id: orderId, title: null });
      });
    return () => {
      cancelled = true;
    };
  }, [visible, effectiveOrderId, headerOrder.id]);

  useEffect(() => {
    if (!visible) return;
    setOrderPanelOpen(!!effectiveOrderId);
    if (!effectiveOrderId) {
      setOrder(null);
      setOrderLoading(false);
      return;
    }
    let cancelled = false;
    setOrderLoading(true);
    setOrder(null);
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
  }, [visible, effectiveOrderId]);

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

  const isDeadlineExpired = (deadline?: string | null) => {
    if (!deadline) return false;
    const end = new Date(deadline).getTime();
    if (Number.isNaN(end)) return false;
    return end <= Date.now();
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

  useEffect(() => {
    if (!visible) return;
    const deadline = order?.deadline;
    if (!deadline) return;

    setDeadlineTick((v) => v + 1);
    const id = window.setInterval(() => setDeadlineTick((v) => v + 1), 30000);
    return () => window.clearInterval(id);
  }, [visible, order?.deadline]);

  const isClosedOrder = order?.status === 'completed' || order?.status === 'cancelled';

  const closedOrderIdsForChat = useMemo(() => {
    if (!selectedChat?.id) return [];
    const ids = closedOrderIdsByChatId[selectedChat.id];
    return Array.isArray(ids) ? ids : [];
  }, [closedOrderIdsByChatId, selectedChat?.id]);

  const tabsBaseOrderIds = useMemo(() => {
    const base = Array.isArray(orderIdsForTabs) && orderIdsForTabs.length > 0 ? orderIdsForTabs : computedOrderIds;
    const next = [...base];
    for (const id of computedOrderIds) {
      if (!next.includes(id)) next.push(id);
    }
    return next;
  }, [computedOrderIds, orderIdsForTabs]);

  const tabsOrderIds = useMemo(() => {
    const filteredByClosed = tabsBaseOrderIds.filter((id) => !closedOrderIdsForChat.includes(id));
    if (!effectiveOrderId || !isClosedOrder) return filteredByClosed;
    return filteredByClosed.filter((id) => id !== effectiveOrderId);
  }, [closedOrderIdsForChat, effectiveOrderId, isClosedOrder, tabsBaseOrderIds]);

  useEffect(() => {
    if (!visible) return;
    if (!isClosedOrder) return;
    if (!selectedChat?.id) return;
    if (!effectiveOrderId) return;

    setClosedOrderIdsByChatId((prev) => {
      const prevIds = prev[selectedChat.id] || [];
      if (prevIds.includes(effectiveOrderId)) return prev;
      return { ...prev, [selectedChat.id]: [...prevIds, effectiveOrderId] };
    });

    const removedIndex = tabsBaseOrderIds.indexOf(effectiveOrderId);
    const nextIds = tabsBaseOrderIds.filter(
      (id) => id !== effectiveOrderId && !closedOrderIdsForChat.includes(id)
    );
    const nextActive =
      nextIds.length === 0 ? null : nextIds[Math.min(Math.max(removedIndex, 0), nextIds.length - 1)];

    setOrderIdsByChatId((prev) => {
      const existing = prev[selectedChat.id];
      if (
        Array.isArray(existing) &&
        existing.length === tabsOrderIds.length &&
        existing.every((v, i) => v === tabsOrderIds[i])
      ) {
        return prev;
      }
      return { ...prev, [selectedChat.id]: tabsOrderIds };
    });

    setActiveOrderId(nextActive);
  }, [
    visible,
    isClosedOrder,
    selectedChat?.id,
    effectiveOrderId,
    tabsBaseOrderIds,
    tabsOrderIds,
    closedOrderIdsForChat,
  ]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

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

  const remainingLabel = useMemo(() => {
    void deadlineTick;
    if (isClosedOrder) return '';
    if (!order?.deadline) return '';
    return formatRemaining(order.deadline);
  }, [order?.deadline, deadlineTick, isClosedOrder]);

  const handleOfferSubmit = async (data: OfferData) => {
    if (!selectedChat) return;
    try {
      await chatApi.sendMessage(selectedChat.id, '', undefined, 'offer', data);
      setOfferModalOpen(false);
      await loadChatDetail(selectedChat.id);
      await loadChats();
      antMessage.success('Предложение отправлено');
    } catch {
      antMessage.error('Не удалось отправить предложение');
    }
  };

  const handleAcceptOffer = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      const chatId = selectedChat.id;
      const result = await chatApi.acceptOffer(chatId, messageId);
      const createdOrderIdRaw = (result as { order_id?: unknown } | undefined)?.order_id;
      const createdOrderId =
        typeof createdOrderIdRaw === 'number'
          ? createdOrderIdRaw
          : typeof createdOrderIdRaw === 'string'
            ? Number(createdOrderIdRaw)
            : NaN;

      if (Number.isFinite(createdOrderId) && createdOrderId > 0) {
        setSelectedChat((prev) =>
          prev
            ? {
                ...prev,
                order_id: createdOrderId,
                order: createdOrderId,
                messages: Array.isArray(prev.messages)
                  ? prev.messages.map((m) => {
                      if (m.id !== messageId) return m;
                      return {
                        ...m,
                        offer_data: {
                          ...(m.offer_data || {}),
                          status: 'accepted',
                          order_id: createdOrderId,
                        },
                      };
                    })
                  : prev.messages,
              }
            : prev
        );
        setChatList((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, order_id: createdOrderId, order: createdOrderId }
              : chat
          )
        );
      }

      await loadChatDetail(chatId);
      await loadChats();
      antMessage.success('Предложение принято');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка принятия предложения');
    }
  };

  const handleRejectOffer = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      setSelectedChat((prev) =>
        prev
          ? {
              ...prev,
              messages: Array.isArray(prev.messages)
                ? prev.messages.map((m) => {
                    if (m.id !== messageId) return m;
                    return {
                      ...m,
                      offer_data: {
                        ...(m.offer_data || {}),
                        status: 'rejected',
                      },
                    };
                  })
                : prev.messages,
            }
          : prev
      );
      await chatApi.rejectOffer(selectedChat.id, messageId);
      await loadChatDetail(selectedChat.id);
      await loadChats();
      antMessage.success('Предложение отклонено');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка отклонения предложения');
    }
  };

  const handleUploadWork = async (file: File) => {
    if (!selectedChat || !effectiveOrderId) return;
    if (isDeadlineExpired(order?.deadline)) {
      antMessage.error('Срок сдачи истёк');
      if (workFileInputRef.current) workFileInputRef.current.value = '';
      return;
    }
    setWorkUploading(true);
    try {
      await chatApi.sendMessage(selectedChat.id, 'Работа загружена', file);
      await ordersApi.submitOrder(effectiveOrderId);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats(), refreshOrder()]);
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
      await Promise.all([refreshOrder(), loadChats()]);
      setReviewRating(5);
      setReviewComment('');
      setReviewModalOpen(true);
      antMessage.success('Заказ принят');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось принять заказ');
    }
  };

  const handleRequestRevision = async () => {
    if (!effectiveOrderId) return;
    try {
      await ordersApi.requestRevision(effectiveOrderId);
      await Promise.all([refreshOrder(), loadChats()]);
      antMessage.success('Отправлено на доработку');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить на доработку');
    }
  };

  const handleSubmitReview = async () => {
    if (!effectiveOrderId) return;
    const rating = Math.max(1, Math.min(5, Math.round(reviewRating || 0)));
    if (rating < 1 || rating > 5) {
      antMessage.error('Оценка должна быть от 1 до 5');
      return;
    }

    setReviewSubmitting(true);
    try {
      await expertsApi.rateExpert({
        order: effectiveOrderId,
        rating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewModalOpen(false);
      antMessage.success('Отзыв отправлен');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить отзыв');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() && attachedFiles.length === 0) {
      antMessage.warning('Введите сообщение или прикрепите файл');
      return;
    }

    if (!selectedChat) {
      antMessage.error('Чат не выбран');
      return;
    }

    setSending(true);
    try {
      const textForFirst = messageText.trim();
      const filesToSend = [...attachedFiles].filter((f) => {
        if (!f) return false;
        if (typeof f.size === 'number' && f.size <= 0) {
          antMessage.error(`Файл "${f.name}" пустой и не будет отправлен`);
          return false;
        }
        return true;
      });

      let createdMessages: Message[] = [];
      if (filesToSend.length > 0) {
        createdMessages = await chatApi.sendMessageWithFiles(selectedChat.id, textForFirst, filesToSend);
      } else {
        const msg = await chatApi.sendMessage(selectedChat.id, textForFirst);
        createdMessages = msg ? [msg] : [];
      }

      if (createdMessages.length > 0) {
        const lastMessage = createdMessages[createdMessages.length - 1];

        setSelectedChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, ...createdMessages]
        } : null);

        setChatList(prev => prev.map(chat =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                last_message: {
                  text: messageText.trim() || (attachedFiles.length > 0 ? `📎 ${attachedFiles.length} файл(ов)` : ''),
                  sender_id: lastMessage.sender_id,
                  created_at: lastMessage.created_at
                },
                last_message_time: lastMessage.created_at
              }
            : chat
        ));
      }

      setMessageText('');
      setAttachedFiles([]);
      antMessage.success('Сообщение отправлено');
    } catch (error: unknown) {
      antMessage.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (typeof file.size === 'number' && file.size <= 0) {
      antMessage.error('Передаваемый файл пуст');
      return false;
    }

    // Проверяем размер файла (максимум 10 МБ)
    const maxSize = 10 * 1024 * 1024; // 10 МБ
    if (file.size > maxSize) {
      antMessage.error('Размер файла не должен превышать 10 МБ');
      return false;
    }

    // Проверяем, что файл еще не добавлен
    if (attachedFiles.find(f => f.name === file.name && f.size === file.size)) {
      antMessage.warning('Этот файл уже прикреплен');
      return false;
    }

    setAttachedFiles(prev => [...prev, file]);
    antMessage.success(`Файл "${file.name}" прикреплен`);
    return false; // Предотвращаем автоматическую загрузку
  };

  const removeAttachedFile = (fileToRemove: File) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    antMessage.info('Файл удален');
  };

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const safeChatList = Array.isArray(chatList) ? chatList : [];
  const supportUserId = (() => {
    const raw = localStorage.getItem('support_user_id');
    const parsed = raw ? Number(raw) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  })();
  const supportAvatarSrc = '/assets/icons/support.png';
  const supportChat = safeChatList.find((chat) => chat.other_user?.id === supportUserId) ?? null;
  const isSupportChatSelected = selectedChat?.other_user?.id === supportUserId;

  const filteredChats = safeChatList.filter(chat => {
    // Фильтр по вкладкам
    if (messageTab === 'unread' && chat.unread_count === 0) return false;
    
    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = chat.other_user?.username?.toLowerCase() || '';
      const lastMessage = chat.last_message?.text?.toLowerCase() || '';
      return userName.includes(query) || lastMessage.includes(query);
    }
    
    return true;
  });
  const filteredChatsWithoutSupport = filteredChats.filter((chat) => chat.other_user?.id !== supportUserId);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const showPinnedSupport =
    !normalizedSearchQuery ||
    'техническая поддержка'.includes(normalizedSearchQuery) ||
    'поддержка'.includes(normalizedSearchQuery) ||
    'support'.includes(normalizedSearchQuery);

  return (
    <Modal
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)')}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: 0,
          margin: isMobile ? 0 : 'auto',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.15)',
          width: isMobile ? '100vw' : undefined,
          maxWidth: isMobile ? undefined : (isDesktop ? 1400 : 1200),
          height: isMobile ? '100vh' : 'calc(100vh - 80px)'
        },
        header: {
          display: 'none'
        },
        body: {
          padding: 0,
          margin: 0,
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          overflow: 'hidden'
        }
      }}
    >
      <ErrorBoundary>
      <div style={{ 
        display: 'flex', 
        height: '100%', 
        width: '100%', 
        flexDirection: isMobile ? 'column' : 'row', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Left Sidebar */}
        <div style={{ 
          width: isMobile ? '100%' : isTablet ? '250px' : '300px', 
          background: '#f3f4f6', 
          borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
          borderBottom: isMobile ? '1px solid #e5e7eb' : 'none',
          display: selectedChat && isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          height: isMobile ? '100%' : 'auto'
        }}>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
            padding: isMobile ? '0 4px' : '0 8px'
          }}>
            <div
              onClick={() => setMessageTab('all')}
              style={{
                flex: 1,
                padding: isMobile ? '10px 2px' : '12px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: messageTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
                color: messageTab === 'all' ? '#3b82f6' : '#6b7280',
                fontWeight: messageTab === 'all' ? 600 : 400,
                fontSize: isMobile ? 11 : 13
              }}
            >
              <MessageOutlined style={{ marginRight: isMobile ? 2 : 4, fontSize: isMobile ? 12 : 14 }} />
              Все
            </div>
            <div
              onClick={() => setMessageTab('unread')}
              style={{
                flex: 1,
                padding: isMobile ? '10px 2px' : '12px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: messageTab === 'unread' ? '2px solid #3b82f6' : '2px solid transparent',
                color: messageTab === 'unread' ? '#3b82f6' : '#6b7280',
                fontWeight: messageTab === 'unread' ? 600 : 400,
                fontSize: isMobile ? 11 : 13
              }}
            >
              <BellOutlined style={{ marginRight: isMobile ? 2 : 4, fontSize: isMobile ? 12 : 14 }} />
              {isMobile ? 'Новые' : 'Непрочитанные'}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: isMobile ? '8px' : '12px', background: '#ffffff' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af', fontSize: isMobile ? 12 : 14 }} />}
              placeholder={isMobile ? 'Поиск...' : 'Поиск пользователя'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderRadius: 8, fontSize: isMobile ? 12 : 14 }}
              size={isMobile ? 'small' : 'middle'}
            />
          </div>

          {/* Contact List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            background: '#ffffff'
          }}>
            {showPinnedSupport && (
              <div 
                onClick={() => {
                  if (supportChat) {
                    loadChatDetail(supportChat.id);
                    return;
                  }
                  loadOrCreateChatWithUser(supportUserId);
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: isMobile ? '8px' : '12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  background: isSupportChatSelected ? '#eff6ff' : (supportChat?.unread_count ? '#f0fdf4' : '#ffffff'),
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSupportChatSelected) {
                    e.currentTarget.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSupportChatSelected) {
                    e.currentTarget.style.background = supportChat?.unread_count ? '#f0fdf4' : '#ffffff';
                  }
                }}
              >
                <Avatar
                  className="support-avatar"
                  size={isMobile ? 36 : 40}
                  icon={<CustomerServiceOutlined />}
                  src={supportAvatarSrc}
                />
                <div style={{ flex: 1, marginLeft: isMobile ? 8 : 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text strong style={{ 
                      fontSize: isMobile ? 13 : 14, 
                      color: '#1f2937',
                      fontWeight: (supportChat?.unread_count ?? 0) > 0 ? 600 : 500
                    }}>
                      Техническая поддержка
                    </Text>
                    <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, color: '#9ca3af' }}>
                      {supportChat?.last_message ? formatTimestamp(supportChat.last_message.created_at) : ''}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text 
                      ellipsis 
                      style={{ 
                        fontSize: isMobile ? 11 : 12, 
                        color: (supportChat?.unread_count ?? 0) > 0 ? '#059669' : '#6b7280',
                        fontWeight: (supportChat?.unread_count ?? 0) > 0 ? 500 : 400,
                        maxWidth: isMobile ? '140px' : '180px'
                      }}
                    >
                      {supportChat?.last_message?.text || 'Написать в поддержку'}
                    </Text>
                    {(supportChat?.unread_count ?? 0) > 0 && (
                      <Badge 
                        count={supportChat?.unread_count} 
                        style={{ 
                          backgroundColor: '#10b981',
                          fontSize: isMobile ? 9 : 10,
                          height: isMobile ? 16 : 18,
                          minWidth: isMobile ? 16 : 18,
                          lineHeight: isMobile ? '16px' : '18px'
                        }} 
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Spin />
              </div>
            ) : filteredChatsWithoutSupport.length === 0 && !showPinnedSupport ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                padding: '40px 20px',
                fontSize: isMobile ? 12 : 14
              }}>
                <MessageOutlined style={{ fontSize: isMobile ? 36 : 48, color: '#d1d5db', marginBottom: 12, display: 'block' }} />
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
              </div>
            ) : (
              filteredChatsWithoutSupport.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => loadChatDetail(chat.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: isMobile ? '8px' : '12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedChat?.id === chat.id ? '#eff6ff' : (chat.unread_count > 0 ? '#f0fdf4' : '#ffffff'),
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChat?.id !== chat.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChat?.id !== chat.id) {
                      e.currentTarget.style.background = chat.unread_count > 0 ? '#f0fdf4' : '#ffffff';
                    }
                  }}
                >
                  <Avatar
                    size={isMobile ? 36 : 40}
                    icon={<UserOutlined />}
                    src={getMediaUrl(chat.other_user?.avatar)}
                    style={{ backgroundColor: '#6b7280' }}
                  />
                  <div style={{ flex: 1, marginLeft: isMobile ? 8 : 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text strong style={{ 
                        fontSize: isMobile ? 13 : 14, 
                        color: '#1f2937',
                        fontWeight: chat.unread_count > 0 ? 600 : 500
                      }}>
                        {chat.other_user?.username || 'Пользователь'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, color: '#9ca3af' }}>
                        {chat.last_message ? formatTimestamp(chat.last_message.created_at) : ''}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text 
                        ellipsis 
                        style={{ 
                          fontSize: isMobile ? 11 : 12, 
                          color: chat.unread_count > 0 ? '#059669' : '#6b7280',
                          fontWeight: chat.unread_count > 0 ? 500 : 400,
                          maxWidth: isMobile ? '140px' : '180px'
                        }}
                      >
                        {chat.last_message?.text || 'Нет сообщений'}
                      </Text>
                      {chat.unread_count > 0 && (
                        <Badge 
                          count={chat.unread_count} 
                          style={{ 
                            backgroundColor: '#10b981',
                            fontSize: isMobile ? 9 : 10,
                            height: isMobile ? 16 : 18,
                            minWidth: isMobile ? 16 : 18,
                            lineHeight: isMobile ? '16px' : '18px'
                          }} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ 
          flex: 1, 
          display: (!selectedChat && isMobile) ? 'none' : 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: selectedChat ? '#ffffff' : '#e0f2fe',
            padding: isMobile ? '8px 12px' : '12px 16px',
            paddingRight: isMobile ? '12px' : '56px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${selectedChat ? '#e5e7eb' : '#bae6fd'}`
          }}>
            {selectedChat ? (
              <>
                <Space>
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setSelectedChat(null)}
                      size="small"
                    />
                  )}
                  <Avatar
                    size={isMobile ? 32 : 36}
                    icon={<UserOutlined />}
                    src={isSupportChatSelected ? supportAvatarSrc : getMediaUrl(selectedChat.other_user?.avatar)}
                    className={isSupportChatSelected ? 'support-avatar' : undefined}
                    style={isSupportChatSelected ? undefined : { backgroundColor: '#6b7280' }}
                  />
                  <div>
                    <Text style={{ fontSize: isMobile ? 13 : 15, color: '#1f2937', fontWeight: 500 }}>
                      {isSupportChatSelected ? 'Техническая поддержка' : (selectedChat.other_user?.username || 'Пользователь')}
                    </Text>
                    {!isSupportChatSelected ? (
                      effectiveOrderId && !isClosedOrder ? (
                        <Text style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', display: 'block' }}>
                          {headerOrder.title || order?.title || `Заказ #${effectiveOrderId}`}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', display: 'block' }}>
                          Без заказа
                        </Text>
                      )
                    ) : null}
                  </div>
                </Space>
                {currentRole === 'expert' && !isSupportChatSelected && (
                  <Button
                    type="primary"
                    size={isMobile ? 'small' : 'middle'}
                    icon={<FileTextOutlined />}
                    style={{ background: '#10B981', borderColor: '#10B981' }}
                    onClick={() => setOfferModalOpen(true)}
                  >
                    {isMobile ? 'Предложение' : 'Индивидуальное предложение'}
                  </Button>
                )}
              </>
            ) : (
              <Space>
                <Text style={{ fontSize: isMobile ? 12 : 14, color: '#0369a1', fontWeight: 500 }}>
                  Выберите чат
                </Text>
              </Space>
            )}
          </div>

          {tabsOrderIds.length > 0 && !isSupportChatSelected ? (
            <>
              <div style={{ padding: isMobile ? '8px 12px' : '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Tabs
                  size="small"
                  activeKey={
                    effectiveOrderId && !isClosedOrder
                      ? String(effectiveOrderId)
                      : (tabsOrderIds.length > 0 ? String(tabsOrderIds[tabsOrderIds.length - 1]) : undefined)
                  }
                  onChange={(key) => {
                    const next = Number(key);
                    if (Number.isFinite(next) && next > 0) setActiveOrderId(next);
                    setOrderPanelOpen(true);
                  }}
                  tabBarStyle={{ margin: 0, flex: 1 }}
                  items={tabsOrderIds.map((id) => ({
                    key: String(id),
                    label: `Заказ #${id}${effectiveOrderId === id && remainingLabel ? ` • ${remainingLabel}` : ''}`,
                  }))}
                />
                <Button size="small" disabled={isClosedOrder} onClick={() => setOrderPanelOpen((v) => !v)} style={{ borderRadius: 999 }}>
                  {orderPanelOpen ? 'Скрыть' : 'Показать'}
                </Button>
              </div>
              {orderPanelOpen && !isClosedOrder ? (
                <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <input
                    ref={workFileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadWork(f);
                    }}
                  />
                  {orderLoading ? (
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <Spin size="small" />
                    </div>
                  ) : order ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text strong>{order.title || `Заказ #${order.id}`}</Text>
                          <Text type="secondary">{formatOrderStatus(order.status)}</Text>
                        </div>
                        {currentRole === 'expert' ? (
                          <Button
                            type="primary"
                            size="small"
                            icon={<UploadOutlined />}
                            loading={workUploading}
                            disabled={!['in_progress', 'revision'].includes(order?.status) || isDeadlineExpired(order?.deadline)}
                            onClick={() => workFileInputRef.current?.click()}
                            style={{ background: '#10B981', borderColor: '#10B981' }}
                          >
                            Выгрузить работу
                          </Button>
                        ) : null}
                      </div>
                      <Text type="secondary">
                        Дедлайн: {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'не указан'}{remainingLabel ? ` • осталось ${remainingLabel}` : ''}
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

          {/* Messages Area */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: isMobile ? '12px' : '20px',
            background: '#f9fafb',
            minHeight: 0
          }}>
            {selectedChat ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12 }}>
                {selectedChat.messages.map((msg: Message, idx: number) => {
                  const isOffer = msg.message_type === 'offer' && !!msg.offer_data;
                  const offerExpired = isOffer
                    ? new Date(msg.created_at).getTime() + 2 * 24 * 60 * 60 * 1000 < Date.now()
                    : false;
                  const offerStatus = isOffer ? (msg.offer_data?.status || 'new') : 'new';
                  const showOfferActions = isOffer && currentRole === 'client' && !msg.is_mine && offerStatus === 'new' && !offerExpired;
                  const isLast = idx === selectedChat.messages.length - 1;
                  const showWorkActions =
                    isLast &&
                    currentRole === 'client' &&
                    !!effectiveOrderId &&
                    order?.status === 'review' &&
                    !msg.is_mine &&
                    !!msg.file_url;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.is_mine ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          maxWidth: isOffer ? (isMobile ? '92%' : 420) : (isMobile ? '85%' : '70%'),
                          padding: isOffer ? 0 : (isMobile ? '8px 12px' : '10px 14px'),
                          borderRadius: isOffer ? 0 : (msg.is_mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
                          background: isOffer ? 'transparent' : (msg.is_mine ? '#3b82f6' : '#ffffff'),
                          color: msg.is_mine ? '#ffffff' : '#1f2937',
                          boxShadow: isOffer ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                          border: isOffer ? 'none' : (msg.is_mine ? 'none' : '1px solid #e5e7eb')
                        }}
                      >
                        {isOffer ? (
                          <Card size="small" style={{ width: isMobile ? '100%' : 420 }}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Индивидуальное предложение</div>
                            <div style={{ marginBottom: 6 }}>
                              <Text type="secondary">Тип работы</Text>
                              <div>{msg.offer_data?.work_type}</div>
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <Text type="secondary">Предмет</Text>
                              <div>{msg.offer_data?.subject}</div>
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <Text type="secondary">Описание</Text>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.offer_data?.description}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div>
                                <Text type="secondary">Стоимость</Text>
                                <div style={{ fontWeight: 600, color: '#10B981' }}>
                                  {typeof msg.offer_data?.cost === 'number' ? msg.offer_data.cost.toLocaleString('ru-RU') : msg.offer_data?.cost} ₽
                                </div>
                              </div>
                              <div>
                                <Text type="secondary">Срок</Text>
                                <div>
                                  {msg.offer_data?.deadline ? new Date(msg.offer_data.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                                </div>
                              </div>
                            </div>

                            {offerStatus === 'accepted' ? (
                              <div style={{ color: '#10B981', fontWeight: 500 }}>
                                <CheckCircleOutlined /> Предложение принято
                              </div>
                            ) : offerStatus === 'rejected' ? (
                              <div style={{ color: '#EF4444', fontWeight: 500 }}>
                                <CloseCircleOutlined /> Предложение отклонено
                              </div>
                            ) : offerExpired ? (
                              <div style={{ color: '#9CA3AF' }}>Срок предложения истек</div>
                            ) : showOfferActions ? (
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

                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                            </div>
                          </Card>
                        ) : (
                          <>
                            {msg.text ? (
                              <Text style={{ 
                                fontSize: isMobile ? 15 : 16, 
                                color: msg.is_mine ? '#ffffff' : '#1f2937',
                                display: 'block',
                                marginBottom: 4
                              }}>
                                {msg.text}
                              </Text>
                            ) : null}
                            {msg.file_url && msg.file_name ? (
                              <div style={{ marginTop: msg.text ? 8 : 0, marginBottom: 4 }}>
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ 
                                    color: msg.is_mine ? '#fff' : '#1890ff',
                                    fontSize: isMobile ? 13 : 14
                                  }}
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
                            <Text style={{ 
                              fontSize: isMobile ? 11 : 12, 
                              color: msg.is_mine ? 'rgba(255, 255, 255, 0.7)' : '#9ca3af'
                            }}>
                              {formatMessageTime(msg.created_at)}
                              {msg.is_mine && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    transform: 'translateY(1px)',
                                    color: msg.is_read ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)'
                                  }}
                                >
                                  {msg.is_read ? (
                                    <span
                                      style={{
                                        position: 'relative',
                                        width: isMobile ? 16 : 18,
                                        height: isMobile ? 12 : 14,
                                        display: 'inline-block'
                                      }}
                                    >
                                      <CheckOutlined
                                        style={{
                                          position: 'absolute',
                                          left: 0,
                                          top: 0,
                                          fontSize: isMobile ? 11 : 12
                                        }}
                                      />
                                      <CheckOutlined
                                        style={{
                                          position: 'absolute',
                                          left: isMobile ? 6 : 7,
                                          top: 0,
                                          fontSize: isMobile ? 11 : 12
                                        }}
                                      />
                                    </span>
                                  ) : (
                                    <CheckOutlined style={{ fontSize: isMobile ? 11 : 12 }} />
                                  )}
                                </span>
                              )}
                            </Text>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                paddingTop: isMobile ? '50px' : '100px',
                fontSize: isMobile ? 12 : 14
              }}>
                <MessageOutlined style={{ fontSize: isMobile ? 36 : 48, color: '#d1d5db', marginBottom: isMobile ? 12 : 16, display: 'block' }} />
                Выберите чат для начала общения
              </div>
            )}
          </div>

          {/* Input Area */}
          {selectedChat && (
            <div style={{ 
              padding: isMobile ? '8px 12px 12px 12px' : '16px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              flexShrink: 0
            }}>
              <div style={{ 
                display: 'flex',
                gap: isMobile ? 6 : 8,
                alignItems: 'flex-end'
              }}>
                <Input.TextArea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  autoSize={{ minRows: isMobile ? 2 : 3, maxRows: isMobile ? 6 : 8 }}
                  style={{ 
                    flex: 1,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: isMobile ? 13 : 14
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending}
                />
                
                {/* File Attachment Button */}
                <Upload
                  beforeUpload={handleFileSelect}
                  showUploadList={false}
                  multiple
                  accept=".doc,.docx,.pdf,.rtf,.txt,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z"
                >
                  <Button
                    type="text"
                    icon={<PaperClipOutlined />}
                    style={{ 
                      width: isMobile ? 36 : 40, 
                      height: isMobile ? 36 : 40,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      color: '#6b7280',
                      fontSize: isMobile ? 14 : 16
                    }}
                    disabled={sending}
                    title="Прикрепить файл"
                  />
                </Upload>

                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  style={{ 
                    width: isMobile ? 36 : 40, 
                    height: isMobile ? 36 : 40,
                    background: '#3b82f6',
                    border: 'none',
                    fontSize: isMobile ? 14 : 16
                  }}
                  onClick={sendMessage}
                  loading={sending}
                  disabled={!messageText.trim() && attachedFiles.length === 0}
                />
              </div>

              {attachedFiles.length > 0 && (
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  {attachedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 999,
                        maxWidth: '100%'
                      }}
                    >
                      <FileOutlined style={{ color: '#6b7280' }} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#374151',
                          maxWidth: isMobile ? 160 : 240
                        }}
                        ellipsis
                      >
                        {file.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} МБ
                      </Text>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => removeAttachedFile(file)}
                        style={{
                          color: '#ef4444',
                          padding: 0,
                          height: 20,
                          minWidth: 20,
                          lineHeight: '20px'
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </ErrorBoundary>
      <Modal
        open={reviewModalOpen}
        centered
        onCancel={() => setReviewModalOpen(false)}
        onOk={handleSubmitReview}
        okButtonProps={{ loading: reviewSubmitting }}
        okText="Отправить"
        cancelText="Позже"
        title="Оставьте отзыв об эксперте"
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>Оценка</Text>
            <Rate value={reviewRating} onChange={(v) => setReviewRating(v)} />
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>Комментарий</Text>
            <Input.TextArea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Напишите пару слов (необязательно)"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
        </div>
      </Modal>
      <IndividualOfferModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        onSubmit={handleOfferSubmit}
      />
    </Modal>
  );
};

export default MessageModalNew;
