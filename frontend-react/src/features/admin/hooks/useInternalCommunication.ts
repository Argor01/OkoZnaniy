import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { internalCommunicationApi, InternalMessage, MeetingRequest } from '@/features/admin/api/internalCommunication';
import { QUERY_KEYS, QUERY_CONFIG } from '@/features/admin/constants/adminConstants';

export const useInternalCommunication = () => {
  const queryClient = useQueryClient();

  // Queries
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_INTERNAL_MESSAGES(false),
    queryFn: () => internalCommunicationApi.getMessages(false),
    staleTime: QUERY_CONFIG.staleTime,
    refetchInterval: 30000,
  });

  const { data: meetingRequests = [], isLoading: loadingMeetings, refetch: refetchMeetings } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_MEETING_REQUESTS(),
    queryFn: () => internalCommunicationApi.getMeetingRequests(),
    staleTime: QUERY_CONFIG.staleTime,
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0, isLoading: loadingUnread, refetch: refetchUnread } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_INTERNAL_UNREAD_COUNT,
    queryFn: internalCommunicationApi.getUnreadCount,
    staleTime: QUERY_CONFIG.staleTime,
    refetchInterval: 30000,
  });

  const loading = loadingMessages || loadingMeetings || loadingUnread;

  const refetchAll = async () => {
    await Promise.all([refetchMessages(), refetchMeetings(), refetchUnread()]);
  };

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: internalCommunicationApi.sendMessage,
    onSuccess: () => {
      message.success('Сообщение отправлено');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_INTERNAL_MESSAGES(false) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_INTERNAL_UNREAD_COUNT });
    },
    onError: (error) => {
      console.error('Ошибка отправки сообщения:', error);
      message.error('Не удалось отправить сообщение');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: internalCommunicationApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_INTERNAL_MESSAGES(false) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_INTERNAL_UNREAD_COUNT });
    },
    onError: (error) => {
      console.error('Ошибка отметки сообщения:', error);
      message.error('Не удалось отметить сообщение');
    },
  });

  const archiveMessageMutation = useMutation({
    mutationFn: internalCommunicationApi.archiveMessage,
    onSuccess: () => {
      message.success('Сообщение архивировано');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_INTERNAL_MESSAGES(false) });
    },
    onError: (error) => {
      console.error('Ошибка архивирования:', error);
      message.error('Не удалось архивировать сообщение');
    },
  });

  return {
    messages,
    meetingRequests,
    loading,
    unreadCount,
    loadMessages: refetchMessages,
    loadMeetingRequests: refetchMeetings,
    loadUnreadCount: refetchUnread,
    loadAll: refetchAll,
    sendMessage: sendMessageMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    archiveMessage: archiveMessageMutation.mutateAsync,
  };
};
