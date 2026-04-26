
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS, QUERY_CONFIG } from '@/features/admin/constants/adminConstants';
import { message } from 'antd';

export const useDirectorCommunications = (enabled: boolean = true) => {
  const { data: communications = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_DIRECTOR_COMMUNICATIONS,
    queryFn: adminPanelApi.getDirectorCommunications,
    enabled,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: QUERY_CONFIG.staleTime,
  });

  return { communications, loading, refetch };
};

export const useDirectorCommunicationMessages = (communicationId: number | null) => {
  const { data: messages = [], isLoading: loading, refetch } = useQuery({
    queryKey: communicationId ? QUERY_KEYS.ADMIN_DIRECTOR_COMMUNICATION_MESSAGES(communicationId) : ['admin-director-communications-messages-disabled'],
    queryFn: () => communicationId ? adminPanelApi.getDirectorCommunicationMessages(communicationId) : Promise.resolve([]),
    enabled: !!communicationId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  return { messages, loading, refetch };
};

export const useDirectorCommunicationActions = () => {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: ({ communicationId, message }: { communicationId: number; message: string }) =>
      adminPanelApi.sendDirectorMessage(communicationId, message),
    onSuccess: (_, { communicationId }) => {
      message.success('Сообщение отправлено');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_DIRECTOR_COMMUNICATION_MESSAGES(communicationId) });
    },
    onError: () => {
      message.error('Ошибка при отправке сообщения');
    },
  });

  const createCommunication = useMutation({
    mutationFn: adminPanelApi.createDirectorCommunication,
    onSuccess: () => {
      message.success('Обсуждение создано');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_DIRECTOR_COMMUNICATIONS });
    },
    onError: () => {
      message.error('Ошибка при создании обсуждения');
    },
  });

  return {
    sendMessage: sendMessage.mutateAsync,
    isSendingMessage: sendMessage.isPending,
    createCommunication: createCommunication.mutateAsync,
    isCreatingCommunication: createCommunication.isPending,
  };
};
