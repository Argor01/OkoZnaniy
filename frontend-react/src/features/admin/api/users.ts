import { apiClient } from '@/api/client';
import { AdminUser, AdminRole, AdminPermission, BlockedUser } from '@/features/admin/types/admin';
import { API_ENDPOINTS } from '@/config/endpoints';

export const usersApi = {
  // Users
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>(API_ENDPOINTS.admin.users.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as any).results)) return (data as any).results;
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
    return [];
  },

  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    const response = await apiClient.get<BlockedUser[]>(API_ENDPOINTS.admin.users.blocked);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as any).results)) return (data as any).results;
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
    return [];
  },

  blockUser: async (userId: number): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.admin.users.block(userId));
  },

  unblockUser: async (userId: number): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.admin.users.unblock(userId));
  },

  changeUserRole: async (userId: number, role: string): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>(API_ENDPOINTS.admin.users.changeRole(userId), { role });
    return response.data;
  },

  // Roles & Permissions
  getRoles: async (): Promise<AdminRole[]> => {
    const response = await apiClient.get<AdminRole[]>(API_ENDPOINTS.admin.roles.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as any).results)) return (data as any).results;
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
    return [];
  },

  createRole: async (roleData: Partial<AdminRole>): Promise<AdminRole> => {
    const response = await apiClient.post<AdminRole>(API_ENDPOINTS.admin.roles.list, roleData);
    return response.data;
  },

  updateRole: async (roleId: string, roleData: Partial<AdminRole>): Promise<AdminRole> => {
    const response = await apiClient.patch<AdminRole>(API_ENDPOINTS.admin.roles.detail(roleId), roleData);
    return response.data;
  },

  deleteRole: async (roleId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.admin.roles.detail(roleId));
  },

  getPermissions: async (): Promise<AdminPermission[]> => {
    const response = await apiClient.get<AdminPermission[]>(API_ENDPOINTS.admin.roles.permissions);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as any).results)) return (data as any).results;
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
    return [];
  },

  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<AdminRole> => {
    const response = await apiClient.post<AdminRole>(API_ENDPOINTS.admin.roles.updatePermissions(roleId), { permissions });
    return response.data;
  },

  getArbitrators: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.users.arbitrators);
    return response.data;
  },

  getUserHistory: async (userId: number) => {
    const response = await apiClient.get(API_ENDPOINTS.admin.users.history(userId));
    return response.data;
  },
};
