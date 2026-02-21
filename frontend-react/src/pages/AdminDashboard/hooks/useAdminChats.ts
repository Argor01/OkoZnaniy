

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminChatsApi, type AdminChatApiResponse, type ChatMessagesApiResponse } from '../utils/adminChatsApi';
import { chatNotifications } from '../utils/notificationHelpers';
import type { AdminChatGroup, ChatMessage, AdminUser } from '../types/requests.types';

export const useAdminChats = () => {
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<AdminChatGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  
  const {
    data: chatsResponse,
    isLoading: chatsLoading,
    error: chatsError,
    refetch: refetchChats
  } = useQuery<AdminChatApiResponse>({
    queryKey: ['admin-chats', searchQuery],
    queryFn: () => adminChatsApi.getChats({ search: searchQuery }),
    refetchInterval: 10000, 
    staleTime: 5000, 
    gcTime: 300000, 
  });

  
  const chats = chatsResponse?.results || [];

  
  const {
    data: messagesResponse,
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery<ChatMessagesApiResponse>({
    queryKey: ['chat-messages', selectedChat?.id],
    queryFn: () => selectedChat ? adminChatsApi.getChatMessages(selectedChat.id) : Promise.resolve({ results: [], count: 0 }),
    enabled: !!selectedChat,
    refetchInterval: 3000, 
    staleTime: 1000, 
  });

  
  const chatMessages = messagesResponse?.results || [];

  
  const {
    data: availableAdmins = [],
    isLoading: adminsLoading
  } = useQuery<AdminUser[]>({
    queryKey: ['available-admins'],
    queryFn: () => adminChatsApi.getAvailableAdmins(),
    staleTime: 60000, 
    gcTime: 300000, 
  });

  
  const {
    data: unreadCounts = {},
    refetch: refetchUnreadCounts
  } = useQuery<{ [chatId: number]: number }>({
    queryKey: ['unread-counts'],
    queryFn: async () => {
      const data = await adminChatsApi.getUnreadCount();
      return typeof data === 'number' ? {} : data;
    },
    refetchInterval: 5000, 
    staleTime: 2000,
  });

  
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
      
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      refetchUnreadCounts();
      
      chatNotifications.messageSuccess();
    },
    onError: (error: any) => {
      console.error('Error sending chat message:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  
  const createChatMutation = useMutation({
    mutationFn: (data: {
      name: string;
      type: 'general' | 'department' | 'private';
      participantIds: number[];
      description?: string;
    }) => adminChatsApi.createChat(data),
    onSuccess: (newChat) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      
      setSelectedChat(newChat);
      
      chatNotifications.chatCreated(newChat.name);
    },
    onError: (error: any) => {
      console.error('Error creating chat:', error);
      chatNotifications.chatCreateError(error?.response?.data?.message);
    },
  });

  
  const joinChatMutation = useMutation({
    mutationFn: (chatId: number) => adminChatsApi.joinChat(chatId),
    onSuccess: (_, chatId) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      
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

  
  const leaveChatMutation = useMutation({
    mutationFn: (chatId: number) => adminChatsApi.leaveChat(chatId),
    onSuccess: (_, chatId) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
      
      
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

  
  const addParticipantsMutation = useMutation({
    mutationFn: ({ chatId, participantIds }: { chatId: number; participantIds: number[] }) => 
      adminChatsApi.addParticipants(chatId, participantIds),
    onSuccess: (updatedChat) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      
      if (selectedChat?.id === updatedChat.id) {
        setSelectedChat(updatedChat);
      }
    },
    onError: (error: any) => {
      console.error('Error adding participants:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  
  const removeParticipantsMutation = useMutation({
    mutationFn: ({ chatId, participantIds }: { chatId: number; participantIds: number[] }) => 
      adminChatsApi.removeParticipants(chatId, participantIds),
    onSuccess: (updatedChat) => {
      
      queryClient.invalidateQueries({ queryKey: ['admin-chats'] });
      
      
      if (selectedChat?.id === updatedChat.id) {
        setSelectedChat(updatedChat);
      }
    },
    onError: (error: any) => {
      console.error('Error removing participants:', error);
      chatNotifications.messageError(error?.response?.data?.message);
    },
  });

  
  const markAsReadMutation = useMutation({
    mutationFn: ({ chatId, messageIds }: { chatId: number; messageIds?: number[] }) => 
      adminChatsApi.markMessagesAsRead(chatId, messageIds),
    onSuccess: () => {
      
      refetchUnreadCounts();
    },
    onError: (error: any) => {
      console.error('Error marking messages as read:', error);
    },
  });

  
  const handleChatSelect = useCallback((chat: AdminChatGroup) => {
    setSelectedChat(chat);
    
    
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

  
  const searchMessages = useCallback(async (chatId: number, query: string, filters?: any) => {
    try {
      const response = await adminChatsApi.searchMessages(chatId, query, filters);
      return response.results || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, []);

  
  const exportChatHistory = useCallback(async (
    chatId: number, 
    format: 'txt' | 'json' | 'csv',
    filters?: any
  ) => {
    try {
      const blob = await adminChatsApi.exportChatHistory(chatId, format, filters);
      
      
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

  
  const getChatStats = useCallback(async (chatId: number, period?: 'day' | 'week' | 'month') => {
    try {
      return await adminChatsApi.getChatStats(chatId, period);
    } catch (error) {
      console.error('Error getting chat stats:', error);
      return null;
    }
  }, []);

  return {
    
    chats,
    chatMessages,
    availableAdmins,
    unreadCounts,
    selectedChat,
    searchQuery,
    
    
    chatsLoading,
    messagesLoading,
    adminsLoading,
    isSendingMessage: sendMessageMutation.isPending,
    isCreatingChat: createChatMutation.isPending,
    isJoiningChat: joinChatMutation.isPending,
    isLeavingChat: leaveChatMutation.isPending,
    isAddingParticipants: addParticipantsMutation.isPending,
    isRemovingParticipants: removeParticipantsMutation.isPending,
    
    
    chatsError,
    
    
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
    
    
    refetchChats,
    refetchMessages,
    refetchUnreadCounts,
  };
};
