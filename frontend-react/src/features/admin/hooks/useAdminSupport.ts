
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '../constants/adminConstants';
import { message } from 'antd';

export const useSupportChats = (enabled: boolean = true) => {
  const { data: chats = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_SUPPORT_CHATS,
    queryFn: adminPanelApi.getSupportChats,
    enabled,
    initialData: [],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { chats, loading, refetch };
};

export const useSupportActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: sendChatMessage } = useMutation({
    mutationFn: ({ chatId, message }: { chatId: number; message: string }) =>
      adminPanelApi.sendSupportChatMessage(chatId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SUPPORT_CHATS });
    },
    onError: () => message.error('Ошибка при отправке сообщения'),
  });

  return { 
    sendChatMessage: (chatId: number, message: string) => sendChatMessage({ chatId, message }),
    sendSupportChatMessage: sendChatMessage
  };
};
