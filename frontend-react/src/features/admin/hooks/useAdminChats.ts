
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';
import { message } from 'antd';

export const useChatRooms = (enabled: boolean = true) => {
  const { data: chatRooms = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_CHAT_ROOMS,
    queryFn: adminPanelApi.getChatRooms,
    enabled,
    initialData: [],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { chatRooms, loading, refetch };
};

// Alias for compatibility
export const useAdminChatRooms = useChatRooms;

export const useChatMessages = (roomId: number | null) => {
  const { data: messages = [], isLoading: loading, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.ADMIN_CHAT_ROOMS, roomId, 'messages'],
    queryFn: () => roomId ? adminPanelApi.getChatRoomMessages(roomId) : Promise.resolve([]),
    enabled: !!roomId,
    initialData: [],
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  return { messages, loading, refetch };
};

export const useChatActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: sendMessage } = useMutation({
    mutationFn: ({ roomId, message }: { roomId: number; message: string }) =>
      adminPanelApi.sendChatRoomMessage(roomId, message),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADMIN_CHAT_ROOMS, roomId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CHAT_ROOMS }); // Update last message in list
    },
    onError: () => {
      message.error('Ошибка отправки сообщения');
    },
  });

  const { mutateAsync: createRoom } = useMutation({
    mutationFn: (roomData: any) => adminPanelApi.createChatRoom(roomData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CHAT_ROOMS });
      message.success('Чат создан');
    },
    onError: () => {
      message.error('Ошибка создания чата');
    },
  });

  const { mutateAsync: joinRoom } = useMutation({
    mutationFn: (roomId: number) => adminPanelApi.joinChatRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CHAT_ROOMS });
      message.success('Вы присоединились к чату');
    },
  });

  const { mutateAsync: leaveRoom } = useMutation({
    mutationFn: (roomId: number) => adminPanelApi.leaveChatRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CHAT_ROOMS });
      message.success('Вы покинули чат');
    },
  });

  const { mutateAsync: inviteUser } = useMutation({
    mutationFn: ({ roomId, userId }: { roomId: number; userId: number }) =>
      adminPanelApi.inviteToChatRoom(roomId, userId),
    onSuccess: () => {
      message.success('Пользователь приглашен');
    },
    onError: () => {
      message.error('Ошибка приглашения пользователя');
    },
  });

  const { mutateAsync: uploadFile } = useMutation({
    mutationFn: ({ roomId, file }: { roomId: number; file: File }) =>
      adminPanelApi.uploadChatRoomFile(roomId, file),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADMIN_CHAT_ROOMS, roomId, 'messages'] });
      message.success('Файл загружен');
    },
    onError: () => {
      message.error('Ошибка загрузки файла');
    },
  });

  return {
    sendMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    inviteUser,
    uploadFile,
    // Compatibility wrappers matching useAdminPanelData signatures
    sendMessageWrapper: (roomId: number, msg: string) => sendMessage({ roomId, message: msg }),
    inviteUserWrapper: (roomId: number, userId: number) => inviteUser({ roomId, userId }),
    uploadFileWrapper: (roomId: number, file: File) => uploadFile({ roomId, file }),
  };
};

// Alias for compatibility
export const useChatRoomActions = () => {
  const actions = useChatActions();
  return {
    ...actions,
    sendMessage: actions.sendMessageWrapper,
    inviteUser: actions.inviteUserWrapper,
    uploadFile: actions.uploadFileWrapper,
  };
};
