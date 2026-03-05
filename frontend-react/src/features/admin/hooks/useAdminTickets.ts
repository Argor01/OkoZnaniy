
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';
import { message } from 'antd';

export const useTickets = (enabled: boolean = true) => {
  const { data: tickets = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_TICKETS,
    queryFn: async () => {
      const [supportRequests, claims] = await Promise.all([
        adminPanelApi.getSupportRequests(),
        adminPanelApi.getClaims()
      ]);
      
      const allTickets = [
        ...supportRequests.map((req: any) => ({
          ...req,
          type: 'support_request',
          claim_type: null
        })),
        ...claims.map((claim: any) => ({
          ...claim,
          type: 'claim'
        }))
      ];
      
      allTickets.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return allTickets;
    },
    enabled,
    initialData: [],
  });

  return { tickets, loading, refetch };
};

export const useTicket = (ticketId: number) => {
  const { data: ticket, isLoading: loading, refetch } = useQuery({
    queryKey: ['admin_ticket', ticketId],
    queryFn: async () => {
      // Сначала пытаемся получить как support_request
      try {
        const supportRequest = await adminPanelApi.getSupportRequest(ticketId);
        return {
          ...supportRequest,
          type: 'support_request' as const,
          claim_type: null
        };
      } catch (error) {
        // Если не найден как support_request, пытаемся как claim
        try {
          const claim = await adminPanelApi.getClaim(ticketId);
          return {
            ...claim,
            type: 'claim' as const
          };
        } catch (claimError) {
          throw new Error('Тикет не найден');
        }
      }
    },
    enabled: !!ticketId && ticketId > 0,
  });

  return { ticket, loading, refetch };
};

export const useTicketByNumber = (ticketNumber: string) => {
  const { tickets, loading: ticketsLoading } = useTickets(true);
  
  const ticket = tickets.find((t: any) => t.ticket_number === ticketNumber);
  
  const { data: fullTicket, isLoading: detailLoading, refetch } = useQuery({
    queryKey: ['admin_ticket_by_number', ticketNumber],
    queryFn: async () => {
      if (!ticket) {
        throw new Error('Тикет не найден');
      }
      
      // Получаем полную информацию о тикете по ID
      try {
        const supportRequest = await adminPanelApi.getSupportRequest(ticket.id);
        return {
          ...supportRequest,
          type: 'support_request' as const,
          claim_type: null
        };
      } catch (error) {
        try {
          const claim = await adminPanelApi.getClaim(ticket.id);
          return {
            ...claim,
            type: 'claim' as const
          };
        } catch (claimError) {
          throw new Error('Тикет не найден');
        }
      }
    },
    enabled: !!ticket && !!ticketNumber,
  });

  return { 
    ticket: fullTicket, 
    loading: ticketsLoading || detailLoading, 
    refetch 
  };
};

export const useAdminUsers = () => {
  const { data: adminUsers = [], isLoading: loading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: () => supportApi.getAdminUsers(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  return { adminUsers, loading };
};

export const useTicketActions = () => {
  const queryClient = useQueryClient();

  const invalidateTickets = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_TICKETS });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_SUPPORT_REQUESTS()[0]] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_CLAIMS()[0]] });
  };

  const { mutateAsync: sendMessage } = useMutation({
    mutationFn: ({ ticketId, message, ticketType }: { ticketId: number; message: string; ticketType: 'support_request' | 'claim' }) => {
      if (ticketType === 'support_request') {
        return adminPanelApi.sendSupportMessage(ticketId, message);
      } else {
        return adminPanelApi.sendClaimMessage(ticketId, message);
      }
    },
    onSuccess: () => {
      message.success('Сообщение отправлено');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при отправке сообщения'),
  });

  const { mutateAsync: updateStatus } = useMutation({
    mutationFn: ({ ticketId, status, ticketType }: { ticketId: number; status: string; ticketType: 'support_request' | 'claim' }) =>
      adminPanelApi.updateTicketStatus(ticketId, status, ticketType),
    onSuccess: () => {
      message.success('Статус обновлен');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при обновлении статуса'),
  });

  const { mutateAsync: updatePriority } = useMutation({
    mutationFn: ({ ticketId, priority, ticketType }: { ticketId: number; priority: string; ticketType: 'support_request' | 'claim' }) =>
      adminPanelApi.updateTicketPriority(ticketId, priority, ticketType),
    onSuccess: () => {
      message.success('Приоритет обновлен');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при обновлении приоритета'),
  });

  const { mutateAsync: assignAdmin } = useMutation({
    mutationFn: ({ ticketId, adminId, ticketType }: { ticketId: number; adminId: number; ticketType: 'support_request' | 'claim' }) =>
      adminPanelApi.assignTicketAdmin(ticketId, adminId, ticketType),
    onSuccess: () => {
      message.success('Администратор назначен');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при назначении администратора'),
  });

  const { mutateAsync: assignUsers } = useMutation({
    mutationFn: ({ ticketId, userIds, ticketType }: { ticketId: number; userIds: number[]; ticketType: 'support_request' | 'claim' }) =>
      supportApi.assignUsersToTicket(ticketId, userIds, ticketType),
    onSuccess: () => {
      message.success('Пользователи назначены');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при назначении пользователей'),
  });

  const { mutateAsync: addTag } = useMutation({
    mutationFn: ({ ticketId, tag, ticketType }: { ticketId: number; tag: string; ticketType: 'support_request' | 'claim' }) =>
      supportApi.addTagToTicket(ticketId, tag, ticketType),
    onSuccess: () => {
      message.success('Тег добавлен');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при добавлении тега'),
  });

  const { mutateAsync: removeTag } = useMutation({
    mutationFn: ({ ticketId, tag, ticketType }: { ticketId: number; tag: string; ticketType: 'support_request' | 'claim' }) =>
      supportApi.removeTagFromTicket(ticketId, tag, ticketType),
    onSuccess: () => {
      message.success('Тег удален');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при удалении тега'),
  });

  const { mutateAsync: updateTags } = useMutation({
    mutationFn: ({ ticketId, tags, ticketType }: { ticketId: number; tags: string; ticketType: 'support_request' | 'claim' }) =>
      supportApi.updateTicketTags(ticketId, tags, ticketType),
    onSuccess: () => {
      message.success('Теги обновлены');
      invalidateTickets();
    },
    onError: () => message.error('Ошибка при обновлении тегов'),
  });

  return { 
    sendMessage: (ticketId: number, message: string, ticketType: 'support_request' | 'claim') => sendMessage({ ticketId, message, ticketType }), 
    updateStatus: (ticketId: number, status: string, ticketType: 'support_request' | 'claim') => updateStatus({ ticketId, status, ticketType }), 
    updatePriority: (ticketId: number, priority: string, ticketType: 'support_request' | 'claim') => updatePriority({ ticketId, priority, ticketType }), 
    assignAdmin: (ticketId: number, adminId: number, ticketType: 'support_request' | 'claim') => assignAdmin({ ticketId, adminId, ticketType }),
    assignUsers: (ticketId: number, userIds: number[], ticketType: 'support_request' | 'claim') => assignUsers({ ticketId, userIds, ticketType }),
    addTag: (ticketId: number, tag: string, ticketType: 'support_request' | 'claim') => addTag({ ticketId, tag, ticketType }),
    removeTag: (ticketId: number, tag: string, ticketType: 'support_request' | 'claim') => removeTag({ ticketId, tag, ticketType }),
    updateTags: (ticketId: number, tags: string, ticketType: 'support_request' | 'claim') => updateTags({ ticketId, tags, ticketType })
  };
};
