/**
 * Хук для работы с чатами администраторов
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminChatsApi, type AdminChatApiResponse, type ChatMessagesApiResponse } from '../utils/adminChatsApi';
import { chatNotifications } from '../utils/notificationHelpers';
import type { AdminChatGroup, ChatMessage, AdminUser } from '../types/requests.types';

export const useAdminChats = () => {
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<AdminChatGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Получение списка чатов
  const {
    data: chatsResponse,
    isLoading: chatsLoading,
    error: chatsError,
    refetch: refetchChats
  } = useQuery<AdminChatApiResponse>({
    queryKey: ['admin-chats', searchQuery],
    queryFn: () => adminChatsApi.getChats({ search: searchQuery }),
    refetchInterval: 10000, // Обновление каждые 10 секунд
    staleTime: 5000, // Данные считаются свежими 5 секунд
    cacheTime: 300000, // Кэш на 5 минут
  });

  // Извлекаем массив чатов из ответа
  const chats = chatsResponse?.results || [];

  // Получение сообщений выбранного чата
  const {
    data: messagesResponse,
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery<ChatMessagesApiResponse>({
    queryKey: ['chat-messages', selectedChat?.id],
    queryFn: () => selectedChat ? adminChatsApi.getChatMessages(selectedChat.id) : Promise.resolve({ results: [], count: 0 }),
    enabled: !!selectedChat,
    refetchInterval: 3000, // Обновление каждые 3 секунды для активного чата
    staleTime: 1000, // Сообщения считаются свежими 1 секунду
  });

  // Извлекаем массив сообщений из ответа
  const chatMessages = messagesResponse?.results || [];

  // Получение доступных администраторов
  const {
    data: availableAdmins = [],
    isLoading: adminsLoading
  } = useQuery<AdminUser[]>({
    queryKey: ['available-admins'],
    queryFn: () => adminChatsApi.getAvailableAdmins(),
    staleTime: 60000, // Список админов свежий 1 минуту
    cacheTime: 300000, // Кэш на 5 минут
  });

  // Получение количества непрочитанных сообщений
  const {
    data: unreadCounts = {},
    refetch: refetchUnreadCounts
  } = useQuery<{ [chatId: number]: number }>({
    queryKey: ['unread-counts'],
    queryFn: () => adminChatsApi.getUnreadCount(),
    refetchInterval: 5000, // Обновление каждые 5 секунд
    staleTime: 2000,
  });

  // Мутация: отправка сообщения в чат
  const sendMessageMutation = useMutation({
    mutationFn: ({ 
      chatId, 
      content, 
      replyToId, 
      attachments 
    }: {
      chatId: number;
      content: string;
      replyToId?: number;
      attachments?: File[];
    }) => adminChatsApi.sendChatMessage(chatId, content, replyToId, attachments),
    onSuccess: () => {
      // Обновляем сообщения чата
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      // Обновляем список чатов (может измениться lastMessage)
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      // Обновляем счетчики непрочитанных
      refetchUnreadCounts();
      
      chatNotifications.messageSuccess();
    },
    onError: (error: any) => {
      console.error('Error sending chat message:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  // Мутация: создание нового чата
  const createChatMutation = useMutation({
    mutationFn: (data: {
      name: string;
      type: 'general' | 'department' | 'private';
      participantIds: number[];
      description?: string;
    }) => adminChatsApi.createChat(data),
    onSuccess: (newChat) => {
      // Обновляем список чатов
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      // Автоматически выбираем новый чат
      setSelectedChat(newChat);
      
      chatNotifications.chatCreated(newChat.name);
    },
    onError: (error: any) => {
      console.error('Error creating chat:', error);
      chatNotifications.chatCreateError(error?.response?.data?.message);
    },
  });

  // Мутация: присоединение к чату
  const joinChatMutation = useMutation({
    mutationFn: (chatId: number) => adminChatsApi.joinChat(chatId),
    onSuccess: (_, chatId) => {
      // Обновляем список чатов
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      // Находим чат и показываем уведомление
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chatNotifications.joinedChat(chat.name);
      }
    },
    onError: (error: any) => {
      console.error('Error joining chat:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  // Мутация: покидание чата
  const leaveChatMutation = useMutation({
    mutationFn: (chatId: number) => adminChatsApi.leaveChat(chatId),
    onSuccess: (_, chatId) => {
      // Обновляем список чатов
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      // Если покидаем выбранный чат, закрываем его
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
      
      // Находим чат и показываем уведомление
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chatNotifications.leftChat(chat.name);
      }
    },
    onError: (error: any) => {
      console.error('Error leaving chat:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  // Мутация: добавление участников
  const addParticipantsMutation = useMutation({
    mutationFn: ({ chatId, participantIds }: { chatId: number; participantIds: number[] }) => 
      adminChatsApi.addParticipants(chatId, participantIds),
    onSuccess: (updatedChat) => {
      // Обновляем список чатов
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      // Обновляем выбранный чат если это он
      if (selectedChat?.id === updatedChat.id) {
        setSelectedChat(updatedChat);
      }
    },
    onError: (error: any) => {
      console.error('Error adding participants:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  // Мутация: удаление участников
  const removeParticipantsMutation = useMutation({
    mutationFn: ({ chatId, participantIds }: { chatId: number; participantIds: number[] }) => 
      adminChatsApi.removeParticipants(chatId, participantIds),
    onSuccess: (updatedChat) => {
      // Обновляем список чатов
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      // Обновляем выбранный чат если это он
      if (selectedChat?.id === updatedChat.id) {
        setSelectedChat(updatedChat);
      }
    },
    onError: (error: any) => {
      console.error('Error removing participants:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  // Мутация: отметка сообщений как прочитанных
  const markAsReadMutation = useMutation({
    mutationFn: ({ chatId, messageIds }: { chatId: number; messageIds?: number[] }) => 
      adminChatsApi.markMessagesAsRead(chatId, messageIds),
    onSuccess: () => {
      // Обновляем счетчики непрочитанных
      refetchUnreadCounts();
    },
    onError: (error: any) => {
      console.error('Error marking messages as read:', error);
    },
  });

  // Обработчики событий
  const handleChatSelect = useCallback((chat: AdminChatGroup) => {
    setSelectedChat(chat);
    
    // Автоматически отмечаем сообщения как прочитанные
    if (chat.unreadCount > 0) {
      markAsReadMutation.mutate({ chatId: chat.id });
    }
  }, [markAsReadMutation]);

  const handleChatClose = useCallback(() => {
    setSelectedChat(null);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const sendMessage = useCallback((
    content: string, 
    replyToId?: number, 
    attachments?: File[]
  ) => {
    if (selectedChat) {
      sendMessageMutation.mutate({
        chatId: selectedChat.id,
        content,
        replyToId,
        attachments
      });
    }
  }, [selectedChat, sendMessageMutation]);

  const createChat = useCallback((
    name: string, 
    type: 'general' | 'department' | 'private', 
    participantIds: number[],
    description?: string
  ) => {
    createChatMutation.mutate({ name, type, participantIds, description });
  }, [createChatMutation]);

  const joinChat = useCallback((chatId: number) => {
    joinChatMutation.mutate(chatId);
  }, [joinChatMutation]);

  const leaveChat = useCallback((chatId: number) => {
    leaveChatMutation.mutate(chatId);
  }, [leaveChatMutation]);

  const addParticipants = useCallback((chatId: number, participantIds: number[]) => {
    addParticipantsMutation.mutate({ chatId, participantIds });
  }, [addParticipantsMutation]);

  const removeParticipants = useCallback((chatId: number, participantIds: number[]) => {
    removeParticipantsMutation.mutate({ chatId, participantIds });
  }, [removeParticipantsMutation]);

  const markMessagesAsRead = useCallback((chatId: number, messageIds?: number[]) => {
    markAsReadMutation.mutate({ chatId, messageIds });
  }, [markAsReadMutation]);

  // Поиск сообщений в чате
  const searchMessages = useCallback(async (chatId: number, query: string, filters?: any) => {
    try {
      const response = await adminChatsApi.searchMessages(chatId, query, filters);
      return response.results || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, []);

  // Экспорт истории чата
  const exportChatHistory = useCallback(async (
    chatId: number, 
    format: 'txt' | 'json' | 'csv',
    filters?: any
  ) => {
    try {
      const blob = await adminChatsApi.exportChatHistory(chatId, format, filters);
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_history_${chatId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      chatNotifications.messageSuccess();
    } catch (error) {
      console.error('Error exporting chat history:', error);
      chatNotifications.messageError('Ошибка при экспорте истории чата');
    }
  }, []);

  // Получение статистики чата
  const getChatStats = useCallback(async (chatId: number, period?: 'day' | 'week' | 'month') => {
    try {
      return await adminChatsApi.getChatStats(chatId, period);
    } catch (error) {
      console.error('Error getting chat stats:', error);
      return null;
    }
  }, []);

  return {
    // Данные
    chats,
    chatMessages,
    availableAdmins,
    unreadCounts,
    selectedChat,
    searchQuery,
    
    // Состояния загрузки
    chatsLoading,
    messagesLoading,
    adminsLoading,
    isSendingMessage: sendMessageMutation.isPending,
    isCreatingChat: createChatMutation.isPending,
    isJoiningChat: joinChatMutation.isPending,
    isLeavingChat: leaveChatMutation.isPending,
    isAddingParticipants: addParticipantsMutation.isPending,
    isRemovingParticipants: removeParticipantsMutation.isPending,
    
    // Ошибки
    chatsError,
    
    // Обработчики
    handleChatSelect,
    handleChatClose,
    handleSearchChange,
    sendMessage,
    createChat,
    joinChat,
    leaveChat,
    addParticipants,
    removeParticipants,
    markMessagesAsRead,
    searchMessages,
    exportChatHistory,
    getChatStats,
    
    // Методы обновления
    refetchChats,
    refetchMessages,
    refetchUnreadCounts,
  };
};