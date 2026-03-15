
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupportRequest, SupportMessage, SupportStats, SupportStatus } from '@/features/admin/types/support.types';
import { supportApi, SupportChat, SupportMessage as ApiSupportMessage } from '@/features/support/api/support';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';

export const useSupportRequests = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>('open');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  const mapChatToRequest = (chat: SupportChat): SupportRequest => ({
    id: chat.id,
    title: chat.subject,
    description: chat.last_message?.text || '', // Use last message as description fallback
    status: chat.status as SupportRequest['status'],
    priority: chat.priority as SupportRequest['priority'],
    category: 'general', // Default category
    customer: {
      id: chat.client.id,
      name: `${chat.client.first_name} ${chat.client.last_name}`.trim() || chat.client.username,
      email: chat.client.email,
      avatar: undefined,
    },
    assignedAdmin: chat.admin ? {
      id: chat.admin.id,
      name: `${chat.admin.first_name} ${chat.admin.last_name}`.trim(),
      avatar: undefined,
    } : undefined,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
    lastMessageAt: chat.last_message?.created_at,
    messagesCount: chat.unread_count, // Placeholder, API doesn't return total count
    tags: [], // Placeholder
  });

  const mapApiMessageToMessage = (msg: ApiSupportMessage, chatId: number): SupportMessage => ({
    id: msg.id,
    requestId: chatId,
    senderId: msg.sender.id,
    senderType: msg.sender.is_admin ? 'admin' : 'customer',
    senderName: `${msg.sender.first_name} ${msg.sender.last_name}`.trim() || msg.sender.username,
    senderAvatar: undefined,
    content: msg.text,
    type: msg.message_type === 'file' ? 'file' : 'text',
    attachments: msg.file ? [{
      id: 0,
      name: 'Attachment',
      url: msg.file,
      size: 0,
      type: 'file'
    }] : [],
    createdAt: msg.created_at,
    isRead: msg.is_read,
  });

  const { data: requests = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_SUPPORT_REQUESTS(selectedStatus),
    queryFn: async () => {
      const chats = await supportApi.getChats(selectedStatus === 'completed' ? 'resolved' : selectedStatus);
      return chats.map(mapChatToRequest);
    },
  });

  const { data: requestMessages = [] } = useQuery({
    queryKey: selectedRequest ? QUERY_KEYS.ADMIN_SUPPORT_MESSAGES(selectedRequest.id) : ['admin-support-messages-disabled'],
    queryFn: async () => {
      if (!selectedRequest) return [];
      const messages = await supportApi.getMessages(selectedRequest.id);
      return messages.map(msg => mapApiMessageToMessage(msg, selectedRequest.id));
    },
    enabled: !!selectedRequest,
  });

  const takeRequestMutation = useMutation({
    mutationFn: supportApi.takeChat,
    onSuccess: () => {
      // Invalidate all support requests regardless of status
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_REQUESTS()[0]] });
    },
  });

  const takeRequest = async (requestId: number) => {
    try {
      await takeRequestMutation.mutateAsync(requestId);
      return true;
    } catch (error) {
      console.error('Error taking request:', error);
      return false;
    }
  };

  const fetchRequests = useCallback((status?: SupportStatus) => {
    if (status) {
      setSelectedStatus(status);
    } else {
      refetch();
    }
  }, [refetch]);

  // Placeholder stats - in real app should come from API
  const stats: SupportStats = {
    openRequests: 0,
    inProgressRequests: 0,
    completedToday: 0,
    averageResponseTime: 0,
    customerSatisfaction: 0,
  };

  return {
    requests,
    requestMessages,
    loading,
    selectedStatus,
    selectedRequest,
    stats,
    fetchRequests,
    setSelectedStatus,
    setSelectedRequest,
    takeRequest,
    isTakingRequest: takeRequestMutation.isPending,
  };
};
