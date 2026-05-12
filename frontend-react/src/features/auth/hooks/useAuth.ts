import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, User } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { CURRENT_USER_KEY } from '@/hooks/queries';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const hasToken = !!token;

  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: authApi.getCurrentUser,
    enabled: hasToken,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logout = () => {
    authApi.logout();
    queryClient.setQueryData([...CURRENT_USER_KEY], null);
    navigate(ROUTES.login);
  };

  return {
    user,
    isLoading: hasToken && isLoading,
    isAuthenticated: !!user,
    logout,
  };
};
