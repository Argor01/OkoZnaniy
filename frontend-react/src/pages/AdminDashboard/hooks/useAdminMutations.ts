import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { adminApi } from '../../../api/admin';
import { disputesApi } from '../../../api/disputes';
import { QUERY_KEYS } from '../constants';
import type { UpdatePartnerRequest, PartnerEarning } from '../types';

/**
 * Хук для всех мутаций (изменений данных) в админской панели
 * Вынесен из монолитного AdminDashboard.tsx
 */
export const useAdminMutations = () => {
  const queryClient = useQueryClient();

  /**
   * Мутация для отметки начисления как выплаченного
   */
  const markEarningPaidMutation = useMutation({
    mutationFn: adminApi.markEarningPaid,
    onMutate: async (earningId: number) => {
      // Отменяем исходящие запросы, чтобы не перезаписать оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
      
      // Сохраняем предыдущее значение для отката
      const previousEarnings = queryClient.getQueryData(QUERY_KEYS.ADMIN_EARNINGS);
      
      // Оптимистично обновляем данные
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
      // Откатываем изменения в случае ошибки
      if (context?.previousEarnings) {
        queryClient.setQueryData(QUERY_KEYS.ADMIN_EARNINGS, context.previousEarnings);
      }
      console.error('Error marking earning as paid:', error);
      message.error(error?.message || 'Ошибка при отметке начисления');
    },
  });

  /**
   * Мутация для обновления партнера
   */
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

  /**
   * Мутация для назначения арбитра спору
   */
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

  /**
   * Мутация для создания нового партнера (если потребуется)
   */
  const createPartnerMutation = useMutation({
    mutationFn: adminApi.createPartner,
    onSuccess: () => {
      message.success('Партнер создан');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
    },
    onError: (error: any) => {
      console.error('Error creating partner:', error);
      message.error(error?.response?.data?.message || 'Ошибка создания партнера');
    },
  });

  /**
   * Мутация для удаления партнера (если потребуется)
   */
  const deletePartnerMutation = useMutation({
    mutationFn: adminApi.deletePartner,
    onSuccess: () => {
      message.success('Партнер удален');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
    },
    onError: (error: any) => {
      console.error('Error deleting partner:', error);
      message.error(error?.response?.data?.message || 'Ошибка удаления партнера');
    },
  });

  /**
   * Универсальная функция для обновления кэша
   */
  const invalidateQueries = (queryKeys?: string[][]) => {
    if (queryKeys) {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    } else {
      // Обновляем все админские запросы
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_PARTNERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EARNINGS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_DISPUTES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ARBITRATORS });
    }
  };

  return {
    // Мутации для начислений
    markEarningPaid: markEarningPaidMutation.mutate,
    markEarningPaidAsync: markEarningPaidMutation.mutateAsync,
    isMarkingEarningPaid: markEarningPaidMutation.isLoading,

    // Мутации для партнеров
    updatePartner: updatePartnerMutation.mutate,
    updatePartnerAsync: updatePartnerMutation.mutateAsync,
    isUpdatingPartner: updatePartnerMutation.isLoading,

    createPartner: createPartnerMutation.mutate,
    createPartnerAsync: createPartnerMutation.mutateAsync,
    isCreatingPartner: createPartnerMutation.isLoading,

    deletePartner: deletePartnerMutation.mutate,
    deletePartnerAsync: deletePartnerMutation.mutateAsync,
    isDeletingPartner: deletePartnerMutation.isLoading,

    // Мутации для споров
    assignArbitrator: assignArbitratorMutation.mutate,
    assignArbitratorAsync: assignArbitratorMutation.mutateAsync,
    isAssigningArbitrator: assignArbitratorMutation.isLoading,

    // Утилиты
    invalidateQueries,
    
    // Общее состояние загрузки
    isLoading: markEarningPaidMutation.isLoading || 
               updatePartnerMutation.isLoading || 
               assignArbitratorMutation.isLoading ||
               createPartnerMutation.isLoading ||
               deletePartnerMutation.isLoading,
  };
};