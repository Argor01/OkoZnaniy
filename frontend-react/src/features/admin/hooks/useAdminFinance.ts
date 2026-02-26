
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '../constants/adminConstants';
import { message } from 'antd';

// Tariffs
export const useTariffs = (enabled: boolean = true) => {
  const { data: tariffs = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_TARIFFS,
    queryFn: adminPanelApi.getTariffs,
    enabled,
    initialData: [],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { tariffs, loading, refetch };
};

export const useTariffActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: createTariff } = useMutation({
    mutationFn: (data: any) => adminPanelApi.createTariff(data),
    onSuccess: () => {
      message.success('Тариф создан');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_TARIFFS });
    },
    onError: () => message.error('Ошибка при создании тарифа'),
  });

  const { mutateAsync: updateTariff } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminPanelApi.updateTariff(id, data),
    onSuccess: () => {
      message.success('Тариф обновлен');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_TARIFFS });
    },
    onError: () => message.error('Ошибка при обновлении тарифа'),
  });

  const { mutateAsync: deleteTariff } = useMutation({
    mutationFn: (id: number) => adminPanelApi.deleteTariff(id),
    onSuccess: () => {
      message.success('Тариф удален');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_TARIFFS });
    },
    onError: () => message.error('Ошибка при удалении тарифа'),
  });

  return { 
    createTariff, 
    updateTariff: (id: number, data: any) => updateTariff({ id, data }), 
    deleteTariff 
  };
};

// Commissions
export const useCommissions = (enabled: boolean = true) => {
  const { data: commissions = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_COMMISSIONS,
    queryFn: adminPanelApi.getCommissions,
    enabled,
    initialData: [],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { commissions, loading, refetch };
};

export const useCommissionActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: createCommission } = useMutation({
    mutationFn: (data: any) => adminPanelApi.createCommission(data),
    onSuccess: () => {
      message.success('Комиссия создана');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COMMISSIONS });
    },
    onError: () => message.error('Ошибка при создании комиссии'),
  });

  const { mutateAsync: updateCommission } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminPanelApi.updateCommission(id, data),
    onSuccess: () => {
      message.success('Комиссия обновлена');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COMMISSIONS });
    },
    onError: () => message.error('Ошибка при обновлении комиссии'),
  });

  const { mutateAsync: deleteCommission } = useMutation({
    mutationFn: (id: number) => adminPanelApi.deleteCommission(id),
    onSuccess: () => {
      message.success('Комиссия удалена');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_COMMISSIONS });
    },
    onError: () => message.error('Ошибка при удалении комиссии'),
  });

  return { 
    createCommission, 
    updateCommission: (id: number, data: any) => updateCommission({ id, data }), 
    deleteCommission 
  };
};
