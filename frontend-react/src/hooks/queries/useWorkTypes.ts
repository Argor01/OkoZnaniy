import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

export const WORK_TYPES_KEY = ['workTypes'] as const;

export const useWorkTypes = () =>
  useQuery({
    queryKey: [...WORK_TYPES_KEY],
    queryFn: () => catalogApi.getWorkTypes(),
    staleTime: 10 * 60 * 1000,
  });
