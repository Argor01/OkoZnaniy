
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '../constants/adminConstants';
import { message } from 'antd';

export const useWorks = (status?: string, enabled: boolean = true) => {
  const { data: works = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_WORKS(status),
    queryFn: () => adminPanelApi.getWorks(status),
    enabled,
    initialData: [],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { works, loading, refetch };
};

export const useWorkActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: approveWork } = useMutation({
    mutationFn: (workId: number) => adminPanelApi.approveWork(workId),
    onSuccess: () => {
      message.success('Работа одобрена');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_WORKS()[0]] });
    },
    onError: () => message.error('Ошибка при одобрении работы'),
  });

  const { mutateAsync: rejectWork } = useMutation({
    mutationFn: (workId: number) => adminPanelApi.rejectWork(workId),
    onSuccess: () => {
      message.success('Работа отклонена');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_WORKS()[0]] });
    },
    onError: () => message.error('Ошибка при отклонении работы'),
  });

  return { approveWork, rejectWork };
};
