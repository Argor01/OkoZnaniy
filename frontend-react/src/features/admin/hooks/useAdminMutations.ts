import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { adminPanelApi } from '@/features/admin/api';
import { disputesApi } from '@/features/arbitration/api/disputes';
import { QUERY_KEYS } from '@/features/admin/constants';
import type { UpdatePartnerRequest, PartnerEarning } from '@/features/admin/types/admin';
import type { Dispute } from '@/features/admin/types';
import { logger } from '@/utils/logger';


export const useAdminMutations = () => {
  const queryClient = useQueryClient();

  
  const markEarningPaidMutation = useMutation({
    mutationFn: adminPanelApi.markEarningPaid,
    onMutate: async (earningId: number) => {
      
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
      
      
      const previousEarnings = queryClient.getQueryData(QUERY_KEYS.ADMIN_EARNINGS);
      
      
      queryClient.setQueryData(QUERY_KEYS.ADMIN_EARNINGS, (old: any) => {
        if (!old) return old;
        const earnings = old.earnings || old;
        if (!Array.isArray(earnings)) return old;
        const updated = earnings.map((earning: PartnerEarning) => 
          earning.id === earningId 
            ? { ...earning, is_paid: true }
            : earning
        );
        return old.earnings !== undefined ? { ...old, earnings: updated } : updated;
      });
      
      return { previousEarnings };
    },
    onSuccess: () => {
      message.success('Начисление выплачено');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
    },
    onError: (error: any, earningId, context) => {
      
      if (context?.previousEarnings) {
        queryClient.setQueryData(QUERY_KEYS.ADMIN_EARNINGS, context.previousEarnings);
      }
      logger.error('Error marking earning as paid:', error);
      message.error(error?.response?.data?.error || 'Ошибка при выплате начисления');
    },
  });

  
  const payPartnerEarningsMutation = useMutation({
    mutationFn: (earningIds: number[]) => adminPanelApi.payPartnerEarnings(earningIds),
    onSuccess: (data) => {
      message.success(data.message || `Выплачено ${data.earnings_count} начислений`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
    },
    onError: (error: any) => {
      logger.error('Error paying partner earnings:', error);
      message.error(error?.response?.data?.error || 'Ошибка при выплате');
    },
  });

  
  const updatePartnerMutation = useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: number; data: UpdatePartnerRequest }) =>
      adminPanelApi.updatePartner(partnerId, data),
    onSuccess: () => {
      message.success('Партнер обновлен');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
    },
    onError: (error: any) => {
      logger.error('Error updating partner:', error);
      message.error(error?.response?.data?.message || 'Ошибка обновления партнера');
    },
  });

  
  const assignArbitratorMutation = useMutation({
    mutationFn: ({ disputeId, arbitratorId }: { disputeId: number; arbitratorId: number }) =>
      disputesApi.assignArbitrator(disputeId, { arbitrator_id: arbitratorId }),
    onSuccess: () => {
      message.success('Арбитр назначен успешно');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_DISPUTES });
    },
    onError: (error: any) => {
      logger.error('Error assigning arbitrator:', error);
      message.error(error?.response?.data?.error || 'Не удалось назначить арбитра');
    },
  });

  
  const invalidateQueries = (queryKeys?: string[][]) => {
    if (queryKeys) {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    } else {
      
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_DISPUTES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ARBITRATORS });
    }
  };

  return {
    
    markEarningPaid: markEarningPaidMutation.mutate,
    markEarningPaidAsync: markEarningPaidMutation.mutateAsync,
    isMarkingEarningPaid: markEarningPaidMutation.isPending,

    
    payPartnerEarnings: payPartnerEarningsMutation.mutate,
    payPartnerEarningsAsync: payPartnerEarningsMutation.mutateAsync,
    isPayingPartnerEarnings: payPartnerEarningsMutation.isPending,

    
    updatePartner: updatePartnerMutation.mutate,
    updatePartnerAsync: updatePartnerMutation.mutateAsync,
    isUpdatingPartner: updatePartnerMutation.isPending,

    
    assignArbitrator: assignArbitratorMutation.mutate,
    assignArbitratorAsync: assignArbitratorMutation.mutateAsync,
    isAssigningArbitrator: assignArbitratorMutation.isPending,

    
    invalidateQueries,
    
    
    isLoading: markEarningPaidMutation.isPending || 
               updatePartnerMutation.isPending || 
               assignArbitratorMutation.isPending,
  };
};
