import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { adminApi } from '../../../api/admin';
import { disputesApi } from '../../../api/disputes';
import { QUERY_KEYS } from '../constants';
import type { UpdatePartnerRequest, PartnerEarning } from '../types';


export const useAdminMutations = () => {
  const queryClient = useQueryClient();

  
  const markEarningPaidMutation = useMutation({
    mutationFn: adminApi.markEarningPaid,
    onMutate: async (earningId: number) => {
      
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
      
      
      const previousEarnings = queryClient.getQueryData(QUERY_KEYS.ADMIN_EARNINGS);
      
      
      queryClient.setQueryData(QUERY_KEYS.ADMIN_EARNINGS, (old: PartnerEarning[] | undefined) => {
        if (!old) return old;
        return old.map(earning => 
          earning.id === earningId 
            ? { ...earning, is_paid: true }
            : earning
        );
      });
      
      return { previousEarnings };
    },
    onSuccess: () => {
      message.success('Начисление отмечено как выплаченное');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
    },
    onError: (error: any, earningId, context) => {
      
      if (context?.previousEarnings) {
        queryClient.setQueryData(QUERY_KEYS.ADMIN_EARNINGS, context.previousEarnings);
      }
      console.error('Error marking earning as paid:', error);
      message.error(error?.message || 'Ошибка при отметке начисления');
    },
  });

  
  const updatePartnerMutation = useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: number; data: UpdatePartnerRequest }) =>
      adminApi.updatePartner(partnerId, data),
    onSuccess: () => {
      message.success('Партнер обновлен');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
    },
    onError: (error: any) => {
      console.error('Error updating partner:', error);
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
      console.error('Error assigning arbitrator:', error);
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
