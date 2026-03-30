import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/features/user/types/users';

/**
 * Хук для централизованного обновления данных пользователя во всём приложении
 * Обновляет все query keys, которые содержат информацию о пользователе
 */
export const useUserUpdate = () => {
  const queryClient = useQueryClient();

  /**
   * Обновляет данные пользователя во всех местах, где они используются
   * @param userData - новые данные пользователя
   */
  const updateUserInCache = (userData: User) => {
    // Обновляем основной профиль пользователя
    queryClient.setQueryData(['user-profile'], userData);
    
    // Обновляем текущие данные в useAuth
    queryClient.setQueryData(['current-user'], userData);
    
    // Инвалидируем все запросы, связанные с пользователем
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
    
    // Инвалидируем запросы, которые могут содержать данные пользователя
    queryClient.invalidateQueries({ predicate: (query) => {
      const queryKey = query.queryKey;
      // Инвалидируем запросы, которые содержат user, profile, me в ключе
      const keyString = JSON.stringify(queryKey).toLowerCase();
      return keyString.includes('user') || keyString.includes('profile') || keyString.includes('me');
    }});
  };

  /**
   * Принудительно обновляет данные пользователя из API
   */
  const refetchUserProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    await queryClient.refetchQueries({ queryKey: ['user-profile'] });
  };

  return {
    updateUserInCache,
    refetchUserProfile,
  };
};
