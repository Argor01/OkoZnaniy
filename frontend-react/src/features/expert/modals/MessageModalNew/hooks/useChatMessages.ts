import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { message as antMessage } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/features/support/api/chat';
import { ordersApi } from '@/features/orders/api/orders';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { logger } from '@/utils/logger';
import type { ChatListItem, ChatDetail, Message, OrderForChat, ContextChat, GroupedMessage } from '../types';

interface UseChatMessagesParams {
  visible: boolean;
  selectedUserId?: number;
  chatContextTitle?: string;
}

export function useChatMessages({ visible, selectedUserId, chatContextTitle }: UseChatMessagesParams) {
  const queryClient = useQueryClient();

  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingChat, setDeletingChat] = useState(false);
  const [contextChat, setContextChat] = useState<ContextChat>(null);
  const [orderIntroByChatId, setOrderIntroByChatId] = useState<Record<number, string>>({});
  const [orderIdsByChatId, setOrderIdsByChatId] = useState<Record<number, number[]>>({});
  const [closedOrderIdsByChatId, setClosedOrderIdsByChatId] = useState<Record<number, number[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCachedChatsRef = useRef(false);

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

    const closedIds: number[] = [];
    const openIds: number[] = [];
    await Promise.all(
      orderIds.map(async (orderId) => {
        try {
          const orderData = await ordersApi.getById(orderId);
          const status = String((orderData as { status?: unknown } | undefined)?.status || '');
          if (status === 'completed' || status === 'cancelled') {
            closedIds.push(orderId);
          } else {
            openIds.push(orderId);
          }
        } catch {
          openIds.push(orderId);
        }
      })
    );
    setClosedOrderIdsByChatId((prev) => ({ ...prev, [chatId]: closedIds }));
    setOrderIdsByChatId((prev) => ({ ...prev, [chatId]: openIds }));
  }, [extractOrderIdsFromChat]);

  const loadChats = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await chatApi.getAll();
      const uniqueChatsMap = new Map<number, ChatListItem>();
      data.forEach((chat) => {
        const otherUserId = chat.other_user?.id;
        if (!otherUserId) {
          uniqueChatsMap.set(chat.id, chat);
          return;
        }
        const existing = uniqueChatsMap.get(otherUserId);
        if (!existing) {
          uniqueChatsMap.set(otherUserId, chat);
        } else {
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
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
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
      }
      return data;
    } catch {
      antMessage.error('Не удалось загрузить чат');
      return undefined;
    }
  }, [hydrateClosedOrdersForChat, queryClient, syncChatListItemFromDetail]);

  // WebSocket handler
  const handleNewMessage = useCallback((wsMessage: any) => {
    if (!selectedChat) return;

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

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    if (!newMsg.is_mine && !newMsg.is_read && selectedChat?.id) {
      const chatIdToMark = selectedChat.id;
      chatApi
        .markAsRead(chatIdToMark)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        })
        .catch(() => {});
    }
  }, [selectedChat, queryClient]);

  const { isConnected: wsConnected } = useChatWebSocket(
    selectedChat?.id ?? null,
    handleNewMessage
  );

  const handleNotificationEvent = useCallback((event: { data?: { chat_id?: number; text?: string; created_at?: string } }) => {
    const chatId = event.data?.chat_id;
    if (!chatId) return;
    if (selectedChat?.id === chatId) {
      void loadChats(true);
      return;
    }

    setChatList((prev) => {
      let found = false;
      const next = prev.map((chat) => {
        if (chat.id !== chatId) return chat;
        found = true;
        return {
          ...chat,
          unread_count: (chat.unread_count || 0) + 1,
          last_message: {
            text: event.data?.text || chat.last_message?.text || '',
            sender_id: chat.last_message?.sender_id || 0,
            created_at: event.data?.created_at || new Date().toISOString(),
            file_name: chat.last_message?.file_name ?? null,
            file_url: chat.last_message?.file_url ?? null,
          },
          last_message_time: event.data?.created_at || new Date().toISOString(),
        };
      });

      if (!found) return prev;
      return [...next].sort((a, b) => {
        const aPinned = a.is_pinned ? 1 : 0;
        const bPinned = b.is_pinned ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime();
      });
    });

    void loadChats(true);
  }, [loadChats, selectedChat?.id]);

  useWebSocket({
    enabled: visible,
    onNotification: handleNotificationEvent,
  });

  const handleTogglePin = useCallback(async (chatId: number) => {
    try {
      setChatList((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, is_pinned: !chat.is_pinned }
            : chat
        )
      );
      await chatApi.togglePin(chatId);
      await loadChats(true);
    } catch (error) {
      logger.error('Ошибка закрепления чата:', error);
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
      const currentChat = chatList.find(c => c.id === chatId);
      const currentUnread = currentChat?.unread_count ?? 0;
      const willMarkAsUnread = currentUnread === 0;

      setChatList((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, unread_count: willMarkAsUnread ? 1 : 0 }
            : c
        )
      );

      if (currentUnread > 0) {
        await chatApi.markAsRead(chatId);
        antMessage.success('Чат помечен как прочитанный');
      } else {
        await chatApi.markAsUnread(chatId);
        antMessage.success('Чат помечен как непрочитанным');
      }
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      await loadChats(true);
    } catch (error) {
      logger.error('Ошибка изменения статуса прочтения:', error);
      antMessage.error('Не удалось изменить статус чата');
      setChatList((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, unread_count: chat.unread_count > 0 ? 0 : 1 }
            : chat
        )
      );
    }
  }, [chatList, loadChats, queryClient]);

  // Context chat effect
  useEffect(() => {
    if (!visible) {
      setContextChat(null);
      return;
    }
    if (chatContextTitle && selectedUserId) {
      setContextChat({ userId: selectedUserId, title: chatContextTitle });
    }
  }, [visible, chatContextTitle, selectedUserId]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  const safeChatList = useMemo(() => (Array.isArray(chatList) ? chatList : []), [chatList]);
  const showChatListLoading = loading && safeChatList.length === 0;

  useEffect(() => {
    hasCachedChatsRef.current = safeChatList.length > 0;
  }, [safeChatList.length]);

  const filteredChats = useMemo(() => safeChatList.filter(chat => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = chat.other_user?.username?.toLowerCase() || '';
      const lastMessage = chat.last_message?.text?.toLowerCase() || '';
      return userName.includes(query) || lastMessage.includes(query);
    }
    return true;
  }), [safeChatList, searchQuery]);

  const groupedMessages = useMemo((): GroupedMessage[] => {
    if (!selectedChat?.messages) return [];

    const result: GroupedMessage[] = [];
    let currentGroup: GroupedMessage | null = null;

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

  return {
    selectedChat,
    setSelectedChat,
    chatList,
    setChatList,
    loading,
    searchQuery,
    setSearchQuery,
    deletingChat,
    setDeletingChat,
    contextChat,
    setContextChat,
    orderIntroByChatId,
    orderIdsByChatId,
    setOrderIdsByChatId,
    closedOrderIdsByChatId,
    setClosedOrderIdsByChatId,
    messagesEndRef,
    hasCachedChatsRef,
    toPositiveNumber,
    extractOrderIdsFromChat,
    loadChats,
    loadChatDetail,
    syncChatListItemFromDetail,
    handleTogglePin,
    handleMarkAsUnread,
    safeChatList,
    showChatListLoading,
    filteredChats,
    groupedMessages,
    wsConnected,
    queryClient,
  };
}
