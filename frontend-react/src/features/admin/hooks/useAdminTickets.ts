
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

  return { 
    sendMessage: (ticketId: number, message: string, ticketType: 'support_request' | 'claim') => sendMessage({ ticketId, message, ticketType }), 
    updateStatus: (ticketId: number, status: string, ticketType: 'support_request' | 'claim') => updateStatus({ ticketId, status, ticketType }), 
    updatePriority: (ticketId: number, priority: string, ticketType: 'support_request' | 'claim') => updatePriority({ ticketId, priority, ticketType }), 
    assignAdmin: (ticketId: number, adminId: number, ticketType: 'support_request' | 'claim') => assignAdmin({ ticketId, adminId, ticketType })
  };
};
