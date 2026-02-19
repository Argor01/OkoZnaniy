import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Input, Button, Avatar, Badge, Space, Typography, message as antMessage, Spin, Upload, Card, Rate, Tabs, Select, Carousel, DatePicker, Dropdown } from 'antd';
import ErrorBoundary from '../../../components/ErrorBoundary';
import {
  MessageOutlined,
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
  UploadOutlined,
  ExclamationCircleOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
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
  chatContextTitle?: string;
  supportUserId?: number;
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

type WorkOfferData = {
  title?: string;
  description?: string;
  cost?: number;
  status?: 'new' | 'accepted' | 'rejected';
  delivery_status?: 'pending' | 'awaiting_upload' | 'delivered' | 'accepted' | 'rejected';
  delivered_message_id?: number;
} & Record<string, unknown>;

type OrderForChat = {
  id: number;
  title?: string | null;
  description?: string | null;
  budget?: string | number | null;
  deadline?: string | null;
  status?: string | null;
  is_overdue?: boolean | null;
  client?: { id?: number | null } | null;
  client_id?: number | null;
  expert?: { id?: number | null } | null;
  expert_id?: number | null;
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

const parseContextTitle = (raw?: string | null): { title: string; workId?: number } => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return { title: '' };
  const match = value.match(/work:(\d+)/);
  const workIdRaw = match?.[1] ? Number(match[1]) : NaN;
  const workId = Number.isFinite(workIdRaw) && workIdRaw > 0 ? workIdRaw : undefined;
  const title = value.replace(/\s*\|\s*work:\d+\s*$/, '').trim();
  return { title, workId };
};

const MessageModalNew: React.FC<MessageModalProps> = ({ 
  visible, 
  onClose,
  isMobile,
  isTablet,
  isDesktop,
  selectedUserId,
  selectedOrderId,
  chatContextTitle,
  supportUserId: supportUserIdProp,
  userProfile
}) => {
  const [messageText, setMessageText] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [workOfferModalOpen, setWorkOfferModalOpen] = useState(false);
  const [acceptWorkDeliveryModalOpen, setAcceptWorkDeliveryModalOpen] = useState(false);
  const [acceptWorkDeliveryMessageId, setAcceptWorkDeliveryMessageId] = useState<number | null>(null);
  const [acceptWorkDeliveryRating, setAcceptWorkDeliveryRating] = useState<number>(5);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [order, setOrder] = useState<OrderForChat | null>(null);
  const [headerOrder, setHeaderOrder] = useState<{ id: number | null; title: string | null }>({ id: null, title: null });
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [orderIdsByChatId, setOrderIdsByChatId] = useState<Record<number, number[]>>({});
  const [closedOrderIdsByChatId, setClosedOrderIdsByChatId] = useState<Record<number, number[]>>({});
  const [workUploading, setWorkUploading] = useState(false);
  const [workOfferUploading, setWorkOfferUploading] = useState(false);
  const [deadlineTick, setDeadlineTick] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewOrderId, setReviewOrderId] = useState<number | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimText, setClaimText] = useState<string>('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [showClaimCategories, setShowClaimCategories] = useState(false);
  const [selectedClaimCategory, setSelectedClaimCategory] = useState<string>('');
  const [claimFiles, setClaimFiles] = useState<File[]>([]);
  const [overdueExtendModalOpen, setOverdueExtendModalOpen] = useState(false);
  const [overdueDeadlineValue, setOverdueDeadlineValue] = useState<Dayjs | null>(null);
  const [overdueExtending, setOverdueExtending] = useState(false);
  const [overdueCancelling, setOverdueCancelling] = useState(false);
  const [orderRelevance, setOrderRelevance] = useState<string>(''); // Заказ актуален/не актуален
  const [refundType, setRefundType] = useState<string>(''); // Тип возврата средств
  const [contextChat, setContextChat] = useState<{ userId: number; title: string } | null>(null);
  const [orderIntroByChatId, setOrderIntroByChatId] = useState<Record<number, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const workOfferFileInputRef = useRef<HTMLInputElement>(null);
  
  // Категории претензий
  const claimCategories = [
    'Заказ не выполнен',
    'Заказ выполнен некачественно/частично', 
    'Заказ не оплачен',
    'Необоснованный отзыв',
    'Магазин готовых работ',
    'Другое'
  ];
  
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
        if ((m as { offer_data?: { status?: unknown } }).offer_data?.status !== 'accepted') continue;
        const id = toPositiveNumber((m as { offer_data?: { order_id?: unknown } }).offer_data?.order_id);
        if (!id) continue;
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
        if (m.offer_data?.status !== 'accepted') continue;
        const id = toPositiveNumber(m.offer_data?.order_id);
        if (!id) continue;
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

  useEffect(() => {
    if (!visible) {
      setContextChat(null);
      return;
    }
    if (chatContextTitle && selectedUserId) {
      setContextChat({ userId: selectedUserId, title: chatContextTitle });
    }
  }, [visible, chatContextTitle, selectedUserId]);

  const headerContextMeta = useMemo(() => {
    if (!selectedChat) return { title: '' as string, workId: undefined as number | undefined };
    if (effectiveOrderId) return { title: '' as string, workId: undefined as number | undefined };
    const chatStoredTitle =
      typeof (selectedChat as { context_title?: unknown }).context_title === 'string'
        ? String((selectedChat as { context_title?: unknown }).context_title).trim()
        : '';
    if (chatStoredTitle) return parseContextTitle(chatStoredTitle);
    if (!contextChat) return { title: '' as string, workId: undefined as number | undefined };
    if (selectedChat.other_user?.id !== contextChat.userId) return { title: '' as string, workId: undefined as number | undefined };
    return parseContextTitle(contextChat.title);
  }, [contextChat, effectiveOrderId, selectedChat]);

  const headerContextTitle = useMemo(() => {
    const title = headerContextMeta.title;
    return headerContextMeta.workId && title ? title : null;
  }, [headerContextMeta.title, headerContextMeta.workId]);

  const headerContextWorkId = useMemo(() => headerContextMeta.workId, [headerContextMeta.workId]);

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
      const orderIdFromContext = (() => {
        const ctx = typeof (data as { context_title?: unknown } | null)?.context_title === 'string'
          ? String((data as { context_title?: unknown }).context_title)
          : '';
        const m = ctx.match(/#(\d+)/);
        const parsed = m?.[1] ? Number(m[1]) : NaN;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      })();

      if (data.order_id) {
        setOrderIntroByChatId((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, chatId)) return prev;
          const { [chatId]: _removed, ...rest } = prev;
          return rest;
        });
      } else if (orderIdFromContext) {
        try {
          const orderData = await ordersApi.getById(orderIdFromContext);
          const title =
            typeof (orderData as { title?: unknown } | undefined)?.title === 'string'
              ? String((orderData as { title?: unknown }).title).trim()
              : '';
          const subjectName =
            typeof (orderData as { subject?: { name?: unknown } | null } | undefined)?.subject?.name === 'string'
              ? String((orderData as { subject?: { name?: unknown } | null }).subject?.name).trim()
              : '';
          const workTypeName =
            typeof (orderData as { work_type?: { name?: unknown } | null } | undefined)?.work_type?.name === 'string'
              ? String((orderData as { work_type?: { name?: unknown } | null }).work_type?.name).trim()
              : '';
          const budgetRaw = (orderData as { budget?: unknown } | undefined)?.budget;
          const budgetText =
            typeof budgetRaw === 'number'
              ? `${budgetRaw.toLocaleString('ru-RU')} ₽`
              : typeof budgetRaw === 'string' && budgetRaw.trim()
                ? (() => {
                    const raw = budgetRaw.trim();
                    const asNumber = /^[0-9]+(?:\.[0-9]+)?$/.test(raw) ? Number(raw) : NaN;
                    if (Number.isFinite(asNumber)) return `${asNumber.toLocaleString('ru-RU')} ₽`;
                    return `${raw} ₽`;
                  })()
                : 'Договорная';
          const deadlineRaw = (orderData as { deadline?: unknown } | undefined)?.deadline;
          const deadlineText =
            typeof deadlineRaw === 'string' && deadlineRaw.trim()
              ? new Date(deadlineRaw).toLocaleDateString('ru-RU')
              : 'Не указан';

          const infoText = [
            `Этот чат по теме: ${title || `Заказ #${orderIdFromContext}`}`,
            `Предмет: ${subjectName || '—'}`,
            `Тип работы: ${workTypeName || '—'}`,
            `Бюджет: ${budgetText}`,
            `Дедлайн: ${deadlineText}`,
          ].join('\n');

          setOrderIntroByChatId((prev) => ({ ...prev, [chatId]: infoText }));
        } catch {
          setOrderIntroByChatId((prev) => ({ ...prev, [chatId]: `Этот чат по теме: Заказ #${orderIdFromContext}` }));
        }
      }
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
      if (!chatData.order_id) {
        try {
          const orderData = await ordersApi.getById(orderId);
          const title =
            typeof (orderData as { title?: unknown } | undefined)?.title === 'string'
              ? String((orderData as { title?: unknown }).title).trim()
              : '';
          const subjectName =
            typeof (orderData as { subject?: { name?: unknown } | null } | undefined)?.subject?.name === 'string'
              ? String((orderData as { subject?: { name?: unknown } | null }).subject?.name).trim()
              : '';
          const workTypeName =
            typeof (orderData as { work_type?: { name?: unknown } | null } | undefined)?.work_type?.name === 'string'
              ? String((orderData as { work_type?: { name?: unknown } | null }).work_type?.name).trim()
              : '';
          const budgetRaw = (orderData as { budget?: unknown } | undefined)?.budget;
          const budgetText =
            typeof budgetRaw === 'number'
              ? `${budgetRaw.toLocaleString('ru-RU')} ₽`
              : typeof budgetRaw === 'string' && budgetRaw.trim()
                ? (() => {
                    const raw = budgetRaw.trim();
                    const asNumber = /^[0-9]+(?:\.[0-9]+)?$/.test(raw) ? Number(raw) : NaN;
                    if (Number.isFinite(asNumber)) return `${asNumber.toLocaleString('ru-RU')} ₽`;
                    return `${raw} ₽`;
                  })()
                : 'Договорная';
          const deadlineRaw = (orderData as { deadline?: unknown } | undefined)?.deadline;
          const deadlineText =
            typeof deadlineRaw === 'string' && deadlineRaw.trim()
              ? new Date(deadlineRaw).toLocaleDateString('ru-RU')
              : 'Не указан';

          const infoText = [
            `Этот чат по теме: ${title || `Заказ #${orderId}`}`,
            `Предмет: ${subjectName || '—'}`,
            `Тип работы: ${workTypeName || '—'}`,
            `Бюджет: ${budgetText}`,
            `Дедлайн: ${deadlineText}`,
          ].join('\n');

          setOrderIntroByChatId((prev) => ({ ...prev, [chatData.id]: infoText }));
        } catch {
          setOrderIntroByChatId((prev) => {
            if (Object.prototype.hasOwnProperty.call(prev, chatData.id)) return prev;
            return { ...prev, [chatData.id]: `Этот чат по теме: Заказ #${orderId}` };
          });
        }
      } else {
        setOrderIntroByChatId((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, chatData.id)) return prev;
          const { [chatData.id]: _removed, ...rest } = prev;
          return rest;
        });
      }
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
      const chatData = await chatApi.getOrCreateByUser(userId, chatContextTitle);
      await hydrateClosedOrdersForChat(chatData);
      setSelectedChat(chatData);
      await loadChats();
    } catch (error: unknown) {
      antMessage.error('Не удалось открыть чат с пользователем');
    } finally {
      setLoading(false);
    }
  }, [chatContextTitle, hydrateClosedOrdersForChat, loadChats]);

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

  const formatRemaining = (deadline?: string, status?: string) => {
    if (!deadline) return '';
    const baseEnd = new Date(deadline).getTime();
    const reviewExtraMs = status === 'review' ? 5 * 24 * 60 * 60 * 1000 : 0;
    const end = baseEnd + reviewExtraMs;
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
  const currentUserId = (() => {
    const rawId = localStorage.getItem('user_id');
    const parsed = rawId ? Number(rawId) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 0;
      const id = Number(JSON.parse(raw)?.id);
      return Number.isFinite(id) && id > 0 ? id : 0;
    } catch {
      return 0;
    }
  })();
  const isChatInitiator = (() => {
    if (!selectedChat) return false;
    const chatClientId =
      (selectedChat as { client?: { id?: unknown } | null; client_id?: unknown } | null)?.client?.id ??
      (selectedChat as { client_id?: unknown } | null)?.client_id;
    if (chatClientId) return Number(chatClientId) === currentUserId;
    const msgs = (selectedChat as { messages?: unknown } | null)?.messages;
    if (!Array.isArray(msgs) || msgs.length === 0) return false;
    return !!(msgs[0] as { is_mine?: unknown } | undefined)?.is_mine;
  })();
  const isChatExpert = (() => {
    if (!selectedChat) return false;
    const chatExpertId =
      (selectedChat as { expert?: { id?: unknown } | null; expert_id?: unknown } | null)?.expert?.id ??
      (selectedChat as { expert_id?: unknown } | null)?.expert_id;
    if (chatExpertId) return Number(chatExpertId) === currentUserId;
    return !isChatInitiator;
  })();
  const isOrderClient = (() => {
    const clientId = order?.client?.id ?? order?.client_id;
    if (clientId) return Number(clientId) === currentUserId;
    if (selectedChat) return isChatInitiator;
    return false;
  })();

  const showExpertUploadButton = useMemo(() => {
    if (currentRole !== 'expert') return false;
    if (!order || isClosedOrder) return false;
    if (isOrderClient) return false;
    const status = String(order?.status ?? '');
    return status === 'in_progress' || status === 'revision';
  }, [currentRole, isClosedOrder, isOrderClient, order]);

  const remainingLabel = useMemo(() => {
    void deadlineTick;
    if (isClosedOrder) return '';
    if (!order?.deadline) return '';
    return formatRemaining(order.deadline, order.status);
  }, [order?.deadline, order?.status, deadlineTick, isClosedOrder]);

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

  const lastWorkOffer = useMemo(() => {
    const messages = selectedChat?.messages;
    if (!Array.isArray(messages) || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.message_type === 'work_offer' && m.offer_data) return m;
    }
    return null;
  }, [selectedChat?.messages]);

  const uploadableWorkOffer = useMemo(() => {
    const messages = selectedChat?.messages;
    if (!Array.isArray(messages) || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.message_type !== 'work_offer' || !m.offer_data) continue;
      if (!m.is_mine) continue;
      const status = (m.offer_data as WorkOfferData | null)?.status;
      const deliveryStatus = (m.offer_data as WorkOfferData | null)?.delivery_status;
      if (status === 'accepted' && deliveryStatus === 'awaiting_upload') return m;
    }
    return null;
  }, [selectedChat?.messages]);

  const handleWorkOfferSubmit = async (data: WorkOfferData) => {
    if (!selectedChat) return;
    setWorkOfferUploading(true);
    try {
      const title = headerContextTitle || chatContextTitle || '';
      const payload: WorkOfferData = {
        ...data,
        title: title || data.title,
        ...(headerContextWorkId ? { work_id: headerContextWorkId } : {}),
        status: 'new',
        delivery_status: 'pending',
      };
      await chatApi.sendMessage(selectedChat.id, '', undefined, 'work_offer', payload);
      setWorkOfferModalOpen(false);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats()]);
      antMessage.success('Предложение отправлено');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить предложение');
    } finally {
      setWorkOfferUploading(false);
    }
  };

  const handleAcceptWorkOffer = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      await chatApi.acceptWorkOffer(selectedChat.id, messageId);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats()]);
      antMessage.success('Предложение принято');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка принятия предложения');
    }
  };

  const handleRejectWorkOffer = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      await chatApi.rejectWorkOffer(selectedChat.id, messageId);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats()]);
      antMessage.success('Предложение отклонено');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка отклонения предложения');
    }
  };

  const handleDeliverWorkOffer = async (messageId: number, file: File) => {
    if (!selectedChat) return;
    setWorkOfferUploading(true);
    try {
      await chatApi.deliverWorkOffer(selectedChat.id, messageId, file);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats()]);
      antMessage.success('Работа отправлена');
      setContextChat(null);
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить работу');
    } finally {
      setWorkOfferUploading(false);
      if (workOfferFileInputRef.current) workOfferFileInputRef.current.value = '';
    }
  };

  const handleAcceptWorkDelivery = async (messageId: number) => {
    if (!selectedChat) return;
    setAcceptWorkDeliveryMessageId(messageId);
    setAcceptWorkDeliveryRating(5);
    setAcceptWorkDeliveryModalOpen(true);
  };

  const handleConfirmAcceptWorkDelivery = async () => {
    if (!selectedChat) return;
    const messageId = acceptWorkDeliveryMessageId;
    if (!messageId) return;
    try {
      await chatApi.acceptWorkDelivery(selectedChat.id, messageId, acceptWorkDeliveryRating);
      setAcceptWorkDeliveryModalOpen(false);
      setAcceptWorkDeliveryMessageId(null);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats()]);
      antMessage.success('Работа принята');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка принятия работы');
    }
  };

  const handleRejectWorkDelivery = async (messageId: number) => {
    if (!selectedChat) return;
    try {
      await chatApi.rejectWorkDelivery(selectedChat.id, messageId);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats()]);
      antMessage.success('Работа отклонена');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Ошибка отклонения работы');
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

  const handleOfferWorkUpload = async (file: File) => {
    if (!selectedChat) return;
    const offerId = uploadableWorkOffer?.id ?? lastWorkOffer?.id;
    if (!offerId) {
      antMessage.error('Не найдено предложение для отправки работы');
      if (workOfferFileInputRef.current) workOfferFileInputRef.current.value = '';
      return;
    }
    await handleDeliverWorkOffer(offerId, file);
  };

  const handleApproveOrder = async () => {
    if (!effectiveOrderId) return;
    try {
      await ordersApi.approveOrder(effectiveOrderId);
      await Promise.all([refreshOrder(), loadChats()]);
      setReviewRating(5);
      setReviewComment('');
      setReviewOrderId(effectiveOrderId);
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
    const orderId = reviewOrderId || effectiveOrderId;
    if (!orderId) {
      antMessage.error('Не удалось определить заказ для отзыва');
      return;
    }
    const rating = Math.max(1, Math.min(5, Math.round(reviewRating || 0)));
    if (rating < 1 || rating > 5) {
      antMessage.error('Оценка должна быть от 1 до 5');
      return;
    }

    setReviewSubmitting(true);
    try {
      await expertsApi.rateExpert({
        order: orderId,
        rating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewModalOpen(false);
      setReviewOrderId(null);
      antMessage.success('Отзыв отправлен');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить отзыв');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!selectedClaimCategory) {
      antMessage.warning('Выберите категорию претензии');
      return;
    }

    // Дополнительная валидация для категории "Заказ не выполнен"
    if (selectedClaimCategory === 'Заказ не выполнен') {
      if (!orderRelevance) {
        antMessage.warning('Укажите актуальность заказа');
        return;
      }
      if (!refundType) {
        antMessage.warning('Выберите тип возврата средств');
        return;
      }
    }

    if (!claimText.trim()) {
      antMessage.warning('Введите текст претензии');
      return;
    }

    if (!selectedChat || !isSupportChatSelected) {
      antMessage.error('Претензию можно подать только в чате с технической поддержкой');
      return;
    }

    setClaimSubmitting(true);
    try {
      // Маппинг категорий претензий на типы БД
      const claimTypeMap: Record<string, string> = {
        'Заказ не выполнен': 'refund',
        'Заказ выполнен некачественно/частично': 'quality',
        'Заказ не оплачен': 'refund',
        'Необоснованный отзыв': 'complaint',
        'Магазин готовых работ': 'complaint',
        'Другое': 'other',
      };
      
      const claimType = claimTypeMap[selectedClaimCategory] || 'other';
      
      // Создаем претензию в БД
      const claim = await chatApi.createClaim({
        order_id: effectiveOrderId || undefined,
        claim_type: claimType,
        subject: selectedClaimCategory,
        description: claimText.trim(),
      });
      
      // Формируем сообщение со ссылкой на претензию
      let claimMessage = `🚨 ПРЕТЕНЗИЯ #${claim.id}: ${selectedClaimCategory}\n\n`;
      
      // Добавляем дополнительные поля для категории "Заказ не выполнен"
      if (selectedClaimCategory === 'Заказ не выполнен') {
        claimMessage += `Актуальность заказа: ${orderRelevance}\n`;
        claimMessage += `Возврат средств: ${refundType}\n\n`;
      }
      
      claimMessage += claimText.trim();
      
      let createdMessages: Message[] = [];
      
      // Если есть файлы, отправляем с файлами
      if (claimFiles.length > 0) {
        createdMessages = await chatApi.sendMessageWithFiles(selectedChat.id, claimMessage, claimFiles);
      } else {
        const msg = await chatApi.sendMessage(selectedChat.id, claimMessage);
        createdMessages = msg ? [msg] : [];
      }
      
      // Обновляем чат с реальными сообщениями от сервера
      if (createdMessages.length > 0) {
        const lastMessage = createdMessages[createdMessages.length - 1];
        
        setSelectedChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, ...createdMessages]
        } : null);

        // Обновляем список чатов
        setChatList(prev => prev.map(chat =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                last_message: {
                  text: claimMessage,
                  sender_id: lastMessage.sender_id,
                  created_at: lastMessage.created_at
                },
                last_message_time: lastMessage.created_at
              }
            : chat
        ));
      }

      setClaimModalOpen(false);
      setClaimText('');
      setSelectedClaimCategory('');
      setClaimFiles([]);
      setOrderRelevance('');
      setRefundType('');
      setShowClaimCategories(false);
      antMessage.success('Претензия отправлена в техническую поддержку');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить претензию');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleClaimFileSelect = (file: File) => {
    if (typeof file.size === 'number' && file.size <= 0) {
      antMessage.error('Передаваемый файл пуст');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10 МБ
    if (file.size > maxSize) {
      antMessage.error('Размер файла не должен превышать 10 МБ');
      return false;
    }

    if (claimFiles.find(f => f.name === file.name && f.size === file.size)) {
      antMessage.warning('Этот файл уже прикреплен');
      return false;
    }

    setClaimFiles(prev => [...prev, file]);
    antMessage.success(`Файл "${file.name}" прикреплен`);
    return false;
  };

  const removeClaimFile = (fileToRemove: File) => {
    setClaimFiles(prev => prev.filter(file => file !== fileToRemove));
    antMessage.info('Файл удален');
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
    if (typeof supportUserIdProp === 'number' && supportUserIdProp > 0) return supportUserIdProp;
    const raw = localStorage.getItem('support_user_id');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();
  const supportAvatarSrc = '/assets/icons/support.png';
  const supportChat =
    supportUserId ? (safeChatList.find((chat) => chat.other_user?.id === supportUserId) ?? null) : null;
  const isSupportChatSelected = !!supportUserId && selectedChat?.other_user?.id === supportUserId;

  const hasActiveOffersInSelectedChat = useMemo(() => {
    const messages = selectedChat?.messages;
    if (!Array.isArray(messages) || messages.length === 0) return false;
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    return messages.some((m) => {
      if (m?.message_type !== 'offer') return false;
      const status = (m.offer_data?.status ?? 'new') as unknown;
      if (status !== 'new') return false;
      const createdAt = Date.parse(m.created_at);
      if (!Number.isFinite(createdAt)) return true;
      return createdAt + twoDaysMs > now;
    });
  }, [selectedChat?.messages]);

  const handleDeleteSelectedChat = useCallback(() => {
    if (!selectedChat) return;
    Modal.confirm({
      title: 'Удалить чат?',
      icon: <ExclamationCircleOutlined />,
      content: hasActiveOffersInSelectedChat
        ? 'В этом чате есть активные индивидуальные предложения. Сначала дождитесь окончания действия предложения или отклоните/примите его.'
        : 'Чат будет удалён без возможности восстановления.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true, disabled: hasActiveOffersInSelectedChat, loading: deletingChat },
      onOk: async () => {
        setDeletingChat(true);
        try {
          await chatApi.deleteChat(selectedChat.id);
          setSelectedChat(null);
          await loadChats();
          antMessage.success('Чат удалён');
        } catch (error: unknown) {
          antMessage.error(getErrorDetail(error) || 'Не удалось удалить чат');
        } finally {
          setDeletingChat(false);
        }
      },
    });
  }, [deletingChat, hasActiveOffersInSelectedChat, loadChats, selectedChat]);

  const canOverdueClientActions =
    !!selectedChat &&
    isOrderClient &&
    !!effectiveOrderId &&
    (order?.is_overdue === true || isDeadlineExpired(order?.deadline)) &&
    (order?.status === 'in_progress' || order?.status === 'revision');

  const openOverdueExtendModal = () => {
    setOverdueDeadlineValue(dayjs().add(1, 'day'));
    setOverdueExtendModalOpen(true);
  };

  const handleConfirmOverdueExtend = async () => {
    if (!effectiveOrderId) return;
    if (!overdueDeadlineValue) {
      antMessage.error('Выберите новый дедлайн');
      return;
    }
    if (overdueDeadlineValue.valueOf() <= dayjs().valueOf()) {
      antMessage.error('Дедлайн не может быть в прошлом');
      return;
    }

    setOverdueExtending(true);
    try {
      await ordersApi.extendDeadline(effectiveOrderId, overdueDeadlineValue.toISOString());
      setOverdueExtendModalOpen(false);
      await Promise.all([refreshOrder(), loadChats()]);
      antMessage.success('Дедлайн продлён');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось продлить дедлайн');
    } finally {
      setOverdueExtending(false);
    }
  };

  const handleCancelOverdueOrder = () => {
    if (!effectiveOrderId) return;
    Modal.confirm({
      title: 'Отменить заказ?',
      icon: <ExclamationCircleOutlined />,
      content: 'Эксперту заказ зачтётся как невыполненный.',
      okText: 'Отменить',
      okButtonProps: { danger: true, loading: overdueCancelling },
      cancelText: 'Назад',
      onOk: async () => {
        setOverdueCancelling(true);
        try {
          await ordersApi.cancelOverdue(effectiveOrderId);
          await Promise.all([refreshOrder(), loadChats()]);
          antMessage.success('Заказ отменён');
        } catch (error: unknown) {
          antMessage.error(getErrorDetail(error) || 'Не удалось отменить заказ');
        } finally {
          setOverdueCancelling(false);
        }
      },
    });
  };

  const handleOverdueComplaint = async () => {
    if (!effectiveOrderId) return;
    if (!supportUserId) {
      antMessage.error('Поддержка не настроена');
      return;
    }
    const expertName = selectedChat?.other_user?.username || 'эксперт';
    const deadlineText = order?.deadline ? new Date(order.deadline).toLocaleString('ru-RU') : 'не указан';
    const title = order?.title || `Заказ #${effectiveOrderId}`;
    const text = [
      'Здравствуйте!',
      '',
      `Хочу подать претензию по заказу #${effectiveOrderId}.`,
      `Заказ: ${title}`,
      `Эксперт: ${expertName}`,
      `Дедлайн: ${deadlineText}`,
      'Причина: заказ не выполнен в срок.',
      '',
      'Описание ситуации:',
      ''
    ].join('\n');

    await loadOrCreateChatWithUser(supportUserId);
    setSelectedClaimCategory('Заказ не выполнен');
    setOrderRelevance('Заказ актуален');
    setRefundType('Возврат предоплаты');
    setClaimText(text);
    setShowClaimCategories(false);
    setClaimModalOpen(true);
  };

  const filteredChats = safeChatList.filter(chat => {
    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = chat.other_user?.username?.toLowerCase() || '';
      const lastMessage = chat.last_message?.text?.toLowerCase() || '';
      return userName.includes(query) || lastMessage.includes(query);
    }
    
    return true;
  });
  const filteredChatsWithoutSupport = supportUserId
    ? filteredChats.filter((chat) => chat.other_user?.id !== supportUserId)
    : filteredChats;
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
        {selectedChat && !isSupportChatSelected && (
          <Dropdown
            key={`dropdown-${selectedChat.id}`}
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'delete',
                  label: 'Удалить чат',
                  danger: true,
                  disabled: deletingChat || hasActiveOffersInSelectedChat,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'delete') handleDeleteSelectedChat();
              },
            }}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              style={{
                position: 'absolute',
                top: 10,
                right: 48,
                zIndex: 10,
                width: 40,
                height: 40,
              }}
            />
          </Dropdown>
        )}
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
                  if (supportUserId) {
                    loadOrCreateChatWithUser(supportUserId);
                  }
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
                        dot
                        style={{ 
                          backgroundColor: '#3b82f6'
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
                          dot
                          style={{ 
                            backgroundColor: '#3b82f6'
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
        <div 
          key={selectedChat ? `chat-${selectedChat.id}` : 'no-chat'}
          style={{ 
            flex: 1, 
            display: (!selectedChat && isMobile) ? 'none' : 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            background: selectedChat ? '#ffffff' : '#e0f2fe',
            padding: isMobile ? '8px 12px' : '12px 16px',
            paddingRight: selectedChat ? (isMobile ? '96px' : '140px') : (isMobile ? '12px' : '56px'),
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
                      ) : headerContextTitle ? (
                        <Text style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', display: 'block' }}>
                          {headerContextTitle}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', display: 'block' }}>
                          Без заказа
                        </Text>
                      )
                    ) : null}
                  </div>
                </Space>
                <input
                  ref={workOfferFileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleOfferWorkUpload(f);
                  }}
                />
                {currentRole === 'expert' && !isSupportChatSelected ? (
                  headerContextTitle ? (
                    <Button
                      type="primary"
                      size={isMobile ? 'small' : 'middle'}
                      icon={
                        uploadableWorkOffer
                          ? <UploadOutlined />
                          : <FileTextOutlined />
                      }
                      loading={workOfferUploading}
                      onClick={() => {
                        if (uploadableWorkOffer) {
                          workOfferFileInputRef.current?.click();
                        } else {
                          setWorkOfferModalOpen(true);
                        }
                      }}
                      style={{ background: '#10B981', borderColor: '#10B981' }}
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
                      style={{ background: '#10B981', borderColor: '#10B981' }}
                      onClick={() => setOfferModalOpen(true)}
                    >
                      {isMobile ? 'Предложение' : 'Индивидуальное предложение'}
                    </Button>
                  ) : null
                ) : null}
                {isSupportChatSelected && (
                  <Button
                    type="text"
                    danger
                    icon={<ExclamationCircleOutlined />}
                    size={isMobile ? 'middle' : 'large'}
                    onClick={() => setClaimModalOpen(true)}
                    style={{
                      fontSize: isMobile ? 20 : 22,
                      color: '#ef4444',
                      padding: isMobile ? '4px' : '6px',
                      height: isMobile ? 32 : 40,
                      width: isMobile ? 32 : 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Подать претензию"
                  />
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
              <input
                ref={workFileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadWork(f);
                }}
              />
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
                        {canOverdueClientActions ? (
                          <Space size={8} wrap>
                            <Button
                              type="primary"
                              size="small"
                              disabled={overdueCancelling}
                              loading={overdueExtending}
                              onClick={openOverdueExtendModal}
                            >
                              Продлить дедлайн
                            </Button>
                            <Button
                              danger
                              size="small"
                              disabled={overdueExtending}
                              loading={overdueCancelling}
                              onClick={handleCancelOverdueOrder}
                            >
                              Отменить заказ
                            </Button>
                            <Button
                              size="small"
                              disabled={overdueExtending || overdueCancelling}
                              onClick={handleOverdueComplaint}
                            >
                              Жалоба
                            </Button>
                          </Space>
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
                      {showExpertUploadButton ? (
                        <div style={{ marginTop: 6 }}>
                          <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            loading={workUploading}
                            disabled={isDeadlineExpired(order?.deadline)}
                            onClick={() => workFileInputRef.current?.click()}
                            style={{ background: '#10B981', borderColor: '#10B981' }}
                          >
                            Выгрузить работу
                          </Button>
                        </div>
                      ) : null}
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
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedChat ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12 }}>
                {orderIntroByChatId[selectedChat.id] ? (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                      style={{
                        maxWidth: isMobile ? '92%' : 520,
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        color: '#6b7280',
                        fontSize: isMobile ? 12 : 13,
                        whiteSpace: 'pre-wrap',
                        textAlign: 'center'
                      }}
                    >
                      {orderIntroByChatId[selectedChat.id]}
                    </div>
                  </div>
                ) : null}
                {selectedChat.messages.map((msg: Message, idx: number) => {
                  const isOffer = msg.message_type === 'offer' && !!msg.offer_data;
                  const isWorkOffer = msg.message_type === 'work_offer' && !!msg.offer_data;
                  const canReviewOrder =
                    (isOrderClient || currentRole === 'client') && currentRole !== 'expert';
                  const showWorkActions =
                    canReviewOrder &&
                    !!effectiveOrderId &&
                    order?.status === 'review' &&
                    !msg.is_mine &&
                    !!msg.file_url;
                  const isCardMessage = isOffer || isWorkOffer || showWorkActions;
                  const offerExpired = isOffer
                    ? new Date(msg.created_at).getTime() + 2 * 24 * 60 * 60 * 1000 < Date.now()
                    : false;
                  const offerStatus = isOffer ? (msg.offer_data?.status || 'new') : 'new';
                  const showOfferActions = isOffer && !msg.is_mine && offerStatus === 'new' && !offerExpired;
                  const workOfferStatus = isWorkOffer ? ((msg.offer_data as WorkOfferData | null)?.status || 'new') : 'new';
                  const workDeliveryStatus = isWorkOffer
                    ? ((msg.offer_data as WorkOfferData | null)?.delivery_status || 'pending')
                    : 'pending';
                  const showWorkOfferActions =
                    isWorkOffer && !msg.is_mine && currentRole !== 'expert' && workOfferStatus === 'new';
                  const showWorkDeliveryActions =
                    isWorkOffer &&
                    !msg.is_mine &&
                    currentRole !== 'expert' &&
                    workOfferStatus === 'accepted' &&
                    workDeliveryStatus === 'delivered';
                  const showExpertUploadForWorkOffer =
                    isWorkOffer &&
                    msg.is_mine &&
                    currentRole === 'expert' &&
                    workOfferStatus === 'accepted' &&
                    workDeliveryStatus === 'awaiting_upload';

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
                          maxWidth: isCardMessage ? (isMobile ? '92%' : 420) : (isMobile ? '85%' : '70%'),
                          padding: isCardMessage ? 0 : (isMobile ? '8px 12px' : '10px 14px'),
                          borderRadius: isCardMessage ? 0 : (msg.is_mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
                          background: isCardMessage ? 'transparent' : (msg.is_mine ? '#3b82f6' : '#ffffff'),
                          color: msg.is_mine ? '#ffffff' : '#1f2937',
                          boxShadow: isCardMessage ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                          border: isCardMessage ? 'none' : (msg.is_mine ? 'none' : '1px solid #e5e7eb')
                        }}
                      >
                        {showWorkActions ? (
                          <Card size="small" style={{ width: isMobile ? '100%' : 420 }}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Работа по заказу</div>
                            <div style={{ marginBottom: 10 }}>
                              <Text type="secondary">Файл</Text>
                              <div style={{ marginTop: 4 }}>
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#1890ff', fontSize: isMobile ? 13 : 14 }}
                                >
                                  📎 {msg.file_name || 'Скачать файл'}
                                </a>
                              </div>
                            </div>
                            <div style={{ color: '#2563eb', fontWeight: 500, marginBottom: 10 }}>
                              Работа отправлена, ожидает решения заказчика
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button
                                type="primary"
                                style={{ background: '#10B981', borderColor: '#10B981' }}
                                onClick={handleApproveOrder}
                                block
                              >
                                Принять
                              </Button>
                              <Button danger onClick={handleRequestRevision} block>
                                На доработку
                              </Button>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                            </div>
                          </Card>
                        ) : isOffer ? (
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
                              <div style={{ color: '#9CA3AF' }}>Ожидает решения получателя</div>
                            )}

                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                            </div>
                          </Card>
                        ) : isWorkOffer ? (
                          <Card size="small" style={{ width: isMobile ? '100%' : 420 }}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Предложение готовой работы</div>
                            <div style={{ marginBottom: 10 }}>
                              <Text type="secondary">Название</Text>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {(msg.offer_data as WorkOfferData | null)?.title || headerContextTitle || 'Готовая работа'}
                              </div>
                            </div>
                            {(msg.offer_data as WorkOfferData | null)?.description ? (
                              <div style={{ marginBottom: 10 }}>
                                <Text type="secondary">Описание</Text>
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                  {(msg.offer_data as WorkOfferData | null)?.description}
                                </div>
                              </div>
                            ) : null}
                            {typeof (msg.offer_data as WorkOfferData | null)?.cost === 'number' ? (
                              <div style={{ marginBottom: 10 }}>
                                <Text type="secondary">Стоимость</Text>
                                <div>
                                  <Text strong style={{ color: '#10B981' }}>
                                    {Number((msg.offer_data as WorkOfferData | null)?.cost).toLocaleString('ru-RU')} ₽
                                  </Text>
                                </div>
                              </div>
                            ) : null}

                            {workOfferStatus === 'rejected' ? (
                              <div style={{ color: '#EF4444', fontWeight: 500 }}>
                                <CloseCircleOutlined /> Предложение отклонено
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'accepted' ? (
                              <div style={{ color: '#10B981', fontWeight: 500 }}>
                                <CheckCircleOutlined /> Работа принята
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'rejected' ? (
                              <div style={{ color: '#EF4444', fontWeight: 500 }}>
                                <CloseCircleOutlined /> Работа отклонена
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'delivered' ? (
                              <div style={{ color: '#2563eb', fontWeight: 500 }}>
                                Работа отправлена, ожидает решения покупателя
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'awaiting_upload' ? (
                              <div style={{ color: '#2563eb', fontWeight: 500 }}>
                                Ожидается отправка работы экспертом
                              </div>
                            ) : (
                              <div style={{ color: '#9CA3AF' }}>Ожидает решения покупателя</div>
                            )}

                            {showWorkOfferActions ? (
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <Button
                                  type="primary"
                                  style={{ background: '#10B981', borderColor: '#10B981' }}
                                  onClick={() => handleAcceptWorkOffer(msg.id)}
                                  block
                                >
                                  Принять
                                </Button>
                                <Button danger onClick={() => handleRejectWorkOffer(msg.id)} block>
                                  Отказаться
                                </Button>
                              </div>
                            ) : null}

                            {showExpertUploadForWorkOffer ? (
                              <div style={{ marginTop: 12 }}>
                                <Button
                                  type="primary"
                                  icon={<UploadOutlined />}
                                  style={{ background: '#10B981', borderColor: '#10B981' }}
                                  onClick={() => workOfferFileInputRef.current?.click()}
                                  loading={workOfferUploading}
                                  block
                                >
                                  Отправить работу
                                </Button>
                              </div>
                            ) : null}

                            {showWorkDeliveryActions ? (
                              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <Button
                                  type="primary"
                                  style={{ background: '#10B981', borderColor: '#10B981' }}
                                  onClick={() => handleAcceptWorkDelivery(msg.id)}
                                  block
                                >
                                  Принять
                                </Button>
                                <Button danger onClick={() => handleRejectWorkDelivery(msg.id)} block>
                                  Отказаться
                                </Button>
                              </div>
                            ) : null}

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
              {/* Claim Categories Carousel - only for support chat */}
              {isSupportChatSelected && (
                <div style={{ 
                  marginBottom: isMobile ? 8 : 12,
                  paddingBottom: isMobile ? 8 : 12,
                  borderBottom: '1px solid #f3f4f6',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <style>{`
                    @keyframes scroll-carousel {
                      0% {
                        transform: translateX(0);
                      }
                      100% {
                        transform: translateX(-50%);
                      }
                    }
                    .carousel-scroll {
                      animation: scroll-carousel 20s linear infinite;
                    }
                    .carousel-scroll:hover {
                      animation-play-state: paused;
                    }
                  `}</style>
                  <div 
                    className="carousel-scroll"
                    style={{
                      display: 'flex',
                      gap: 8,
                      paddingBottom: 4
                    }}
                  >
                    {/* Дублируем категории для бесшовного loop эффекта */}
                    {[...claimCategories, ...claimCategories].map((category, index) => (
                      <Button
                        key={index}
                        type="default"
                        size="small"
                        onClick={() => {
                          setSelectedClaimCategory(category);
                          setClaimModalOpen(true);
                        }}
                        style={{
                          borderRadius: 6,
                          border: '1px solid #ef4444',
                          background: '#ffffff',
                          color: '#ef4444',
                          fontSize: isMobile ? 11 : 12,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.borderColor = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ 
                display: 'flex',
                gap: isMobile ? 8 : 10,
                alignItems: 'flex-end',
                width: '100%'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input.TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    autoSize={{ minRows: isMobile ? 1 : 1, maxRows: isMobile ? 4 : 4 }}
                    style={{ 
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      fontSize: isMobile ? 14 : 15,
                      padding: '10px 14px',
                      resize: 'none'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sending}
                  />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? 6 : 8,
                  alignItems: 'center',
                  flexShrink: 0
                }}>
                  {/* File Attachment Button */}
                  <Upload
                    beforeUpload={handleFileSelect}
                    showUploadList={false}
                    multiple
                    accept=".doc,.docx,.pdf,.rtf,.txt,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z"
                  >
                    <Button
                      type="default"
                      icon={<PaperClipOutlined />}
                      style={{ 
                        width: isMobile ? 40 : 44, 
                        height: isMobile ? 40 : 44,
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        color: '#6b7280',
                        fontSize: isMobile ? 16 : 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#ffffff',
                        transition: 'all 0.2s'
                      }}
                      disabled={sending}
                      title="Прикрепить файл"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    />
                  </Upload>

                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    style={{ 
                      width: isMobile ? 40 : 44, 
                      height: isMobile ? 40 : 44,
                      background: (!messageText.trim() && attachedFiles.length === 0) ? '#9ca3af' : '#3b82f6',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: isMobile ? 16 : 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: (!messageText.trim() && attachedFiles.length === 0) ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.2s',
                      cursor: (!messageText.trim() && attachedFiles.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                    onClick={sendMessage}
                    loading={sending}
                    disabled={!messageText.trim() && attachedFiles.length === 0}
                    onMouseEnter={(e) => {
                      if (!sending && (messageText.trim() || attachedFiles.length > 0)) {
                        e.currentTarget.style.background = '#2563eb';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (messageText.trim() || attachedFiles.length > 0) {
                        e.currentTarget.style.background = '#3b82f6';
                      } else {
                        e.currentTarget.style.background = '#9ca3af';
                      }
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                </div>
              </div>

              {attachedFiles.length > 0 && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #e5e7eb',
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
                        gap: 10,
                        padding: '8px 12px',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: 12,
                        maxWidth: '100%',
                        transition: 'all 0.2s'
                      }}
                    >
                      <FileOutlined style={{ color: '#0284c7', fontSize: 16 }} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#0c4a6e',
                          maxWidth: isMobile ? 140 : 220,
                          fontWeight: 500
                        }}
                        ellipsis
                      >
                        {file.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#0369a1', whiteSpace: 'nowrap' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} МБ
                      </Text>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => removeAttachedFile(file)}
                        icon={<span style={{ fontSize: 18, lineHeight: 1 }}>×</span>}
                        style={{
                          color: '#ef4444',
                          padding: 0,
                          height: 24,
                          width: 24,
                          minWidth: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 6,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      />
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
        open={overdueExtendModalOpen}
        centered
        onCancel={() => {
          setOverdueExtendModalOpen(false);
          setOverdueDeadlineValue(null);
        }}
        onOk={handleConfirmOverdueExtend}
        okButtonProps={{ loading: overdueExtending }}
        okText="Продлить"
        cancelText="Отмена"
        title="Продлить дедлайн"
        destroyOnClose
        width={isMobile ? '90%' : 520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text type="secondary">Выберите новый дедлайн</Text>
          <DatePicker
            showTime
            style={{ width: '100%' }}
            value={overdueDeadlineValue}
            onChange={(v) => setOverdueDeadlineValue(v)}
            format="DD.MM.YYYY HH:mm"
          />
        </div>
      </Modal>
      
      {/* Claim Modal */}
      <Modal
        open={claimModalOpen}
        centered
        onCancel={() => {
          setClaimModalOpen(false);
          setSelectedClaimCategory('');
          setClaimText('');
          setClaimFiles([]);
          setOrderRelevance('');
          setRefundType('');
        }}
        onOk={handleSubmitClaim}
        okButtonProps={{ 
          loading: claimSubmitting,
          danger: true
        }}
        okText="Подать претензию"
        cancelText="Отмена"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
            Подача претензии
          </div>
        }
        destroyOnClose
        width={isMobile ? '90%' : 600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ 
            padding: '12px 16px', 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: 8,
            color: '#991b1b'
          }}>
            <Text style={{ fontSize: 13, color: '#991b1b' }}>
              Претензия будет отправлена в техническую поддержку для рассмотрения. 
              Опишите подробно суть вашей проблемы.
            </Text>
          </div>
          
          {/* Категории претензий */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Категория претензии *
            </Text>
            <Select
              value={selectedClaimCategory || undefined}
              onChange={(value) => {
                setSelectedClaimCategory(value);
                // Сбрасываем дополнительные поля при смене категории
                if (value !== 'Заказ не выполнен') {
                  setOrderRelevance('');
                  setRefundType('');
                }
              }}
              placeholder="Выберите категорию претензии"
              size="large"
              style={{ width: '100%' }}
              options={claimCategories.map(category => ({
                label: category,
                value: category
              }))}
            />
          </div>
          
          {/* Дополнительные поля для категории "Заказ не выполнен" */}
          {selectedClaimCategory === 'Заказ не выполнен' && (
            <>
              <div>
                <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Актуальность заказа *
                </Text>
                <Select
                  value={orderRelevance || undefined}
                  onChange={(value) => setOrderRelevance(value)}
                  placeholder="Выберите актуальность заказа"
                  size="large"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Заказ актуален', value: 'Заказ актуален' },
                    { label: 'Заказ не актуален', value: 'Заказ не актуален' }
                  ]}
                />
              </div>
              
              <div>
                <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Возврат средств *
                </Text>
                <Select
                  value={refundType || undefined}
                  onChange={(value) => setRefundType(value)}
                  placeholder="Выберите тип возврата средств"
                  size="large"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Возврат предоплаты', value: 'Возврат предоплаты' },
                    { label: 'Возврат предоплаты и неустойка', value: 'Возврат предоплаты и неустойка' },
                    { label: 'Возврат средств не требуется', value: 'Возврат средств не требуется' }
                  ]}
                />
              </div>
            </>
          )}
          
          {/* Текст претензии */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Описание претензии *
            </Text>
            <Input.TextArea
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Опишите подробно суть проблемы, укажите детали ситуации..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              maxLength={1000}
              showCount
              style={{ fontSize: 14 }}
            />
          </div>
          
          {/* Прикрепление файлов */}
          <div>
            <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Прикрепить файлы (необязательно)
            </Text>
            <Upload
              beforeUpload={handleClaimFileSelect}
              showUploadList={false}
              multiple
              accept=".doc,.docx,.pdf,.rtf,.txt,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.dwg,.dxf,.cdr,.cdw,.bak,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z"
            >
              <Button
                icon={<PaperClipOutlined />}
                style={{ width: '100%' }}
              >
                Выбрать файлы
              </Button>
            </Upload>
            
            {claimFiles.length > 0 && (
              <div style={{
                marginTop: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                {claimFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6
                    }}
                  >
                    <FileOutlined style={{ color: '#6b7280' }} />
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#374151',
                        flex: 1
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
                      onClick={() => removeClaimFile(file)}
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
        </div>
      </Modal>
      
      <Modal
        open={reviewModalOpen}
        centered
        onCancel={() => {
          setReviewModalOpen(false);
          setReviewOrderId(null);
        }}
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
      <Modal
        open={acceptWorkDeliveryModalOpen}
        centered
        onCancel={() => {
          setAcceptWorkDeliveryModalOpen(false);
          setAcceptWorkDeliveryMessageId(null);
        }}
        onOk={handleConfirmAcceptWorkDelivery}
        okText="Принять"
        cancelText="Отмена"
        title="Оцените работу"
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>Оценка</Text>
            <Rate value={acceptWorkDeliveryRating} onChange={(v) => setAcceptWorkDeliveryRating(v)} />
          </div>
        </div>
      </Modal>
      <IndividualOfferModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        onSubmit={handleOfferSubmit}
      />
      <IndividualOfferModal
        open={workOfferModalOpen}
        onClose={() => setWorkOfferModalOpen(false)}
        onSubmit={(data) => handleWorkOfferSubmit(data as unknown as WorkOfferData)}
        loading={workOfferUploading}
        variant="work_offer"
        workTitle={headerContextTitle || chatContextTitle || undefined}
      />
    </Modal>
  );
};

export default MessageModalNew;
