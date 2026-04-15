import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Input, Button, Avatar, Badge, Space, Typography, message as antMessage, Spin, Upload, Card, Rate, Tabs, Select, Carousel, DatePicker, Dropdown, Popover, MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
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
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  MoreOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DownOutlined,
  UpOutlined,
  MenuOutlined,
  DollarOutlined,
  PercentageOutlined,
  PushpinOutlined,
  PushpinFilled,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { SmileOutlined } from '@ant-design/icons';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import dayjs, { type Dayjs } from 'dayjs';
import { chatApi, ChatListItem, ChatDetail, Message, ChatFrozenError } from '@/features/support/api/chat';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getMediaUrl } from '../../../config/api';
import { IndividualOfferModal } from '@/features/orders';
import { ordersApi } from '@/features/orders/api/orders';
import { expertsApi } from '@/features/expert/api/experts';
import { SupportCenterPanel } from '@/features/support/components/SupportCenterPanel';
import { ROUTES } from '@/utils/constants';
import styles from './MessageModalNew.module.css';
import '../../../styles/messages.css';
import '../../../styles/avatar.css';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';

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
  prepayment_percent?: number;
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
  is_frozen?: boolean | null;
  frozen_reason?: string | null;
  frozen_at?: string | null;
  client?: { id?: number | null } | null;
  client_id?: number | null;
  expert?: { id?: number | null } | null;
  expert_id?: number | null;
  subject?: { name?: string | null } | null;
  work_type?: { name?: string | null } | null;
  custom_subject?: string | null;
  custom_work_type?: string | null;
  files?: Array<{ id: number; file_name: string; file_url: string; file_type?: string }>;
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

const truncateFileName = (name: string, maxLength: number = 20) => {
  if (name.length <= maxLength) return name;
  const extIndex = name.lastIndexOf('.');
  if (extIndex === -1) return name.substring(0, maxLength) + '...';
  
  const ext = name.substring(extIndex);
  const nameWithoutExt = name.substring(0, extIndex);
  
  // Reserve space for extension and ellipsis
  const availableLength = maxLength - ext.length - 3; 
  if (availableLength <= 0) return name.substring(0, maxLength) + '...';
  
  return nameWithoutExt.substring(0, availableLength) + '...' + ext;
};

const getFileIconByName = (fileName?: string | null) => {
  const value = String(fileName || '').toLowerCase();
  if (!value) return <FileOutlined />;
  if (value.endsWith('.pdf')) return <FilePdfOutlined />;
  if (value.endsWith('.doc') || value.endsWith('.docx')) return <FileWordOutlined />;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg') || value.endsWith('.png') || value.endsWith('.webp') || value.endsWith('.gif')) return <FileImageOutlined />;
  if (value.endsWith('.zip') || value.endsWith('.rar') || value.endsWith('.7z')) return <FileZipOutlined />;
  return <FileOutlined />;
};

const normalizeMessageText = (value: string): string => value.normalize('NFC');

const hasVisibleMessageContent = (value: string): boolean => {
  const normalized = normalizeMessageText(value);
  const stripped = normalized
    .replace(/\s+/gu, '')
    .replace(/\u200B|\u200C|\u200D/gu, '')
    .replace(/\uFE0E/gu, '')
    .replace(/\uFE0F/gu, '')
    .replace(/\p{Emoji_Modifier}/gu, '')
    .replace(/\u20E3/gu, '');
  return stripped.length > 0;
};

type DeviceEmojiFamily = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'other';
type EmojiVersionLevel = '12.0' | '13.0' | '14.0' | '15.0';

const detectDeviceEmojiFamily = (): DeviceEmojiFamily => {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
};

const emojiVersionRank: Record<EmojiVersionLevel, number> = {
  '12.0': 12,
  '13.0': 13,
  '14.0': 14,
  '15.0': 15,
};

const clampEmojiVersion = (target: EmojiVersionLevel, detected: EmojiVersionLevel): EmojiVersionLevel =>
  emojiVersionRank[detected] <= emojiVersionRank[target] ? detected : target;

const isEmojiRenderable = (emoji: string): boolean => {
  if (typeof document === 'undefined') return true;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;

  const render = (symbol: string): Uint8ClampedArray => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'top';
    ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(symbol, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };

  const sample = render(emoji);
  const fallback = render('\uFFFD');

  for (let i = 0; i < sample.length; i += 1) {
    if (sample[i] !== fallback[i]) return true;
  }
  return false;
};

const resolveEmojiVersionByDevice = (family: DeviceEmojiFamily): EmojiVersionLevel => {
  const targetByFamily: Record<DeviceEmojiFamily, EmojiVersionLevel> = {
    ios: '15.0',
    android: '14.0',
    windows: '13.0',
    mac: '15.0',
    linux: '13.0',
    other: '13.0',
  };

  const target = targetByFamily[family];
  if (isEmojiRenderable('🩷')) return clampEmojiVersion(target, '15.0');
  if (isEmojiRenderable('🫶')) return clampEmojiVersion(target, '14.0');
  if (isEmojiRenderable('🥲')) return clampEmojiVersion(target, '13.0');
  return '12.0';
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
  userProfile
}) => {
  const navigate = useNavigate();
  
  const [messageText, setMessageText] = useState<string>('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [supportCenterSelected, setSupportCenterSelected] = useState(false);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragOverChat, setIsDragOverChat] = useState(false);
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
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimText, setClaimText] = useState<string>('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [showClaimCategories, setShowClaimCategories] = useState(false);
  const [selectedClaimCategory, setSelectedClaimCategory] = useState<string>('');
  const [claimFiles, setClaimFiles] = useState<File[]>([]);
  const [expertViolationModalOpen, setExpertViolationModalOpen] = useState(false);
  const [lastViolationOrderId, setLastViolationOrderId] = useState<number | null>(null);
  const [overdueExtendModalOpen, setOverdueExtendModalOpen] = useState(false);
  const [overdueDeadlineValue, setOverdueDeadlineValue] = useState<Dayjs | null>(null);
  const [overdueExtending, setOverdueExtending] = useState(false);
  const [overdueCancelling, setOverdueCancelling] = useState(false);
  const [orderRelevance, setOrderRelevance] = useState<string>(''); 
  const [refundType, setRefundType] = useState<string>(''); 
  const [contextChat, setContextChat] = useState<{ userId: number; title: string } | null>(null);
  const [orderIntroByChatId, setOrderIntroByChatId] = useState<Record<number, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<any>(null);
  const workFileInputRef = useRef<HTMLInputElement>(null);
  const workOfferFileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  // WebSocket для real-time обновлений чата
  const handleNewMessage = useCallback((wsMessage: any) => {
    if (!selectedChat) return;
    
    // Добавляем новое сообщение в текущий чат
    const newMsg: Message = {
      id: wsMessage.id,
      sender: wsMessage.sender || { id: wsMessage.sender_id, username: '', first_name: '', last_name: '' },
      sender_id: wsMessage.sender?.id,
      text: wsMessage.text,
      message_type: wsMessage.message_type,
      created_at: wsMessage.created_at,
      is_read: wsMessage.is_read,
      is_mine: false,
      file_name: wsMessage.file_name ?? null,
      file_url: wsMessage.file_url ?? null,
    };

    setSelectedChat((prev) => {
      if (!prev || prev.id !== selectedChat.id) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), newMsg],
      };
    });

    // Обновляем список чатов (последнее сообщение)
    setChatList((prev) => {
      return prev.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;
        return {
          ...chat,
          last_message: {
            text: wsMessage.text,
            sender_id: wsMessage.sender?.id,
            created_at: wsMessage.created_at,
            file_name: wsMessage.file_name ?? null,
            file_url: wsMessage.file_url ?? null,
          },
          last_message_time: wsMessage.created_at,
        };
      });
    });

    // Автоскролл вниз
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [selectedChat]);

  const { isConnected: wsConnected } = useChatWebSocket(
    selectedChat?.id ?? null,
    handleNewMessage
  );

  const emojiVersion = useMemo<EmojiVersionLevel>(() => {
    const family = detectDeviceEmojiFamily();
    return resolveEmojiVersionByDevice(family);
  }, []);
  
  
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

    const loadChats = useCallback(async (silent: boolean = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await chatApi.getAll();
        // Удаляем дубликаты чатов по other_user.id, оставляя самый последний
        const uniqueChatsMap = new Map<number, ChatListItem>();
        data.forEach((chat) => {
          const otherUserId = chat.other_user?.id;
          if (!otherUserId) {
            // Если other_user.id отсутствует, используем chat.id как ключ
            uniqueChatsMap.set(chat.id, chat);
            return;
          }
          const existing = uniqueChatsMap.get(otherUserId);
          if (!existing) {
            uniqueChatsMap.set(otherUserId, chat);
          } else {
            // Оставляем чат с более поздним last_message_time
            const existingTime = new Date(existing.last_message_time || 0).getTime();
            const newTime = new Date(chat.last_message_time || 0).getTime();
            if (newTime > existingTime) {
              uniqueChatsMap.set(otherUserId, chat);
            }
          }
        });
        const deduplicatedData = Array.from(uniqueChatsMap.values());
      
        setChatList((prev) => {
          if (!Array.isArray(prev) || prev.length !== deduplicatedData.length) return deduplicatedData;

          const prevById = new Map(prev.map((chat) => [chat.id, chat]));
          let changed = false;
          const merged = deduplicatedData.map((nextChat) => {
            const prevChat = prevById.get(nextChat.id);
            if (!prevChat) {
              changed = true;
              return nextChat;
            }

            const prevLast = prevChat.last_message;
            const nextLast = nextChat.last_message;
            const isSameLastMessage =
              prevLast?.created_at === nextLast?.created_at &&
              prevLast?.text === nextLast?.text &&
              prevLast?.sender_id === nextLast?.sender_id &&
              prevLast?.file_name === nextLast?.file_name &&
              prevLast?.file_url === nextLast?.file_url;

            const isSameChat =
              prevChat.unread_count === nextChat.unread_count &&
              prevChat.last_message_time === nextChat.last_message_time &&
              prevChat.order_id === nextChat.order_id &&
              prevChat.order === nextChat.order &&
              prevChat.is_frozen === nextChat.is_frozen &&
              prevChat.frozen_reason === nextChat.frozen_reason &&
              prevChat.is_pinned === nextChat.is_pinned &&
              isSameLastMessage;

            if (isSameChat) return prevChat;
            changed = true;
            return nextChat;
          });

          return changed ? merged : prev;
        });
      } catch (error: unknown) {
        if (!silent) antMessage.error('Не удалось загрузить чаты');
      } finally {
        if (!silent) setLoading(false);
      }
    }, []);

  const syncChatListItemFromDetail = useCallback((detail: ChatDetail) => {
    const lastMessage = Array.isArray(detail.messages) && detail.messages.length > 0
      ? detail.messages[detail.messages.length - 1]
      : null;

    setChatList((prev) => {
      let changed = false;
      const next = prev.map((chat) => {
        if (chat.id !== detail.id) return chat;

        const nextLastMessage = lastMessage
          ? {
              text: lastMessage.text,
              sender_id: lastMessage.sender_id,
              created_at: lastMessage.created_at,
              file_name: lastMessage.file_name ?? null,
              file_url: lastMessage.file_url ?? null,
            }
          : null;

        const nextLastMessageTime = lastMessage?.created_at || chat.last_message_time;
        const nextUnread = detail.unread_count ?? chat.unread_count;
        const nextOrderId = detail.order_id ?? chat.order_id;
        const nextOrder = detail.order ?? chat.order;

        const isSameLastMessage =
          chat.last_message?.created_at === nextLastMessage?.created_at &&
          chat.last_message?.text === nextLastMessage?.text &&
          chat.last_message?.sender_id === nextLastMessage?.sender_id &&
          (chat.last_message?.file_name ?? null) === (nextLastMessage?.file_name ?? null) &&
          (chat.last_message?.file_url ?? null) === (nextLastMessage?.file_url ?? null);

        const isSameChat =
          chat.unread_count === nextUnread &&
          chat.last_message_time === nextLastMessageTime &&
          chat.order_id === nextOrderId &&
          chat.order === nextOrder &&
          chat.is_frozen === detail.is_frozen &&
          chat.frozen_reason === detail.frozen_reason &&
          isSameLastMessage;

        if (isSameChat) return chat;
        changed = true;
        return {
          ...chat,
          unread_count: nextUnread,
          order_id: nextOrderId,
          order: nextOrder,
          is_frozen: detail.is_frozen,
          frozen_reason: detail.frozen_reason,
          last_message: nextLastMessage,
          last_message_time: nextLastMessageTime,
        };
      });

      return changed ? next : prev;
    });
  }, []);

  const loadChatDetail = useCallback(async (chatId: number) => {
    try {
      const data = await chatApi.getById(chatId);
      await hydrateClosedOrdersForChat(data);
      setSelectedChat((prev) => {
        if (!prev || prev.id !== data.id) return data;
        const prevMessages = Array.isArray(prev.messages) ? prev.messages : [];
        const nextMessages = Array.isArray(data.messages) ? data.messages : [];
        const prevLastId = prevMessages[prevMessages.length - 1]?.id;
        const nextLastId = nextMessages[nextMessages.length - 1]?.id;

        const same =
          prevMessages.length === nextMessages.length &&
          prevLastId === nextLastId &&
          prev.unread_count === data.unread_count &&
          prev.order_id === data.order_id &&
          prev.order === data.order &&
          prev.is_frozen === data.is_frozen &&
          prev.frozen_reason === data.frozen_reason;

        return same ? prev : data;
      });
      syncChatListItemFromDetail(data);
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
            `Срок сдачи: ${deadlineText}`,
          ].join('\n');

          setOrderIntroByChatId((prev) => ({ ...prev, [chatId]: infoText }));
        } catch {
          setOrderIntroByChatId((prev) => ({ ...prev, [chatId]: `Этот чат по теме: Заказ #${orderIdFromContext}` }));
        }
      }
      const hasUnreadIncomingMessages = Array.isArray(data.messages)
        ? data.messages.some((msg) => !msg.is_mine && !msg.is_read)
        : false;

      if (hasUnreadIncomingMessages) {
        await chatApi.markAsRead(chatId);
        setSelectedChat((prev) =>
          prev && prev.id === chatId
            ? {
                ...prev,
                unread_count: 0,
                messages: Array.isArray(prev.messages)
                  ? prev.messages.map((msg) =>
                      msg.is_mine ? msg : { ...msg, is_read: true }
                    )
                  : prev.messages,
              }
            : prev
        );
        setChatList((prev) => {
          let changed = false;
          const next = prev.map((chat) => {
            if (chat.id !== chatId || chat.unread_count === 0) return chat;
            changed = true;
            return { ...chat, unread_count: 0 };
          });
          return changed ? next : prev;
        });
      }
      return data;
    } catch (error: unknown) {
      antMessage.error('Не удалось загрузить чат');
      return null;
    }
  }, [hydrateClosedOrdersForChat, syncChatListItemFromDetail]);

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
            `Срок сдачи: ${deadlineText}`,
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
    console.log('🔧 loadOrCreateChatWithUser called with userId:', userId, 'chatContextTitle:', chatContextTitle);
    setLoading(true);
    try {
      const chatData = await chatApi.getOrCreateByUser(userId, chatContextTitle);
      console.log('🔧 Chat data received:', chatData);
      await hydrateClosedOrdersForChat(chatData);
      setSelectedChat(chatData);
      console.log('🔧 Selected chat set to:', chatData);
      await loadChats();
    } catch (error: unknown) {
      console.error('🔧 Error in loadOrCreateChatWithUser:', error);
      antMessage.error('Не удалось открыть чат с пользователем');
    } finally {
      setLoading(false);
    }
  }, [chatContextTitle, hydrateClosedOrdersForChat, loadChats]);

  useEffect(() => {
    if (visible) {
      loadChats();

      if (selectedOrderId && selectedUserId) {
        loadOrCreateChatByOrderAndUser(selectedOrderId, selectedUserId);
        return;
      }

      if (selectedUserId) {
        loadOrCreateChatWithUser(selectedUserId);
      }
    }
  }, [visible, selectedUserId, selectedOrderId, loadChats, loadOrCreateChatByOrderAndUser, loadOrCreateChatWithUser]);

    // Initial load of chat detail
  useEffect(() => {
    if (!visible || !selectedChat?.id) return;
    loadChatDetail(selectedChat.id);
  }, [visible, selectedChat?.id, loadChatDetail]);

        // WebSocket handles real-time message updates.
        // No polling needed for messages anymore.

    // Polling for chat list every 30 seconds (reduced from 10s to prevent flickering)
    useEffect(() => {
    if (!visible) return;
    // Don't poll if document is hidden
    if (document.hidden) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled || document.hidden) return;
      await loadChats(true);
    };
    const id = window.setInterval(poll, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [visible, loadChats]);

  useEffect(() => {
    const handleOpenSupportCenter = () => {
      setSupportCenterSelected(true);
      setSelectedChat(null);
    };

    window.addEventListener('openSupportCenter', handleOpenSupportCenter);
    return () => window.removeEventListener('openSupportCenter', handleOpenSupportCenter);
  }, []);

    // Обработчик события для открытия чата по userId (после назначения исполнителя)
  useEffect(() => {
    const handleOpenChatById = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const chatId = customEvent.detail?.chatId;
      const userId = customEvent.detail?.userId;
    
      console.log('🔧 handleOpenChatById triggered, visible:', visible, 'chatId:', chatId, 'userId:', userId);
    
      // Если передан chatId, используем его
      if (chatId) {
        try {
          setLoading(true);
          const chatData = await chatApi.getById(chatId);
          await hydrateClosedOrdersForChat(chatData);
          setSelectedChat(chatData);
          console.log('🔧 Chat loaded by ID:', chatData);
          await loadChats();
          
          // Извлекаем order_id из сообщений с принятым оффером и открываем панель заказа
          const orderIdFromAcceptedOffer = (() => {
            const messages = chatData?.messages;
            if (!Array.isArray(messages) || messages.length === 0) return null;
            for (let i = messages.length - 1; i >= 0; i--) {
              const m = messages[i];
              if (m?.message_type === 'offer' && m.offer_data?.status === 'accepted') {
                const id = toPositiveNumber(m.offer_data?.order_id);
                if (id) return id;
              }
            }
            return null;
          })();
          
          if (orderIdFromAcceptedOffer) {
            console.log('🔧 Found order_id from accepted offer:', orderIdFromAcceptedOffer);
            setActiveOrderId(orderIdFromAcceptedOffer);
            setOrderPanelOpen(true);
          }
        } catch (error: unknown) {
          console.error('🔧 Error in handleOpenChatById (by chatId):', error);
          antMessage.error('Не удалось открыть чат');
        } finally {
          setLoading(false);
        }
        return;
      }
    
      // Если передан userId, создаем/открываем чат с этим пользователем
      if (userId) {
        try {
          setLoading(true);
          await loadOrCreateChatWithUser(userId);
          console.log('🔧 Chat opened with userId:', userId);
        } catch (error: unknown) {
          console.error('🔧 Error in handleOpenChatById (by userId):', error);
          antMessage.error('Не удалось открыть чат');
        } finally {
          setLoading(false);
        }
        return;
      }
    
      console.error('🔧 No chatId or userId provided to handleOpenChatById');
    };

    window.addEventListener('openChatById', handleOpenChatById);
    return () => {
      window.removeEventListener('openChatById', handleOpenChatById);
    };
  }, [visible, hydrateClosedOrdersForChat, loadChats, loadOrCreateChatWithUser, toPositiveNumber]);

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

  const formatRemaining = (deadline?: string, status?: string, isFrozen?: boolean | null) => {
    if (isFrozen) return 'Срок заморожен';
    if (status === 'review') return 'На проверке';
    if (!deadline) return '';
    const baseEnd = new Date(deadline).getTime();
    // const reviewExtraMs = status === 'review' ? 5 * 24 * 60 * 60 * 1000 : 0;
    // const end = baseEnd + reviewExtraMs;
    const end = baseEnd; // Пока без учета reviewExtraMs, если нужно - раскомментировать
    if (Number.isNaN(end)) return '';
    
    const diff = end - Date.now();
    if (diff <= 0) return 'Срок истёк';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const dd = String(days).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    
    if (days > 0) {
      return `Осталось: ${dd} д. ${hh}:${mm}:${ss}`;
    }
    return `Осталось: ${hh}:${mm}:${ss}`;
  };

  const isDeadlineExpired = (deadline?: string | null, isFrozen?: boolean | null) => {
    if (isFrozen) return false;
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

    // Обновляем таймер каждую секунду для отображения секунд
    setDeadlineTick((v) => v + 1);
    const id = window.setInterval(() => setDeadlineTick((v) => v + 1), 1000);
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

    const currentUserId = useMemo(() => {
    const profileId = Number((userProfile as { id?: unknown } | undefined)?.id);
    if (Number.isFinite(profileId) && profileId > 0) return profileId;
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
  }, [userProfile]);
  
  const isChatInitiator = useMemo(() => {
    if (!selectedChat) return false;
    const chatClientId =
      (selectedChat as { client?: { id?: unknown } | null; client_id?: unknown } | null)?.client?.id ??
      (selectedChat as { client_id?: unknown } | null)?.client_id;
    if (chatClientId) return Number(chatClientId) === currentUserId;
    const chatExpertId =
      (selectedChat as { expert?: { id?: unknown } | null; expert_id?: unknown } | null)?.expert?.id ??
      (selectedChat as { expert_id?: unknown } | null)?.expert_id;
    if (chatExpertId && currentUserId > 0) return Number(chatExpertId) !== currentUserId;
    return false;
  }, [selectedChat, currentUserId]);
  
  const isChatExpert = useMemo(() => {
    if (!selectedChat) return false;
    const chatExpertId =
      (selectedChat as { expert?: { id?: unknown } | null; expert_id?: unknown } | null)?.expert?.id ??
      (selectedChat as { expert_id?: unknown } | null)?.expert_id;
    if (chatExpertId) return Number(chatExpertId) === currentUserId;
    const chatClientId =
      (selectedChat as { client?: { id?: unknown } | null; client_id?: unknown } | null)?.client?.id ??
      (selectedChat as { client_id?: unknown } | null)?.client_id;
    if (chatClientId && currentUserId > 0) return Number(chatClientId) !== currentUserId;
    const otherRole = String(selectedChat.other_user?.role ?? '').trim().toLowerCase();
    return otherRole === 'client';
  }, [selectedChat, currentUserId]);
  
  const currentUserRole = useMemo(() => {
    const roleFromProfile = String(userProfile?.role ?? '').trim().toLowerCase();
    if (roleFromProfile) return roleFromProfile;
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw) as { role?: unknown };
      return String(parsed?.role ?? '').trim().toLowerCase();
    } catch {
      return '';
    }
  }, [userProfile]);
    const isGlobalExpert = currentUserRole === 'expert';
  const canUseExpertOfferButtons = isGlobalExpert && isChatExpert && !isChatInitiator;
  
  const isOrderClient = useMemo(() => {
    // Если заказ загружен, проверяем по ID клиента заказа
    const clientId = order?.client?.id ?? order?.client_id;
    if (clientId) return Number(clientId) === currentUserId;
    
    // Если заказ не загружен, но есть выбранный чат, проверяем инициатора чата
    // В большинстве случаев инициатор чата - это клиент
    if (selectedChat) return isChatInitiator;
    
    return false;
  }, [order?.client?.id, order?.client_id, currentUserId, selectedChat, isChatInitiator]);

  const isOrderExpert = useMemo(() => {
    // Если заказ загружен, проверяем, назначен ли этот пользователь исполнителем
    // (Поле expert в заказе может называться expert или expert_id)
    const expertId = (order as any)?.expert?.id ?? (order as any)?.expert_id;
    if (expertId) return Number(expertId) === currentUserId;

    if (selectedChat) return isChatExpert;
    return false;
  }, [order, currentUserId, selectedChat, isChatExpert]);

  const canOverdueClientActions = useMemo(() => {
    if (isClosedOrder || !order) return false;
    // Действия с просрочкой доступны только клиенту данного заказа
    if (!isOrderClient) return false;
    
    return isDeadlineExpired(order.deadline, order.is_frozen);
  }, [isClosedOrder, order, isOrderClient]);

  const showExpertUploadButton = useMemo(() => {
    // Кнопку видит ТОЛЬКО тот, кто является исполнителем (экспертом) в данном заказе
    if (!isOrderExpert) return false;

    // Если заказ не загружен или закрыт, тоже нет
    if (!order || isClosedOrder) return false;

    // Проверяем статус заказа: выгрузка возможна только "В работе" или "На доработке"
    const status = String(order?.status ?? '');
    return status === 'in_progress' || status === 'revision';
  }, [isOrderExpert, isClosedOrder, order]);

  const remainingLabel = useMemo(() => {
    void deadlineTick;
    if (isClosedOrder) return '';
    if (!order?.deadline) return '';
    return formatRemaining(order.deadline, order.status, order.is_frozen);
  }, [order?.deadline, order?.status, deadlineTick, isClosedOrder]);

  useEffect(() => {
    if (!visible) return;
    if (!order?.id) return;
    if (!isOrderClient) return;
    if (!order.is_frozen) return;
    if (lastViolationOrderId === order.id) return;
    setLastViolationOrderId(order.id);
    setExpertViolationModalOpen(true);
  }, [visible, order?.id, order?.is_frozen, isOrderClient, lastViolationOrderId]);

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

  const handleUploadWork = async (files: File[]) => {
    if (!selectedChat || !effectiveOrderId) return;
    if (!Array.isArray(files) || files.length === 0) return;
    if (isDeadlineExpired(order?.deadline)) {
      antMessage.error('Срок сдачи истёк');
      if (workFileInputRef.current) workFileInputRef.current.value = '';
      return;
    }
    setWorkUploading(true);
    try {
      const deliveryBatchId = `chat_delivery_batch_id:${Date.now()}`;
      const previouslyDeliveredFiles = Array.isArray(order?.files)
        ? order.files.filter((file: any) => {
            const fileType = String(file?.file_type || '').toLowerCase();
            return fileType === 'solution' || fileType === 'revision';
          })
        : [];
      if (previouslyDeliveredFiles.length > 0) {
        await Promise.all(
          previouslyDeliveredFiles
            .map((file: any) => Number(file?.id))
            .filter((fileId: number) => Number.isFinite(fileId) && fileId > 0)
            .map((fileId: number) => ordersApi.deleteOrderFile(effectiveOrderId, fileId))
        );
      }
      const uploadedFiles = [];
      for (const file of files) {
        const uploaded = await ordersApi.uploadOrderFile(effectiveOrderId, file, {
          file_type: 'solution',
          description: `chat_upload_order_id:${effectiveOrderId};${deliveryBatchId}`,
        });
        uploadedFiles.push({
          name: uploaded?.filename || uploaded?.file_name || file.name,
          url: uploaded?.file_url || uploaded?.file || '',
        });
      }
      await chatApi.sendMessage(
        selectedChat.id,
        'Работа отправлена на проверку',
        undefined,
        'work_delivery',
        { files: uploadedFiles.filter((f) => !!f.url) }
      );
      await ordersApi.submitOrder(effectiveOrderId);
      await Promise.all([loadChatDetail(selectedChat.id), loadChats(), refreshOrder()]);
      antMessage.success(files.length > 1 ? 'Работы отправлены на проверку' : 'Работа отправлена на проверку');
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

  const handleRequestRevision = () => {
    setRevisionModalOpen(true);
  };

  const handleConfirmRevision = async () => {
    if (!effectiveOrderId || !selectedChat) return;
    const comment = revisionComment.trim();
    if (!comment) {
      antMessage.warning('Добавьте комментарий для доработки');
      return;
    }
    try {
      setRevisionSubmitting(true);
      await ordersApi.requestRevision(effectiveOrderId, comment);
      await Promise.all([refreshOrder(), loadChats(), loadChatDetail(selectedChat.id)]);
      setRevisionModalOpen(false);
      setRevisionComment('');
      antMessage.success('Отправлено на доработку');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось отправить на доработку');
    } finally {
      setRevisionSubmitting(false);
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
    if (!hasVisibleMessageContent(messageText) && attachedFiles.length === 0) {
      antMessage.warning('Введите сообщение или прикрепите файл');
      return;
    }

    if (!selectedChat) {
      antMessage.error('Чат не выбран');
      return;
    }

    setSending(true);
    try {
      const textForFirst = normalizeMessageText(messageText).trim();
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
                  text: textForFirst || (attachedFiles.length > 0 ? `📎 ${attachedFiles.length} файл(ов)` : ''),
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
      
      const refreshedChat = await loadChatDetail(selectedChat.id);

      if (refreshedChat?.is_frozen) {
        antMessage.warning('Сообщение отклонено: переписка заморожена из-за проверки правил безопасности.');
      } else {
        antMessage.success('Сообщение отправлено');
      }
    } catch (error: unknown) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Обновляем данные чата в любом случае
      try {
        await Promise.all([
          loadChatDetail(selectedChat.id)
        ]);
      } catch (updateError) {
        console.error('Ошибка обновления данных чата:', updateError);
      }
      
      // Проверяем, если это ошибка заморозки чата
      if (error instanceof ChatFrozenError) {
        antMessage.error(error.frozenReason || error.message);
      } else {
        antMessage.error('Не удалось отправить сообщение');
      }
    } finally {
      setSending(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const currentText = messageText || '';
    const textArea = messageInputRef.current?.resizableTextArea?.textArea as HTMLTextAreaElement | undefined;
    if (textArea) {
      const start = textArea.selectionStart ?? currentText.length;
      const end = textArea.selectionEnd ?? currentText.length;
      const nextText = `${currentText.slice(0, start)}${emojiData.emoji}${currentText.slice(end)}`;
      setMessageText(nextText);
      setTimeout(() => {
        const position = start + emojiData.emoji.length;
        textArea.setSelectionRange(position, position);
        textArea.focus();
      }, 0);
    } else {
      setMessageText(`${currentText}${emojiData.emoji}`);
    }
    setEmojiPickerOpen(false);
  };

  const addAttachedFiles = useCallback((files: File[]) => {
    if (!Array.isArray(files) || files.length === 0) return;
    const maxSize = 10 * 1024 * 1024;
    const existing = new Set(attachedFiles.map((f) => `${f.name}_${f.size}`));
    const next: File[] = [];

    for (const file of files) {
      if (!file) continue;
      if (typeof file.size === 'number' && file.size <= 0) {
        antMessage.error(`Файл "${file.name}" пустой и не будет добавлен`);
        continue;
      }
      if (file.size > maxSize) {
        antMessage.error(`Файл "${file.name}" больше 10 МБ и не будет добавлен`);
        continue;
      }
      const key = `${file.name}_${file.size}`;
      if (existing.has(key) || next.some((f) => f.name === file.name && f.size === file.size)) {
        antMessage.warning(`Файл "${file.name}" уже прикреплен`);
        continue;
      }
      next.push(file);
    }

    if (next.length > 0) {
      setAttachedFiles((prev) => [...prev, ...next]);
      antMessage.success(
        next.length === 1
          ? `Файл "${next[0].name}" прикреплен`
          : `Прикреплено файлов: ${next.length}`
      );
    }
  }, [attachedFiles]);

  const handleFileSelect = (file: File) => {
    addAttachedFiles([file]);
    return false;
  };

  const handleChatDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedChat || selectedChat.is_frozen || order?.is_frozen || sending) return;
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOverChat(true);
  }, [selectedChat, order?.is_frozen, sending]);

  const handleChatDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedChat || selectedChat.is_frozen || order?.is_frozen || sending) return;
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverChat) setIsDragOverChat(true);
  }, [selectedChat, order?.is_frozen, sending, isDragOverChat]);

  const handleChatDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedChat || selectedChat.is_frozen || order?.is_frozen || sending) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOverChat(false);
    }
  }, [selectedChat, order?.is_frozen, sending]);

  const handleChatDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOverChat(false);
    if (!selectedChat || selectedChat.is_frozen || order?.is_frozen || sending) return;
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;
    addAttachedFiles(dropped);
  }, [selectedChat, order?.is_frozen, sending, addAttachedFiles]);

  const removeAttachedFile = (fileToRemove: File) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    antMessage.info('Файл удален');
  };

  useEffect(() => {
    if (!visible) {
      dragDepthRef.current = 0;
      setIsDragOverChat(false);
    }
  }, [visible]);

  const formatTimestamp = (dateString: string) => {
    try {
      const result = formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
      return result
        .replace(/меньше минуты/gi, '1 м')
        .replace(/(\d+)\s+минут(?:а|ы|у)?/gi, '$1 м');
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

    const safeChatList = useMemo(() => (Array.isArray(chatList) ? chatList : []), [chatList]);

  const supportAvatarSrc = '/assets/icons/support.png';

  const isSupportChatSelected = supportCenterSelected;

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
        : 'Чат будет удалён только для вас. У другого участника он останется, если он не удалит его у себя.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true, disabled: hasActiveOffersInSelectedChat, loading: deletingChat },
      onOk: async () => {
        setDeletingChat(true);
        try {
          await chatApi.deleteChat(selectedChat.id);
          setSelectedChat(null);
          await loadChats();
          antMessage.success('Чат удалён только для вас');
        } catch (error: unknown) {
          antMessage.error(getErrorDetail(error) || 'Не удалось удалить чат');
        } finally {
          setDeletingChat(false);
        }
      },
    });
  }, [deletingChat, hasActiveOffersInSelectedChat, loadChats, selectedChat]);

    const handleTogglePin = useCallback(async (chatId: number) => {
    try {
      // Сначала обновляем состояние локально для мгновенного отклика
      setChatList((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, is_pinned: !chat.is_pinned }
            : chat
        )
      );
      
      // Затем отправляем запрос на сервер
      await chatApi.togglePin(chatId);
      // Перезагружаем список для синхронизации с сервером (silent mode)
      await loadChats(true);
    } catch (error) {
      console.error('Ошибка закрепления чата:', error);
      // Откатываем изменение при ошибке
      setChatList((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, is_pinned: !chat.is_pinned }
            : chat
        )
      );
    }
  }, [loadChats]);

    const handleMarkAsUnread = useCallback(async (chatId: number) => {
      try {
        // Сначала получаем текущее состояние чата из локального состояния
        const currentChat = chatList.find(c => c.id === chatId);
        const currentUnread = currentChat?.unread_count ?? 0;
        const willMarkAsUnread = currentUnread === 0;
      
        // Обновляем состояние локально для мгновенного отклика
        setChatList((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? { ...c, unread_count: willMarkAsUnread ? 1 : 0 }
              : c
          )
        );
      
        // Затем отправляем запрос на сервер
        if (currentUnread > 0) {
          // Помечаем как прочитанный
          await chatApi.markAsRead(chatId);
          antMessage.success('Чат помечен как прочитанный');
        } else {
          // Помечаем как непрочитанный
          await chatApi.markAsUnread(chatId);
          antMessage.success('Чат помечен как непрочитанный');
        }
      
        // Перезагружаем список для синхронизации с сервером
        await loadChats(true);
      } catch (error) {
        console.error('Ошибка изменения статуса прочтения:', error);
        antMessage.error('Не удалось изменить статус чата');
        // Откатываем изменение при ошибке
        setChatList((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, unread_count: chat.unread_count > 0 ? 0 : 1 }
              : chat
          )
        );
      }
    }, [chatList, loadChats]);

  const openOverdueExtendModal = () => {
    setOverdueDeadlineValue(dayjs().add(1, 'day'));
    setOverdueExtendModalOpen(true);
  };

  const handleConfirmOverdueExtend = async () => {
    if (!effectiveOrderId) return;
    if (!overdueDeadlineValue) {
      antMessage.error('Выберите новый срок сдачи');
      return;
    }
    if (overdueDeadlineValue.valueOf() <= dayjs().valueOf()) {
      antMessage.error('Срок сдачи не может быть в прошлом');
      return;
    }

    setOverdueExtending(true);
    try {
      await ordersApi.extendDeadline(effectiveOrderId, overdueDeadlineValue.toISOString());
      setOverdueExtendModalOpen(false);
      await Promise.all([refreshOrder(), loadChats()]);
      antMessage.success('Срок сдачи продлён');
    } catch (error: unknown) {
      antMessage.error(getErrorDetail(error) || 'Не удалось продлить срок сдачи');
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
    onClose();
    navigate(`/support/claim-form?mode=arbitration&orderId=${effectiveOrderId}`);
  };

  const handleGoToOrder = useCallback(() => {
    if (!effectiveOrderId) return;
    const path = ROUTES.orders.detail.replace(':orderId', String(effectiveOrderId));
    onClose();
    navigate(path, {
      state: {
        from: `${window.location.pathname}${window.location.search}`,
        source: 'order-chat',
      },
    });
  }, [effectiveOrderId, navigate, onClose]);

  const handleContactSupport = useCallback(async () => {
    setSupportCenterSelected(true);
    setSelectedChat(null);
  }, []);

    const filteredChats = useMemo(() => safeChatList.filter(chat => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = chat.other_user?.username?.toLowerCase() || '';
      const lastMessage = chat.last_message?.text?.toLowerCase() || '';
      return userName.includes(query) || lastMessage.includes(query);
    }
    return true;
  }), [safeChatList, searchQuery]);
  
  const groupedMessages = useMemo(() => {
    if (!selectedChat?.messages) return [];
    
    const result: (Message & { attached_files?: { name: string; url: string }[] })[] = [];
    let currentGroup: (Message & { attached_files?: { name: string; url: string }[] }) | null = null;

    selectedChat.messages.forEach((msg) => {
      const isSimpleMessage = !msg.message_type || msg.message_type === 'text';
      const hasFile = !!(msg.file_url && msg.file_name);
      
      if (isSimpleMessage && hasFile) {
        if (currentGroup && 
            currentGroup.sender_id === msg.sender_id && 
            currentGroup.is_mine === msg.is_mine &&
            (currentGroup.attached_files?.length || 0) < 5 &&
            (new Date(msg.created_at).getTime() - new Date(currentGroup.created_at).getTime() < 60000)
           ) {
          
          if (!currentGroup.attached_files) {
             currentGroup.attached_files = [];
             if (currentGroup.file_url && currentGroup.file_name) {
               currentGroup.attached_files.push({ name: currentGroup.file_name, url: currentGroup.file_url });
             }
          }
          currentGroup.attached_files.push({ name: msg.file_name!, url: msg.file_url! });
          
          if (msg.text) {
             currentGroup.text = currentGroup.text ? `${currentGroup.text}\n${msg.text}` : msg.text;
          }
          return;
        } else {
             if (currentGroup) result.push(currentGroup);
             currentGroup = { ...msg, attached_files: [{ name: msg.file_name!, url: msg.file_url! }] };
             return;
        }
      }
      
      if (currentGroup) {
         result.push(currentGroup);
         currentGroup = null;
      }
      result.push(msg);
    });
    
    if (currentGroup) {
      result.push(currentGroup);
    }
    
    return result;
  }, [selectedChat?.messages]);
  const isChatFrozen = Boolean(selectedChat?.is_frozen || order?.is_frozen);

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
            {loading ? (
              <div className={styles.chatListLoading}>
                <Spin />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className={`${styles.chatListEmpty} ${isMobile ? styles.chatListEmptyMobile : ''}`}>
                <MessageOutlined className={`${styles.chatListEmptyIcon} ${isMobile ? styles.chatListEmptyIconMobile : ''}`} />
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const menuItems: MenuProps['items'] = [
                  {
                    key: 'pin',
                    icon: chat.is_pinned ? <PushpinFilled /> : <PushpinOutlined />,
                    label: chat.is_pinned ? 'Открепить' : 'Закрепить',
                    onClick: () => handleTogglePin(chat.id),
                  },
                  {
                    key: 'unread',
                    icon: chat.unread_count > 0 ? <EyeOutlined /> : <EyeInvisibleOutlined />,
                    label: chat.unread_count > 0 ? 'Пометить прочитанным' : 'Пометить непрочитанным',
                    onClick: () => handleMarkAsUnread(chat.id),
                  },
                ];

                const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                };

                return (
                  <Dropdown
                    key={chat.id}
                    menu={{ items: menuItems }}
                    trigger={['contextMenu']}
                  >
                    <div
                      onClick={() => {
                        setSupportCenterSelected(false);
                        loadChatDetail(chat.id);
                      }}
                      onContextMenu={handleContextMenu}
                      className={`${styles.chatListItem} ${isMobile ? styles.chatListItemMobile : ''} ${selectedChat?.id === chat.id ? styles.chatListItemSelected : ''} ${chat.unread_count > 0 ? styles.chatListItemUnread : ''} ${chat.is_pinned ? styles.chatListItemPinned : ''}`}
                    >
                      {chat.is_pinned && (
                        <PushpinFilled className={styles.chatListItemPinIcon} />
                      )}
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
                            ellipsis
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
                  </Dropdown>
                );
              })
            )}
          </div>
        </div>

        
        <div 
          key={selectedChat ? `chat-${selectedChat.id}` : (isSupportChatSelected ? 'support-center' : 'no-chat')}
          className={`${styles.chatPanel} ${(!selectedChat && !isSupportChatSelected && isMobile) ? styles.chatPanelHidden : ''}`}
        >
          
          <div
            className={`${styles.chatHeader} ${(selectedChat || isSupportChatSelected) ? styles.chatHeaderActive : styles.chatHeaderEmpty} ${
              (selectedChat || isSupportChatSelected)
                ? (isMobile ? styles.chatHeaderPaddingMobileActive : styles.chatHeaderPaddingDesktopActive)
                : (isMobile ? styles.chatHeaderPaddingMobileEmpty : styles.chatHeaderPaddingDesktopEmpty)
            }`}
          >
            {selectedChat || isSupportChatSelected ? (
              <>
                <Space>
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => {
                        setSelectedChat(null);
                        setSupportCenterSelected(false);
                      }}
                      size="small"
                    />
                  )}
                  <Avatar
                    size={isMobile ? 32 : 36}
                    icon={isSupportChatSelected ? <CustomerServiceOutlined /> : <UserOutlined />}
                    src={isSupportChatSelected ? supportAvatarSrc : getMediaUrl(selectedChat?.other_user?.avatar)}
                    className={isSupportChatSelected ? 'support-avatar' : styles.chatHeaderAvatar}
                  />
                  <div>
                    <Text className={`${styles.chatHeaderTitle} ${isMobile ? styles.chatHeaderTitleMobile : ''}`}>
                      {isSupportChatSelected ? 'Центр обращений' : (selectedChat?.other_user?.username || 'Пользователь')}
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
                {canUseExpertOfferButtons && !isSupportChatSelected ? (
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
                    onClick={() => {
                      onClose();
                      navigate('/support/claim-form?mode=support');
                    }}
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
                multiple
                className={styles.hiddenInput}
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || []);
                  if (selectedFiles.length > 0) handleUploadWork(selectedFiles);
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
                    label: `Заказ #${id}`,
                  }))}
                />
              </div>
              
              {!isClosedOrder && (
                <div className={styles.orderSummaryContainer}>
                  {orderLoading ? (
                    <div className={styles.orderLoading}>
                      <Spin size="small" />
                    </div>
                  ) : order ? (
                    <>
                      {/* Compact Header (Always Visible) */}
                      <div 
                        className={`${styles.orderSummaryHeader} ${orderPanelOpen ? styles.orderSummaryHeaderOpen : ''}`} 
                        onClick={() => setOrderPanelOpen(!orderPanelOpen)}
                      >
                        <div className={styles.orderSummaryLeft}>
                          <div className={styles.orderSummaryId}>#{order.id}</div>
                          <div className={`${styles.orderSummaryStatus} ${styles[`status-${order.status}`] || ''}`}>
                            {formatOrderStatus(order.status)}
                          </div>
                        </div>
                        
                        <div className={styles.orderSummaryCenter} />

                        <div className={styles.orderSummaryRight}>
                          <ClockCircleOutlined className={remainingLabel === 'Срок истёк' ? styles.iconDanger : styles.iconWarning} /> 
                          <span className={styles.orderTimerText}>
                            {remainingLabel}
                          </span>
                          <div className={styles.orderToggleIcon}>
                            {orderPanelOpen ? <UpOutlined /> : <DownOutlined />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {orderPanelOpen && (
                        <div className={styles.orderSummaryDetails}>
                          <div className={styles.orderGrid}>
                            <div className={styles.orderGridItem}>
                              <div className={styles.gridIcon}><BookOutlined /></div>
                              <div>
                                <div className={styles.gridLabel}>Предмет</div>
                                <div className={styles.gridValue}>{order.subject?.name || order.custom_subject || '—'}</div>
                              </div>
                            </div>
                            <div className={styles.orderGridItem}>
                              <div className={styles.gridIcon}><FileTextOutlined /></div>
                              <div>
                                <div className={styles.gridLabel}>Тип работы</div>
                                <div className={styles.gridValue}>{order.work_type?.name || order.custom_work_type || '—'}</div>
                              </div>
                            </div>
                            <div className={styles.orderGridItem}>
                              <div className={styles.gridIcon}><ClockCircleOutlined /></div>
                              <div>
                                <div className={styles.gridLabel}>Срок сдачи</div>
                                <div className={styles.gridValue}>
                                  {order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'не указан'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={styles.orderActionsBar}>
                             <div className={styles.primaryActionsRow}>
                              <Button 
                                onClick={handleGoToOrder}
                                className={styles.goToOrderButton}
                              >
                                Перейти в заказ
                              </Button>
                              {showExpertUploadButton && (
                                <Button
                                  type="primary"
                                  icon={<UploadOutlined />}
                                  loading={workUploading}
                                  disabled={isDeadlineExpired(order?.deadline)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    workFileInputRef.current?.click();
                                  }}
                                  className={styles.actionButtonPrimary}
                                >
                                  Выгрузить работу
                                </Button>
                              )}
                             </div>
                             
                             {canOverdueClientActions && (
                                <div className={styles.secondaryActions}>
                                  <Button
                                    size="small"
                                    disabled={overdueCancelling}
                                    loading={overdueExtending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openOverdueExtendModal();
                                    }}
                                  >
                                    Продлить срок сдачи
                                  </Button>
                                  <Button
                                    danger
                                    size="small"
                                    disabled={overdueExtending}
                                    loading={overdueCancelling}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelOverdueOrder();
                                    }}
                                  >
                                    Отменить
                                  </Button>
                                  <Button
                                    size="small"
                                    disabled={overdueExtending || overdueCancelling}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOverdueComplaint();
                                    }}
                                    icon={<ExclamationCircleOutlined />}
                                  >
                                    Жалоба
                                  </Button>
                                </div>
                             )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.orderError}>Не удалось загрузить данные</div>
                  )}
                </div>
              )}
            </>
          ) : null}

          
          <div
            className={`${styles.chatMessages} ${isMobile ? styles.chatMessagesMobile : ''} ${isDragOverChat ? styles.chatMessagesDragOver : ''}`}
            onDragEnter={handleChatDragEnter}
            onDragOver={handleChatDragOver}
            onDragLeave={handleChatDragLeave}
            onDrop={handleChatDrop}
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
                    <Button size="small" onClick={handleContactSupport} className={styles.chatFrozenSupportButton}>
                      Написать в поддержку
                    </Button>
                  </div>
                ) : (
                  <>
                    {orderIntroByChatId[selectedChat.id] ? (
                      <div className={styles.chatIntroWrapper}>
                        <div
                          className={`${styles.chatIntroBubble} ${isMobile ? styles.chatIntroBubbleMobile : ''}`}
                        >
                          {orderIntroByChatId[selectedChat.id]}
                        </div>
                      </div>
                    ) : null}
                    {groupedMessages.map((msg: any, idx: number) => {
                  const isOffer = msg.message_type === 'offer' && !!msg.offer_data;
                  const isWorkOffer = msg.message_type === 'work_offer' && !!msg.offer_data;
                  const workDeliveryFiles = Array.isArray(msg.offer_data?.files) ? msg.offer_data.files : [];
                  const isWorkDelivery = msg.message_type === 'work_delivery' && (!!msg.file_url || workDeliveryFiles.length > 0);
                  const isSystemMessage = msg.message_type === 'system';
                  const revisionSystemPrefix = 'Клиент вернул работу на доработку';
                  const isRevisionSystemMessage = String(msg.text || '').startsWith(revisionSystemPrefix);
                  const revisionCommentText = isRevisionSystemMessage
                    ? (() => {
                        const structuredComment = String(msg.offer_data?.revision_comment || '').trim();
                        if (structuredComment) return structuredComment;
                        const rawText = String(msg.text || '').replace(/\r\n/g, '\n').trim();
                        const explicitCommentMatch = rawText.match(/Комментарий:\s*([\s\S]*)$/);
                        if (explicitCommentMatch?.[1]) return explicitCommentMatch[1].trim();
                        const withoutPrefix = rawText.replace(revisionSystemPrefix, '').replace(/^[:\s\n-]+/, '').trim();
                        return withoutPrefix;
                      })()
                    : '';
                  const canReviewOrder = isOrderClient;
                  const showWorkActions =
                    isWorkDelivery &&
                    canReviewOrder &&
                    !!effectiveOrderId &&
                    order?.status === 'review' &&
                    !msg.is_mine &&
                    (!!msg.file_url || workDeliveryFiles.length > 0);
                  const isCardMessage = isOffer || isWorkOffer || isWorkDelivery || showWorkActions;
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
                    isWorkOffer && !msg.is_mine && isOrderClient && workOfferStatus === 'new';
                  const showWorkDeliveryActions =
                    isWorkOffer &&
                    !msg.is_mine &&
                    isOrderClient &&
                    workOfferStatus === 'accepted' &&
                    workDeliveryStatus === 'delivered';
                  const showExpertUploadForWorkOffer =
                    isWorkOffer &&
                    msg.is_mine &&
                    isOrderExpert &&
                    workOfferStatus === 'accepted' &&
                    workDeliveryStatus === 'awaiting_upload';
                  
                  // System message styling
                  if (isSystemMessage || isRevisionSystemMessage) {
                    if (isRevisionSystemMessage) {
                      const revisionRowClass = `${styles.messageRow} ${msg.is_mine ? styles.messageRowMine : styles.messageRowOther}`;
                      const revisionBubbleClass = `${styles.messageBubble} ${styles.messageBubbleCard} ${msg.is_mine ? styles.messageBubbleMine : styles.messageBubbleOther}`;
                      return (
                        <div
                          key={msg.id}
                          className={revisionRowClass}
                        >
                          <div className={revisionBubbleClass}>
                            <Card
                              size="small"
                              className={`${styles.messageCard} ${isMobile ? styles.messageCardMobile : styles.messageCardDesktop} ${styles.offerCard}`}
                            >
                              <div className={styles.offerCardHeader}>
                                <div className={styles.offerCardHeaderIcon}>
                                  <ExclamationCircleOutlined />
                                </div>
                                <div className={styles.offerCardTitle}>Доработка по заказу</div>
                              </div>
                              <div className={styles.offerCardBody}>
                                <div className={styles.offerDescription}>
                                  {revisionCommentText || 'Комментарий не указан'}
                                </div>
                                <div className={styles.messageCardTime}>
                                  <Text type="secondary" className={styles.messageCardTimeText}>
                                    {formatMessageTime(msg.created_at)}
                                  </Text>
                                </div>
                              </div>
                            </Card>
                          </div>
                        </div>
                      );
                    }
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
                        {isWorkDelivery ? (
                          <Card size="small" className={messageCardClass}>
                            <div className={styles.messageCardTitle}>Готовая работа</div>
                            <div className={styles.messageCardSection}>
                              <Text type="secondary">Файлы</Text>
                              <div className={styles.attachedFilesGrid}>
                                {(workDeliveryFiles.length > 0
                                  ? workDeliveryFiles
                                  : [{ name: msg.file_name || 'Скачать файл', url: msg.file_url }])
                                  .filter((file: any) => !!file?.url)
                                  .map((file: any, fileIdx: number) => (
                                    <a
                                      key={`${msg.id}-work-file-${fileIdx}`}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`${styles.messageFileBlock} ${!msg.is_mine ? styles.messageFileBlockOther : ''}`}
                                      title={file.name}
                                    >
                                      <div className={`${styles.messageFileIconBox} ${!msg.is_mine ? styles.messageFileIconBoxOther : ''}`}>
                                        {getFileIconByName(file.name)}
                                      </div>
                                      <div className={`${styles.messageFileName} ${msg.is_mine ? styles.messageFileNameMine : styles.messageFileNameOther}`}>
                                        {truncateFileName(file.name || 'Скачать файл')}
                                      </div>
                                    </a>
                                  ))}
                              </div>
                            </div>
                            <div className={styles.messageCardInfo}>
                              {msg.is_mine
                                ? 'Вы отправили работу на проверку'
                                : 'Эксперт отправил работу на проверку'}
                            </div>
                            {showWorkActions ? (
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
                            ) : null}
                            <div className={styles.messageCardTime}>
                              <Text type="secondary" className={styles.messageCardTimeText}>
                                {formatMessageTime(msg.created_at)}
                              </Text>
                            </div>
                          </Card>
                        ) : showWorkActions ? (
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
                          <Card size="small" className={`${messageCardClass} ${styles.offerCard}`}>
                            <div className={styles.offerCardHeader}>
                              <div className={styles.offerCardHeaderIcon}><FileTextOutlined /></div>
                              <div className={styles.offerCardTitle}>Индивидуальное предложение</div>
                            </div>
                            
                            <div className={styles.offerCardBody}>
                              <div className={styles.offerGrid}>
                                <div className={styles.offerGridItem}>
                                  <div className={styles.offerGridIcon}><BookOutlined /></div>
                                  <div>
                                    <div className={styles.offerLabel}>Предмет</div>
                                    <div className={styles.offerValue}>{msg.offer_data?.subject}</div>
                                  </div>
                                </div>
                                <div className={styles.offerGridItem}>
                                  <div className={styles.offerGridIcon}><FileTextOutlined /></div>
                                  <div>
                                    <div className={styles.offerLabel}>Тип работы</div>
                                    <div className={styles.offerValue}>{msg.offer_data?.work_type}</div>
                                  </div>
                                </div>
                                <div className={styles.offerGridItem}>
                                  <div className={styles.offerGridIcon}><ClockCircleOutlined /></div>
                                  <div>
                                    <div className={styles.offerLabel}>Срок выполнения</div>
                                    <div className={styles.offerValue}>
                                      {msg.offer_data?.deadline ? new Date(msg.offer_data.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                                    </div>
                                  </div>
                                </div>
                                <div className={styles.offerGridItem}>
                                  <div className={`${styles.offerGridIcon} ${styles.offerGridIconGreen}`}><DollarOutlined /></div>
                                  <div>
                                    <div className={styles.offerLabel}>Стоимость</div>
                                    <div className={styles.offerValue}>
                                      {typeof msg.offer_data?.cost === 'number' ? msg.offer_data.cost.toLocaleString('ru-RU') : msg.offer_data?.cost} ₽
                                    </div>
                                  </div>
                                </div>
                                <div className={styles.offerGridItem}>
                                  <div className={styles.offerGridIcon}><PercentageOutlined /></div>
                                  <div>
                                    <div className={styles.offerLabel}>Предоплата</div>
                                    <div className={styles.offerValue}>
                                      {Number(msg.offer_data?.prepayment_percent ?? 0)}%
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className={styles.offerDescription}>
                                {msg.offer_data?.description}
                              </div>

                              {offerStatus === 'accepted' ? (
                                <div className={`${styles.messageStatusSuccess} ${styles.messageCardActionsTop}`}>
                                  <CheckCircleOutlined /> Предложение принято
                                </div>
                              ) : offerStatus === 'rejected' ? (
                                <div className={`${styles.messageStatusDanger} ${styles.messageCardActionsTop}`}>
                                  <CloseCircleOutlined /> Предложение отклонено
                                </div>
                              ) : offerExpired ? (
                                <div className={`${styles.messageStatusMuted} ${styles.messageCardActionsTop}`}>Срок предложения истек</div>
                              ) : showOfferActions ? (
                                <div className={`${styles.messageCardActions} ${styles.messageCardActionsTop}`}>
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
                                <div className={`${styles.messageStatusMuted} ${styles.messageCardActionsTop}`}>Ожидает решения получателя</div>
                              )}
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
                            {msg.attached_files && msg.attached_files.length > 0 ? (
                              <div className={styles.attachedFilesGrid}>
                                {msg.attached_files.map((file: any, fIdx: number) => (
                                  <a
                                    key={fIdx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.messageFileBlock} ${!msg.is_mine ? styles.messageFileBlockOther : ''}`}
                                    title={file.name}
                                  >
                                    <div className={`${styles.messageFileIconBox} ${!msg.is_mine ? styles.messageFileIconBoxOther : ''}`}>
                                      <FileOutlined />
                                    </div>
                                    <div className={`${styles.messageFileName} ${msg.is_mine ? styles.messageFileNameMine : styles.messageFileNameOther}`}>
                                      {truncateFileName(file.name)}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            ) : msg.file_url && msg.file_name ? (
                              <div className={`${styles.messageFile} ${msg.text ? styles.messageFileWithText : ''}`}>
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${styles.messageFileBlock} ${!msg.is_mine ? styles.messageFileBlockOther : ''}`}
                                  title={msg.file_name}
                                >
                                  <div className={`${styles.messageFileIconBox} ${!msg.is_mine ? styles.messageFileIconBoxOther : ''}`}>
                                    <FileOutlined />
                                  </div>
                                  <div className={`${styles.messageFileName} ${msg.is_mine ? styles.messageFileNameMine : styles.messageFileNameOther}`}>
                                    {truncateFileName(msg.file_name)}
                                  </div>
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

          
          {selectedChat && !isChatFrozen && (
            <div 
              key={`chat-input-${selectedChat.id}-${isChatFrozen}`}
              className={`${styles.chatInputContainer} ${isMobile ? styles.chatInputContainerMobile : ''}`}
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
              >
                <div className={styles.chatInputField}>
                  <Input.TextArea
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    autoSize={{ minRows: isMobile ? 1 : 1, maxRows: isMobile ? 4 : 4 }}
                    className={`${styles.chatInput} ${isMobile ? styles.chatInputMobile : ''}`}
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
                  <Popover
                    content={
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={isMobile ? 280 : 320}
                        height={380}
                        emojiVersion={emojiVersion as any}
                      />
                    }
                    trigger="click"
                    open={emojiPickerOpen}
                    onOpenChange={setEmojiPickerOpen}
                    placement="topRight"
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
                      (!hasVisibleMessageContent(messageText) && attachedFiles.length === 0) ? styles.chatSendButtonDisabled : ''
                    }`}
                    onClick={sendMessage}
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
        title="Продлить срок сдачи"
        destroyOnHidden
        width={isMobile ? '90%' : 520}
      >
        <div className={styles.simpleModalContent}>
          <Text type="secondary">Выберите новый срок сдачи</Text>
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
        open={expertViolationModalOpen}
        centered
        onCancel={() => setExpertViolationModalOpen(false)}
        onOk={() => setExpertViolationModalOpen(false)}
        okText="Понятно"
        cancelButtonProps={{ style: { display: 'none' } }}
        title={
          <div className={styles.claimModalTitle}>
            <ExclamationCircleOutlined className={styles.claimModalTitleIcon} />
            Нарушение правил платформы
          </div>
        }
        destroyOnHidden
        width={isMobile ? '90%' : 560}
      >
        <div className={styles.claimModalContent}>
          <div className={styles.claimWarningBox}>
            <Text className={styles.claimWarningText}>
              Эксперт нарушил правила платформы, чат и сроки заказа временно заморожены. 
              Пожалуйста, дождитесь решения администратора.
            </Text>
          </div>
          {order?.frozen_reason && (
            <div>
              <Text type="secondary">{order.frozen_reason}</Text>
            </div>
          )}
        </div>
      </Modal>
      
      
      <Modal
        open={claimModalOpen}
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
        open={revisionModalOpen}
        centered
        onCancel={() => {
          setRevisionModalOpen(false);
          setRevisionComment('');
        }}
        onOk={handleConfirmRevision}
        okButtonProps={{ loading: revisionSubmitting }}
        okText="Отправить"
        cancelText="Отмена"
        title="Комментарий для доработки"
        destroyOnHidden
      >
        <div className={styles.revisionModalSpacing}>
          <Input.TextArea
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            placeholder="Опишите, что нужно исправить"
            autoSize={{ minRows: 4, maxRows: 8 }}
            maxLength={1500}
            showCount
          />
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
