
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { AdminUser, AdminRole, AdminPermission } from '@/features/admin/types/admin';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';
import { message } from 'antd';

export const useUsers = () => {
  const { data: users = [], isLoading: loading, error } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USERS,
    queryFn: adminPanelApi.getUsers,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { users, loading, error };
};

export const useAllUsers = useUsers; // Alias for compatibility

export const useBlockedUsers = () => {
  const { data: users = [], isLoading: loading, error } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BLOCKED_USERS,
    queryFn: adminPanelApi.getBlockedUsers,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { users, loading, error };
};

export const useRoles = () => {
  const { data: roles = [], isLoading: loading, error } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_ROLES,
    queryFn: adminPanelApi.getRoles,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { roles, loading, error };
};

export const usePermissions = () => {
  const { data: permissions = [], isLoading: loading, error } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_PERMISSIONS,
    queryFn: adminPanelApi.getPermissions,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { permissions, loading, error };
};

export const useUserActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: changeRole, isPending: changingRole } = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      adminPanelApi.changeUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ROLES }); // Roles count might change
      message.success('Роль пользователя изменена');
    },
    onError: () => message.error('Ошибка при изменении роли'),
  });

  const { mutateAsync: blockUser, isPending: blockingUser } = useMutation({
    mutationFn: (userId: number) => adminPanelApi.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_BLOCKED_USERS });
      message.success('Пользователь заблокирован');
    },
    onError: () => message.error('Ошибка при блокировке пользователя'),
  });

  const { mutateAsync: unblockUser, isPending: unblockingUser } = useMutation({
    mutationFn: (userId: number) => adminPanelApi.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_BLOCKED_USERS });
      message.success('Пользователь разблокирован');
    },
    onError: () => message.error('Ошибка при разблокировке пользователя'),
  });

  return {
    changeRole,
    changeUserRole: (userId: number, role: string) => changeRole({ userId, role }), // Compatibility alias
    blockUser,
    unblockUser,
    changingRole,
    blockingUser,
    unblockingUser,
  };
};

export const useRoleActions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: createRole, isPending: creatingRole } = useMutation({
    mutationFn: (roleData: Partial<AdminRole>) => adminPanelApi.createRole(roleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ROLES });
      message.success('Роль создана');
    },
    onError: () => message.error('Ошибка при создании роли'),
  });

  const { mutateAsync: updateRole, isPending: updatingRole } = useMutation({
    mutationFn: ({ roleId, roleData }: { roleId: string; roleData: Partial<AdminRole> }) =>
      adminPanelApi.updateRole(roleId, roleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ROLES });
      message.success('Роль обновлена');
    },
    onError: () => message.error('Ошибка при обновлении роли'),
  });

  const { mutateAsync: deleteRole, isPending: deletingRole } = useMutation({
    mutationFn: (roleId: string) => adminPanelApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ROLES });
      message.success('Роль удалена');
    },
    onError: () => message.error('Ошибка при удалении роли'),
  });

  const { mutateAsync: updateRolePermissions, isPending: updatingPermissions } = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      adminPanelApi.updateRolePermissions(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_ROLES });
      message.success('Права роли обновлены');
    },
    onError: () => message.error('Ошибка при обновлении прав роли'),
  });

  return {
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    creatingRole,
    updatingRole,
    deletingRole,
    updatingPermissions,
  };
};
