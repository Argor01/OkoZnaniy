import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';

export const contentApi = {
  // Stats
  getStats: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.content.stats);
    return response.data;
  },

  // Works
  getWorks: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await apiClient.get(API_ENDPOINTS.admin.content.works.list, { params });
    return response.data;
  },

  approveWork: async (workId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.content.works.approve(workId));
    return response.data;
  },

  rejectWork: async (workId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.content.works.reject(workId));
    return response.data;
  }
};
