import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Input, Button, Avatar, Badge, Space, Typography, message as antMessage, Spin, Upload, Card, Rate, Tabs, Select, Carousel, DatePicker, Dropdown, Alert } from 'antd';
import { ErrorBoundary } from '@/features/common';
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
  StopOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { chatApi, ChatListItem, ChatDetail, Message } from '@/features/support/api/chat';
import { supportApi } from '@/features/support/api/support';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMediaUrl } from '../../../config/api';
import { IndividualOfferModal } from '@/features/orders';
import { ordersApi } from '@/features/orders/api/orders';
import { expertsApi } from '@/features/expert/api/experts';
import styles from './MessageModalNew.module.css';
import '../../../styles/messages.css';
import '../../../styles/avatar.css';

const { Text } = Typography;

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  selectedUserId?: number; 
  selectedOrderId?: number; 
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
  const [orderRelevance, setOrderRelevance] = useState<string>(''); 
  const [refundType, setRefundType] = useState<string>(''); 
  const [contextChat, setContextChat] = useState<{ userId: number; title: string } | null>(null);
  const [orderIntroByChatId, setOrderIntroByChatId] = useState<Record<number, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const workOfferFileInputRef = useRef<HTMLInputElement>(null);
  
  
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

  const loadOrCreateSupportChat = useCallback(async (userId?: number) => {
    setLoading(true);
    try {
      // Сначала пытаемся получить существующие чаты поддержки
      const supportChats = await supportApi.getChats();
      
      if (supportChats.length > 0) {
        // Если есть существующий чат, открываем его
        const existingChat = supportChats[0];
        // Преобразуем SupportChat в формат ChatDetail для совместимости
        const chatData = {
          id: existingChat.id,
          participants: [existingChat.client, existingChat.admin].filter(Boolean),
          messages: [], // Сообщения загрузятся отдельно
          unread_count: existingChat.unread_count || 0,
          last_message: existingChat.last_message || null,
          other_user: existingChat.admin || existingChat.client,
          context_title: existingChat.subject,
          is_frozen: false,
          frozen_reason: null
        };
        setSelectedChat(chatData as any);
        
        // Загружаем сообщения поддержки
        const messages = await supportApi.getMessages(existingChat.id);
        // Преобразуем SupportMessage в формат Message
        const convertedMessages = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          created_at: msg.created_at,
          is_read: msg.is_read,
          file: msg.file || null,
          file_name: '',
          message_type: msg.message_type || 'text',
          offer_data: null
        }));
        
        setSelectedChat(prev => prev ? { ...prev, messages: convertedMessages } : null);
      } else {
        // Если нет чата поддержки, создаем новый через supportApi
        const newSupportChat = await supportApi.createChat({
          subject: 'Обращение в техническую поддержку',
          message: 'Здравствуйте! У меня есть вопрос.',
          priority: 'medium'
        });
        
        // Преобразуем созданный чат в формат ChatDetail
        const chatData = {
          id: newSupportChat.id,
          participants: [newSupportChat.client, newSupportChat.admin].filter(Boolean),
          messages: [],
          unread_count: 0,
          last_message: null,
          other_user: newSupportChat.admin || newSupportChat.client,
          context_title: newSupportChat.subject,
          is_frozen: false,
          frozen_reason: null
        };
        setSelectedChat(chatData as any);
        
        // Загружаем сообщения нового чата
        const messages = await supportApi.getMessages(newSupportChat.id);
        const convertedMessages = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          created_at: msg.created_at,
          is_read: msg.is_read,
          file: msg.file || null,
          file_name: '',
          message_type: msg.message_type || 'text',
          offer_data: null
        }));
        
        setSelectedChat(prev => prev ? { ...prev, messages: convertedMessages } : null);
      }
      
      await loadChats();
    } catch (error: unknown) {
      console.error('Ошибка загрузки чата поддержки:', error);
      antMessage.error('Не удалось открыть чат с поддержкой');
    } finally {
      setLoading(false);
    }
  }, [loadChats]);

  useEffect(() => {
    if (visible) {
      loadChats();

      // Обновляем данные выбранного чата при открытии модального окна
      if (selectedChat?.id) {
        loadChatDetail(selectedChat.id);
      }

      if (selectedOrderId && selectedUserId) {
        loadOrCreateChatByOrderAndUser(selectedOrderId, selectedUserId);
        return;
      }

      if (selectedUserId) {
        loadOrCreateChatWithUser(selectedUserId);
      }
    }
  }, [visible, selectedUserId, selectedOrderId, selectedChat?.id, loadChats, loadChatDetail, loadOrCreateChatByOrderAndUser, loadOrCreateChatWithUser, loadOrCreateSupportChat]);

  // Обработчик события для загрузки чата поддержки
  useEffect(() => {
    const handleLoadSupportChatInModal = () => {
      if (visible) {
        const userId = (() => {
          if (typeof supportUserIdProp === 'number' && supportUserIdProp > 0) return supportUserIdProp;
          const raw = localStorage.getItem('support_user_id');
          if (!raw) return null;
          const parsed = Number(raw);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        })();
        loadOrCreateSupportChat(userId || undefined);
      }
    };

    window.addEventListener('loadSupportChatInModal', handleLoadSupportChatInModal);
    return () => {
      window.removeEventListener('loadSupportChatInModal', handleLoadSupportChatInModal);
    };
  }, [visible, loadOrCreateSupportChat, supportUserIdProp]);

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

      const claimTypeMap: Record<string, string> = {
        'Заказ не выполнен': 'refund',
        'Заказ выполнен некачественно/частично': 'quality',
        'Заказ не оплачен': 'refund',
        'Необоснованный отзыв': 'complaint',
        'Магазин готовых работ': 'complaint',
        'Другое': 'other',
      };
      
      const claimType = claimTypeMap[selectedClaimCategory] || 'other';

      const claim = await chatApi.createClaim({
        order_id: effectiveOrderId || undefined,
        claim_type: claimType,
        subject: selectedClaimCategory,
        description: claimText.trim(),
      });

      let claimMessage = `🚨 ПРЕТЕНЗИЯ #${claim.id}: ${selectedClaimCategory}\n\n`;

      if (selectedClaimCategory === 'Заказ не выполнен') {
        claimMessage += `Актуальность заказа: ${orderRelevance}\n`;
        claimMessage += `Возврат средств: ${refundType}\n\n`;
      }
      
      claimMessage += claimText.trim();
      
      let createdMessages: Message[] = [];

      if (claimFiles.length > 0) {
        createdMessages = await chatApi.sendMessageWithFiles(selectedChat.id, claimMessage, claimFiles);
      } else {
        const msg = await chatApi.sendMessage(selectedChat.id, claimMessage);
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

    const maxSize = 10 * 1024 * 1024;
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

      // Проверяем, является ли это чатом поддержки
      const isSupportChat = selectedChat.context_title?.includes('техническую поддержку') || 
                           selectedChat.context_title?.includes('Обращение в техническую поддержку');

      let createdMessages: Message[] = [];
      
      if (isSupportChat) {
        // Для чатов поддержки используем supportApi
        if (filesToSend.length > 0) {
          // Отправляем файлы по одному (supportApi не поддерживает множественные файлы)
          for (const file of filesToSend) {
            const supportMsg = await supportApi.sendMessage(selectedChat.id, textForFirst, file);
            const convertedMsg = {
              id: supportMsg.id,
              text: supportMsg.text,
              sender: supportMsg.sender,
              created_at: supportMsg.created_at,
              is_read: supportMsg.is_read,
              file: supportMsg.file || null,
              file_name: '',
              message_type: supportMsg.message_type || 'text',
              offer_data: null
            };
            createdMessages.push(convertedMsg);
          }
        } else {
          const supportMsg = await supportApi.sendMessage(selectedChat.id, textForFirst);
          const convertedMsg = {
            id: supportMsg.id,
            text: supportMsg.text,
            sender: supportMsg.sender,
            created_at: supportMsg.created_at,
            is_read: supportMsg.is_read,
            file: supportMsg.file || null,
            file_name: '',
            message_type: supportMsg.message_type || 'text',
            offer_data: null
          };
          createdMessages = [convertedMsg];
        }
      } else {
        // Для обычных чатов используем chatApi
        if (filesToSend.length > 0) {
          createdMessages = await chatApi.sendMessageWithFiles(selectedChat.id, textForFirst, filesToSend);
        } else {
          const msg = await chatApi.sendMessage(selectedChat.id, textForFirst);
          createdMessages = msg ? [msg] : [];
        }
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
                  sender_id: lastMessage.sender_id || lastMessage.sender?.id,
                  created_at: lastMessage.created_at
                },
                last_message_time: lastMessage.created_at
              }
            : chat
        ));
      }

      setMessageText('');
      setAttachedFiles([]);
      
      if (isSupportChat) {
        // Для чатов поддержки обновляем через supportApi
        const messages = await supportApi.getMessages(selectedChat.id);
        const convertedMessages = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          created_at: msg.created_at,
          is_read: msg.is_read,
          file: msg.file || null,
          file_name: '',
          message_type: msg.message_type || 'text',
          offer_data: null
        }));
        
        setSelectedChat(prev => prev ? { ...prev, messages: convertedMessages } : null);
        await loadChats();
      } else {
        // Обновляем данные чата и список чатов после отправки сообщения
        // Это важно для получения информации о возможной заморозке чата
        await Promise.all([
          loadChatDetail(selectedChat.id),
          loadChats()
        ]);
      }
      
      antMessage.success('Сообщение отправлено');
    } catch (error: unknown) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Обновляем данные чата в любом случае, чтобы получить актуальную информацию о заморозке
      try {
        await Promise.all([
          loadChatDetail(selectedChat.id),
          loadChats()
        ]);
      } catch (updateError) {
        console.error('Ошибка обновления данных чата:', updateError);
      }
      
      // Проверяем, если это ошибка заморозки чата
      if (error instanceof Error && error.message.includes('заморожен')) {
        antMessage.error(error.message);
      } else {
        antMessage.error('Не удалось отправить сообщение');
      }
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (typeof file.size === 'number' && file.size <= 0) {
      antMessage.error('Передаваемый файл пуст');
      return false;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      antMessage.error('Размер файла не должен превышать 10 МБ');
      return false;
    }

    if (attachedFiles.find(f => f.name === file.name && f.size === file.size)) {
      antMessage.warning('Этот файл уже прикреплен');
      return false;
    }

    setAttachedFiles(prev => [...prev, file]);
    antMessage.success(`Файл "${file.name}" прикреплен`);
    return false;
  };

  const removeAttachedFile = (fileToRemove: File) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    antMessage.info('Файл удален');
  };

  const formatTimestamp = (dateString: string) => {
    try {
      const result = formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
      if (result.includes('меньше минуты')) {
        return '1 минуту назад';
      }
      return result;
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
      wrapClassName={`${styles.chatModalWrap} ${isMobile ? styles.chatModalWrapMobile : isDesktop ? styles.chatModalWrapDesktop : styles.chatModalWrapTablet}`}
    >
      <ErrorBoundary>
      <div
        className={`${styles.chatModalContainer} ${isMobile ? styles.chatModalContainerMobile : ''}`}
      >
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
              className={styles.chatMenuButton}
            />
          </Dropdown>
        )}
        
        <div
          className={`${styles.chatSidebar} ${isMobile ? styles.chatSidebarMobile : isTablet ? styles.chatSidebarTablet : styles.chatSidebarDesktop} ${selectedChat && isMobile ? styles.chatSidebarHidden : ''}`}
        >
          
          <div className={`${styles.chatSearchHeader} ${isMobile ? styles.chatSearchHeaderMobile : ''}`}>
            <Input
              prefix={<SearchOutlined className={`${styles.chatSearchIcon} ${isMobile ? styles.chatSearchIconMobile : ''}`} />}
              placeholder={isMobile ? 'Поиск...' : 'Поиск пользователя'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${styles.chatSearchInput} ${isMobile ? styles.chatSearchInputMobile : ''}`}
              size={isMobile ? 'small' : 'middle'}
            />
          </div>

          
          <div className={styles.chatList}>
            {showPinnedSupport && (
              <div 
                onClick={() => {
                  loadOrCreateSupportChat(supportUserId || undefined);
                }}
                className={`${styles.chatListItem} ${isMobile ? styles.chatListItemMobile : ''} ${isSupportChatSelected ? styles.chatListItemSelected : ''} ${(supportChat?.unread_count ?? 0) > 0 ? styles.chatListItemUnread : ''}`}
              >
                <Avatar
                  className="support-avatar"
                  size={isMobile ? 36 : 40}
                  icon={<CustomerServiceOutlined />}
                  src={supportAvatarSrc}
                />
                <div className={`${styles.chatListContent} ${isMobile ? styles.chatListContentMobile : ''}`}>
                  <div className={styles.chatListHeaderRow}>
                    <Text
                      strong
                      className={`${styles.chatListName} ${isMobile ? styles.chatListNameMobile : ''} ${(supportChat?.unread_count ?? 0) > 0 ? styles.chatListNameUnread : ''}`}
                    >
                      Техническая поддержка
                    </Text>
                    <Text type="secondary" className={`${styles.chatListTime} ${isMobile ? styles.chatListTimeMobile : ''}`}>
                      {supportChat?.last_message ? formatTimestamp(supportChat.last_message.created_at) : ''}
                    </Text>
                  </div>
                  <div className={styles.chatListMetaRow}>
                    <Text 
                      ellipsis 
                      className={`${styles.chatListPreview} ${isMobile ? styles.chatListPreviewMobile : styles.chatListPreviewDesktop} ${(supportChat?.unread_count ?? 0) > 0 ? styles.chatListPreviewUnread : ''}`}
                    >
                      {supportChat?.last_message?.text || 'Написать в поддержку'}
                    </Text>
                    {(supportChat?.unread_count ?? 0) > 0 && (
                      <Badge 
                        dot
                        className={styles.chatBadge}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <div className={styles.chatListLoading}>
                <Spin />
              </div>
            ) : filteredChatsWithoutSupport.length === 0 && !showPinnedSupport ? (
              <div className={`${styles.chatListEmpty} ${isMobile ? styles.chatListEmptyMobile : ''}`}>
                <MessageOutlined className={`${styles.chatListEmptyIcon} ${isMobile ? styles.chatListEmptyIconMobile : ''}`} />
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
              </div>
            ) : (
              filteredChatsWithoutSupport.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => loadChatDetail(chat.id)}
                  className={`${styles.chatListItem} ${isMobile ? styles.chatListItemMobile : ''} ${selectedChat?.id === chat.id ? styles.chatListItemSelected : ''} ${chat.unread_count > 0 ? styles.chatListItemUnread : ''}`}
                >
                  <Avatar
                    size={isMobile ? 36 : 40}
                    icon={<UserOutlined />}
                    src={getMediaUrl(chat.other_user?.avatar)}
                    className={styles.chatAvatar}
                  />
                  <div className={`${styles.chatListContent} ${isMobile ? styles.chatListContentMobile : ''}`}>
                    <div className={styles.chatListHeaderRow}>
                      <Text
                        strong
                        className={`${styles.chatListName} ${isMobile ? styles.chatListNameMobile : ''} ${chat.unread_count > 0 ? styles.chatListNameUnread : ''}`}
                      >
                        {chat.other_user?.username || 'Пользователь'}
                      </Text>
                      <Text type="secondary" className={`${styles.chatListTime} ${isMobile ? styles.chatListTimeMobile : ''}`}>
                        {chat.last_message ? formatTimestamp(chat.last_message.created_at) : ''}
                      </Text>
                    </div>
                    <div className={styles.chatListMetaRow}>
                      <Text 
                        ellipsis 
                        className={`${styles.chatListPreview} ${isMobile ? styles.chatListPreviewMobile : styles.chatListPreviewDesktop} ${chat.unread_count > 0 ? styles.chatListPreviewUnread : ''}`}
                      >
                        {chat.last_message?.text || 'Нет сообщений'}
                      </Text>
                      {chat.unread_count > 0 && (
                        <Badge 
                          dot
                          className={styles.chatBadge}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        
        <div 
          key={selectedChat ? `chat-${selectedChat.id}` : 'no-chat'}
          className={`${styles.chatPanel} ${(!selectedChat && isMobile) ? styles.chatPanelHidden : ''}`}
        >
          
          <div
            className={`${styles.chatHeader} ${selectedChat ? styles.chatHeaderActive : styles.chatHeaderEmpty} ${
              selectedChat
                ? (isMobile ? styles.chatHeaderPaddingMobileActive : styles.chatHeaderPaddingDesktopActive)
                : (isMobile ? styles.chatHeaderPaddingMobileEmpty : styles.chatHeaderPaddingDesktopEmpty)
            }`}
          >
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
                    className={isSupportChatSelected ? 'support-avatar' : styles.chatHeaderAvatar}
                  />
                  <div>
                    <Text className={`${styles.chatHeaderTitle} ${isMobile ? styles.chatHeaderTitleMobile : ''}`}>
                      {isSupportChatSelected ? 'Техническая поддержка' : (selectedChat.other_user?.username || 'Пользователь')}
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
                      onClick={() => setOfferModalOpen(true)}
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
                    onClick={() => setClaimModalOpen(true)}
                    className={`${styles.chatClaimButton} ${isMobile ? styles.chatClaimButtonMobile : ''}`}
                    title="Подать претензию"
                  />
                ) : null}
              </>
            ) : (
              <Space>
                <Text className={`${styles.chatHeaderEmptyText} ${isMobile ? styles.chatHeaderEmptyTextMobile : ''}`}>
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
                className={styles.hiddenInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadWork(f);
                }}
              />
              <div className={`${styles.orderTabsHeader} ${isMobile ? styles.orderTabsHeaderMobile : ''}`}>
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
                  className={styles.orderTabs}
                  items={tabsOrderIds.map((id) => ({
                    key: String(id),
                    label: `Заказ #${id}${effectiveOrderId === id && remainingLabel ? ` • ${remainingLabel}` : ''}`,
                  }))}
                />
                <Button size="small" disabled={isClosedOrder} onClick={() => setOrderPanelOpen((v) => !v)} className={styles.orderToggleButton}>
                  {orderPanelOpen ? 'Скрыть' : 'Показать'}
                </Button>
              </div>
              {orderPanelOpen && !isClosedOrder ? (
                <div className={`${styles.orderPanel} ${isMobile ? styles.orderPanelMobile : ''}`}>
                  {orderLoading ? (
                    <div className={styles.orderLoading}>
                      <Spin size="small" />
                    </div>
                  ) : order ? (
                    <div className={styles.orderInfo}>
                      <div className={styles.orderInfoRow}>
                        <div className={styles.orderInfoMeta}>
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
                        Стоимость: <Text strong className={styles.textSuccess}>{order.budget ? `${Number(order.budget).toLocaleString('ru-RU')} ₽` : '—'}</Text>
                      </Text>
                      {order.description ? <Text className={styles.orderDescription}>{order.description}</Text> : null}
                      {showExpertUploadButton ? (
                        <div className={styles.orderUploadWrapper}>
                          <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            loading={workUploading}
                            disabled={isDeadlineExpired(order?.deadline)}
                            onClick={() => workFileInputRef.current?.click()}
                            className={styles.buttonSuccess}
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

          
          <div className={`${styles.chatMessages} ${isMobile ? styles.chatMessagesMobile : ''}`}>
            {selectedChat ? (
              <div className={`${styles.chatMessagesContent} ${isMobile ? styles.chatMessagesContentMobile : ''}`}>
                {orderIntroByChatId[selectedChat.id] ? (
                  <div className={styles.chatIntroWrapper}>
                    <div
                      className={`${styles.chatIntroBubble} ${isMobile ? styles.chatIntroBubbleMobile : ''}`}
                    >
                      {orderIntroByChatId[selectedChat.id]}
                    </div>
                  </div>
                ) : null}
                
                
                {/* Явно скрываем инпут для замороженных чатов */}
                {selectedChat.is_frozen && (
                  <div style={{ 
                    padding: '16px', 
                    textAlign: 'center', 
                    color: '#999',
                    fontStyle: 'italic',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    Отправка сообщений в замороженном чате недоступна
                  </div>
                )}
                
                {selectedChat.messages.map((msg: Message, idx: number) => {
                  const isOffer = msg.message_type === 'offer' && !!msg.offer_data;
                  const isWorkOffer = msg.message_type === 'work_offer' && !!msg.offer_data;
                  const isSystemMessage = msg.message_type === 'system';
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
                  
                  // System message styling
                  if (isSystemMessage) {
                    return (
                      <div
                        key={msg.id}
                        className={styles.messageRowSystem}
                      >
                        <div className={styles.messageBubbleSystem}>
                          <div className={styles.messageSystemCard}>
                            <StopOutlined className={styles.messageSystemIcon} />
                            <Text className={`${styles.messageSystemText} ${isMobile ? styles.messageSystemTextMobile : ''}`}>
                              {msg.text}
                            </Text>
                            <div className={styles.messageSystemTime}>
                              Система безопасности • {formatMessageTime(msg.created_at)}
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
                    <div
                      key={msg.id}
                      className={messageRowClass}
                    >
                      <div
                        className={messageBubbleClass}
                      >
                        {showWorkActions ? (
                          <Card size="small" className={messageCardClass}>
                            <div className={styles.messageCardTitle}>Работа по заказу</div>
                            <div className={styles.messageCardSection}>
                              <Text type="secondary">Файл</Text>
                              <div className={styles.messageCardSectionTop}>
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${styles.messageCardLink} ${isMobile ? styles.messageCardLinkMobile : ''}`}
                                >
                                  📎 {msg.file_name || 'Скачать файл'}
                                </a>
                              </div>
                            </div>
                            <div className={styles.messageCardInfo}>
                              Работа отправлена, ожидает решения заказчика
                            </div>
                            <div className={styles.messageCardActions}>
                              <Button
                                type="primary"
                                className={styles.buttonSuccess}
                                onClick={handleApproveOrder}
                                block
                              >
                                Принять
                              </Button>
                              <Button danger onClick={handleRequestRevision} block>
                                На доработку
                              </Button>
                            </div>
                            <div className={styles.messageCardTime}>
                              <Text type="secondary" className={styles.messageCardTimeText}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                            </div>
                          </Card>
                        ) : isOffer ? (
                          <Card size="small" className={messageCardClass}>
                            <div className={styles.messageCardTitle}>Индивидуальное предложение</div>
                            <div className={styles.messageCardSectionSm}>
                              <Text type="secondary">Тип работы</Text>
                              <div>{msg.offer_data?.work_type}</div>
                            </div>
                            <div className={styles.messageCardSectionSm}>
                              <Text type="secondary">Предмет</Text>
                              <div>{msg.offer_data?.subject}</div>
                            </div>
                            <div className={styles.messageCardSection}>
                              <Text type="secondary">Описание</Text>
                              <div className={styles.messageCardDescription}>{msg.offer_data?.description}</div>
                            </div>
                            <div className={styles.messageCardRow}>
                              <div>
                                <Text type="secondary">Стоимость</Text>
                                <div className={styles.messageCardPrice}>
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
                              <div className={styles.messageStatusSuccess}>
                                <CheckCircleOutlined /> Предложение принято
                              </div>
                            ) : offerStatus === 'rejected' ? (
                              <div className={styles.messageStatusDanger}>
                                <CloseCircleOutlined /> Предложение отклонено
                              </div>
                            ) : offerExpired ? (
                              <div className={styles.messageStatusMuted}>Срок предложения истек</div>
                            ) : showOfferActions ? (
                              <div className={styles.messageCardActions}>
                                <Button
                                  type="primary"
                                  className={styles.buttonSuccess}
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
                              <div className={styles.messageStatusMuted}>Ожидает решения получателя</div>
                            )}

                            <div className={styles.messageCardTime}>
                              <Text type="secondary" className={styles.messageCardTimeText}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
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
                                <div className={styles.messageCardDescription}>
                                  {(msg.offer_data as WorkOfferData | null)?.description}
                                </div>
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
                              <div className={styles.messageStatusDanger}>
                                <CloseCircleOutlined /> Предложение отклонено
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'accepted' ? (
                              <div className={styles.messageStatusSuccess}>
                                <CheckCircleOutlined /> Работа принята
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'rejected' ? (
                              <div className={styles.messageStatusDanger}>
                                <CloseCircleOutlined /> Работа отклонена
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'delivered' ? (
                              <div className={styles.messageStatusInfo}>
                                Работа отправлена, ожидает решения покупателя
                              </div>
                            ) : workOfferStatus === 'accepted' && workDeliveryStatus === 'awaiting_upload' ? (
                              <div className={styles.messageStatusInfo}>
                                Ожидается отправка работы экспертом
                              </div>
                            ) : (
                              <div className={styles.messageStatusMuted}>Ожидает решения покупателя</div>
                            )}

                            {showWorkOfferActions ? (
                              <div className={`${styles.messageCardActions} ${styles.messageCardActionsTop}`}>
                                <Button
                                  type="primary"
                                  className={styles.buttonSuccess}
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
                                <Button
                                  type="primary"
                                  className={styles.buttonSuccess}
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

                            <div className={styles.messageCardTime}>
                              <Text type="secondary" className={styles.messageCardTimeText}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                            </div>
                          </Card>
                        ) : (
                          <>
                            {msg.text ? (
                              <Text
                                className={`${styles.messageText} ${isMobile ? styles.messageTextMobile : ''} ${
                                  msg.is_mine ? styles.messageTextMine : styles.messageTextOther
                                }`}
                              >
                                {msg.text}
                              </Text>
                            ) : null}
                            {msg.file_url && msg.file_name ? (
                              <div className={`${styles.messageFile} ${msg.text ? styles.messageFileWithText : ''}`}>
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${styles.messageFileLink} ${isMobile ? styles.messageFileLinkMobile : ''} ${
                                    msg.is_mine ? styles.messageFileLinkMine : styles.messageFileLinkOther
                                  }`}
                                >
                                  📎 {msg.file_name}
                                </a>
                              </div>
                            ) : null}
                            {showWorkActions ? (
                              <div className={styles.messageActions}>
                                <Button
                                  type="primary"
                                  className={styles.buttonSuccess}
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
                            <Text
                              className={`${styles.messageTime} ${isMobile ? styles.messageTimeMobile : ''} ${
                                msg.is_mine ? styles.messageTimeMine : styles.messageTimeOther
                              }`}
                            >
                              {formatMessageTime(msg.created_at)}
                              {msg.is_mine && (
                                <span
                                  className={`${styles.messageReadStatus} ${
                                    msg.is_read ? styles.messageReadStatusRead : styles.messageReadStatusUnread
                                  }`}
                                >
                                  {msg.is_read ? (
                                    <span
                                      className={`${styles.messageReadIcons} ${
                                        isMobile ? styles.messageReadIconsMobile : styles.messageReadIconsDesktop
                                      }`}
                                    >
                                      <CheckOutlined
                                        className={`${styles.messageReadCheck} ${styles.messageReadCheckFirst} ${
                                          isMobile ? styles.messageReadCheckMobile : styles.messageReadCheckDesktop
                                        }`}
                                      />
                                      <CheckOutlined
                                        className={`${styles.messageReadCheck} ${styles.messageReadCheckSecond} ${
                                          isMobile ? styles.messageReadCheckSecondMobile : styles.messageReadCheckSecondDesktop
                                        } ${isMobile ? styles.messageReadCheckMobile : styles.messageReadCheckDesktop}`}
                                      />
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
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className={`${styles.chatEmptyState} ${isMobile ? styles.chatEmptyStateMobile : ''}`}>
                <MessageOutlined className={`${styles.chatEmptyStateIcon} ${isMobile ? styles.chatEmptyStateIconMobile : ''}`} />
                Выберите чат для начала общения
              </div>
            )}
          </div>

          
          {selectedChat && selectedChat.is_frozen !== true && (
            <div 
              key={`chat-input-${selectedChat.id}-${selectedChat.is_frozen}`}
              className={`${styles.chatInputContainer} ${isMobile ? styles.chatInputContainerMobile : ''}`}
              style={{ 
                display: selectedChat?.is_frozen === true ? 'none' : 'block'
              }}
            >
              
              {isSupportChatSelected && (
                <div className={`${styles.claimCarouselWrapper} ${isMobile ? styles.claimCarouselWrapperMobile : ''}`}>
                  <div className={styles.claimCarouselTrack}>
                    
                    {[...claimCategories, ...claimCategories].map((category, index) => (
                      <Button
                        key={index}
                        type="default"
                        size="small"
                        onClick={() => {
                          setSelectedClaimCategory(category);
                          setClaimModalOpen(true);
                        }}
                        className={`${styles.claimCarouselButton} ${isMobile ? styles.claimCarouselButtonMobile : ''}`}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div 
                className={`${styles.chatInputRow} ${isMobile ? styles.chatInputRowMobile : ''}`}
                style={{ 
                  display: selectedChat?.is_frozen === true ? 'none' : 'flex'
                }}
              >
                <div className={styles.chatInputField}>
                  <Input.TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    autoSize={{ minRows: isMobile ? 1 : 1, maxRows: isMobile ? 4 : 4 }}
                    className={`${styles.chatInput} ${isMobile ? styles.chatInputMobile : ''}`}
                    style={{ 
                      display: selectedChat?.is_frozen === true ? 'none' : 'block'
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
                
                <div className={`${styles.chatInputActions} ${isMobile ? styles.chatInputActionsMobile : ''}`}>
                  
                  <Upload
                    beforeUpload={handleFileSelect}
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
                      (!messageText.trim() && attachedFiles.length === 0) ? styles.chatSendButtonDisabled : ''
                    }`}
                    onClick={sendMessage}
                    loading={sending}
                    disabled={!messageText.trim() && attachedFiles.length === 0}
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
                        onClick={() => removeAttachedFile(file)}
                        icon={<span className={styles.attachedFileRemoveIcon}>×</span>}
                        className={styles.attachedFileRemoveButton}
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
        destroyOnHidden
        width={isMobile ? '90%' : 520}
      >
        <div className={styles.simpleModalContent}>
          <Text type="secondary">Выберите новый дедлайн</Text>
          <DatePicker
            showTime
            className={styles.fullWidth}
            value={overdueDeadlineValue}
            onChange={(v) => setOverdueDeadlineValue(v)}
            format="DD.MM.YYYY HH:mm"
          />
        </div>
      </Modal>
      
      
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
          <div className={styles.claimModalTitle}>
            <ExclamationCircleOutlined className={styles.claimModalTitleIcon} />
            Подача претензии
          </div>
        }
        destroyOnHidden
        width={isMobile ? '90%' : 600}
      >
        <div className={styles.claimModalContent}>
          <div className={styles.claimWarningBox}>
            <Text className={styles.claimWarningText}>
              Претензия будет отправлена в техническую поддержку для рассмотрения. 
              Опишите подробно суть вашей проблемы.
            </Text>
          </div>
          
          
          <div>
            <Text className={styles.formLabel}>
              Категория претензии *
            </Text>
            <Select
              value={selectedClaimCategory || undefined}
              onChange={(value) => {
                setSelectedClaimCategory(value);

                if (value !== 'Заказ не выполнен') {
                  setOrderRelevance('');
                  setRefundType('');
                }
              }}
              placeholder="Выберите категорию претензии"
              size="large"
              className={styles.fullWidth}
              options={claimCategories.map(category => ({
                label: category,
                value: category
              }))}
            />
          </div>
          
          
          {selectedClaimCategory === 'Заказ не выполнен' && (
            <>
              <div>
                <Text className={styles.formLabel}>
                  Актуальность заказа *
                </Text>
                <Select
                  value={orderRelevance || undefined}
                  onChange={(value) => setOrderRelevance(value)}
                  placeholder="Выберите актуальность заказа"
                  size="large"
                  className={styles.fullWidth}
                  options={[
                    { label: 'Заказ актуален', value: 'Заказ актуален' },
                    { label: 'Заказ не актуален', value: 'Заказ не актуален' }
                  ]}
                />
              </div>
              
              <div>
                <Text className={styles.formLabel}>
                  Возврат средств *
                </Text>
                <Select
                  value={refundType || undefined}
                  onChange={(value) => setRefundType(value)}
                  placeholder="Выберите тип возврата средств"
                  size="large"
                  className={styles.fullWidth}
                  options={[
                    { label: 'Возврат предоплаты', value: 'Возврат предоплаты' },
                    { label: 'Возврат предоплаты и неустойка', value: 'Возврат предоплаты и неустойка' },
                    { label: 'Возврат средств не требуется', value: 'Возврат средств не требуется' }
                  ]}
                />
              </div>
            </>
          )}
          
          
          <div>
            <Text className={styles.formLabel}>
              Описание претензии *
            </Text>
            <Input.TextArea
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Опишите подробно суть проблемы, укажите детали ситуации..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              maxLength={1000}
              showCount
              className={styles.claimTextArea}
            />
          </div>
          
          
          <div>
            <Text className={styles.formLabel}>
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
                className={styles.fullWidth}
              >
                Выбрать файлы
              </Button>
            </Upload>
            
            {claimFiles.length > 0 && (
              <div className={styles.claimFiles}>
                {claimFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className={styles.claimFileItem}
                  >
                    <FileOutlined className={styles.claimFileIcon} />
                    <Text
                      className={styles.claimFileName}
                      ellipsis
                    >
                      {file.name}
                    </Text>
                    <Text className={styles.claimFileSize}>
                      {(file.size / 1024 / 1024).toFixed(2)} МБ
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => removeClaimFile(file)}
                      className={styles.claimFileRemoveButton}
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
        destroyOnHidden
      >
        <div className={styles.simpleModalContent}>
          <div>
            <Text className={styles.formLabelSmall}>Оценка</Text>
            <Rate value={reviewRating} onChange={(v) => setReviewRating(v)} />
          </div>
          <div>
            <Text className={styles.formLabelSmall}>Комментарий</Text>
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
        destroyOnHidden
      >
        <div className={styles.simpleModalContent}>
          <div>
            <Text className={styles.formLabelSmall}>Оценка</Text>
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
