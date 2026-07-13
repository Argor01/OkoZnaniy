import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';

const userDisplayName = (user: any) => {
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  return fullName || user?.username || user?.email || 'Пользователь';
};

const mapRequestToSupportChat = (request: any) => {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  const lastMessage = request.last_message || messages[messages.length - 1];

  return {
    id: request.id,
    ticket_number: request.ticket_number,
    client: {
      id: request.user?.id,
      username: request.user?.username || userDisplayName(request.user),
      first_name: request.user?.first_name || '',
      last_name: request.user?.last_name || '',
      email: request.user?.email || '',
      avatar: request.user?.avatar,
    },
    admin: request.admin ? {
      id: request.admin.id,
      first_name: request.admin.first_name || '',
      last_name: request.admin.last_name || '',
      role: request.admin.role || 'admin',
    } : undefined,
    status: request.status,
    priority: request.priority || 'medium',
    subject: request.subject || `Обращение #${request.ticket_number || request.id}`,
    description: request.description || '',
    messages: messages.map((item: any) => ({
      id: item.id,
      text: item.message || item.text || '',
      attachments: Array.isArray(item.attachments)
        ? item.attachments
        : item.file
          ? [{
              name: item.file_name || 'file',
              url: item.file,
              size: item.file_size || 0,
              type: 'file',
            }]
          : [],
      sender: {
        id: item.sender?.id,
        username: item.sender?.username || userDisplayName(item.sender),
        first_name: item.sender?.first_name || '',
        last_name: item.sender?.last_name || '',
        role: item.sender?.role || (item.is_admin ? 'admin' : 'client'),
        is_admin: Boolean(item.is_admin || item.sender?.role === 'admin' || item.sender?.role === 'director'),
      },
      created_at: item.created_at,
      is_mine: Boolean(item.is_admin),
    })),
    last_message: lastMessage ? {
      text: lastMessage.message || lastMessage.text || '',
      created_at: lastMessage.created_at,
    } : undefined,
    unread_count: request.unread_count || 0,
    created_at: request.created_at,
    updated_at: request.last_message_at || request.updated_at || request.created_at,
  };
};

export const useSupportChats = (enabled: boolean = true) => {
  const { data: chats = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_SUPPORT_CHATS,
    queryFn: () => adminPanelApi.getSupportRequests(),
    enabled,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    select: (data: any) => {
      const items = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && Array.isArray(data.results)
          ? data.results
          : data && typeof data === 'object' && Array.isArray(data.data)
            ? data.data
            : [];

      return items.map(mapRequestToSupportChat);
    },
  });

  return { chats, loading, refetch };
};

export const useSupportActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: sendChatMessage } = useMutation({
    mutationFn: ({ chatId, message, files = [] }: { chatId: number; message: string; files?: File[] }) =>
      adminPanelApi.sendSupportMessage(chatId, message, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SUPPORT_CHATS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SUPPORT_REQUESTS() });
    },
    onError: () => message.error('Ошибка при отправке сообщения'),
  });

  const { mutateAsync: markChatRead } = useMutation({
    mutationFn: (chatId: number) => adminPanelApi.markSupportRequestRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SUPPORT_CHATS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SUPPORT_REQUESTS() });
    },
  });

  return {
    sendChatMessage: (chatId: number, message: string, files?: File[]) => sendChatMessage({ chatId, message, files }),
    sendSupportChatMessage: sendChatMessage,
    markChatRead,
  };
};
