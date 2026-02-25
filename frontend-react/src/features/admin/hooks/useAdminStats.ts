
import { useQuery } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '../constants/adminConstants';

export const useAdminStats = () => {
  const { data: stats, isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_STATS,
    queryFn: adminPanelApi.getStats,
  });

  return { stats, loading, refetch };
};
