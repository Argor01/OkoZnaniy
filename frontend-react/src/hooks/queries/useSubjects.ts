import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/features/common/api/catalog';

export const SUBJECTS_KEY = ['subjects'] as const;

export const useSubjects = () => {
  const query = useQuery({
    queryKey: [...SUBJECTS_KEY],
    queryFn: () => catalogApi.getSubjects(),
    staleTime: 10 * 60 * 1000,
  });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
