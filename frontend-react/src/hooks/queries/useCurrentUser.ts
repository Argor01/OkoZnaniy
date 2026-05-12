import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '@/features/auth/api/auth';

export const CURRENT_USER_KEY = ['user-profile'] as const;

export const useCurrentUser = (enabled = true) =>
  useQuery<User>({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: () => authApi.getCurrentUser(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
